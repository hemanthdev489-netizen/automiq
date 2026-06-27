import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const voiceRequestSchema = z.object({
  audioBase64: z.string().optional(), // base64 string of the audio recording
  text: z.string().optional(), // Direct transcribed text if using client SpeechRecognition
  languageCode: z.string().default("en-IN"), // BCP-47 language code
  focusMode: z.boolean().default(false), // Focus mode: transcribe only, no response
  history: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      text: z.string(),
    })
  ).optional(),
});

const OPENAI_API_KEY = 
  (typeof process !== "undefined" ? process.env.OPENAI_API_KEY : undefined) || 
  (typeof globalThis !== "undefined" ? (globalThis as any).OPENAI_API_KEY : undefined) || 
  import.meta.env.VITE_OPENAI_API_KEY || 
  "";

const SARVAM_API_KEY = 
  (typeof process !== "undefined" ? process.env.SARVAM_API_KEY : undefined) || 
  (typeof globalThis !== "undefined" ? (globalThis as any).SARVAM_API_KEY : undefined) || 
  import.meta.env.VITE_SARVAM_API_KEY || 
  "";

// Helper to call Sarvam AI TTS for a sentence chunk
async function callSarvamTts(text: string, languageCode: string): Promise<string> {
  const ttsResponse = await fetch("https://api.sarvam.ai/text-to-speech", {
    method: "POST",
    headers: {
      "api-subscription-key": SARVAM_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: text,
      target_language_code: languageCode,
      speaker: "simran",
      model: "bulbul:v3",
      pace: 1.1,
    }),
  });

  if (!ttsResponse.ok) {
    const errorText = await ttsResponse.text();
    console.error("[VoiceService] Sarvam TTS chunk failed:", errorText);
    throw new Error(`Sarvam TTS failed: ${ttsResponse.statusText} - ${errorText}`);
  }

  const ttsData = await ttsResponse.json();
  const audioBase64 = ttsData.audios?.[0];
  if (!audioBase64) {
    throw new Error("No audio returned from Sarvam TTS chunk");
  }
  return audioBase64;
}

export const processVoice = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    return voiceRequestSchema.parse(data);
  })
  .handler(async ({ data }) => {
    const { audioBase64, text, languageCode, focusMode, history } = data;

    try {
      let transcript = "";

      if (text) {
        transcript = text.trim();
        console.log("[VoiceService] Received direct text transcript:", transcript);
      } else if (audioBase64) {
        // 1. Fallback: Process Speech-to-Text (STT) via Sarvam AI (Synchronous, takes ~300ms)
        let rawBase64 = audioBase64;
        if (audioBase64.includes(";base64,")) {
          rawBase64 = audioBase64.split(";base64,")[1];
        }
        const buffer = Buffer.from(rawBase64, "base64");
        const audioBlob = new Blob([buffer], { type: "audio/webm" });

        const formData = new FormData();
        formData.append("file", audioBlob, "audio.webm");
        formData.append("model", "saaras:v3");
        formData.append("language_code", languageCode);
        formData.append("mode", "transcribe");

        console.log("[VoiceService] Sending audio to Sarvam AI STT...");
        const sttResponse = await fetch("https://api.sarvam.ai/speech-to-text", {
          method: "POST",
          headers: {
            "api-subscription-key": SARVAM_API_KEY,
          },
          body: formData,
        });

        if (!sttResponse.ok) {
          const errorText = await sttResponse.text();
          console.error("[VoiceService] Sarvam STT failed:", errorText);
          throw new Error(`Sarvam STT failed: ${sttResponse.statusText}`);
        }

        const sttData = await sttResponse.json();
        transcript = sttData.transcript?.trim() || "";
        console.log("[VoiceService] Transcribed text via Sarvam STT:", transcript);
      }

      // Focus Mode check: if active, return transcription directly and skip LLM/TTS
      if (focusMode) {
        console.log("[VoiceService] Focus Mode active: returning transcription immediately.");
        const focusStream = new ReadableStream({
          start(controller) {
            controller.enqueue(JSON.stringify({
              transcript,
              isFocusMode: true,
              isFinished: true
            }) + "\n");
            controller.close();
          }
        });
        return new Response(focusStream, { headers: { "Content-Type": "text/event-stream" } });
      }

      // If no text, return early with an empty stream
      if (!transcript || transcript.length === 0) {
        const emptyStream = new ReadableStream({
          start(controller) {
            controller.enqueue(JSON.stringify({
              error: "No speech detected. Please try again.",
              transcript: "",
              text: "I couldn't hear you clearly. Please try speaking again.",
              audio: null,
              index: 0,
              isFinished: true
            }) + "\n");
            controller.close();
          }
        });
        return new Response(emptyStream, { headers: { "Content-Type": "text/event-stream" } });
      }

      // 2. Initialize streaming ReadableStream to send sentence-level chunks to client
      const stream = new ReadableStream({
        async start(controller) {
          try {
            // Send the transcribed user speech first, so client displays it instantly!
            controller.enqueue(JSON.stringify({
              transcript,
              isTranscriptOnly: true
            }) + "\n");

            console.log("[VoiceService] Initiating streaming LLM call to OpenAI...");
            const systemPrompt = `You are AutoMiq's professional, friendly, and warm AI voice agent. AutoMiq is an AI Workforce Studio building custom customer support voice bots, sales support voice bots, chat agents, SEO automation, and bespoke SaaS.
Your instructions:
1. Speak natively, professionally, and naturally like a human representative.
2. If asked about a specific service, explain it with a quick, real-world example of how it works (e.g. "Our support voice bots answer customer queries 24/7, resolving issues like tracking order status instantly without human intervention").
3. CRITICAL: Start with a quick 1-3 word greeting or acknowledgment (e.g., "Oh, absolutely!", "Sure!", "Yes,", "I can explain that!"). Keep your entire answer concise, friendly, and under 45 words. Do not use lists, bullet points, or markdown.
4. BILINGUAL SOUTH INDIAN TELUGU (te-IN): If the user speaks Telugu or the target languageCode is 'te-IN', you MUST respond in highly professional, friendly code-mixed Telugu + English (Telugish) written in Romanized script (Latin characters) for natural prosody. You MUST write all numbers, metrics, times, and digits using English words (e.g. write "twenty four by seven", "one hundred percent", "two thousand" instead of Telugu numbers). For example: "Sure! AutoMiq customer support voice bots customer queries ni twenty four by seven resolve chesi help chestharu. Ee service meku ela help cheyagalanu?"
5. For other languages, respond natively in the language the user speaks (target code: ${languageCode}).`;

            const messages = [
              { role: "system", content: systemPrompt }
            ];

            if (history && history.length > 0) {
              const recentHistory = history.slice(-10);
              for (const msg of recentHistory) {
                if (msg.text.includes("Hello! I am AutoMiq's real-time voice agent") || msg.text.includes("Chat history cleared")) {
                  continue;
                }
                messages.push({
                  role: msg.role === "user" ? "user" : "assistant",
                  content: msg.text,
                });
              }
            }

            messages.push({ role: "user", content: transcript });

            const openAiRes = await fetch("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${OPENAI_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: messages,
                max_tokens: 120,
                temperature: 0.7,
                stream: true, // Enable streaming
              }),
            });

            if (!openAiRes.ok) {
              throw new Error(`OpenAI stream call failed: ${openAiRes.statusText}`);
            }

            const reader = openAiRes.body?.getReader();
            if (!reader) {
              throw new Error("Could not acquire reader for OpenAI stream");
            }

            const decoder = new TextDecoder("utf-8");
            let buffer = "";
            let currentSentence = "";
            let chunkIndex = 0;
            const ttsPromises: Promise<void>[] = [];

            const processTtsChunk = async (text: string, index: number) => {
              try {
                console.log(`[VoiceService] Starting parallel TTS for chunk ${index}: "${text}"`);
                const audioBase64 = await callSarvamTts(text, languageCode);
                controller.enqueue(JSON.stringify({
                  index,
                  text,
                  audio: audioBase64,
                  isFinished: false
                }) + "\n");
              } catch (err: any) {
                console.error(`[VoiceService] TTS chunk ${index} failed:`, err);
                controller.enqueue(JSON.stringify({
                  index,
                  text,
                  audio: null,
                  isFinished: false,
                  error: err.message
                }) + "\n");
              }
            };

            let isFirstChunk = true;

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (let line of lines) {
                line = line.trim();
                if (!line || line === "data: [DONE]") continue;

                if (line.startsWith("data: ")) {
                  try {
                    const json = JSON.parse(line.substring(6));
                    const content = json.choices[0]?.delta?.content || "";
                    currentSentence += content;

                    let shouldTrigger = false;
                    const trimmed = currentSentence.trim();
                    const words = trimmed.split(/\s+/);

                    if (isFirstChunk) {
                      // Aggressive first-chunking: trigger as soon as we have 2 words or 8 characters, or punctuation
                      if (words.length >= 2 || trimmed.length >= 8 || /[.?!,;:]\s*$/.test(currentSentence)) {
                        shouldTrigger = true;
                        isFirstChunk = false;
                      }
                    } else {
                      // Standard sentence/clause boundary detection
                      if (/[.?!]\s*$/.test(currentSentence) || (currentSentence.length > 40 && /[,;:]\s*$/.test(currentSentence))) {
                        shouldTrigger = true;
                      }
                    }

                    if (shouldTrigger) {
                      const textChunk = currentSentence.trim();
                      if (textChunk.length > 0) {
                        const targetChunk = textChunk;
                        const index = chunkIndex++;
                        currentSentence = "";
                        
                        // Fire TTS in parallel! Do not await here, push to promise tracker.
                        ttsPromises.push(processTtsChunk(targetChunk, index));
                      }
                    }
                  } catch (e) {
                    // Ignore JSON parse errors for malformed stream lines
                  }
                }
              }
            }

            // Process any remaining text in the buffer as the final chunk
            const remainingText = currentSentence.trim();
            if (remainingText.length > 0) {
              ttsPromises.push(processTtsChunk(remainingText, chunkIndex++));
            }

            // Wait for all parallel TTS audio generations to complete
            await Promise.all(ttsPromises);

            // Signal end of stream
            controller.enqueue(JSON.stringify({
              isFinished: true,
              totalChunks: chunkIndex
            }) + "\n");

            controller.close();
            console.log("[VoiceService] Stream finished and closed successfully.");
          } catch (streamError: any) {
            console.error("[VoiceService] Error in stream writing:", streamError);
            controller.enqueue(JSON.stringify({
              error: streamError.message || "Streaming error occurred",
              isFinished: true
            }) + "\n");
            controller.close();
          }
        }
      });

      // Return raw Response object with event-stream content type
      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    } catch (error: any) {
      console.error("[VoiceService] Main handler error:", error);
      
      const errorStream = new ReadableStream({
        start(controller) {
          controller.enqueue(JSON.stringify({
            error: error.message || "Failed to process request",
            isFinished: true
          }) + "\n");
          controller.close();
        }
      });
      return new Response(errorStream, { headers: { "Content-Type": "text/event-stream" } });
    }
  });
