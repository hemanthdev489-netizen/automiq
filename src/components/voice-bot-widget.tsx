import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, X, Volume2, Loader2, Phone, PhoneOff, RotateCcw, Settings } from "lucide-react";
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
  { code: "mr-IN", name: "Marathi (मराठी)", native: "मराठी" },
  { code: "gu-IN", name: "Gujarati (ગુજરાતી)", native: "ગુજરાતી" },
  { code: "pa-IN", name: "Punjabi (ਪੰਜਾਬੀ)", native: "ਪੰਜਾਬੀ" },
];

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

const SpeechRecognitionClass = typeof window !== "undefined"
  ? (typeof navigator !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
      ? null // Bypass native speech recognition on mobile to avoid Google/system recording overlays
      : ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition))
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
    { role: "assistant", text: "Hello! I am AUTOMIQ's real-time voice agent. Tap 'Start Call' to talk to me hands-free." },
  ]);
  const [micVolume, setMicVolume] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

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
    setIsMuted(false);
  };

  const toggleMute = () => {
    if (!isSessionActive) return;
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !newMuted;
      });
      console.log(`[VoiceAgent] Microphone state updated: ${newMuted ? "MUTED" : "UNMUTED"}`);
    }
  };

  const startSession = async () => {
    cleanupAudioResources();
    setError(null);
    setIsSessionActive(true);
    
    if (audioPlaybackRef.current) {
      audioPlaybackRef.current.pause();
    } else {
      audioPlaybackRef.current = new Audio();
    }
    // Pre-play a tiny silent WAV file within the user click context to unlock iOS/Safari audio autoplay restrictions
    try {
      audioPlaybackRef.current.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAAA";
      audioPlaybackRef.current.play().catch(() => {});
    } catch (e) {}

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
        
        let audio = audioPlaybackRef.current;
        if (!audio) {
          audio = new Audio();
          audioPlaybackRef.current = audio;
        } else {
          audio.pause();
        }

        // Reset source and update event listeners
        audio.src = audioUrl;

        audio.onended = () => {
          isPlayingRef.current = false;
          // Play next in queue
          playNextStreamingChunk();
          checkSessionTurnCompletion();
        };

        audio.onerror = (e) => {
          console.error(`[VoiceAgent] Error playing audio chunk ${nextIndex}:`, e);
          isPlayingRef.current = false;
          playNextStreamingChunk();
          checkSessionTurnCompletion();
        };

        audio.play().catch((err) => {
          console.error(`[VoiceAgent] Autoplay blocked for chunk ${nextIndex}:`, err);
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
            className="absolute bottom-20 right-0 w-96 max-w-[calc(100vw-2rem)] h-[510px] bg-[#09090b] border border-zinc-800/80 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col z-50"
          >
            {/* Ambient glows */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-36 h-36 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

            {/* Float Header */}
            <div className="absolute top-4 inset-x-0 px-6 flex items-center justify-between z-10">
              {/* Settings gear toggle (Only when call is not active) */}
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 rounded-full hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                disabled={isSessionActive}
              >
                <Settings className="w-4 h-4" />
              </button>

              <span className="font-mono text-[0.62rem] tracking-[0.25em] text-zinc-500 uppercase">
                AUTOMIQ Live Agent
              </span>

              <div className="flex items-center gap-1">
                {/* Transcript overlay toggle */}
                <button
                  onClick={() => setShowTranscriptOverlay(true)}
                  className="p-2 rounded-full hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Main Stage */}
            <div className="flex-1 flex flex-col justify-between pt-16 pb-4">
              
              {/* Center Stage: The Orb */}
              <div className="flex-1 flex flex-col items-center justify-center px-6 relative">
                <div className="relative w-52 h-52 flex items-center justify-center">
                  
                  {/* Outer breathing glowing wave */}
                  <motion.div
                    className={`absolute inset-0 rounded-full blur-2xl opacity-40 transition-colors duration-700 ${
                      status === "listening"
                        ? "bg-cyan-500/40"
                        : status === "thinking"
                        ? "bg-purple-500/30"
                        : isSessionActive
                        ? "bg-cyan-500/40"
                        : "bg-blue-500/20"
                    }`}
                    animate={{
                      scale: status === "listening"
                        ? [1 + micVolume * 0.008, 1.1 + micVolume * 0.015]
                        : status === "thinking"
                        ? [1.02, 1.12, 1.02]
                        : isSessionActive
                        ? [1.05, 1.25, 1.05]
                        : [0.95, 1.05, 0.95] // Ready/Idle slow breathing
                    }}
                    transition={{
                      duration: isSessionActive ? (status === "thinking" ? 2.5 : 0.6) : 3,
                      repeat: Infinity,
                      repeatType: "reverse",
                      ease: "easeInOut"
                    }}
                  />

                  {/* Secondary aura ripple */}
                  <motion.div
                    className={`absolute inset-6 rounded-full blur-md opacity-25 transition-colors duration-700 ${
                      status === "listening"
                        ? "bg-cyan-400/30"
                        : status === "thinking"
                        ? "bg-purple-400/20"
                        : isSessionActive
                        ? "bg-cyan-400/30"
                        : "bg-blue-400/15"
                    }`}
                    animate={{
                      scale: status === "listening"
                        ? [1, 1.15]
                        : status === "thinking"
                        ? [1.05, 0.95, 1.05]
                        : isSessionActive
                        ? [1.1, 0.9, 1.1]
                        : [0.98, 1.02, 0.98]
                    }}
                    transition={{
                      duration: isSessionActive ? 1 : 4,
                      repeat: Infinity,
                      repeatType: "reverse",
                      ease: "easeInOut"
                    }}
                  />

                  {/* Primary Fluid Core Orb */}
                  <motion.div
                    className={`w-36 h-36 rounded-full relative z-10 transition-all duration-700 shadow-inner overflow-hidden border flex items-center justify-center group ${
                      status === "listening"
                        ? "border-cyan-500/30 cursor-pointer"
                        : status === "thinking"
                        ? "border-purple-500/30 cursor-pointer"
                        : "border-blue-500/20 cursor-pointer"
                    }`}
                    style={{
                      background: status === "listening"
                        ? "radial-gradient(circle at 35% 35%, oklch(0.72 0.16 200) 0%, oklch(0.3 0.12 220) 100%)" // Cyan
                        : status === "thinking"
                        ? "radial-gradient(circle at 35% 35%, oklch(0.65 0.22 300) 0%, oklch(0.25 0.15 310) 100%)" // Purple
                        : "radial-gradient(circle at 35% 35%, oklch(0.62 0.15 220) 0%, oklch(0.25 0.12 240) 100%)", // Deep Blue
                      boxShadow: status === "listening"
                        ? `inset 0 0 20px rgba(255,255,255,0.15), 0 0 ${30 + micVolume * 0.5}px oklch(0.72 0.16 200 / 0.5)`
                        : status === "thinking"
                        ? `inset 0 0 20px rgba(255,255,255,0.15), 0 0 35px oklch(0.65 0.22 300 / 0.4)`
                        : `inset 0 0 20px rgba(255,255,255,0.15), 0 0 30px oklch(0.62 0.15 220 / 0.4)`,
                    }}
                    animate={{
                      borderRadius: isSessionActive
                        ? (status === "listening"
                          ? [
                              "42% 58% 70% 30% / 45% 45% 55% 55%",
                              "70% 30% 52% 48% / 60% 40% 60% 40%",
                              "42% 58% 70% 30% / 45% 45% 55% 55%"
                            ]
                          : status === "thinking"
                          ? [
                              "50% 50% 50% 50% / 50% 50% 50% 50%",
                              "45% 55% 45% 55% / 55% 45% 55% 45%",
                              "50% 50% 50% 50% / 50% 50% 50% 50%"
                            ]
                          : [
                              "45% 55% 70% 30% / 50% 60% 40% 50%",
                              "60% 40% 50% 50% / 40% 50% 60% 50%",
                              "45% 55% 70% 30% / 50% 60% 40% 50%"
                            ])
                        : "50%", // Static circle when idle
                      rotate: isSessionActive ? (status === "thinking" ? [0, -360] : [0, 360]) : 0,
                      scale: status === "listening"
                        ? 1 + micVolume * 0.005
                        : status === "speaking"
                        ? [1, 1.08, 0.98, 1.04, 1]
                        : 1
                    }}
                    transition={{
                      borderRadius: { duration: status === "thinking" ? 4 : (status === "speaking" ? 2.5 : 5), repeat: Infinity, ease: "easeInOut" },
                      rotate: { duration: status === "thinking" ? 8 : 15, repeat: Infinity, ease: "linear" },
                      scale: status === "speaking" 
                        ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" }
                        : undefined
                    }}
                    onClick={isSessionActive ? endSession : startSession}
                    whileHover={{ scale: 1.03 }}
                  >
                    {/* Glossy overlay effect for 3D sphere look */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/15 pointer-events-none rounded-full" />
                    <div className="absolute top-2 left-4 w-12 h-6 bg-white/10 blur-[2px] rounded-[50%_50%_30%_30%] transform -rotate-12 pointer-events-none" />

                    {/* Inside Phone Icon (Only when idle or starting call) */}
                    {!isSessionActive ? (
                      <Phone className="w-8 h-8 text-white relative z-20 transition-transform group-hover:scale-110" />
                    ) : status === "speaking" ? (
                      <Volume2 className="w-7 h-7 text-white relative z-20 animate-pulse" />
                    ) : status === "listening" ? (
                      <Mic className="w-7 h-7 text-white relative z-20 animate-pulse" />
                    ) : (
                      <Loader2 className="w-7 h-7 text-white relative z-20 animate-spin" />
                    )}
                  </motion.div>
                </div>

                {/* Subtitle / Status Text */}
                <div className="mt-6 text-center w-full px-8 min-h-[40px] flex items-center justify-center z-10">
                  {!isSessionActive ? (
                    <span className="font-mono text-xs tracking-wider text-zinc-400 animate-pulse">
                      Ready
                    </span>
                  ) : (
                    <AnimatePresence mode="wait">
                      {status === "listening" ? (
                        <motion.p
                          key="listening-sub"
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="text-zinc-200 text-xs tracking-wide leading-relaxed font-sans max-w-xs"
                        >
                          {interimUserText || (chatHistory[chatHistory.length - 1]?.role === "user" ? chatHistory[chatHistory.length - 1]?.text : "Listening...")}
                        </motion.p>
                      ) : status === "thinking" ? (
                        <motion.p
                          key="thinking-sub"
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="text-zinc-500 text-[0.65rem] tracking-widest font-mono animate-pulse"
                        >
                          Thinking...
                        </motion.p>
                      ) : (
                        <motion.p
                          key="speaking-sub"
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="text-cyan-400 text-xs tracking-wide leading-relaxed font-sans max-w-xs"
                        >
                          {chatHistory[chatHistory.length - 1]?.role === "assistant" ? chatHistory[chatHistory.length - 1]?.text : "Speaking..."}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  )}
                </div>
              </div>

              {/* Bottom Control Bar (Pill Shape) */}
              <div className="bg-[#18181b]/95 border border-zinc-800/80 rounded-full px-6 py-3 flex items-center justify-around w-[85%] mx-auto mb-4 z-10 shadow-lg">
                {/* Reset Button */}
                <button
                  onClick={resetChat}
                  className="flex flex-col items-center justify-center gap-1.5 text-[0.55rem] font-mono tracking-wider text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset</span>
                </button>

                {/* Mute Button */}
                <button
                  onClick={toggleMute}
                  className={`flex flex-col items-center justify-center gap-1.5 text-[0.55rem] font-mono tracking-wider transition-colors cursor-pointer ${
                    isMuted ? "text-red-400 hover:text-red-300" : "text-zinc-400 hover:text-zinc-100"
                  }`}
                  disabled={!isSessionActive}
                >
                  {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  <span>{isMuted ? "Muted" : "Mute"}</span>
                </button>

                {/* Start / End Call Button */}
                <button
                  onClick={isSessionActive ? endSession : startSession}
                  className={`flex flex-col items-center justify-center gap-1.5 text-[0.55rem] font-mono tracking-wider transition-colors cursor-pointer ${
                    isSessionActive ? "text-cyan-400 hover:text-cyan-300 font-medium" : "text-zinc-400 hover:text-zinc-100"
                  }`}
                >
                  <Phone className={`w-4 h-4 ${isSessionActive ? "transform rotate-[135deg]" : ""}`} />
                  <span>{isSessionActive ? "End Call" : "Start Call"}</span>
                </button>
              </div>
            </div>

            {/* Settings Slide-in Panel */}
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                  className="absolute inset-x-0 bottom-0 bg-[#121214] border-t border-zinc-800 rounded-t-[2rem] p-6 z-30 shadow-2xl"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="font-mono text-xs tracking-widest text-zinc-400 uppercase">Call Settings</h5>
                    <button onClick={() => setShowSettings(false)} className="text-zinc-500 hover:text-zinc-300 cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-300 font-mono tracking-wider uppercase">Agent Language</span>
                      <select
                        value={languageCode}
                        onChange={(e) => setLanguageCode(e.target.value)}
                        className="bg-zinc-900 border border-zinc-800 text-xs rounded-full px-3 py-1 text-zinc-200 focus:outline-none cursor-pointer font-mono"
                      >
                        {LANGUAGES.map((lang) => (
                          <option key={lang.code} value={lang.code}>
                            {lang.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="h-px bg-zinc-800/60 w-full" />
                    
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-xs text-zinc-300 font-mono tracking-wider uppercase">Voice Focus Mode</span>
                        <span className="text-[0.6rem] text-zinc-500 leading-tight">Transcribe only, don't reply</span>
                      </div>
                      <button
                        onClick={() => setFocusMode(!focusMode)}
                        className={`px-3 py-1 rounded-full text-[0.65rem] font-mono tracking-wider uppercase transition-all border cursor-pointer ${
                          focusMode
                            ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400 shadow-sm"
                            : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        {focusMode ? "ON" : "OFF"}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Transcript Slide-in Panel */}
            <AnimatePresence>
              {showTranscriptOverlay && (
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                  className="absolute inset-0 bg-[#09090b]/98 backdrop-blur-md z-20 flex flex-col p-6 rounded-[2rem]"
                >
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-4">
                    <h5 className="font-mono text-xs tracking-widest text-zinc-400 uppercase">Live Transcript</h5>
                    <button onClick={() => setShowTranscriptOverlay(false)} className="text-zinc-500 hover:text-zinc-300 cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                    {chatHistory.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex flex-col max-w-[85%] ${
                          msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
                        }`}
                      >
                        <span className="font-mono text-[0.55rem] tracking-widest text-zinc-500 uppercase mb-1">
                          {msg.role === "user" ? "You" : "AUTOMIQ"}
                        </span>
                        <div
                          className={`px-4 py-2.5 rounded-2xl text-xs leading-relaxed border ${
                            msg.role === "user"
                              ? "bg-cyan-500/10 border-cyan-500/20 text-zinc-100 rounded-tr-none"
                              : "bg-zinc-900 border-zinc-800 text-zinc-300 rounded-tl-none"
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    ))}
                    {interimUserText && (
                      <div className="flex flex-col max-w-[85%] ml-auto items-end">
                        <span className="font-mono text-[0.55rem] tracking-widest text-zinc-500 uppercase mb-1">
                          You (Speaking)
                        </span>
                        <div className="px-4 py-2.5 rounded-2xl text-xs leading-relaxed border bg-cyan-500/10 border-cyan-500/20 text-zinc-100 rounded-tr-none">
                          {interimUserText}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
