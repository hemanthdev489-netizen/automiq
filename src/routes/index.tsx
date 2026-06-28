import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, useInView, useMotionValueEvent } from "motion/react";
import { VoiceBotWidget } from "../components/voice-bot-widget";
import { PhoneCallDemo } from "../components/phone-call-demo";
import { ChatAgentDemo, SeoDemo, SaasDemo, AutomationDemo } from "../components/service-demos";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AUTOMIQ — AI Workforce Studio" },
      { name: "description", content: "Voice agents, chat agents, SEO automation and custom SaaS. We don't automate tasks — we replace the wait." },
      { property: "og:title", content: "AUTOMIQ — AI Workforce Studio" },
      { property: "og:description", content: "Built to work. Not to wait. Voice · Chat · SEO · SaaS." },
    ],
  }),
  component: Index,
});

/* ------------------------- helpers ------------------------- */

function FadeUp({
  children,
  delay = 0,
  className = "",
  y = 40,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  y?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.9, delay, ease: [0.22, 0.7, 0.2, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* Slot-machine style counter (each digit scrolls vertically) */
function SlotDigit({ value, delay = 0 }: { value: string; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const isDigit = /\d/.test(value);
  if (!isDigit) {
    return (
      <span ref={ref} className="inline-block">
        {value}
      </span>
    );
  }
  const target = parseInt(value, 10);
  return (
    <span
      ref={ref}
      className="inline-block overflow-hidden align-baseline"
      style={{ height: "1em", lineHeight: 1 }}
    >
      <motion.span
        className="inline-flex flex-col"
        initial={{ y: 0 }}
        animate={inView ? { y: `-${target}em` } : { y: 0 }}
        transition={{ duration: 2.2, delay, ease: [0.16, 1, 0.3, 1] }}
      >
        {Array.from({ length: 10 }).map((_, i) => (
          <span key={i} style={{ height: "1em", lineHeight: 1 }}>
            {i}
          </span>
        ))}
      </motion.span>
    </span>
  );
}

function SlotNumber({ value, className = "" }: { value: string; className?: string }) {
  return (
    <span className={className}>
      {value.split("").map((c, i) => (
        <SlotDigit key={i} value={c} delay={i * 0.06} />
      ))}
    </span>
  );
}

/* Marquee row */
function Marquee({
  items,
  reverse = false,
  slow = false,
  className = "",
}: {
  items: React.ReactNode[];
  reverse?: boolean;
  slow?: boolean;
  className?: string;
}) {
  const loop = [...items, ...items];
  return (
    <div className={`overflow-hidden ${className}`}>
      <div className={`marquee ${slow ? "marquee-slow" : ""} ${reverse ? "marquee-reverse" : ""}`}>
        {loop.map((it, i) => (
          <div key={i} className="flex items-center gap-10 pr-10">
            {it}
          </div>
        ))}
      </div>
    </div>
  );
}

/* Word-by-word reveal for big headings */
function WordsReveal({ text, className = "" }: { text: string; className?: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const words = text.split(" ");
  return (
    <h2 ref={ref} className={className}>
      {words.map((w, i) => (
        <span key={i} className="inline-block overflow-hidden align-baseline mr-[0.25em]">
          <motion.span
            className="inline-block"
            initial={{ y: "110%" }}
            animate={inView ? { y: 0 } : {}}
            transition={{ duration: 0.9, delay: 0.05 + i * 0.06, ease: [0.22, 0.7, 0.2, 1] }}
          >
            {w}
          </motion.span>
        </span>
      ))}
    </h2>
  );
}

/* ------------------------- page ------------------------- */

/* Service type used by AutoMiqOS + ServiceScene */
type Service = {
  n: string;
  title: string;
  headline: string[];
  body: string[];
  cases: string[];
  closing: string;
  hue: number;
};

/* The AutoMiq Operating System — central AI CORE with five expandable nodes */
function AutoMiqOS({ services }: { services: Service[] }) {
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const current = services[active];

  return (
    <div ref={ref} className="relative rounded-3xl border border-border bg-card/40 overflow-hidden">
      <div className="absolute inset-0 grid-lines opacity-30 pointer-events-none" />
      <motion.div
        key={current.hue}
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ duration: 1.2 }}
        style={{
          background: `radial-gradient(60% 50% at 50% 50%, oklch(0.55 0.18 ${current.hue} / 0.35), transparent 70%)`,
        }}
      />

      <div className="relative grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-0">
        {/* Diagram */}
        <div className="relative aspect-square lg:aspect-auto lg:h-[640px] p-6">
          <svg viewBox="0 0 400 400" className="absolute inset-0 w-full h-full">
            {services.map((s, i) => {
              const angle = (i / services.length) * Math.PI * 2 - Math.PI / 2;
              const x = 200 + Math.cos(angle) * 150;
              const y = 200 + Math.sin(angle) * 150;
              const isActive = i === active;
              return (
                <motion.line
                  key={s.n}
                  x1={200}
                  y1={200}
                  x2={x}
                  y2={y}
                  stroke={isActive ? `oklch(0.72 0.16 ${s.hue})` : "oklch(0.4 0.01 60 / 0.6)"}
                  strokeWidth={isActive ? 1.5 : 0.75}
                  strokeDasharray="3 4"
                  initial={{ pathLength: 0 }}
                  animate={inView ? { pathLength: 1 } : {}}
                  transition={{ duration: 1.4, delay: 0.2 + i * 0.1, ease: [0.22, 0.7, 0.2, 1] }}
                />
              );
            })}
            <motion.circle
              cx={200}
              cy={200}
              r={140}
              fill="none"
              stroke="oklch(0.35 0.006 60)"
              strokeDasharray="2 6"
              initial={{ rotate: 0 }}
              animate={{ rotate: 360 }}
              transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
              style={{ transformOrigin: "200px 200px" }}
            />
          </svg>

          {/* CORE */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={inView ? { scale: 1, opacity: 1 } : {}}
            transition={{ duration: 1, ease: [0.22, 0.7, 0.2, 1] }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            <div className="relative flex flex-col items-center justify-center h-32 w-32 rounded-full border border-border bg-background/80 backdrop-blur">
              <motion.div
                className="absolute inset-0 rounded-full"
                animate={{ boxShadow: [
                  `0 0 0 0 oklch(0.72 0.16 ${current.hue} / 0.4)`,
                  `0 0 0 24px oklch(0.72 0.16 ${current.hue} / 0)`,
                ] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
              />
              <div className="font-mono text-[0.6rem] tracking-[0.3em] text-muted-foreground">AI CORE</div>
              <div className="font-display italic text-2xl mt-1">AUTOMIQ</div>
            </div>
          </motion.div>

          {/* Nodes */}
          {services.map((s, i) => {
            const angle = (i / services.length) * Math.PI * 2 - Math.PI / 2;
            const isActive = i === active;
            return (
              <motion.button
                key={s.n}
                onClick={() => setActive(i)}
                onMouseEnter={() => setActive(i)}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={inView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.6, delay: 0.4 + i * 0.1, ease: [0.22, 0.7, 0.2, 1] }}
                className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                style={{
                  left: `${50 + Math.cos(angle) * 37.5}%`,
                  top: `${50 + Math.sin(angle) * 37.5}%`,
                }}
              >
                <div
                  className={`relative flex items-center justify-center h-20 w-20 rounded-full border backdrop-blur transition-all ${
                    isActive ? "border-foreground bg-foreground text-primary-foreground scale-110" : "border-border bg-card/80 text-foreground hover:scale-105"
                  }`}
                  style={isActive ? { boxShadow: `0 0 40px oklch(0.72 0.16 ${s.hue} / 0.6)` } : undefined}
                >
                  <div className="text-center px-2">
                    <div className="font-mono text-[0.55rem] tracking-widest opacity-70">{s.n}</div>
                    <div className="font-mono text-[0.62rem] tracking-wider leading-tight mt-0.5">
                      {s.title.toUpperCase()}
                    </div>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Active node detail */}
        <div className="relative border-t lg:border-t-0 lg:border-l border-border p-8 sm:p-12 flex flex-col justify-center min-h-[400px]">
          <motion.div
            key={current.n}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 0.7, 0.2, 1] }}
          >
            <div className="eyebrow">— Node {current.n}</div>
            <h4 className="display-hero text-4xl md:text-5xl mt-4">{current.title}</h4>
            <p className="mt-4 text-muted-foreground leading-relaxed max-w-md">
              {current.body[0]}
            </p>
            <div className="mt-8 font-mono text-[0.65rem] tracking-widest text-muted-foreground">
              Capabilities
            </div>
            <ul className="mt-3 space-y-2">
              {current.cases.slice(0, 4).map((c, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 + i * 0.06 }}
                  className="flex items-start gap-3 text-sm"
                >
                  <span className="text-accent mt-1">→</span>
                  <span className="text-foreground/90">{c.split("—")[0].trim()}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

/* Full-attention service scene — one service, one screen */
function ServiceScene({ service, index }: { service: Service; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["-20%", "20%"]);
  const numberX = useTransform(scrollYProgress, [0, 1], ["-30%", "30%"]);
  const reverse = index % 2 === 1;

  return (
    <div
      ref={ref}
      className="relative min-h-screen flex items-center px-6 sm:px-10 py-32 border-t border-border overflow-hidden"
    >
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          y: bgY,
          background: `radial-gradient(60% 60% at ${reverse ? "80%" : "20%"} 30%, oklch(0.45 0.18 ${service.hue} / 0.25), transparent 70%)`,
        }}
      />
      <div className="absolute inset-0 grid-lines opacity-20 pointer-events-none" />

      {/* Giant ghost number scroll */}
      <motion.div
        style={{ x: numberX }}
        className="absolute -bottom-10 left-0 right-0 font-display italic text-[40vw] leading-none text-foreground/[0.04] select-none pointer-events-none whitespace-nowrap"
      >
        {service.n}
      </motion.div>

      <div className="relative max-w-7xl mx-auto w-full grid grid-cols-12 gap-6">
        <div className={`col-span-12 lg:col-span-7 ${reverse ? "lg:col-start-6" : ""}`}>
          <FadeUp>
            <div className="eyebrow">Service {service.n} — {service.title}</div>
          </FadeUp>

          <WordsReveal
            text={service.headline.join(" ")}
            className="display-hero text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] mt-6"
          />

          <div className="mt-10 space-y-5 max-w-2xl text-muted-foreground leading-relaxed text-base sm:text-lg">
            {service.body.map((p, i) => (
              <FadeUp key={i} delay={0.1 + i * 0.08}>
                <p>{p}</p>
              </FadeUp>
            ))}
          </div>
        </div>

        {/* Render demo visualizers based on service title and orientation */}
        {reverse && (
          <div className="col-span-12 lg:col-span-5 flex items-center justify-center mt-12 lg:mt-0 lg:col-start-1 lg:row-start-1">
            <FadeUp delay={0.25}>
              {service.title === "AI Automation" && <AutomationDemo />}
              {service.title === "SEO" && <SeoDemo />}
            </FadeUp>
          </div>
        )}

        {!reverse && (
          <div className="col-span-12 lg:col-span-5 flex items-center justify-center mt-12 lg:mt-0 lg:col-start-8">
            <FadeUp delay={0.25}>
              {service.title === "Voice Agents" && <PhoneCallDemo />}
              {service.title === "Chat Agents" && <ChatAgentDemo />}
              {service.title === "SaaS Products" && <SaasDemo />}
            </FadeUp>
          </div>
        )}

        <div className={`col-span-12 lg:col-span-10 lg:col-start-2 mt-16`}>
          <FadeUp>
            <div className="font-mono text-[0.65rem] tracking-[0.3em] text-accent mb-6">
              ✦ Real scenes from real businesses
            </div>
          </FadeUp>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {service.cases.map((c, i) => {
              const isLastOdd = i === service.cases.length - 1 && service.cases.length % 2 !== 0;
              return (
                <FadeUp 
                  key={i} 
                  delay={i * 0.08} 
                  y={24}
                  className={isLastOdd ? "md:col-span-2" : ""}
                >
                  <div className="group relative h-full rounded-2xl border border-border bg-card/50 backdrop-blur p-6 hover:bg-card/90 transition-colors">
                    <div
                      className="absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                      style={{
                        background: `linear-gradient(135deg, oklch(0.72 0.16 ${service.hue} / 0.25), transparent 60%)`,
                      }}
                    />
                    <div className="relative flex items-start gap-4">
                      <div className="font-mono text-[0.65rem] tracking-widest text-accent mt-1">
                        0{i + 1}
                      </div>
                      <p className="text-sm sm:text-base leading-relaxed text-foreground/90">
                        <span className="text-accent">→ </span>
                        {c.includes(": ") ? (
                          <>
                            <strong className="text-foreground font-semibold">{c.split(": ")[0]}:</strong>{" "}
                            {c.split(": ").slice(1).join(": ")}
                          </>
                        ) : (
                          c
                        )}
                      </p>
                    </div>
                  </div>
                </FadeUp>
              );
            })}
          </div>
        </div>

        <FadeUp delay={0.2} className="col-span-12 lg:col-span-8 lg:col-start-3 mt-16 text-center">
          <div className="font-display italic text-2xl sm:text-3xl md:text-4xl leading-snug text-foreground/90">
            &ldquo;{service.closing}&rdquo;
          </div>
        </FadeUp>
      </div>
    </div>
  );
}

function Index() {
  // Hero scroll-driven motion
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.94]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.2]);

  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });

  const { scrollYProgress: pageProgress } = useScroll();
  const [progress, setProgress] = useState(0);
  useMotionValueEvent(pageProgress, "change", (v) => setProgress(v));

  const services = [
    {
      n: "01",
      title: "Voice Agents",
      headline: ["Your business,", "answering its own phone."],
      body: [
        "Every missed call is a lost customer somewhere else. Voice agents pick up instantly, every time — no hold music, no \"call back during business hours.\" They sound natural, understand context, and actually get things done on the call, not just collect a message.",
        "This isn't IVR. It's not \"press 1 for sales.\" It's a real conversation — the agent listens, responds, books, confirms, and follows up, the same way your best front-desk person would, except it never takes a day off.",
      ],
      cases: [
        "A clinic's AI receptionist answers 200+ calls a day, books appointments directly into the doctor's calendar, and sends WhatsApp confirmations — zero missed bookings, even at midnight.",
        "A real estate agency's voice agent calls every inbound lead within 60 seconds of form submission, qualifies budget and location, and only forwards hot leads to the sales team.",
        "A restaurant's voice agent takes reservations and large-order calls during peak hours when every human line is busy — no lost tables, no lost orders.",
        "An insurance agency runs outbound renewal calls at scale — the agent reminds, answers FAQs, and books the human agent only for closing.",
      ],
      closing: "If your phone rings and nobody answers — that's revenue walking away. We make sure it never rings unanswered again.",
      hue: 30,
    },
    {
      n: "02",
      title: "AI Automation",
      headline: ["The work happens.", "Nobody has to do it."],
      body: [
        "Most businesses lose hours every day to work that isn't hard — it's just repetitive. Data entry, follow-ups, invoice matching, report generation, status updates. AI automation takes that entire loop — read, decide, act, log — and runs it in the background, continuously, without anyone clicking a button.",
        "This isn't \"set a reminder\" automation. These are agents that watch your systems, make real decisions inside defined rules, execute the task, and leave a full trail of what they did and why — so you trust it like an employee, not a black box.",
      ],
      cases: [
        "A logistics company's automation agent reads delivery confirmations from WhatsApp photos, updates inventory, and flags mismatches — work that used to take a full-time data entry person, now done in seconds.",
        "Social Media Automation: An AI agent generates social media captions, schedules posts automatically, and responds to common comments and DMs — helping brands stay active every day without manually managing every interaction.",
        "An e-commerce brand's agent watches every order, auto-generates invoices, updates stock, and emails suppliers when inventory hits a threshold — fully hands-off restocking.",
        "A finance team's agent reconciles bank statements against invoices daily, flags anomalies before month-end, and prepares the GST filing draft automatically.",
        "An HR team's agent screens every incoming resume, ranks candidates, and schedules first-round interviews automatically — only the shortlist reaches a human inbox.",
      ],
      closing: "You don't need a bigger team. You need the boring 70% of the work to disappear — so your real team only does the 30% that needs them.",
      hue: 200,
    },
    {
      n: "03",
      title: "Chat Agents",
      headline: ["Not a chatbot.", "A teammate that never logs off."],
      body: [
        "Chatbots answer FAQs and lose the thread the moment a real question shows up. Our chat agents are different — they remember the full conversation, understand intent the way a person would, and actually resolve things: checking an order, applying a discount, rebooking a slot, escalating only when a human's judgment genuinely matters.",
        "It feels like messaging a sharp, fast teammate — not filling out a form disguised as a chat window.",
      ],
      cases: [
        "A D2C brand's WhatsApp agent handles order tracking, return requests, and product recommendations in the same chat — and closes upsells a static FAQ bot never could.",
        "A coaching/ed-tech business's Instagram DM agent answers course questions, shares pricing, and books a counseling call — converting leads while the founder is asleep.",
        "A SaaS company's website agent doesn't just answer \"how do I reset my password\" — it walks the user through it live, inside the chat, step by step.",
        "A real estate brand's chat agent qualifies a buyer's budget and location preference within the first 3 messages, then shares matching listings instantly — no waiting for a callback.",
      ],
      closing: "Customers don't want to \"submit a query.\" They want an answer right now. Our chat agents give them one — and turn that moment into a sale.",
      hue: 280,
    },
    {
      n: "04",
      title: "SEO",
      headline: ["Ranking isn't a report.", "It's a system that runs daily."],
      body: [
        "Traditional SEO agencies hand you a PDF once a month. Our AI-driven SEO runs every day — tracking rankings, researching what's actually working for competitors, generating and optimizing content, and adjusting strategy in real time. You don't wait for \"next month's report\" to see what's wrong. You see it fixed before it becomes a problem.",
      ],
      cases: [
        "A local business's AI SEO agent monitors Google Business rankings daily, auto-responds to reviews, and updates listings the moment competitors change theirs — staying #1 in local search continuously.",
        "A content-heavy site's agent identifies which blog posts are losing rank, rewrites and re-optimizes them automatically, and republishes — recovering traffic without a writer touching it.",
        "An e-commerce store's agent generates SEO-optimized product descriptions for hundreds of listings in the time a human would write five.",
        "A growing brand's agent finds backlink opportunities, drafts outreach emails, and tracks which ones convert — running an entire outreach campaign on autopilot.",
      ],
      closing: "SEO isn't a task you finish. It's a system you run. We build the system, not just the strategy document.",
      hue: 140,
    },
    {
      n: "05",
      title: "SaaS Products",
      headline: ["Software built around", "how you actually work."],
      body: [
        "Off-the-shelf software makes you adapt to it. We build SaaS the other way — custom AI-powered tools designed around your exact workflow, your data, your team's habits. Whether it's an internal tool for your own operations or a product you want to sell to your own customers, we take it from idea to a real, working product people actually use.",
      ],
      cases: [
        "A clinic chain gets a custom patient-management SaaS with AI-powered appointment prediction, automated reminders, and a no-show risk score — built specifically around how their front desk actually runs.",
        "A founder with an idea but no tech team gets a full AI-powered MVP built and launched in weeks — from concept to a product they can demo to investors or first customers.",
        "A logistics business gets an internal AI dashboard that predicts delivery delays before they happen, instead of a generic tracking tool that just shows status.",
        "A retail chain gets a custom inventory + demand-forecasting SaaS tool that learns their specific sales patterns — something no generic inventory software could do out of the box.",
      ],
      closing: "You're not stuck choosing between \"buy generic software\" or \"hire a full dev team.\" We build exactly what your business needs — nothing bloated, nothing missing.",
      hue: 330,
    },
  ];

  const ledger = [
    ["Receptionist", "Voice Agent"],
    ["Telecaller", "Chat & Voice SDR"],
    ["SEO Manager", "AI Growth Engine"],
    ["Support Rep", "Resolution Agent"],
    ["Ops Team", "Custom SaaS Tool"],
  ];

  const stats = [
    { num: "40", suffix: "+", label: "AI agents and tools deployed across client businesses" },
    { num: "120", suffix: "k+", label: "Hours of manual work automated to date" },
    { num: "90", suffix: "%", label: "Clients who come back for a second product" },
    { num: "7", suffix: " days", label: "Average time from kickoff to first live agent" },
  ];

  const process = [
    ["01", "Discovery call", "we map exactly where your team is losing hours."],
    ["02", "Build", "we design and ship the agent or product around that gap."],
    ["03", "Launch", "live in days, not months — fully tested on real conversations."],
    ["04", "Grow", "we tune, retrain, and scale it as your business grows."],
  ];

  return (
    <div className="noise relative min-h-screen bg-background text-foreground overflow-x-hidden">
      <div className="fixed top-0 left-0 right-0 h-px bg-border z-50">
        <div className="h-full bg-foreground origin-left" style={{ transform: `scaleX(${progress})` }} />
      </div>

      {/* NAV */}
      <nav className="fixed top-4 left-0 right-0 z-40 px-4 sm:px-8 flex items-center justify-between">
        <a href="#top" className="flex items-center gap-2 group">
          <svg viewBox="0 0 32 32" className="h-7 w-7 text-foreground transition-transform group-hover:rotate-12">
            <path fill="currentColor" d="M16 2l12 7v14l-12 7L4 23V9l12-7zm0 4.6L8 11v10l8 4.6 8-4.6V11l-8-4.4z" />
          </svg>
          <span className="font-mono text-sm tracking-widest">AUTOMIQ<sup className="text-[0.5rem]">.</sup></span>
        </a>
        <div className="hidden md:flex items-center gap-6 font-mono text-xs tracking-widest text-muted-foreground">
          <a href="#work" className="underline-grow">Work</a>
          <a href="#services" className="underline-grow">Services</a>
          <a href="#about" className="underline-grow">About</a>
          <a href="#contact" className="underline-grow">Contact</a>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <a href="#contact" className="pill pill-solid">Start a Project</a>
        </div>
      </nav>

      {/* HERO */}
      <section
        id="top"
        ref={heroRef}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setMouse({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height });
        }}
        className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-32 pb-20"
      >
        <div className="absolute inset-0 grid-lines opacity-40 pointer-events-none" />
        <div
          className="ember-glow absolute h-[600px] w-[600px] pointer-events-none transition-transform duration-700"
          style={{ left: `calc(${mouse.x * 100}% - 300px)`, top: `calc(${mouse.y * 100}% - 300px)` }}
        />

        <div className="absolute top-24 left-0 right-0 opacity-70">
          <Marquee
            slow
            items={["AI WORKFORCE STUDIO", "·", "VOICE", "·", "CHAT", "·", "SEO", "·", "SAAS", "·"].map((t, i) => (
              <span key={i} className="font-mono text-xs tracking-[0.4em] text-muted-foreground">{t}</span>
            ))}
          />
        </div>

        <motion.div
          style={{ y: heroY, scale: heroScale, opacity: heroOpacity }}
          className="relative z-10 text-center max-w-6xl mx-auto"
        >
          <FadeUp delay={0.1}>
            <div className="eyebrow mb-6">— AI Workforce Studio · Voice · Chat · SEO · SaaS</div>
          </FadeUp>

          <h1 className="display-hero text-[16vw] sm:text-[12vw] md:text-[10vw] lg:text-[8rem] xl:text-[10rem]">
            <span className="block overflow-hidden">
              <motion.span
                initial={{ y: "110%" }}
                animate={{ y: 0 }}
                transition={{ duration: 1.1, ease: [0.22, 0.7, 0.2, 1], delay: 0.2 }}
                className="inline-block"
              >
                Built to work.
              </motion.span>
            </span>
            <span className="block overflow-hidden">
              <motion.span
                initial={{ y: "110%" }}
                animate={{ y: 0 }}
                transition={{ duration: 1.1, ease: [0.22, 0.7, 0.2, 1], delay: 0.35 }}
                className="inline-block"
              >
                Not to <span className="font-display italic font-normal text-accent">wait.</span>
              </motion.span>
            </span>
          </h1>

          <FadeUp delay={0.8} className="mt-10">
            <p className="max-w-2xl mx-auto text-muted-foreground text-base sm:text-lg leading-relaxed">
              Voice agents that answer every call. Chat agents that close instead of just reply.
              SEO that compounds while you sleep. SaaS tools built around how your business actually runs.
            </p>
          </FadeUp>

          <FadeUp delay={1} className="mt-10">
            <a href="#contact" className="pill pill-solid text-sm">✦ Start a Project →</a>
          </FadeUp>
        </motion.div>

        <div className="absolute bottom-10 left-0 right-0 px-8 flex items-end justify-between font-mono text-xs tracking-widest text-muted-foreground">
          <div>
            <div className="text-foreground">AUTOMIQ AI STUDIO</div>
            <div className="mt-1">VOICE · CHAT · SEO · SAAS</div>
          </div>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="hidden sm:block"
          >
            SCROLL TO SEE WHAT WE BUILD ↓
          </motion.div>
          <div className="text-right max-w-xs hidden sm:block">
            We don't automate tasks.<br />We replace the wait.
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="relative px-6 sm:px-10 py-32 sm:py-48 max-w-7xl mx-auto">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 md:col-span-2">
            <div className="eyebrow sticky top-32">— Who we are</div>
          </div>
          <div className="col-span-12 md:col-span-10">
            <WordsReveal
              text="We're an AI studio building the workforce small and growing businesses couldn't afford yesterday — and can't afford to skip today."
              className="display-hero text-3xl sm:text-5xl md:text-6xl lg:text-7xl"
            />
            <div className="mt-16 h-px bg-border" />
            <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-10">
              <FadeUp>
                <div className="font-mono text-xs tracking-widest leading-loose">
                  NO BLOATED SOFTWARE.<br />
                  NO &quot;AI CHATBOT&quot; GIMMICKS.<br />
                  JUST AGENTS THAT WORK.
                </div>
              </FadeUp>
              <FadeUp delay={0.15}>
                <p className="text-muted-foreground max-w-md">
                  Just agents that pick up the phone, close the chat, rank the page, and run the backend — so your team only handles what actually needs a human.
                </p>
                <a href="#services" className="mt-6 inline-flex items-center gap-3 font-mono text-xs tracking-widest underline-grow">
                  SEE WHAT WE BUILD <span>→</span>
                </a>
              </FadeUp>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="relative px-6 sm:px-10 py-32 max-w-7xl mx-auto">
        <FadeUp>
          <div className="eyebrow">✦ The system</div>
          <h3 className="display-hero text-4xl sm:text-6xl md:text-7xl mt-4">
            The AUTOMIQ <span className="font-display italic font-normal text-accent">Operating System.</span>
          </h3>
          <p className="mt-6 max-w-xl text-muted-foreground">
            One AI core. Five departments wired into your business — voice, automation, conversations, growth, and custom software.
          </p>
        </FadeUp>

        <div className="mt-20">
          <AutoMiqOS services={services} />
        </div>
      </section>

      {/* SERVICE SCENES */}
      <section id="work" className="relative">
        {services.map((s, i) => (
          <ServiceScene key={s.n} service={s} index={i} />
        ))}
      </section>

      {/* THE LEDGER */}
      <section className="relative px-6 sm:px-10 py-32 max-w-7xl mx-auto">
        <FadeUp>
          <div className="eyebrow">— The Ledger</div>
          <h3 className="display-hero text-5xl md:text-7xl mt-4">
            Every hour we&apos;ve <span className="font-display italic font-normal text-accent">given back.</span>
          </h3>
        </FadeUp>

        <div className="mt-16 divide-y divide-border border-y border-border">
          {ledger.map(([from, to], i) => (
            <FadeUp key={from} delay={i * 0.06}>
              <div className="grid grid-cols-12 items-center py-8 group">
                <div className="col-span-5 md:col-span-4 font-mono text-xs tracking-widest text-muted-foreground line-through">{from}</div>
                <div className="col-span-2 md:col-span-4 text-center text-accent transition-transform duration-500 group-hover:translate-x-2">→</div>
                <div className="col-span-5 md:col-span-4 display-hero text-2xl md:text-4xl text-right md:text-left">{to}</div>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* STATS */}
      <section className="relative px-6 sm:px-10 py-32 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {stats.map((f, i) => (
            <FadeUp key={i} delay={i * 0.1}>
              <div className="border border-border rounded-2xl p-8 h-full bg-card/40 hover:bg-card/80 transition-colors">
                <div className="display-hero text-[4rem] md:text-[5rem] leading-none flex items-baseline">
                  <SlotNumber value={f.num} />
                  <span className="text-accent font-display italic font-normal">{f.suffix}</span>
                </div>
                <div className="mt-8 h-px bg-border" />
                <p className="mt-4 font-mono text-xs tracking-widest text-muted-foreground">{f.label}</p>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* PROCESS */}
      <section className="relative px-6 sm:px-10 py-32 max-w-7xl mx-auto">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 md:col-span-5">
            <FadeUp>
              <div className="eyebrow mb-6">— How we work</div>
              <h3 className="display-hero text-5xl md:text-7xl">
                From idea <br />to <span className="font-display italic font-normal text-accent">live agent.</span>
              </h3>
            </FadeUp>
          </div>
          <div className="col-span-12 md:col-span-7">
            <div className="divide-y divide-border border-y border-border">
              {process.map(([n, t, d], i) => (
                <FadeUp key={n} delay={i * 0.08}>
                  <div className="py-8 grid grid-cols-12 gap-4 items-start">
                    <div className="col-span-2 font-mono text-xs tracking-widest text-accent">{n}</div>
                    <div className="col-span-10">
                      <div className="display-hero text-2xl md:text-3xl">{t}</div>
                      <p className="mt-2 text-muted-foreground">{d}</p>
                    </div>
                  </div>
                </FadeUp>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* DEMO REVEAL */}
      <section className="relative px-6 sm:px-10 py-32 max-w-7xl mx-auto">
        <FadeUp>
          <div className="relative overflow-hidden rounded-3xl border border-border aspect-[16/9] bg-card">
            <div className="absolute inset-0" style={{ background: "radial-gradient(120% 100% at 30% 20%, oklch(0.32 0.1 30), oklch(0.12 0.02 30) 60%, oklch(0.08 0.005 60))" }} />
            <div className="absolute inset-0 grid-lines opacity-20" />
            <div className="absolute top-6 left-6 font-mono text-xs tracking-widest text-muted-foreground">
              ● Live agent — voice line demo
            </div>
            <div className="absolute inset-0 flex items-center justify-center px-6">
              <WordsReveal text="Hear it answer a real call." className="display-hero text-center text-4xl md:text-7xl" />
            </div>
            <div className="absolute bottom-6 right-6 pill pill-solid">▶ Play demo</div>
          </div>
        </FadeUp>
      </section>

      {/* MARQUEE */}
      <section className="relative py-12 border-y border-border overflow-hidden">
        <Marquee
          items={Array.from({ length: 4 }).map((_, i) => (
            <span key={i} className="display-hero text-6xl md:text-8xl flex items-center gap-8 text-foreground">
              Voice Agents
              <span className="text-accent font-display italic font-normal">✦</span>
              Chat Agents
              <span className="text-accent font-display italic font-normal">✦</span>
              SEO Automation
              <span className="text-accent font-display italic font-normal">✦</span>
              SaaS Products
              <span className="text-accent font-display italic font-normal">✦</span>
              Support Agents
              <span className="text-accent font-display italic font-normal">✦</span>
              Lead Qualification
              <span className="text-accent font-display italic font-normal">✦</span>
            </span>
          ))}
        />
      </section>

      {/* WHY US */}
      <section className="relative px-6 sm:px-10 py-32 max-w-7xl mx-auto">
        <FadeUp>
          <div className="eyebrow mb-6">— Why AUTOMIQ</div>
          <h3 className="display-hero text-4xl md:text-6xl max-w-4xl">
            Why businesses choose <span className="font-display italic font-normal text-accent">AUTOMIQ.</span>
          </h3>
        </FadeUp>
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            "We build the agent around your business, not a generic template.",
            "Every agent comes with a full audit trail — you see exactly what it did.",
            "You're not buying software. You're hiring a workforce that never sleeps.",
          ].map((line, i) => (
            <FadeUp key={i} delay={i * 0.08}>
              <div className="border border-border rounded-2xl p-8 h-full bg-card/40 hover:bg-card/80 transition-colors">
                <div className="font-mono text-xs tracking-widest text-accent">0{i + 1}</div>
                <p className="mt-6 text-lg leading-relaxed">{line}</p>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="relative px-6 sm:px-10 py-32 max-w-7xl mx-auto">
        <WordsReveal
          text="Real results, from real businesses."
          className="display-hero text-4xl md:text-6xl max-w-4xl"
        />
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { quote: "Our missed-call rate went to zero in the first week.", name: "Client name", role: "Business type" },
            { quote: "It closes leads faster than our old telecalling team did.", name: "Client name", role: "Business type" },
          ].map((t, i) => (
            <FadeUp key={i} delay={i * 0.08}>
              <div className="border border-border rounded-2xl p-8 h-full bg-card/40 flex flex-col justify-between gap-8 hover:bg-card/80 transition-colors">
                <p className="text-xl leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                <div>
                  <div className="font-medium">— {t.name}</div>
                  <div className="font-mono text-xs tracking-widest text-muted-foreground mt-1">{t.role}</div>
                </div>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section id="contact" className="relative px-6 sm:px-10 py-32 sm:py-48 text-center overflow-hidden">
        <div className="ember-glow absolute inset-0 mx-auto h-[600px] w-[600px] left-0 right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="relative z-10 max-w-5xl mx-auto">
          <FadeUp>
            <div className="eyebrow mb-8">— Become a client</div>
          </FadeUp>
          <WordsReveal
            text="Let's build the agent your business is missing."
            className="display-hero text-5xl md:text-8xl"
          />
          <FadeUp delay={0.4} className="mt-12 flex items-center justify-center gap-4 flex-wrap">
            <a href="mailto:hello@automiq.ai" className="pill pill-solid">Start a Project →</a>
            <a href="mailto:hello@automiq.ai" className="pill">hello@automiq.ai</a>
          </FadeUp>
          <FadeUp delay={0.6}>
            <p className="mt-8 text-muted-foreground text-sm">
              Free 20-minute call. We&apos;ll tell you exactly which agent pays for itself first.
            </p>
          </FadeUp>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border px-6 sm:px-10 py-12 font-mono text-xs tracking-widest text-muted-foreground">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          <div>
            <div className="text-foreground">AUTOMIQ AI STUDIO © {new Date().getFullYear()}</div>
            <div className="mt-2">hello@automiq.ai · +91 XXXXX XXXXX</div>
          </div>
          <div className="md:text-center">VOICE AGENTS · CHAT AGENTS · SEO · SAAS</div>
          <div className="flex md:justify-end items-center gap-6">
            <a href="#" className="underline-grow">LINKEDIN</a>
            <a href="#" className="underline-grow">INSTAGRAM</a>
            <a href="#" className="underline-grow">TWITTER</a>
          </div>
        </div>
      </footer>
      <VoiceBotWidget />
    </div>
  );
}
