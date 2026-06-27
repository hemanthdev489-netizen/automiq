import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Send, TrendingUp, Sparkles, CheckCircle2, Terminal, Play, 
  Cpu, Database, ArrowRight, Check, Shield, Activity, RefreshCw,
  Mail, FileText, Landmark, MessageSquare, Heart, MessageCircle,
  Bookmark, ArrowLeft, MoreHorizontal, Bell, ExternalLink, Instagram
} from "lucide-react";

/* ==========================================================================
   SHARED BROWSER WINDOW WRAPPER
   ========================================================================== */
function BrowserWrapper({ children, url }: { children: React.ReactNode; url: string }) {
  return (
    <div className="relative w-full max-w-[480px] rounded-2xl border border-border bg-card/25 backdrop-blur-sm shadow-2xl overflow-hidden flex flex-col font-sans text-foreground">
      {/* Browser Top Bar */}
      <div className="bg-neutral-900 border-b border-border/40 px-4 py-3 flex items-center gap-4 justify-between select-none">
        {/* Window Dots */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
        </div>
        {/* Mock Address Bar */}
        <div className="flex-1 max-w-[260px] bg-black/40 border border-border/25 rounded-md py-1 px-3 text-[0.62rem] font-mono text-muted-foreground truncate text-center">
          {url}
        </div>
        {/* End Spacer */}
        <div className="w-8 flex-shrink-0" />
      </div>
      {/* Browser Screen Content */}
      <div className="p-5 flex-1 flex flex-col bg-radial from-neutral-900 via-neutral-950 to-black">
        {children}
      </div>
    </div>
  );
}

/* ==========================================================================
   1. CHAT AGENT DEMO (Mobile frame - remains small and vertical)
   ========================================================================== */
interface ChatMsg {
  id: number;
  sender: "ai" | "user";
  text: string;
}

const CHAT_FLOW: ChatMsg[] = [
  { id: 1, sender: "ai", text: "Hi Hemanth! Welcome to Aura Dental. Looking to book an appointment or ask a question?" },
  { id: 2, sender: "user", text: "I need to book a checkup for next Tuesday." },
  { id: 3, sender: "ai", text: "I can help with that! We have openings at 10:00 AM and 3:00 PM. Which works best?" },
  { id: 4, sender: "user", text: "Let's do 10:00 AM." },
  { id: 5, sender: "ai", text: "Perfect! Can I get your full name and phone number to finalize your slot?" },
  { id: 6, sender: "user", text: "Hemanth, 98765 43210" },
  { id: 7, sender: "ai", text: "Confirmed! Booking in CRM. You'll get an SMS confirmation shortly. See you Tuesday!" }
];

export function ChatAgentDemo() {
  const [step, setStep] = useState(0);
  const [messages, setMessages] = useState<ChatMsg[]>([]);

  useEffect(() => {
    if (step < CHAT_FLOW.length) {
      const delay = step === 0 ? 800 : CHAT_FLOW[step - 1].text.length * 25 + 400;
      const timer = setTimeout(() => {
        setMessages((prev) => [...prev, CHAT_FLOW[step]]);
        setStep((prev) => prev + 1);
      }, delay);
      return () => clearTimeout(timer);
    } else {
      const resetTimer = setTimeout(() => {
        setMessages([]);
        setStep(0);
      }, 6000);
      return () => clearTimeout(resetTimer);
    }
  }, [step]);

  return (
    <div className="relative w-full max-w-[310px] aspect-[9/18.8] select-none mx-auto">
      <div className="absolute -inset-1 rounded-[42px] bg-accent/20 blur-md pointer-events-none" />
      <div className="relative w-full h-full rounded-[40px] border-[5px] border-neutral-800 bg-neutral-950 overflow-hidden flex flex-col shadow-2xl">
        <div className="absolute top-3.5 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-full z-30 flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-neutral-900" />
        </div>
        <div className="flex-1 rounded-[35px] overflow-hidden flex flex-col pt-12 pb-4 bg-radial from-neutral-900 via-neutral-950 to-black justify-between">
          <div className="px-4 pb-3 border-b border-border/40 flex items-center gap-3">
            <div className="relative">
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-black" />
              <div className="w-9 h-9 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center font-bold text-accent text-sm">
                A
              </div>
            </div>
            <div>
              <h5 className="text-xs font-bold text-foreground leading-tight">Aura Dental Assistant</h5>
              <span className="text-[0.6rem] font-mono tracking-widest text-muted-foreground uppercase">AI SDR Agent</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 flex flex-col justify-start">
            <AnimatePresence>
              {messages.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 12, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className={`flex flex-col max-w-[85%] ${m.sender === "ai" ? "self-start" : "self-end"}`}
                >
                  <div className={`text-xs px-3.5 py-2.5 rounded-2xl leading-relaxed ${m.sender === "ai" ? "bg-neutral-900 text-foreground border border-border/50 rounded-tl-sm" : "bg-accent text-primary-foreground font-medium rounded-tr-sm"}`}>
                    {m.text}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {step < CHAT_FLOW.length && CHAT_FLOW[step].sender === "ai" && (
              <div className="self-start flex gap-1 bg-neutral-900 px-3.5 py-2.5 rounded-2xl border border-border/50 rounded-tl-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce [animation-delay:0.4s]" />
              </div>
            )}
          </div>
          <div className="px-4">
            <AnimatePresence>
              {step >= CHAT_FLOW.length && (
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-emerald-950/80 border border-emerald-500/25 rounded-2xl p-3 flex flex-col gap-1.5 shadow-lg shadow-black/40 mb-3"
                >
                  <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>CRM Lead Captured!</span>
                  </div>
                  <div className="font-mono text-[0.62rem] text-emerald-300/90 leading-normal space-y-0.5">
                    <div>NAME: Hemanth</div>
                    <div>SERVICE: Dental Checkup</div>
                    <div>PHONE: +91 98765 XXXXX</div>
                    <div>STATUS: Automated Confirmation Sent</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="flex items-center gap-2 p-1.5 rounded-full border border-border/40 bg-neutral-900/60 backdrop-blur-sm">
              <span className="text-[0.65rem] text-muted-foreground pl-3 flex-1 font-mono">
                {step >= CHAT_FLOW.length ? "Connecting to agent..." : "Dialogue in progress..."}
              </span>
              <button className="w-7 h-7 rounded-full bg-neutral-800 flex items-center justify-center text-muted-foreground">
                <Send className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   2. AI AUTOMATION WORKFLOW DEMO (Desktop window - Big size)
   ========================================================================== */
export function AutomationDemo() {
  const [phase, setPhase] = useState(0);
  const [typedComment, setTypedComment] = useState("");
  const [showComment, setShowComment] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [dmStep, setDmStep] = useState(0);

  // Phase controller loop
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (phase === 0) {
      // Phase 0: Reels view & typing
      setTypedComment("");
      setShowComment(false);
      setShowNotification(false);
      setDmStep(0);

      // Start typing 'LINK' after 1s
      timer = setTimeout(() => {
        const chars = "LINK";
        let curr = "";
        let i = 0;
        const typingInterval = setInterval(() => {
          if (i < chars.length) {
            curr += chars[i];
            setTypedComment(curr);
            i++;
          } else {
            clearInterval(typingInterval);
            // Simulate post click
            setTimeout(() => {
              setShowComment(true);
              // Wait 1.5s then move to phase 1 (notification)
              setTimeout(() => {
                setPhase(1);
              }, 1500);
            }, 500);
          }
        }, 300);
      }, 800);
    } else if (phase === 1) {
      // Phase 1: Notification dropdown
      // Show notification after 400ms
      timer = setTimeout(() => {
        setShowNotification(true);
        // Show for 3s then transit to phase 2 (DM)
        setTimeout(() => {
          setPhase(2);
        }, 3000);
      }, 400);
    } else if (phase === 2) {
      // Phase 2: DM Chat connection
      setDmStep(0);
      
      const dmTimers = [
        setTimeout(() => setDmStep(1), 1000), // AI typing
        setTimeout(() => setDmStep(2), 2500), // AI message
        setTimeout(() => setDmStep(3), 4500), // User message
        setTimeout(() => setDmStep(4), 5800), // AI typing
        setTimeout(() => setDmStep(5), 7200), // AI reply
        setTimeout(() => setPhase(0), 11500), // Loop back
      ];

      return () => {
        dmTimers.forEach(t => clearTimeout(t));
      };
    }

    return () => clearTimeout(timer);
  }, [phase]);

  return (
    <div className="relative w-full max-w-[310px] aspect-[9/18.8] select-none mx-auto">
      {/* Outer Case Glow */}
      <div className="absolute -inset-1 rounded-[42px] bg-accent/20 blur-md pointer-events-none" />

      {/* Phone chassis */}
      <div className="relative w-full h-full rounded-[40px] border-[5px] border-neutral-800 bg-neutral-950 overflow-hidden flex flex-col shadow-2xl">
        {/* Dynamic Island */}
        <div className="absolute top-3.5 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-full z-30 flex items-center justify-between px-2.5">
          <div className="w-1.5 h-1.5 rounded-full bg-neutral-800" />
          <div className="w-3.5 h-1 bg-neutral-800 rounded-full" />
        </div>

        {/* Screen Content */}
        <div className="relative flex-1 rounded-[35px] overflow-hidden flex flex-col pt-12 pb-4 bg-black">
          
          {/* Notification Overlay (Phase 1) */}
          <AnimatePresence>
            {showNotification && phase === 1 && (
              <motion.div
                initial={{ y: -60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -60, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="absolute top-12 left-3 right-3 z-50 rounded-2xl border border-neutral-800 bg-neutral-900/95 backdrop-blur-md p-3.5 shadow-2xl flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-yellow-500 via-red-500 to-purple-600 flex items-center justify-center text-white flex-shrink-0">
                  <Instagram className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">Instagram</span>
                    <span className="text-[0.6rem] text-muted-foreground font-mono">now</span>
                  </div>
                  <p className="text-[0.7rem] text-foreground/90 font-medium truncate mt-0.5">
                    <strong className="font-semibold">@automiq</strong> sent you a message: "Here is your link!"
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {/* SCREEN 1: INSTAGRAM REEL (Phase 0 and 1) */}
            {(phase === 0 || phase === 1) && (
              <motion.div
                key="reel"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col justify-between relative"
              >
                {/* Reel header */}
                <div className="px-4 py-1.5 flex items-center justify-between border-b border-neutral-900 bg-neutral-950/40">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-yellow-500 via-red-500 to-purple-600 p-0.5">
                      <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-[0.6rem] font-bold text-accent">A</div>
                    </div>
                    <div>
                      <span className="text-[0.7rem] font-bold text-foreground">automiq.ai</span>
                      <span className="text-[0.55rem] text-muted-foreground block leading-none">Sponsored</span>
                    </div>
                  </div>
                  <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                </div>

                {/* Reel Main Content Video Simulator */}
                <div className="flex-1 bg-gradient-to-b from-neutral-950 via-neutral-900 to-black relative flex flex-col justify-end p-4">
                  {/* Visual animation graphic inside reel */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 opacity-35 pointer-events-none">
                    <div className="w-20 h-20 rounded-full border-2 border-dashed border-accent/40 flex items-center justify-center animate-spin [animation-duration:15s]">
                      <Instagram className="w-10 h-10 text-accent/60" />
                    </div>
                    <span className="text-[0.6rem] font-mono text-accent/60 mt-4 tracking-wider">REEL INTERACTIVE</span>
                  </div>

                  {/* Reel interactive overlay on right */}
                  <div className="absolute right-3 bottom-24 flex flex-col items-center gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-9 h-9 rounded-full bg-neutral-900/50 backdrop-blur-sm flex items-center justify-center text-rose-500">
                        <Heart className="w-4 h-4 fill-current" />
                      </div>
                      <span className="text-[0.55rem] text-neutral-400 mt-1 font-mono">1.2k</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-9 h-9 rounded-full bg-neutral-900/50 backdrop-blur-sm flex items-center justify-center text-foreground">
                        <MessageCircle className="w-4 h-4" />
                      </div>
                      <span className="text-[0.55rem] text-neutral-400 mt-1 font-mono">284</span>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-neutral-900/50 backdrop-blur-sm flex items-center justify-center text-foreground">
                      <Send className="w-4 h-4" />
                    </div>
                    <div className="w-9 h-9 rounded-full bg-neutral-900/50 backdrop-blur-sm flex items-center justify-center text-foreground">
                      <Bookmark className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Reel Caption and User Comments */}
                  <div className="max-w-[80%] space-y-3">
                    <div>
                      <span className="text-[0.7rem] font-bold text-foreground mr-1.5">@automiq</span>
                      <p className="text-[0.68rem] text-neutral-300 leading-normal inline">
                        Want to automate your brand's growth? Comment <span className="text-accent font-bold bg-accent/15 px-1.5 py-0.5 rounded">LINK</span> to get our playbook! 🚀
                      </p>
                    </div>

                    {/* Simulated new comment after typing is complete */}
                    <AnimatePresence>
                      {showComment && (
                        <motion.div
                          initial={{ opacity: 0, x: -10, y: 5 }}
                          animate={{ opacity: 1, x: 0, y: 0 }}
                          className="bg-neutral-900/80 backdrop-blur-sm border border-neutral-800 rounded-xl p-2 flex items-start gap-2 max-w-[90%] shadow-lg"
                        >
                          <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center text-[0.55rem] text-accent font-bold">H</div>
                          <div className="flex-1 min-w-0">
                            <span className="text-[0.6rem] font-bold text-foreground">hemanth</span>
                            <p className="text-[0.62rem] text-accent font-mono leading-tight mt-0.5">LINK</p>
                          </div>
                          <Heart className="w-3 h-3 text-rose-500 fill-current mt-0.5 flex-shrink-0" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Reels Bottom Comment Input Bar */}
                <div className="p-3 border-t border-neutral-900 bg-neutral-950/80 flex items-center gap-2">
                  <div className="flex-1 bg-neutral-900/60 rounded-full px-3.5 py-1.5 flex items-center justify-between border border-neutral-800">
                    <span className="text-[0.65rem] text-neutral-400 font-mono tracking-wide truncate">
                      {typedComment || (
                        <span className="text-neutral-600 italic">Type a comment...</span>
                      )}
                      <span className="animate-pulse font-bold text-accent">|</span>
                    </span>
                    <button className="text-[0.65rem] font-bold text-accent font-mono">Post</button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* SCREEN 2: INSTAGRAM DM VIEW (Phase 2) */}
            {phase === 2 && (
              <motion.div
                key="dm"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.35 }}
                className="flex-1 flex flex-col justify-between"
              >
                {/* DM Chat Header */}
                <div className="px-3.5 py-2.5 border-b border-neutral-900 bg-neutral-950/80 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <ArrowLeft className="w-4 h-4 text-foreground cursor-pointer" onClick={() => setPhase(0)} />
                    <div className="relative">
                      <div className="w-7 h-7 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center font-bold text-accent text-xs">
                        A
                      </div>
                      <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 rounded-full border border-black" />
                    </div>
                    <div>
                      <h6 className="text-[0.7rem] font-bold text-foreground leading-tight">automiq.ai</h6>
                      <span className="text-[0.52rem] font-mono text-muted-foreground">Active now</span>
                    </div>
                  </div>
                </div>

                {/* DM Message Thread Area */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5 flex flex-col justify-start">
                  
                  {/* User message 'LINK' */}
                  {dmStep >= 0 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      className="self-end max-w-[80%]"
                    >
                      <div className="bg-accent text-primary-foreground font-mono text-[0.65rem] px-3.5 py-2.5 rounded-2xl rounded-tr-sm">
                        LINK
                      </div>
                    </motion.div>
                  )}

                  {/* AI Typing... */}
                  {dmStep === 1 && (
                    <div className="self-start flex gap-1 bg-neutral-900 px-3.5 py-2.5 rounded-2xl rounded-tl-sm border border-neutral-800">
                      <span className="w-1 h-1 rounded-full bg-accent animate-bounce" />
                      <span className="w-1 h-1 rounded-full bg-accent animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1 h-1 rounded-full bg-accent animate-bounce [animation-delay:0.4s]" />
                    </div>
                  )}

                  {/* AI Response Card */}
                  {dmStep >= 2 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="self-start max-w-[85%] space-y-2"
                    >
                      {/* AI Chat Bubble */}
                      <div className="bg-neutral-900 text-foreground text-[0.68rem] px-3.5 py-2.5 rounded-2xl rounded-tl-sm border border-neutral-800 leading-relaxed">
                        Hey Hemanth! Thanks for commenting on our Reel. 🚀 Here is your instant access link to our DM playbook!
                      </div>

                      {/* Card Preview */}
                      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden shadow-lg max-w-[220px]">
                        <div className="bg-gradient-to-tr from-accent/30 via-neutral-900 to-neutral-950 p-3 flex items-center justify-between border-b border-neutral-800/60">
                          <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-accent animate-pulse" />
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                        <div className="p-3">
                          <h6 className="text-[0.65rem] font-bold text-foreground truncate">AI Automation Playbook</h6>
                          <p className="text-[0.52rem] text-muted-foreground font-mono leading-normal mt-0.5 uppercase tracking-wider">automiq.ai/playbook</p>
                          <span 
                            className="block text-center mt-3 text-[0.6rem] font-bold py-1.5 px-3 rounded-lg bg-accent text-primary-foreground shadow shadow-accent/20 hover:brightness-105 transition-all"
                          >
                            Open Playbook Link ⚡
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* User message 'Wow, that was fast!' */}
                  {dmStep >= 3 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      className="self-end max-w-[80%]"
                    >
                      <div className="bg-accent text-primary-foreground text-[0.68rem] px-3.5 py-2.5 rounded-2xl rounded-tr-sm">
                        Wow, that was fast!
                      </div>
                    </motion.div>
                  )}

                  {/* AI Typing... */}
                  {dmStep === 4 && (
                    <div className="self-start flex gap-1 bg-neutral-900 px-3.5 py-2.5 rounded-2xl rounded-tl-sm border border-neutral-800">
                      <span className="w-1 h-1 rounded-full bg-accent animate-bounce" />
                      <span className="w-1 h-1 rounded-full bg-accent animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1 h-1 rounded-full bg-accent animate-bounce [animation-delay:0.4s]" />
                    </div>
                  )}

                  {/* AI Response 2 */}
                  {dmStep >= 5 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="self-start max-w-[80%]"
                    >
                      <div className="bg-neutral-900 text-foreground text-[0.68rem] px-3.5 py-2.5 rounded-2xl rounded-tl-sm border border-neutral-800 leading-relaxed">
                        That's the power of AutoMiq AI Automation. We replace the wait! 😉⚡
                      </div>
                    </motion.div>
                  )}

                </div>

                {/* DM Input Bar */}
                <div className="px-4 pb-2 pt-1 border-t border-neutral-900 bg-neutral-950/80">
                  <div className="flex items-center gap-2 p-1.5 rounded-full border border-neutral-800 bg-neutral-900/60 backdrop-blur-sm">
                    <span className="text-[0.55rem] text-muted-foreground pl-3 flex-1 font-mono">
                      {dmStep >= 5 ? "Active connection..." : "Typing..."}
                    </span>
                    <button className="w-6 h-6 rounded-full bg-neutral-800 flex items-center justify-center text-muted-foreground">
                      <Send className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   3. SEO ANALYTICS DEMO (Desktop window - Big size)
   ========================================================================== */
export function SeoDemo() {
  const [boosted, setBoosted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [optimizerLogs, setOptimizerLogs] = useState<string[]>([
    "Scanning domain rank authority...",
    "Done. Competitor audit gap identified."
  ]);

  const keywords = [
    { word: "voice receptionist salon", initRank: 42, targetRank: 1 },
    { word: "ai automation clinic", initRank: 28, targetRank: 2 },
    { word: "custom workflow software", initRank: 56, targetRank: 3 }
  ];

  const handleBoost = () => {
    if (boosted) return;
    setBoosted(true);
    let start = 0;
    const interval = setInterval(() => {
      start += 2;
      setProgress(start);
      if (start >= 100) clearInterval(interval);
    }, 30);
  };

  useEffect(() => {
    if (boosted && progress > 0) {
      const logs = [
        "Analyzing search volume trends...",
        "Identifying content gap recommendations...",
        "Optimized blog article 'Salon Scheduling' with 4 key terms...",
        "Sent indexing request to Google Webmaster API...",
        "Re-indexing completed. Rank boosted successfully!"
      ];
      const idx = Math.floor((progress / 100) * logs.length);
      if (idx < logs.length && optimizerLogs.length <= idx + 2) {
        setOptimizerLogs((prev) => [...prev, logs[idx]]);
      }
    }
  }, [progress, boosted]);

  useEffect(() => {
    if (progress === 100) {
      const reset = setTimeout(() => {
        setBoosted(false);
        setProgress(0);
        setOptimizerLogs([
          "Scanning domain rank authority...",
          "Done. Competitor audit gap identified."
        ]);
      }, 7000);
      return () => clearTimeout(reset);
    }
  }, [progress]);

  // Generate SVG path points
  const generatePath = () => {
    const points = [
      [10, 80],
      [60, 72],
      [110, 68],
      [160, boosted ? 68 - progress * 0.32 : 68],
      [210, boosted ? 60 - progress * 0.42 : 60],
      [265, boosted ? 52 - progress * 0.45 : 52],
      [315, boosted ? 40 - progress * 0.35 : 44],
      [360, boosted ? 28 - progress * 0.22 : 36]
    ];
    return `M ${points.map(p => p.join(",")).join(" L ")}`;
  };

  return (
    <BrowserWrapper url="console.automiq.ai/seo/domain-rank-hub">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/40 pb-3 mb-4">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-foreground leading-normal">Aura Dental Clinic SEO Tracker</span>
          <span className="text-[0.55rem] font-mono text-muted-foreground uppercase mt-0.5">Organic Search Engine</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[0.6rem] font-mono text-emerald-400 bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-500/20">
            INDEXED
          </span>
        </div>
      </div>

      {/* Grid: Keyword list & Traffic graph */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Keywords */}
        <div className="space-y-1.5 border border-border/20 rounded-xl p-3 bg-black/20">
          <div className="grid grid-cols-12 text-[0.52rem] font-mono text-muted-foreground tracking-wider uppercase pb-1 border-b border-border/20">
            <div className="col-span-8">Keyword</div>
            <div className="col-span-2 text-right">Start</div>
            <div className="col-span-2 text-right text-accent font-bold">Now</div>
          </div>
          {keywords.map((k, i) => {
            const currentRank = boosted 
              ? Math.max(k.targetRank, Math.round(k.initRank - (progress / 100) * (k.initRank - k.targetRank)))
              : k.initRank;

            return (
              <div key={i} className="grid grid-cols-12 items-center text-[0.65rem] font-mono py-0.5">
                <div className="col-span-8 text-foreground/80 truncate pr-1">{k.word}</div>
                <div className="col-span-2 text-right text-muted-foreground">#{k.initRank}</div>
                <div className={`col-span-2 text-right font-bold transition-all duration-300 ${boosted ? "text-emerald-400" : "text-accent"}`}>
                  #{currentRank}
                </div>
              </div>
            );
          })}
        </div>

        {/* Live chart */}
        <div className="relative h-28 border border-border/20 rounded-xl bg-black/40 p-2 flex flex-col justify-between">
          <div className="text-[0.52rem] font-mono text-muted-foreground uppercase flex items-center gap-1 leading-none">
            <Activity className="w-3 h-3 text-accent" /> Organic Monthly Hits
          </div>
          <div className="absolute top-2.5 right-2 text-[0.65rem] font-bold font-mono text-foreground">
            {boosted ? Math.round(2400 + progress * 215.2) : 2400} HITS
          </div>

          <svg className="w-full h-full pt-4" viewBox="0 0 380 90">
            <line x1="0" y1="45" x2="380" y2="45" stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" />
            <line x1="0" y1="70" x2="380" y2="70" stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" />
            <motion.path
              d={generatePath()}
              fill="none"
              stroke="oklch(0.72 0.16 140)"
              strokeWidth="2.5"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
            />
            <circle cx="360" cy={boosted ? 28 - progress * 0.22 : 36} r="4.5" className="fill-emerald-400 stroke-black stroke-2" />
          </svg>
        </div>
      </div>

      {/* Optimizer Log Console */}
      <div className="mt-4 border border-border/25 rounded-xl bg-black/60 p-3 h-28 font-mono text-[0.58rem] leading-relaxed flex flex-col justify-between overflow-hidden">
        <div className="overflow-y-auto space-y-1.5 flex-1 pr-1.5 scrollbar-thin">
          {optimizerLogs.map((log, i) => (
            <div key={i} className="flex gap-1.5 text-foreground/90">
              <span className="text-accent">&gt;</span>
              <span>{log}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Boost Button */}
      <button
        onClick={handleBoost}
        className={`w-full py-2.5 mt-4 rounded-xl font-mono text-xs tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all border ${
          boosted
            ? "bg-emerald-950/20 border-emerald-500/35 text-emerald-400"
            : "bg-accent text-primary-foreground border-accent hover:opacity-90 active:scale-95"
        }`}
      >
        <Sparkles className="w-4 h-4" />
        {boosted ? `RUNNING COMPETITOR SEO AUDIT BOOST (${progress}%)` : "TRIGGER GOOGLE RANK BOOST"}
      </button>
    </BrowserWrapper>
  );
}

/* ==========================================================================
   4. SAAS CUSTOM DASHBOARD DEMO (Desktop window - Big size)
   ========================================================================== */
export function SaasDemo() {
  const [percentage, setPercentage] = useState(0);
  const [running, setRunning] = useState(false);
  const [telemetry, setTelemetry] = useState<string[]>([
    "Initial telemetry boot...",
    "Done. CRM state healthy."
  ]);

  const handleRun = () => {
    if (running) return;
    setRunning(true);
    setTelemetry([]);
    setPercentage(0);

    let pct = 0;
    const interval = setInterval(() => {
      pct += 5;
      setPercentage(pct);
      if (pct >= 100) {
        clearInterval(interval);
      }
    }, 80);
  };

  useEffect(() => {
    if (running && percentage > 0) {
      const logs = [
        "Verifying AI Voice SDR API response latency...",
        "Response parsed: 18ms. Handoff connection clear.",
        "Testing Webhook routing channels...",
        "Webhooks check successful: 100% messages delivered.",
        "Synchronizing local DB state to Zoho/HubSpot CRM...",
        "CRM Sync completed. All tables fully operational."
      ];
      const idx = Math.floor((percentage / 100) * logs.length);
      if (idx < logs.length && telemetry.length <= idx) {
        setTelemetry(logs.slice(0, idx + 1));
      }
    }
  }, [percentage, running]);

  useEffect(() => {
    if (percentage === 100) {
      const reset = setTimeout(() => {
        setRunning(false);
        setPercentage(0);
        setTelemetry([
          "Initial telemetry boot...",
          "Done. CRM state healthy."
        ]);
      }, 7000);
      return () => clearTimeout(reset);
    }
  }, [percentage]);

  return (
    <BrowserWrapper url="console.automiq.ai/saas/clinic-crm-telemetry">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/40 pb-3.5 mb-4">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-foreground leading-normal">AutoMiq CRM & Telemetry OS</span>
          <span className="text-[0.55rem] font-mono text-muted-foreground uppercase mt-0.5">SaaS Custom Portal</span>
        </div>
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="border border-border/20 rounded-xl p-2.5 bg-black/20 text-center">
          <span className="text-[0.55rem] font-mono text-muted-foreground uppercase block">Staff Saved</span>
          <h5 className="text-base font-bold text-accent mt-0.5">142 hrs</h5>
        </div>
        <div className="border border-border/20 rounded-xl p-2.5 bg-black/20 text-center">
          <span className="text-[0.55rem] font-mono text-muted-foreground uppercase block">AI Bookings</span>
          <h5 className="text-base font-bold text-emerald-400 mt-0.5">384</h5>
        </div>
        <div className="border border-border/20 rounded-xl p-2.5 bg-black/20 text-center">
          <span className="text-[0.55rem] font-mono text-muted-foreground uppercase block">API Response</span>
          <h5 className="text-base font-bold text-foreground mt-0.5">18ms</h5>
        </div>
      </div>

      {/* Activity Logs Console */}
      <div className="border border-border/25 rounded-xl bg-black/60 p-3 h-28 font-mono text-[0.58rem] leading-relaxed flex flex-col justify-between overflow-hidden">
        <div className="overflow-y-auto space-y-1.5 flex-1 pr-1.5 scrollbar-thin">
          {telemetry.map((line, i) => (
            <div key={i} className="flex gap-1.5 text-foreground/90">
              <span className="text-accent">&gt;</span>
              <span>{line}</span>
            </div>
          ))}
        </div>

        {/* Progress Bar inside console */}
        {running && (
          <div className="mt-2 flex items-center gap-3 pt-2 border-t border-border/20">
            <div className="flex-1 h-1.5 bg-neutral-900 rounded-full overflow-hidden">
              <motion.div className="h-full bg-accent" style={{ width: `${percentage}%` }} />
            </div>
            <span className="text-[0.6rem] font-bold text-accent min-w-[24px] text-right">{percentage}%</span>
          </div>
        )}
      </div>

      {/* Button */}
      <button
        onClick={handleRun}
        className={`w-full py-2.5 mt-4 rounded-xl font-mono text-xs tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all border ${
          running
            ? "bg-neutral-900 border-border text-muted-foreground cursor-not-allowed"
            : "bg-accent text-primary-foreground border-accent hover:opacity-90 active:scale-95"
        }`}
        disabled={running}
      >
        {running ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
            <span>DIAGNOSTIC TEST RUNNING...</span>
          </>
        ) : (
          <>
            <Play className="w-4 h-4 fill-primary-foreground" />
            <span>RUN REAL-TIME DIAGNOSTIC SYNC</span>
          </>
        )}
      </button>
    </BrowserWrapper>
  );
}
