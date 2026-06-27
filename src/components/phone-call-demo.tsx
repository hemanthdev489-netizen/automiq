import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Phone, PhoneOff, User, Volume2, ShieldCheck, Check } from "lucide-react";

type CallState = "incoming" | "connecting" | "connected" | "ended";

interface DialogueLine {
  start: number;
  end: number;
  speaker: "AI" | "User";
  text: string;
}

const DIALOGUE: DialogueLine[] = [
  {
    start: 0,
    end: 4,
    speaker: "AI",
    text: "Hey Hemanth! Thanks for calling AutoMiq. I'm Sarah, your AI assistant. How can I help you today?",
  },
  {
    start: 4,
    end: 9,
    speaker: "User",
    text: "Hi Sarah! I wanted to check if your voice agents can handle incoming bookings for our clinic.",
  },
  {
    start: 9,
    end: 15,
    speaker: "AI",
    text: "Absolutely! We answer calls instantly, check slot availability in real time, and book clients directly into your CRM.",
  },
  {
    start: 15,
    end: 19,
    speaker: "User",
    text: "That sounds amazing. How fast can we get an agent like you set up for our clinic?",
  },
  {
    start: 19,
    end: 25,
    speaker: "AI",
    text: "We can design, train, and launch your voice agent in under 7 days. Shall I schedule a quick consultation to start?",
  },
  {
    start: 25,
    end: 28,
    speaker: "User",
    text: "Yes, let's schedule it! That would be perfect.",
  },
  {
    start: 28,
    end: 32,
    speaker: "AI",
    text: "Perfect! I've sent a booking link to your number. Check your texts. Have a wonderful day!",
  },
];

const CALL_DURATION = 32; // Total seconds of dialogue

export function PhoneCallDemo() {
  const [state, setState] = useState<CallState>("incoming");
  const [seconds, setSeconds] = useState(0);
  const [smsSent, setSmsSent] = useState(false);

  // Auto transition from connecting to connected
  useEffect(() => {
    if (state === "connecting") {
      const timer = setTimeout(() => {
        setState("connected");
        setSeconds(0);
        setSmsSent(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [state]);

  // Call timer and dialog tracker
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (state === "connected") {
      interval = setInterval(() => {
        setSeconds((prev) => {
          if (prev >= CALL_DURATION) {
            setState("ended");
            return 0;
          }
          // Simulate SMS being sent towards the end
          if (prev >= 29) {
            setSmsSent(true);
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [state]);

  // Auto restart after call ended
  useEffect(() => {
    if (state === "ended") {
      const timer = setTimeout(() => {
        setState("incoming");
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [state]);

  const handleAnswer = () => {
    setState("connecting");
  };

  const handleDecline = () => {
    setState("ended");
  };

  const handleEnd = () => {
    setState("ended");
  };

  // Find active line
  const activeLine = DIALOGUE.find((line) => seconds >= line.start && seconds < line.end);
  const isAiSpeaking = activeLine?.speaker === "AI";
  const isUserSpeaking = activeLine?.speaker === "User";

  // Format seconds into MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="relative w-full max-w-[310px] aspect-[9/18.8] select-none mx-auto">
      {/* Outer Phone Case glowing decoration */}
      <div 
        className={`absolute -inset-1 rounded-[42px] transition-colors duration-1000 blur-md opacity-40 pointer-events-none ${
          state === "connected" && isAiSpeaking
            ? "bg-accent animate-pulse"
            : state === "connected" && isUserSpeaking
            ? "bg-emerald-500/80 animate-pulse"
            : "bg-border"
        }`}
      />

      {/* Main Phone Chassis */}
      <div className="relative w-full h-full rounded-[40px] border-[5px] border-neutral-800 bg-neutral-950 overflow-hidden flex flex-col shadow-2xl">
        {/* Dynamic Island */}
        <div className="absolute top-3.5 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-full z-30 flex items-center justify-between px-2.5">
          <div className="w-1.5 h-1.5 rounded-full bg-neutral-800" />
          {state === "connected" && (
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[0.55rem] font-mono tracking-widest text-neutral-400">REC</span>
            </div>
          )}
          <div className="w-3.5 h-1 bg-neutral-800 rounded-full" />
        </div>

        {/* Screen Content Wrapper */}
        <div className="relative flex-1 rounded-[35px] overflow-hidden flex flex-col p-6 pt-12 justify-between bg-radial from-neutral-900 via-neutral-950 to-black">
          
          <AnimatePresence mode="wait">
            {/* 1. INCOMING CALL STATE */}
            {state === "incoming" && (
              <motion.div
                key="incoming"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col justify-between pt-8"
              >
                {/* Caller Information */}
                <div className="text-center">
                  <span className="font-mono text-[0.6rem] tracking-[0.25em] text-muted-foreground uppercase">
                    Incoming Call
                  </span>
                  <h4 className="text-2xl font-bold tracking-tight text-foreground mt-2">
                    AutoMiq AI SDR
                  </h4>
                  <p className="text-xs font-mono tracking-wider text-accent mt-1">
                    Voice Agent Demo
                  </p>
                </div>

                {/* Pulse Ring Profile Area */}
                <div className="relative flex items-center justify-center my-auto py-12">
                  <div className="absolute w-36 h-36 rounded-full border border-accent/20 animate-[ping_2s_infinite]" />
                  <div className="absolute w-28 h-28 rounded-full border border-accent/40 animate-[ping_2.5s_infinite_0.4s]" />
                  <div className="relative flex items-center justify-center w-24 h-24 rounded-full border border-accent/60 bg-neutral-900/50 backdrop-blur shadow-inner shadow-accent/20">
                    <User className="w-10 h-10 text-accent" />
                  </div>
                </div>

                {/* Call Control Buttons */}
                <div className="flex items-center justify-around pb-6">
                  {/* Decline Button */}
                  <div className="flex flex-col items-center gap-2">
                    <button
                      onClick={handleDecline}
                      className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center text-white cursor-pointer active:scale-95 transition-transform"
                    >
                      <PhoneOff className="w-5 h-5" />
                    </button>
                    <span className="text-[0.62rem] font-mono tracking-widest text-muted-foreground">DECLINE</span>
                  </div>

                  {/* Answer Button */}
                  <div className="flex flex-col items-center gap-2">
                    <button
                      onClick={handleAnswer}
                      className="relative w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center text-white cursor-pointer active:scale-95 transition-transform"
                    >
                      <span className="absolute -inset-1.5 rounded-full border-2 border-emerald-500/40 animate-ping pointer-events-none" />
                      <Phone className="w-6 h-6 animate-pulse" />
                    </button>
                    <span className="text-[0.62rem] font-mono tracking-widest text-emerald-400 font-bold">ANSWER</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 2. CONNECTING STATE */}
            {state === "connecting" && (
              <motion.div
                key="connecting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center gap-6"
              >
                <div className="relative flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full border-2 border-accent/20 border-t-accent animate-spin" />
                </div>
                <div className="text-center">
                  <h4 className="text-sm font-mono tracking-[0.2em] text-accent uppercase">
                    Connecting
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">Establishing secure voice line...</p>
                </div>
              </motion.div>
            )}

            {/* 3. CONNECTED STATE */}
            {state === "connected" && (
              <motion.div
                key="connected"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col justify-between pt-6"
              >
                {/* Header Call Information */}
                <div className="text-center">
                  <span className="font-mono text-[0.6rem] tracking-[0.25em] text-accent uppercase flex items-center justify-center gap-1.5">
                    <Volume2 className="w-3 h-3 text-accent animate-pulse" />
                    Live AI Call
                  </span>
                  <h4 className="text-xl font-bold mt-1.5 tracking-tight text-foreground">
                    Sarah (Voice SDR)
                  </h4>
                  <span className="inline-block mt-1 font-mono text-xs tracking-wider bg-accent/10 border border-accent/20 px-2 py-0.5 rounded text-accent">
                    {formatTime(seconds)}
                  </span>
                </div>

                {/* Dynamic Waveform Visualizer & Transcription */}
                <div className="flex-1 flex flex-col justify-center py-6">
                  {/* Waveform graphic */}
                  <div className="flex items-end justify-center gap-1.5 h-16 mb-8">
                    {Array.from({ length: 15 }).map((_, i) => {
                      // Generate animations depending on speaker
                      const isSpeaking = activeLine !== undefined;
                      const isAi = isSpeaking && isAiSpeaking;
                      const isUser = isSpeaking && isUserSpeaking;
                      
                      let heightRange = [8, 8, 8];
                      let duration = 0.8;
                      
                      if (isSpeaking) {
                        // Alternate animations for more realistic waveform variation
                        const factor = (i % 3) + 1;
                        if (isAi) {
                          heightRange = [8, 16 + factor * 14, 8];
                          duration = 0.25 + (i % 3) * 0.08;
                        } else if (isUser) {
                          heightRange = [8, 12 + factor * 12, 8];
                          duration = 0.3 + (i % 3) * 0.06;
                        }
                      }
                      
                      return (
                        <motion.div
                          key={i}
                          className={`w-1 rounded-full ${
                            isAiSpeaking ? "bg-accent" : isUserSpeaking ? "bg-emerald-400" : "bg-neutral-800"
                          }`}
                          animate={{ height: heightRange }}
                          transition={{
                            duration: duration,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: i * 0.02,
                          }}
                        />
                      );
                    })}
                  </div>

                  {/* Transcription Subtitle Box */}
                  <div className="min-h-[140px] px-3 py-4 rounded-2xl border border-border bg-card/60 backdrop-blur-sm flex flex-col justify-start gap-2 relative">
                    <div className="flex items-center justify-between border-b border-border/60 pb-1.5 mb-1.5">
                      <span className={`font-mono text-[0.58rem] tracking-wider uppercase font-semibold ${
                        isAiSpeaking ? "text-accent" : isUserSpeaking ? "text-emerald-400" : "text-muted-foreground"
                      }`}>
                        {activeLine ? (isAiSpeaking ? "Sarah (AI Agent)" : "You (Visitor)") : "Listening..."}
                      </span>
                      <span className="flex items-center gap-1 text-[0.55rem] font-mono text-muted-foreground">
                        <ShieldCheck className="w-3 h-3 text-accent" /> Secure Line
                      </span>
                    </div>

                    <p className="text-xs leading-relaxed text-foreground/90 font-sans italic">
                      {activeLine ? activeLine.text : "..."}
                    </p>

                    {/* Pop-up SMS confirmation alert at the end */}
                    <AnimatePresence>
                      {smsSent && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute -top-12 left-2 right-2 bg-emerald-950/90 border border-emerald-500/30 rounded-xl px-2.5 py-1.5 flex items-center gap-2 backdrop-blur shadow-lg shadow-black/40"
                        >
                          <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-black flex-shrink-0">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                          <div className="text-[0.62rem] font-sans leading-tight">
                            <span className="font-bold text-white block">SMS Sent!</span>
                            <span className="text-emerald-300">Consultation link delivered.</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Hang Up Button */}
                <div className="flex flex-col items-center gap-2 pb-6">
                  <button
                    onClick={handleEnd}
                    className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center text-white cursor-pointer active:scale-95 transition-transform"
                  >
                    <PhoneOff className="w-5 h-5" />
                  </button>
                  <span className="text-[0.58rem] font-mono tracking-[0.2em] text-muted-foreground uppercase">
                    End Call
                  </span>
                </div>
              </motion.div>
            )}

            {/* 4. CALL ENDED STATE */}
            {state === "ended" && (
              <motion.div
                key="ended"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center gap-4"
              >
                <div className="w-12 h-12 rounded-full bg-neutral-900 border border-border flex items-center justify-center text-muted-foreground">
                  <PhoneOff className="w-5 h-5" />
                </div>
                <div className="text-center">
                  <h4 className="text-base font-bold tracking-tight text-foreground">
                    Call Ended
                  </h4>
                  <p className="text-xs font-mono text-muted-foreground mt-1">
                    Thank you for listening
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
