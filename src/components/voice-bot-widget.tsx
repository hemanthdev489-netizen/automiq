import React, { useState, useEffect, useRef } from "react";
import { Mic, X, Volume2, Loader2, Phone, PhoneOff } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { processVoice } from "../lib/voice-service";

const LANGUAGES = [
  { code: "en-IN", name: "English (India)", native: "English" },
  { code: "hi-IN", name: "Hindi (हिंदी)", native: "हिन्दी" },
  { code: "bn-IN", name: "Bengali (বাংলা)", native: "বাংলা" },
  { code: "ta-IN", name: "Tamil (தமிழ்)", native: "தமிழ்" },
  { code: "te-IN", name: "Telugu (తెలుగు)", native: "తెలుగు" },
  { code: "kn-IN", name: "Kannada (ಕನ್ನಡ)", native: "ಕನ್ನಡ" },
  { code: "ml-IN", name: "Malayalam (മലയാളം)", native: "മലയാളം" },
  { code: "mr-IN", name: "Marathi (मराठी)", native: "ਮਰਾਠੀ" },
  { code: "gu-IN", name: "Gujarati (ગુજરાતી)", native: "ગુજરાਤੀ" },
  { code: "pa-IN", name: "Punjabi (ਪੰਜਾਬੀ)", native: "ਪੰਜਾਬੀ" },
];

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

const SpeechRecognitionClass = typeof window !== "undefined"
  ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
  : null;

export function VoiceBotWidget() {
  const [interimUserText, setInterimUserText] = useState("");
  const recognitionRef = useRef<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [status, setStatus] = useState<"idle" | "listening" | "thinking" | "speaking" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [languageCode, setLanguageCode] = useState("en-IN");
  const [focusMode, setFocusMode] = useState(false); // Focus mode: transcribe only, no bot replies
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { role: "assistant", text: "Hello! I am AutoMiq's real-time voice agent. Tap 'Start Call' to talk to me hands-free." },
  ]);
  const [micVolume, setMicVolume] = useState(0);

  // Recording and Stream Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Web Audio Analyzer Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  // Playback Ref
  const audioPlaybackRef = useRef<HTMLAudioElement | null>(null);

  // Silence & Barge-in detection Refs
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasSpokenRef = useRef(false);
  const ignoreNextStopRef = useRef(false);

  // Streaming Queue Refs
  const nextPlayIndexRef = useRef(0);
  const receivedChunksRef = useRef<Map<number, { text: string; audio: string | null }>>(new Map());
  const isPlayingRef = useRef(false);
  const streamFinishedRef = useRef(false);
  const totalChunksRef = useRef(-1);

  // React State Synchronization Refs (avoids stale closures in requestAnimationFrame)
  const isOpenRef = useRef(isOpen);
  const isSessionActiveRef = useRef(isSessionActive);
  const statusRef = useRef(status);
  const languageCodeRef = useRef(languageCode);
  const focusModeRef = useRef(focusMode);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Keep refs synchronized
  useEffect(() => { isOpenRef.current = isOpen; }, [isOpen]);
  useEffect(() => { isSessionActiveRef.current = isSessionActive; }, [isSessionActive]);
  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { languageCodeRef.current = languageCode; }, [languageCode]);
  useEffect(() => { focusModeRef.current = focusMode; }, [focusMode]);

  // Scroll to bottom of chat automatically
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isOpen]);

  // Handle panel close and cleanup
  useEffect(() => {
    if (!isOpen) {
      endSession();
    }
  }, [isOpen]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      cleanupAudioResources();
      if (audioPlaybackRef.current) {
        audioPlaybackRef.current.pause();
      }
    };
  }, []);

  const cleanupAudioResources = () => {
    // Stop recording tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Stop native recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }

    // Cancel animation frame
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }

    // Close AudioContext
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }

    // Clear silence timers
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    hasSpokenRef.current = false;
    setMicVolume(0);
  };

  const startSession = async () => {
    cleanupAudioResources();
    setError(null);
    setIsSessionActive(true);
    
    if (audioPlaybackRef.current) {
      audioPlaybackRef.current.pause();
    }

    try {
      console.log("[VoiceAgent] Initializing mic stream with hardware noise suppression...");
      // Request media stream with advanced audio constraints to suppress background noise
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      streamRef.current = stream;

      // Setup audio context and analyser node once for the entire session
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Start continuous volume/silence/barge-in monitoring
      startAnalysisLoop();

      // Start the first recording turn
      startRecordingTurn();
    } catch (err: any) {
      console.error("[VoiceAgent] Mic access denied or failed:", err);
      setError("Could not access microphone. Please check permissions.");
      setIsSessionActive(false);
      setStatus("error");
    }
  };

  const endSession = () => {
    cleanupAudioResources();
    if (audioPlaybackRef.current) {
      audioPlaybackRef.current.pause();
      audioPlaybackRef.current = null;
    }
    setIsSessionActive(false);
    setStatus("idle");
  };

  const startRecordingTurn = () => {
    setError(null);
    setInterimUserText("");

    // 1. Primary path: Native browser SpeechRecognition if supported
    if (SpeechRecognitionClass) {
      // Abort any existing recognition instance to clean up state
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
        recognitionRef.current = null;
      }

      // Stop MediaRecorder if running
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        try {
          ignoreNextStopRef.current = true;
          mediaRecorderRef.current.stop();
        } catch (e) {}
      }

      try {
        const recognition = new SpeechRecognitionClass();
        recognitionRef.current = recognition;
        recognition.continuous = false; // Stops automatically when speaking ends
        recognition.interimResults = true; // Stream words in real-time
        recognition.lang = languageCodeRef.current;

        recognition.onstart = () => {
          console.log("[SpeechRecognition] Native recognition started listening...");
          setStatus("listening");
          hasSpokenRef.current = false;

          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        };

        recognition.onresult = (event: any) => {
          let interimText = "";
          let finalText = "";

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const segment = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalText += segment;
            } else {
              interimText += segment;
            }
          }

          const currentText = finalText || interimText;
          if (currentText.trim()) {
            setInterimUserText(currentText);
            hasSpokenRef.current = true;
          }

          if (finalText.trim()) {
            console.log("[SpeechRecognition] Final transcript obtained:", finalText);
            setInterimUserText("");
            try {
              recognition.abort();
            } catch (e) {}
            recognitionRef.current = null;

            // Log user message and set to thinking immediately
            setChatHistory((prev) => [
              ...prev,
              { role: "user", text: finalText.trim() }
            ]);
            setStatus("thinking");

            // Process text directly to bypass STT API latency
            processVoiceInput(finalText.trim());
          }
        };

        recognition.onerror = (event: any) => {
          console.warn("[SpeechRecognition] Error detected:", event.error);
        };

        recognition.onend = () => {
          console.log("[SpeechRecognition] Native recognition session ended.");
          recognitionRef.current = null;

          // Restart listening if we are still in listening state and no speech was registered
          if (statusRef.current === "listening" && isSessionActiveRef.current) {
            setTimeout(() => {
              if (statusRef.current === "listening" && isSessionActiveRef.current) {
                startRecordingTurn();
              }
            }, 300);
          }
        };

        recognition.start();
        return;
      } catch (err) {
        console.warn("[SpeechRecognition] Error initializing native speech engine. Falling back to MediaRecorder.", err);
      }
    }

    // 2. Fallback path: MediaRecorder + peak volume detection
    if (!streamRef.current) return;

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        ignoreNextStopRef.current = true;
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }

    try {
      let mimeType = "audio/webm";
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = "audio/ogg";
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = "";

      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(streamRef.current, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (!isSessionActiveRef.current) return;
        if (ignoreNextStopRef.current) {
          ignoreNextStopRef.current = false;
          return;
        }
        
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || "audio/webm" });
        await processVoiceInput(audioBlob);
      };

      ignoreNextStopRef.current = false;
      mediaRecorder.start(100);
      setStatus("listening");
      hasSpokenRef.current = false;

      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }

      silenceTimerRef.current = setTimeout(() => {
        if (statusRef.current === "listening" && !hasSpokenRef.current) {
          console.log("[SilenceDetection] Fallback mic silent for 6s. Flushing & restarting...");
          startRecordingTurn();
        }
      }, 6000);
    } catch (err) {
      console.error("[VoiceAgent] Failed to start fallback recording turn:", err);
      setStatus("error");
    }
  };

  const stopRecordingTurn = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      ignoreNextStopRef.current = false; 
      mediaRecorderRef.current.stop();
      setStatus("thinking");
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    }
  };

  const startAnalysisLoop = () => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    // Track consecutive frames of speech detection for robust barge-in
    let consecutiveSpeechFrames = 0;

    const checkVolume = () => {
      if (!isSessionActiveRef.current || !analyserRef.current) return;

      // Use time-domain data for true peak volume detection
      analyserRef.current.getByteTimeDomainData(dataArray);

      let maxVal = 0;
      for (let i = 0; i < bufferLength; i++) {
        const val = Math.abs(dataArray[i] - 128); // 128 is mid-point for 8-bit PCM
        if (val > maxVal) {
          maxVal = val;
        }
      }

      // Scale to 0-100 for visualizer
      const currentVol = Math.min(100, Math.round((maxVal / 128) * 100));
      setMicVolume(currentVol);

      // Low threshold (peak amplitude > 8) to register user speaking
      const voiceDetected = maxVal > 8;

      if (statusRef.current === "listening") {
        if (voiceDetected) {
          if (!hasSpokenRef.current) {
            hasSpokenRef.current = true;
            console.log("[SilenceDetection] Speaking detected (peak):", maxVal);
          }
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        } else if (hasSpokenRef.current) {
          if (!silenceTimerRef.current) {
            silenceTimerRef.current = setTimeout(() => {
              console.log("[SilenceDetection] Speech ended (silence peak < 8). Submitting...");
              stopRecordingTurn();
            }, 450); // 450ms silence
          }
        }
      } else if (statusRef.current === "speaking") {
        // Barge-in (Interruption) Detection
        const bargeInThreshold = 45; // User voice must exceed peak of 45 to interrupt (less sensitive to speakers)
        if (maxVal > bargeInThreshold) {
          consecutiveSpeechFrames++;
          if (consecutiveSpeechFrames >= 6) { // Filter transient spikes (require ~75ms of sustained sound)
            console.log("[Barge-in] User interrupted playback (peak):", maxVal);
            if (audioPlaybackRef.current) {
              audioPlaybackRef.current.pause();
              audioPlaybackRef.current = null;
            }
            consecutiveSpeechFrames = 0;
            isPlayingRef.current = false;
            // Interrupt current recording turn and discard
            startRecordingTurn();
          }
        } else {
          consecutiveSpeechFrames = Math.max(0, consecutiveSpeechFrames - 1);
        }
      }

      animationFrameIdRef.current = requestAnimationFrame(checkVolume);
    };

    checkVolume();
  };

  const processVoiceInput = async (input: Blob | string) => {
    try {
      // Reset streaming parameters for this new turn
      nextPlayIndexRef.current = 0;
      receivedChunksRef.current.clear();
      isPlayingRef.current = false;
      streamFinishedRef.current = false;
      totalChunksRef.current = -1;

      if (typeof input === "string") {
        await handleVoiceResponse({
          text: input,
          languageCode: languageCodeRef.current,
          focusMode: focusModeRef.current,
          history: chatHistory,
        });
      } else {
        const reader = new FileReader();
        reader.readAsDataURL(input);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          await handleVoiceResponse({
            audioBase64: base64Audio,
            languageCode: languageCodeRef.current,
            focusMode: focusModeRef.current,
            history: chatHistory,
          });
        };
      }
    } catch (err) {
      console.error("[VoiceAgent] Error starting stream processing:", err);
      startRecordingTurn();
    }
  };

  const handleVoiceResponse = async (requestData: { audioBase64?: string; text?: string; languageCode: string; focusMode: boolean; history?: ChatMessage[] }) => {
    try {
      console.log("[VoiceAgent] Calling streaming processVoice server function...");
      const response = await processVoice({
        data: requestData
      });

      // Ensure session wasn't closed or interrupted
      if (!isSessionActiveRef.current) return;

      // If returned Response has a stream body, process SSE lines
      if (response && response.body) {
        const sseReader = response.body.getReader();
        const decoder = new TextDecoder();
        let streamBuffer = "";

        while (true) {
          const { done, value } = await sseReader.read();
          if (done) break;

          streamBuffer += decoder.decode(value, { stream: true });
          const lines = streamBuffer.split("\n");
          streamBuffer = lines.pop() || "";

          for (const line of lines) {
            if (line.trim()) {
              try {
                const chunk = JSON.parse(line);

                // A. Focus Mode chunk response: user transcription only, no bot reply
                if (chunk.isFocusMode) {
                  if (!requestData.text) {
                    setChatHistory((prev) => [
                      ...prev,
                      { role: "user", text: chunk.transcript }
                    ]);
                  }
                  console.log("[VoiceAgent] Focus Mode: transcription displayed, listening turn restarted.");
                  setStatus("listening");
                  startRecordingTurn();
                  continue;
                }
                // B. User transcription text arrives first (normal mode)
                if (chunk.isTranscriptOnly) {
                  if (!requestData.text) {
                    setChatHistory((prev) => [
                      ...prev,
                      { role: "user", text: chunk.transcript }
                    ]);
                  }
                  setStatus("thinking");
                  continue;
                } 
                // C. TTS error or no-speech error
                if (chunk.error) {
                  console.warn("[VoiceAgent] Stream chunk error:", chunk.error);
                } 
                // D. Audio chunk arrives (sentence indexed)
                if (chunk.index !== undefined) {
                  receivedChunksRef.current.set(chunk.index, {
                    text: chunk.text,
                    audio: chunk.audio
                  });
                  // Try playing immediately
                  playNextStreamingChunk();
                } 
                // E. Stream final finished chunk
                if (chunk.isFinished) {
                  streamFinishedRef.current = true;
                  totalChunksRef.current = chunk.totalChunks;
                  // Check if we should finalize listening transition
                  checkSessionTurnCompletion();
                }
              } catch (e) {
                // Ignore JSON parse errors for incomplete SSE lines
              }
            }
          }
        }
      } else {
        console.error("[VoiceAgent] Server function returned no response body.");
        startRecordingTurn();
      }
    } catch (err) {
      console.error("[VoiceAgent] Error in handleVoiceResponse:", err);
      startRecordingTurn();
    }
  };

  const playNextStreamingChunk = () => {
    // If we're already playing a chunk, skip. It will auto-trigger onended.
    if (isPlayingRef.current) return;

    const nextIndex = nextPlayIndexRef.current;
    if (receivedChunksRef.current.has(nextIndex)) {
      const chunk = receivedChunksRef.current.get(nextIndex)!;
      nextPlayIndexRef.current++;
      isPlayingRef.current = true;

      // 1. Append/Aggregate assistant text bubble
      setChatHistory((prev) => {
        const updated = [...prev];
        const lastMsg = updated[updated.length - 1];
        if (lastMsg && lastMsg.role === "assistant" && nextIndex > 0) {
          lastMsg.text += " " + chunk.text;
        } else {
          updated.push({ role: "assistant", text: chunk.text });
        }
        return updated;
      });

      // 2. Play Audio if synthesized
      if (chunk.audio) {
        setStatus("speaking");

        // Force native SpeechRecognition to abort during speech output to prevent echo feedback
        if (recognitionRef.current) {
          try {
            recognitionRef.current.abort();
          } catch (e) {}
          recognitionRef.current = null;
        }

        const audioUrl = `data:audio/wav;base64,${chunk.audio}`;
        
        if (audioPlaybackRef.current) {
          audioPlaybackRef.current.pause();
        }

        const audio = new Audio(audioUrl);
        audioPlaybackRef.current = audio;

        audio.onended = () => {
          audioPlaybackRef.current = null;
          isPlayingRef.current = false;
          // Play next in queue
          playNextStreamingChunk();
          checkSessionTurnCompletion();
        };

        audio.onerror = (e) => {
          console.error(`[VoiceAgent] Error playing audio chunk ${nextIndex}:`, e);
          audioPlaybackRef.current = null;
          isPlayingRef.current = false;
          playNextStreamingChunk();
          checkSessionTurnCompletion();
        };

        audio.play().catch((err) => {
          console.error(`[VoiceAgent] Autoplay blocked for chunk ${nextIndex}:`, err);
          audioPlaybackRef.current = null;
          isPlayingRef.current = false;
          playNextStreamingChunk();
          checkSessionTurnCompletion();
        });
      } else {
        // Text-only fallback (no audio chunk synthesized)
        isPlayingRef.current = false;
        playNextStreamingChunk();
        checkSessionTurnCompletion();
      }
    }
  };

  const checkSessionTurnCompletion = () => {
    // If the stream is finished and we have successfully played all generated chunks
    if (
      streamFinishedRef.current && 
      !isPlayingRef.current && 
      nextPlayIndexRef.current >= totalChunksRef.current
    ) {
      console.log("[VoiceAgent] Call turn completed. Resuming listening...");
      startRecordingTurn();
    }
  };

  const resetChat = () => {
    setChatHistory([
      { role: "assistant", text: "Chat history cleared. Start the call to speak." },
    ]);
    setError(null);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Toggle Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full flex items-center justify-center cursor-pointer shadow-lg relative overflow-hidden transition-colors duration-300 ${
          isOpen
            ? "bg-card text-foreground border border-border"
            : "bg-accent text-accent-foreground border border-accent/20"
        }`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <div className="absolute inset-0 rounded-full bg-accent/15 blur-md animate-pulse pointer-events-none" />
        {isOpen ? <X className="w-6 h-6" /> : <Mic className="w-6 h-6 animate-pulse" />}
      </motion.button>

      {/* Main Glassmorphic Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-20 right-0 w-96 max-w-[calc(100vw-2rem)] h-[510px] bg-card/85 backdrop-blur-xl border border-border/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Ambient glows */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent/5 rounded-full blur-2xl pointer-events-none" />

            {/* Header */}
            <div className="px-6 py-4 border-b border-border/60 flex items-center justify-between bg-card/30">
              <div>
                <h4 className="font-display italic text-2xl text-foreground font-medium tracking-wide">AutoMiq Live Agent</h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${isSessionActive ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"}`} />
                  <span className="text-[0.65rem] font-mono tracking-widest uppercase text-muted-foreground">
                    {isSessionActive ? (focusMode ? "Focus Mode" : "Connected") : "Disconnected"}
                  </span>
                </div>
              </div>
              <button
                onClick={resetChat}
                className="font-mono text-[0.65rem] tracking-wider uppercase text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1 border border-border/80 rounded-full bg-background/40 hover:bg-background cursor-pointer"
              >
                Clear
              </button>
            </div>

            {/* Settings Bar: Language Selection & Focus Mode Toggle */}
            <div className="px-6 py-2 bg-background/30 border-b border-border/40 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[0.65rem] tracking-wider text-muted-foreground uppercase">Agent Language</span>
                <select
                  value={languageCode}
                  onChange={(e) => setLanguageCode(e.target.value)}
                  className="bg-card border border-border/80 text-xs rounded-full px-3 py-1 font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
                  disabled={isSessionActive}
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="h-px bg-border/20 w-full" />
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-col">
                  <span className="font-mono text-[0.65rem] tracking-wider text-muted-foreground uppercase">Voice Focus Mode</span>
                  <span className="text-[0.55rem] text-muted-foreground/60 leading-tight">Transcribe only, don't generate replies</span>
                </div>
                <button
                  onClick={() => setFocusMode(!focusMode)}
                  className={`px-3 py-0.5 rounded-full text-[0.65rem] font-mono tracking-wider uppercase transition-all duration-300 border cursor-pointer ${
                    focusMode
                      ? "bg-accent/20 border-accent text-accent shadow-sm"
                      : "bg-background/40 border-border/80 text-muted-foreground hover:text-foreground"
                  }`}
                  disabled={isSessionActive}
                >
                  {focusMode ? "ON" : "OFF"}
                </button>
              </div>
            </div>

            {/* Interactive Stage & Audio visualization */}
            <div className="flex-1 flex flex-col overflow-hidden min-h-0 relative">
              <div className="h-44 flex flex-col items-center justify-center border-b border-border/30 bg-background/20 relative overflow-hidden">
                <div className="absolute inset-0 grid-lines opacity-10 pointer-events-none" />

                {!isSessionActive ? (
                  /* Welcome / Disconnected Screen */
                  <div className="flex flex-col items-center justify-center p-6 text-center">
                    <motion.button
                      onClick={startSession}
                      className="w-16 h-16 rounded-full bg-accent text-accent-foreground flex items-center justify-center shadow-lg hover:shadow-accent/40 border border-accent/25 relative group cursor-pointer"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <div className="absolute inset-0 rounded-full bg-accent/25 blur-md group-hover:blur-lg transition-all scale-105" />
                      <Phone className="w-6 h-6 relative z-10" />
                    </motion.button>
                    <span className="mt-3 font-mono text-[0.7rem] tracking-widest text-muted-foreground uppercase">
                      Start Voice Call
                    </span>
                    {error && (
                      <span className="text-[0.65rem] text-red-400 font-mono mt-2 max-w-[280px]">
                        {error}
                      </span>
                    )}
                  </div>
                ) : (
                  /* Active Live Call Screen with Premium Orb visualizer */
                  <div className="flex flex-col items-center justify-center w-full relative">
                    <div className="relative w-32 h-32 flex items-center justify-center">
                      {/* Outer breathing glowing wave */}
                      <motion.div
                        className={`absolute inset-0 rounded-full blur-md opacity-35 transition-colors duration-500 ${
                          status === "listening"
                            ? "bg-red-500/30"
                            : status === "thinking"
                            ? "bg-purple-500/20"
                            : "bg-accent/30"
                        }`}
                        animate={{
                          scale: status === "listening"
                            ? [1 + micVolume * 0.008, 1 + micVolume * 0.015]
                            : status === "thinking"
                            ? [1.02, 1.12, 1.02]
                            : [1.08, 1.15, 1.08],
                        }}
                        transition={{
                          duration: status === "thinking" ? 1.6 : 0.35,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      />
                      
                      {/* Middle scaling ring */}
                      <motion.div
                        className={`absolute inset-3 rounded-full blur-sm opacity-55 transition-colors duration-500 ${
                          status === "listening"
                            ? "bg-red-500/20"
                            : status === "thinking"
                            ? "bg-purple-500/10"
                            : "bg-accent/25"
                        }`}
                        style={{
                          transform: status === "listening" ? `scale(${1 + micVolume * 0.004})` : undefined
                        }}
                      />

                      {/* Central core Orb */}
                      <motion.div
                        onClick={endSession}
                        className={`w-16 h-16 rounded-full flex items-center justify-center border relative z-10 cursor-pointer shadow-lg transition-all duration-500 group ${
                          status === "listening"
                            ? "bg-red-950/70 border-red-500/50 text-red-400"
                            : status === "thinking"
                            ? "bg-purple-950/70 border-purple-500/50 text-purple-400"
                            : "bg-accent/15 border-accent/60 text-accent"
                        }`}
                        style={{
                          boxShadow: status === "listening"
                            ? `0 0 ${20 + micVolume * 0.3}px oklch(0.57 0.24 27 / 0.4)`
                            : status === "thinking"
                            ? `0 0 20px oklch(0.5 0.2 280 / 0.3)`
                            : `0 0 25px oklch(0.72 0.16 45 / 0.45)`
                        }}
                        whileHover={{ scale: 1.02 }}
                      >
                        {/* Hover display to end call */}
                        <div className="absolute inset-0 rounded-full bg-red-600/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
                          <PhoneOff className="w-5 h-5 text-white" />
                        </div>

                        {status === "listening" ? (
                          <Mic className="w-5 h-5 animate-pulse relative z-10" />
                        ) : status === "thinking" ? (
                          <Loader2 className="w-5 h-5 animate-spin relative z-10" />
                        ) : (
                          <Volume2 className="w-5 h-5 animate-bounce relative z-10" />
                        )}
                      </motion.div>
                    </div>

                    <div className="mt-2 text-center">
                      <span className="font-mono text-[0.62rem] tracking-[0.2em] text-muted-foreground uppercase block">
                        {status === "listening"
                          ? (focusMode ? "Focus Mode: Transcribing..." : "Listening...")
                          : status === "thinking"
                          ? "Processing..."
                          : "Speaking..."}
                      </span>
                      <span className="text-[0.52rem] text-muted-foreground/60 font-mono mt-0.5 block">
                        {!focusMode && "You can speak to interrupt/barge-in anytime"}
                        {focusMode && "Transcribing voice in real-time with noise suppression"}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Scrollable Conversation Logs */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {chatHistory.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex flex-col max-w-[85%] ${
                      msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
                    }`}
                  >
                    <span className="font-mono text-[0.55rem] tracking-widest text-muted-foreground uppercase mb-1">
                      {msg.role === "user" ? "You" : "AutoMiq"}
                    </span>
                    <div
                      className={`px-4 py-2.5 rounded-2xl text-xs leading-relaxed border ${
                        msg.role === "user"
                          ? "bg-accent/10 border-accent/20 text-foreground rounded-tr-none"
                          : "bg-card border-border/80 text-foreground/90 rounded-tl-none"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {interimUserText && (
                  <div className="flex flex-col max-w-[85%] ml-auto items-end">
                    <span className="font-mono text-[0.55rem] tracking-widest text-muted-foreground uppercase mb-1">
                      You (Speaking)
                    </span>
                    <div className="px-4 py-2.5 rounded-2xl text-xs leading-relaxed border bg-accent/10 border-accent/20 text-foreground rounded-tr-none">
                      {interimUserText}
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            </div>

            {/* Bottom Status bar */}
            <div className="px-6 py-4 border-t border-border/60 bg-card/40 flex items-center justify-between text-[0.62rem] font-mono text-muted-foreground">
              <span>Noise Suppressed Mic Stream</span>
              {isSessionActive && (
                <button
                  onClick={endSession}
                  className="text-red-400 hover:text-red-300 font-semibold cursor-pointer uppercase tracking-wider transition-colors"
                >
                  End Call
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
