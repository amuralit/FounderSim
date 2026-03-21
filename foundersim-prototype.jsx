import { useState, useEffect, useRef, useCallback } from "react";

// ============================================================
// FOUNDERSIM — AI Town-Style Spatial UI Prototype
// ============================================================
// Aesthetic: Dark command-center meets cozy startup office
// Interaction: Click agents to inspect work, chat to redirect
// ============================================================

// --- AGENT DEFINITIONS ---
const AGENTS = [
  {
    id: "ceo",
    name: "Ada Chen",
    role: "CEO Agent",
    emoji: "👩‍💼",
    color: "#f59e0b",
    zone: "ceo-office",
    avatar: "https://api.dicebear.com/9.x/personas/svg?seed=Ada&backgroundColor=f59e0b&size=80",
    personality: "Strategic thinker. Sets vision, hires team, makes final calls.",
    defaultPos: { x: 50, y: 28 },
  },
  {
    id: "research",
    name: "Dr. Kai Patel",
    role: "Research Agent",
    emoji: "🔍",
    color: "#3b82f6",
    zone: "research-lab",
    avatar: "https://api.dicebear.com/9.x/personas/svg?seed=Kai&backgroundColor=3b82f6&size=80",
    personality: "Data-driven analyst. Grounds everything in real market evidence.",
    defaultPos: { x: 15, y: 18 },
  },
  {
    id: "product",
    name: "Maya Rodriguez",
    role: "Product Agent",
    emoji: "📋",
    color: "#8b5cf6",
    zone: "war-room",
    avatar: "https://api.dicebear.com/9.x/personas/svg?seed=Maya&backgroundColor=8b5cf6&size=80",
    personality: "User-obsessed PM. Prioritizes ruthlessly. Ships fast.",
    defaultPos: { x: 72, y: 18 },
  },
  {
    id: "architect",
    name: "James Okonkwo",
    role: "Architect Agent",
    emoji: "🏗️",
    color: "#06b6d4",
    zone: "architect-desk",
    avatar: "https://api.dicebear.com/9.x/personas/svg?seed=James&backgroundColor=06b6d4&size=80",
    personality: "Systems thinker. Cares about correctness and scalability.",
    defaultPos: { x: 50, y: 72 },
  },
  {
    id: "developer",
    name: "Priya Sharma",
    role: "Developer Agent",
    emoji: "💻",
    color: "#10b981",
    zone: "dev-bullpen",
    avatar: "https://api.dicebear.com/9.x/personas/svg?seed=Priya&backgroundColor=10b981&size=80",
    personality: "Pragmatic builder. Pushes back on complexity. Ships clean code.",
    defaultPos: { x: 82, y: 72 },
  },
];

// --- ZONES ---
const ZONES = [
  { id: "ceo-office", label: "CEO Office", x: 35, y: 18, w: 30, h: 22 },
  { id: "research-lab", label: "Research Lab", x: 2, y: 5, w: 30, h: 28 },
  { id: "war-room", label: "War Room", x: 68, y: 5, w: 30, h: 28 },
  { id: "architect-desk", label: "Architecture", x: 35, y: 60, w: 30, h: 22 },
  { id: "dev-bullpen", label: "Dev Bay", x: 68, y: 60, w: 30, h: 22 },
  { id: "deploy-zone", label: "Deploy", x: 2, y: 60, w: 30, h: 22 },
  { id: "debate-arena", label: "Debate Arena", x: 35, y: 38, w: 30, h: 20 },
];

// --- SIMULATED AGENT ACTIVITY ---
const SIMULATION_STEPS = [
  {
    step: 0,
    active: "ceo",
    speech: "Analyzing mission... I need a Research lead, a PM, an Architect, and a Developer.",
    output: { title: "Company Brief", content: "**Mission:** Help freelancers track invoices and get paid faster.\n**Target:** Solo freelancers losing money on late payments.\n**Value prop:** Automated reminders that actually get you paid.\n**Key metric:** Days-to-payment reduction." },
    status: { ceo: "working", research: "idle", product: "idle", architect: "idle", developer: "idle" },
  },
  {
    step: 1,
    active: "research",
    speech: "Searching competitors via Google... Found FreshBooks, Wave, Bonsai, Harvest, Invoice Ninja.",
    output: { title: "Competitive Analysis", content: "**Competitors Found (Live Data):**\n\n| Company | Price | Strength | Weakness |\n|---------|-------|----------|----------|\n| FreshBooks | $17/mo | Full-featured | Expensive for solos |\n| Wave | Free | No cost | Ad-supported, basic |\n| Bonsai | $24/mo | Creative focus | Narrow niche |\n| Harvest | $11/mo | Time+invoice | No auto-reminders |\n| Invoice Ninja | Free | Open source | Self-hosted complexity |\n\n**Gap:** No tool optimizes for *getting paid faster*. Automated reminders + smart follow-ups + late fee calculation is underserved.\n\n*Data sourced via Google Search + URL Context from live competitor websites.*" },
    status: { ceo: "done", research: "working", product: "waiting", architect: "waiting", developer: "waiting" },
  },
  {
    step: 2,
    active: "product",
    speech: "Defining MVP features based on the market gap...",
    output: { title: "Product Requirements", content: "**MVP Features (Prioritized):**\n\n1. ✅ Invoice creation with line items — *core, non-negotiable*\n2. ✅ Client management — *organize who owes you*\n3. ✅ Automated payment reminders — *THE differentiator*\n4. ✅ Payment status dashboard — *know where your money is*\n5. ⚠️ Late fee auto-calculation — *nice-to-have, adds 1 week*\n\n**User Story:** As a freelancer, I want to send an invoice and have the system automatically remind my client when it's overdue, so I get paid faster without awkward follow-up emails.\n\n**Scope Decision Needed:** Cut feature #5 to ship in 3 weeks?" },
    status: { ceo: "done", research: "done", product: "working", architect: "waiting", developer: "waiting" },
    needsApproval: true,
    approvalQuestion: "Cut late fee calculator to ship faster?",
  },
  {
    step: 3,
    active: "architect",
    speech: "Designing system architecture. Next.js + Supabase + BetterAuth.",
    output: { title: "Architecture Document", content: "**Tech Stack:**\n- Frontend: Next.js 15 (App Router)\n- Database: Supabase (PostgreSQL + RLS)\n- Auth: BetterAuth\n- Deployment: Vercel\n- Monitoring: Sentry\n\n**Data Model:**\n```\ninvoices: id, client_id, amount, status, due_date, created_at\nclients: id, name, email, company\nline_items: id, invoice_id, description, qty, rate\nreminders: id, invoice_id, sent_at, type, status\n```\n\n**Architecture Decision Record:**\n- Supabase over Firebase: relational data (invoices→line_items) needs SQL\n- BetterAuth over Clerk: free, unlimited users, sufficient for MVP\n- Supabase Realtime for live payment status updates" },
    status: { ceo: "done", research: "done", product: "done", architect: "working", developer: "waiting" },
    debate: {
      between: ["product", "architect"],
      topic: "Database Choice",
      messages: [
        { agent: "product", text: "Firebase would ship 2x faster. We only have 3 weeks." },
        { agent: "architect", text: "Invoice data is inherently relational. Line items, clients, payments — NoSQL makes reporting impossible." },
        { agent: "product", text: "We can migrate to SQL in v2. Speed matters now." },
        { agent: "architect", text: "Migrating databases post-launch is a 3-month project. The 2 extra days for Supabase saves us months later." },
      ],
      needsResolution: true,
    },
  },
  {
    step: 4,
    active: "developer",
    speech: "Building components... Deploying to Vercel...",
    output: { title: "Deployment", content: "**Build Progress:**\n- ✅ Invoice creation form\n- ✅ Client management page\n- ✅ Dashboard with payment status\n- ✅ Automated reminder system (Supabase Edge Functions)\n- ⏳ Deploying to Vercel...\n\n**Supabase Tables Created:**\n- ✅ invoices (RLS enabled)\n- ✅ clients (RLS enabled)\n- ✅ line_items\n- ✅ reminders\n\n🚀 **DEPLOYED:** https://freelancepay.vercel.app\n\n*Environment variables set. Database connected. Auth configured.*" },
    status: { ceo: "done", research: "done", product: "done", architect: "done", developer: "working" },
  },
];

// --- PITCH DECK SLIDES (simulated output) ---
const PITCH_SLIDES = [
  { title: "FreelancePay", subtitle: "Get paid faster. Automatically.", bg: "linear-gradient(135deg, #0f172a, #1e293b)" },
  { title: "The Problem", body: "Freelancers lose $6,000/year on average to late payments. Following up is awkward and time-consuming." },
  { title: "The Solution", body: "FreelancePay sends smart, automated payment reminders so you get paid on time — without the awkward emails." },
  { title: "Market Size", body: "TAM: $15.3B (global invoicing software)\nSAM: $2.1B (freelancer-focused)\nSOM: $210M (US solo freelancers)" },
  { title: "Competition", body: "FreshBooks ($17/mo) — full-featured but expensive\nWave (free) — basic, no reminders\nHarvest ($11/mo) — time-focused\n\n→ None optimize for getting paid FASTER" },
  { title: "Business Model", body: "Freemium: Free for 3 clients\nPro: $9/mo unlimited clients + smart reminders\nBusiness: $19/mo + team features + late fee calc" },
  { title: "Traction", body: "Built from idea to deployed product in 15 minutes using AI agents.\nLive at: freelancepay.vercel.app\nReal database. Real auth. Real deployment." },
  { title: "The Ask", body: "Raising $500K pre-seed\nUse of funds: Engineering (60%), GTM (25%), Ops (15%)\n12-month runway to 1,000 paying users" },
];

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function FounderSim() {
  const [currentStep, setCurrentStep] = useState(-1); // -1 = input phase
  const [mission, setMission] = useState("");
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [agentPositions, setAgentPositions] = useState(
    Object.fromEntries(AGENTS.map(a => [a.id, a.defaultPos]))
  );
  const [agentStatuses, setAgentStatuses] = useState(
    Object.fromEntries(AGENTS.map(a => [a.id, "idle"]))
  );
  const [speechBubbles, setSpeechBubbles] = useState({});
  const [outputs, setOutputs] = useState({});
  const [chatMessages, setChatMessages] = useState({});
  const [chatInput, setChatInput] = useState("");
  const [showPitchDeck, setShowPitchDeck] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [debateActive, setDebateActive] = useState(null);
  const [approvalPending, setApprovalPending] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const chatEndRef = useRef(null);

  // --- RUN SIMULATION ---
  const runSimulation = useCallback(() => {
    if (!mission.trim()) return;
    setIsRunning(true);
    setCurrentStep(0);

    SIMULATION_STEPS.forEach((step, i) => {
      setTimeout(() => {
        setCurrentStep(i);
        setAgentStatuses(step.status);

        // Move active agent to center if debating
        if (step.debate) {
          const debatePos = { x: 50, y: 45 };
          setAgentPositions(prev => ({
            ...prev,
            [step.debate.between[0]]: { x: 40, y: 45 },
            [step.debate.between[1]]: { x: 60, y: 45 },
          }));
          setTimeout(() => setDebateActive(step.debate), 500);
        } else {
          // Move active agent to its zone
          const agent = AGENTS.find(a => a.id === step.active);
          if (agent) {
            setAgentPositions(prev => ({
              ...prev,
              [step.active]: agent.defaultPos,
            }));
          }
        }

        // Speech bubble
        setSpeechBubbles(prev => ({ ...prev, [step.active]: step.speech }));
        setTimeout(() => {
          setSpeechBubbles(prev => ({ ...prev, [step.active]: null }));
        }, 4000);

        // Output
        if (step.output) {
          setOutputs(prev => ({ ...prev, [step.active]: step.output }));
        }

        // Approval gate
        if (step.needsApproval) {
          setApprovalPending({
            agent: step.active,
            question: step.approvalQuestion,
          });
        }

        // Final step — show pitch deck button
        if (i === SIMULATION_STEPS.length - 1) {
          setTimeout(() => setIsRunning(false), 2000);
        }
      }, i * 5000);
    });
  }, [mission]);

  // --- SEND CEO MESSAGE ---
  const sendCeoMessage = (agentId) => {
    if (!chatInput.trim()) return;
    const msg = chatInput.trim();
    setChatMessages(prev => ({
      ...prev,
      [agentId]: [...(prev[agentId] || []),
        { from: "ceo", text: msg },
      ],
    }));
    setChatInput("");

    // Simulate agent response
    setTimeout(() => {
      const agent = AGENTS.find(a => a.id === agentId);
      const responses = {
        research: `Good point. Let me search for that... I'll update the competitive analysis with this feedback. The market data supports your direction.`,
        product: `I hear you. Let me re-prioritize the feature set based on your input. The PRD will be updated to reflect this change.`,
        architect: `I understand the concern. Let me explain my reasoning: the current architecture was chosen because it optimizes for long-term maintainability. But I can adjust if you prefer speed over scalability.`,
        developer: `Got it. I'll restructure the implementation to align with your direction. The deployment pipeline won't be affected.`,
        ceo: `Noted. I'll cascade this decision to the rest of the team and update the company brief.`,
      };
      setChatMessages(prev => ({
        ...prev,
        [agentId]: [...(prev[agentId] || []),
          { from: agentId, text: responses[agentId] || "I'll take that into account and adjust my output." },
        ],
      }));
    }, 1500);
  };

  // --- AUTO-SCROLL CHAT ---
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, selectedAgent]);

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div style={{
      width: "100%",
      minHeight: "100vh",
      background: "#08080e",
      color: "#e2e2f0",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* --- HEADER --- */}
      <header style={{
        padding: "12px 24px",
        borderBottom: "1px solid #1e1e2e",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "#0c0c14",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "linear-gradient(135deg, #f59e0b, #ef4444)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, fontWeight: 700,
          }}>F</div>
          <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: "-0.02em" }}>FounderSim</span>
          <span style={{ fontSize: 12, color: "#666", marginLeft: 4 }}>from idea to investor-ready</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {currentStep >= SIMULATION_STEPS.length - 1 && !isRunning && (
            <button
              onClick={() => setShowPitchDeck(true)}
              style={{
                padding: "6px 16px", borderRadius: 6,
                background: "linear-gradient(135deg, #f59e0b, #ef4444)",
                border: "none", color: "#fff", fontWeight: 600,
                fontSize: 13, cursor: "pointer",
              }}
            >
              📊 View Pitch Deck
            </button>
          )}
          {isRunning && (
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              fontSize: 12, color: "#f59e0b",
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%",
                background: "#f59e0b",
                animation: "pulse 1.5s infinite",
              }} />
              Agents working...
            </div>
          )}
        </div>
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* --- OFFICE VIEW (LEFT) --- */}
        <div style={{
          flex: selectedAgent ? "0 0 60%" : "1",
          position: "relative",
          background: "#0a0a12",
          transition: "flex 0.3s ease",
          overflow: "hidden",
        }}>
          {/* Mission input overlay */}
          {currentStep === -1 && (
            <div style={{
              position: "absolute", inset: 0, zIndex: 20,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(8,8,14,0.95)",
              backdropFilter: "blur(20px)",
            }}>
              <div style={{ textAlign: "center", maxWidth: 520, padding: 32 }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🚀</div>
                <h1 style={{
                  fontSize: 28, fontWeight: 700, marginBottom: 8,
                  background: "linear-gradient(135deg, #f59e0b, #ef4444, #8b5cf6)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                }}>What company should we build?</h1>
                <p style={{ color: "#888", fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
                  Describe your idea in one sentence. AI agents will research the market,
                  design the product, write the code, and deploy it — all while you watch and steer.
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={mission}
                    onChange={e => setMission(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && runSimulation()}
                    placeholder="A tool that helps freelancers track invoices and get paid faster"
                    style={{
                      flex: 1, padding: "12px 16px", borderRadius: 8,
                      background: "#14141e", border: "1px solid #2a2a3a",
                      color: "#e2e2f0", fontSize: 14, outline: "none",
                    }}
                  />
                  <button
                    onClick={runSimulation}
                    style={{
                      padding: "12px 24px", borderRadius: 8,
                      background: "linear-gradient(135deg, #f59e0b, #ef4444)",
                      border: "none", color: "#fff", fontWeight: 600,
                      fontSize: 14, cursor: "pointer", whiteSpace: "nowrap",
                    }}
                  >
                    Build It →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Zone backgrounds */}
          {ZONES.map(zone => (
            <div key={zone.id} style={{
              position: "absolute",
              left: `${zone.x}%`, top: `${zone.y}%`,
              width: `${zone.w}%`, height: `${zone.h}%`,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: 12,
              transition: "all 0.3s",
            }}>
              <span style={{
                position: "absolute", top: 8, left: 12,
                fontSize: 10, color: "#444", fontWeight: 600,
                textTransform: "uppercase", letterSpacing: "0.08em",
              }}>{zone.label}</span>
            </div>
          ))}

          {/* Connection lines between active agents */}
          <svg style={{
            position: "absolute", inset: 0, width: "100%", height: "100%",
            pointerEvents: "none", zIndex: 1,
          }}>
            {currentStep >= 1 && AGENTS.map((agent, i) => {
              if (i === 0) return null;
              const from = agentPositions[AGENTS[0].id];
              const to = agentPositions[agent.id];
              const status = agentStatuses[agent.id];
              if (status === "idle" || status === "waiting") return null;
              return (
                <line key={agent.id}
                  x1={`${from.x}%`} y1={`${from.y + 5}%`}
                  x2={`${to.x}%`} y2={`${to.y + 5}%`}
                  stroke={agent.color} strokeWidth={1} strokeDasharray="4 4"
                  opacity={0.3}
                />
              );
            })}
          </svg>

          {/* Agent avatars */}
          {AGENTS.map(agent => {
            const pos = agentPositions[agent.id];
            const status = agentStatuses[agent.id];
            const bubble = speechBubbles[agent.id];
            const isActive = status === "working";
            const isSelected = selectedAgent?.id === agent.id;

            return (
              <div key={agent.id} style={{
                position: "absolute",
                left: `${pos.x}%`, top: `${pos.y}%`,
                transform: "translate(-50%, -50%)",
                transition: "left 1.5s cubic-bezier(0.4,0,0.2,1), top 1.5s cubic-bezier(0.4,0,0.2,1)",
                zIndex: isActive ? 10 : 5,
                cursor: "pointer",
              }}
              onClick={() => setSelectedAgent(selectedAgent?.id === agent.id ? null : agent)}
              >
                {/* Speech bubble */}
                {bubble && (
                  <div style={{
                    position: "absolute", bottom: "calc(100% + 12px)", left: "50%",
                    transform: "translateX(-50%)",
                    background: "#1a1a28", border: `1px solid ${agent.color}40`,
                    borderRadius: 10, padding: "8px 12px",
                    fontSize: 11, color: "#ccc", maxWidth: 220,
                    whiteSpace: "normal", lineHeight: 1.4,
                    animation: "fadeIn 0.3s ease",
                    boxShadow: `0 4px 20px ${agent.color}15`,
                  }}>
                    {bubble}
                    <div style={{
                      position: "absolute", bottom: -6, left: "50%",
                      transform: "translateX(-50%)", width: 0, height: 0,
                      borderLeft: "6px solid transparent",
                      borderRight: "6px solid transparent",
                      borderTop: `6px solid ${agent.color}40`,
                    }} />
                  </div>
                )}

                {/* Avatar */}
                <div style={{
                  width: 56, height: 56, borderRadius: "50%",
                  border: `2px solid ${isSelected ? "#fff" : isActive ? agent.color : "#333"}`,
                  overflow: "hidden",
                  boxShadow: isActive
                    ? `0 0 20px ${agent.color}40, 0 0 40px ${agent.color}20`
                    : isSelected ? `0 0 15px rgba(255,255,255,0.2)` : "none",
                  transition: "all 0.3s",
                  position: "relative",
                  background: "#14141e",
                }}>
                  <img
                    src={agent.avatar}
                    alt={agent.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                  {isActive && (
                    <div style={{
                      position: "absolute", inset: -3,
                      borderRadius: "50%",
                      border: `2px solid ${agent.color}`,
                      animation: "ping 1.5s cubic-bezier(0,0,0.2,1) infinite",
                      opacity: 0.5,
                    }} />
                  )}
                </div>

                {/* Status dot */}
                <div style={{
                  position: "absolute", bottom: 2, right: 2,
                  width: 12, height: 12, borderRadius: "50%",
                  background: status === "done" ? "#10b981"
                    : status === "working" ? agent.color
                    : status === "waiting" ? "#666"
                    : "#333",
                  border: "2px solid #0a0a12",
                }} />

                {/* Name label */}
                <div style={{
                  textAlign: "center", marginTop: 4,
                  fontSize: 10, fontWeight: 600, color: isActive ? "#fff" : "#888",
                  whiteSpace: "nowrap",
                }}>
                  {agent.name}
                </div>
                <div style={{
                  textAlign: "center",
                  fontSize: 9, color: "#555",
                  whiteSpace: "nowrap",
                }}>
                  {agent.role}
                </div>
              </div>
            );
          })}

          {/* Approval gate overlay */}
          {approvalPending && (
            <div style={{
              position: "absolute", bottom: 20, left: "50%",
              transform: "translateX(-50%)", zIndex: 30,
              background: "#1a1a28", border: "1px solid #f59e0b40",
              borderRadius: 12, padding: "16px 24px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
              display: "flex", alignItems: "center", gap: 16,
              maxWidth: 500,
            }}>
              <div style={{ fontSize: 24 }}>⏸️</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#f59e0b", marginBottom: 4 }}>
                  Decision Required
                </div>
                <div style={{ fontSize: 12, color: "#aaa" }}>{approvalPending.question}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setApprovalPending(null)} style={{
                  padding: "6px 14px", borderRadius: 6,
                  background: "#10b981", border: "none", color: "#fff",
                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}>Approve</button>
                <button onClick={() => setApprovalPending(null)} style={{
                  padding: "6px 14px", borderRadius: 6,
                  background: "#333", border: "1px solid #555", color: "#ccc",
                  fontSize: 12, cursor: "pointer",
                }}>Modify</button>
              </div>
            </div>
          )}
        </div>

        {/* --- INSPECTOR PANEL (RIGHT) --- */}
        {selectedAgent && (
          <div style={{
            width: "40%", borderLeft: "1px solid #1e1e2e",
            background: "#0c0c14", display: "flex", flexDirection: "column",
            overflow: "hidden", animation: "slideIn 0.3s ease",
          }}>
            {/* Agent header */}
            <div style={{
              padding: "16px 20px", borderBottom: "1px solid #1e1e2e",
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: "50%",
                overflow: "hidden", border: `2px solid ${selectedAgent.color}`,
                flexShrink: 0,
              }}>
                <img src={selectedAgent.avatar} alt="" style={{ width: "100%", height: "100%" }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{selectedAgent.name}</div>
                <div style={{ fontSize: 12, color: selectedAgent.color }}>{selectedAgent.role}</div>
              </div>
              <button onClick={() => setSelectedAgent(null)} style={{
                background: "none", border: "none", color: "#666",
                fontSize: 20, cursor: "pointer", padding: 4,
              }}>✕</button>
            </div>

            {/* Agent personality */}
            <div style={{
              padding: "10px 20px", fontSize: 12, color: "#666",
              borderBottom: "1px solid #1e1e2e",
              fontStyle: "italic",
            }}>
              {selectedAgent.personality}
            </div>

            {/* Work output */}
            <div style={{ flex: 1, overflow: "auto", padding: "16px 20px" }}>
              {outputs[selectedAgent.id] ? (
                <div>
                  <h3 style={{
                    fontSize: 13, fontWeight: 700, color: selectedAgent.color,
                    textTransform: "uppercase", letterSpacing: "0.05em",
                    marginBottom: 12,
                  }}>
                    📄 {outputs[selectedAgent.id].title}
                  </h3>
                  <div style={{
                    fontSize: 13, lineHeight: 1.7, color: "#bbb",
                    whiteSpace: "pre-wrap",
                    background: "#12121a", borderRadius: 8,
                    padding: 16, border: "1px solid #1e1e2e",
                  }}>
                    {outputs[selectedAgent.id].content}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: 40, color: "#444" }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
                  <div style={{ fontSize: 13 }}>Waiting for this agent to start...</div>
                </div>
              )}

              {/* Debate display */}
              {debateActive && debateActive.between.includes(selectedAgent.id) && (
                <div style={{
                  marginTop: 20, padding: 16,
                  background: "#1a1020", borderRadius: 8,
                  border: "1px solid #8b5cf620",
                }}>
                  <div style={{
                    fontSize: 12, fontWeight: 700, color: "#8b5cf6",
                    marginBottom: 12, textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}>⚡ Debate: {debateActive.topic}</div>
                  {debateActive.messages.map((msg, i) => {
                    const agent = AGENTS.find(a => a.id === msg.agent);
                    return (
                      <div key={i} style={{
                        display: "flex", gap: 8, marginBottom: 10,
                        alignItems: "flex-start",
                      }}>
                        <div style={{
                          width: 24, height: 24, borderRadius: "50%",
                          overflow: "hidden", flexShrink: 0,
                          border: `1px solid ${agent?.color || "#333"}`,
                        }}>
                          <img src={agent?.avatar} alt="" style={{ width: "100%", height: "100%" }} />
                        </div>
                        <div>
                          <span style={{ fontSize: 11, fontWeight: 600, color: agent?.color }}>
                            {agent?.name}
                          </span>
                          <p style={{ fontSize: 12, color: "#aaa", margin: "2px 0 0" }}>{msg.text}</p>
                        </div>
                      </div>
                    );
                  })}
                  {debateActive.needsResolution && (
                    <div style={{
                      marginTop: 12, padding: 10, background: "#14141e",
                      borderRadius: 6, border: "1px solid #f59e0b30",
                      fontSize: 12, color: "#f59e0b",
                    }}>
                      🤔 Deadlock. Use the chat below to break the tie.
                    </div>
                  )}
                </div>
              )}

              {/* Chat history */}
              {(chatMessages[selectedAgent.id] || []).length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div style={{
                    fontSize: 12, fontWeight: 700, color: "#666",
                    marginBottom: 8, textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}>💬 Your Conversation</div>
                  {chatMessages[selectedAgent.id].map((msg, i) => (
                    <div key={i} style={{
                      display: "flex", gap: 8, marginBottom: 8,
                      justifyContent: msg.from === "ceo" ? "flex-end" : "flex-start",
                    }}>
                      <div style={{
                        maxWidth: "80%", padding: "8px 12px", borderRadius: 10,
                        fontSize: 12, lineHeight: 1.5,
                        background: msg.from === "ceo" ? "#f59e0b20" : "#1a1a28",
                        color: msg.from === "ceo" ? "#f59e0b" : "#bbb",
                        border: `1px solid ${msg.from === "ceo" ? "#f59e0b30" : "#2a2a3a"}`,
                      }}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
              )}
            </div>

            {/* Chat input */}
            <div style={{
              padding: "12px 16px", borderTop: "1px solid #1e1e2e",
              display: "flex", gap: 8,
            }}>
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendCeoMessage(selectedAgent.id)}
                placeholder={`Ask ${selectedAgent.name.split(" ")[0]} a question or give direction...`}
                style={{
                  flex: 1, padding: "10px 14px", borderRadius: 8,
                  background: "#14141e", border: "1px solid #2a2a3a",
                  color: "#e2e2f0", fontSize: 13, outline: "none",
                }}
              />
              <button
                onClick={() => sendCeoMessage(selectedAgent.id)}
                style={{
                  padding: "10px 16px", borderRadius: 8,
                  background: selectedAgent.color, border: "none",
                  color: "#fff", fontWeight: 600, fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Send
              </button>
            </div>
          </div>
        )}
      </div>

      {/* --- PITCH DECK MODAL --- */}
      {showPitchDeck && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "rgba(0,0,0,0.85)", backdropFilter: "blur(10px)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }} onClick={() => setShowPitchDeck(false)}>
          <div style={{
            width: "80%", maxWidth: 720, aspectRatio: "16/9",
            background: "#12121a", borderRadius: 16,
            border: "1px solid #2a2a3a", overflow: "hidden",
            display: "flex", flexDirection: "column",
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              padding: 48, textAlign: "center",
              background: PITCH_SLIDES[currentSlide].bg || "#12121a",
            }}>
              <div>
                <h2 style={{
                  fontSize: currentSlide === 0 ? 36 : 28,
                  fontWeight: 700, marginBottom: 12,
                  background: "linear-gradient(135deg, #f59e0b, #ef4444)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                }}>
                  {PITCH_SLIDES[currentSlide].title}
                </h2>
                {PITCH_SLIDES[currentSlide].subtitle && (
                  <p style={{ fontSize: 18, color: "#888" }}>
                    {PITCH_SLIDES[currentSlide].subtitle}
                  </p>
                )}
                {PITCH_SLIDES[currentSlide].body && (
                  <p style={{
                    fontSize: 15, color: "#bbb", whiteSpace: "pre-line",
                    lineHeight: 1.8, maxWidth: 500, margin: "0 auto",
                    textAlign: "left",
                  }}>
                    {PITCH_SLIDES[currentSlide].body}
                  </p>
                )}
              </div>
            </div>
            <div style={{
              padding: "12px 20px", borderTop: "1px solid #1e1e2e",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <button
                onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
                disabled={currentSlide === 0}
                style={{
                  padding: "6px 16px", borderRadius: 6,
                  background: "#1a1a28", border: "1px solid #333",
                  color: currentSlide === 0 ? "#333" : "#ccc",
                  fontSize: 13, cursor: currentSlide === 0 ? "default" : "pointer",
                }}
              >← Prev</button>
              <span style={{ fontSize: 12, color: "#666" }}>
                {currentSlide + 1} / {PITCH_SLIDES.length}
              </span>
              <button
                onClick={() => setCurrentSlide(Math.min(PITCH_SLIDES.length - 1, currentSlide + 1))}
                disabled={currentSlide === PITCH_SLIDES.length - 1}
                style={{
                  padding: "6px 16px", borderRadius: 6,
                  background: currentSlide === PITCH_SLIDES.length - 1 ? "#1a1a28" : "#f59e0b",
                  border: "none",
                  color: "#fff", fontSize: 13, fontWeight: 600,
                  cursor: currentSlide === PITCH_SLIDES.length - 1 ? "default" : "pointer",
                }}
              >Next →</button>
            </div>
          </div>
        </div>
      )}

      {/* --- CSS ANIMATIONS --- */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes ping {
          0% { transform: scale(1); opacity: 0.5; }
          75%, 100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-50%) translateY(8px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        input::placeholder { color: #555; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #555; }
      `}</style>
    </div>
  );
}
