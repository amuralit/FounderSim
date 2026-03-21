'use client';

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { AGENTS } from '@/lib/agents/config';
import { AgentId, AgentStatus, SimPhase, ChatMessage, DecisionEntry } from '@/lib/agents/types';
import { Project, loadProjects, saveProject, deleteProject, createNewProject, migrateOldState } from '@/lib/projects';
import OfficeView from './OfficeView';
import MissionInput from './MissionInput';
import InspectorPanel from './InspectorPanel';
import ApprovalGate from './ApprovalGate';
import FundraisingKit from './FundraisingKit';
import ArtifactPanel from './ArtifactPanel';
import ProjectSwitcher from './ProjectSwitcher';

type StatusMap = Record<AgentId, AgentStatus>;
type PositionMap = Record<AgentId, { x: number; y: number }>;

const initialStatuses: StatusMap = {
  ceo: 'idle', research: 'idle', product: 'idle', architect: 'idle', developer: 'idle', tester: 'idle',
};

const initialPositions: PositionMap = Object.fromEntries(
  AGENTS.map(a => [a.id, a.defaultPosition])
) as PositionMap;

const PIPELINE_ORDER: AgentId[] = ['research', 'product', 'architect', 'developer', 'tester'];

const GO_KEYWORDS = /\b(go|start|build|proceed|yes|approved|lgtm|let'?s go|do it|ship it|launch|begin|kick it off|make it happen|sounds good|looks good|perfect|love it|great|run|execute)\b/i;

export default function FounderSim() {
  const [phase, setPhase] = useState<SimPhase>('idle');
  const [mission, setMission] = useState('');
  const [companyBrief, setCompanyBrief] = useState('');
  const [pendingBrief, setPendingBrief] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AgentId | null>(null);
  const [statuses, setStatuses] = useState<StatusMap>(initialStatuses);
  const [positions, setPositions] = useState<PositionMap>(initialPositions);
  const [speeches, setSpeeches] = useState<Record<string, string | null>>({});
  const [outputs, setOutputs] = useState<Record<string, string>>({});
  const [chatHistories, setChatHistories] = useState<Record<string, ChatMessage[]>>({});
  const [decisions, setDecisions] = useState<DecisionEntry[]>([]);
  const [approvalGate, setApprovalGate] = useState<{ question: string; details?: string } | null>(null);
  const [showKit, setShowKit] = useState(false);
  const [demoUrl, setDemoUrl] = useState<string | null>(null);
  const [webUrl, setWebUrl] = useState<string | null>(null);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [competitiveVisualBase64, setCompetitiveVisualBase64] = useState<string | null>(null);
  const [marketMapBase64, setMarketMapBase64] = useState<string | null>(null);
  const [archDiagramBase64, setArchDiagramBase64] = useState<string | null>(null);
  const [productMockupBase64, setProductMockupBase64] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [totalTime, setTotalTime] = useState<number | null>(null);
  const [ceoChatLoading, setCeoChatLoading] = useState(false);
  const [showArtifacts, setShowArtifacts] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const startPipelineRef = useRef<(brief: string) => void>(() => {});

  // ── PROJECT PERSISTENCE ──
  // Load projects on mount (migrate old format if needed)
  useEffect(() => {
    let allProjects = loadProjects();
    const migrated = migrateOldState();
    if (migrated) {
      allProjects.push(migrated);
      saveProject(migrated);
    }
    // Also remove legacy key
    try { localStorage.removeItem('foundersim-state'); } catch { /* */ }

    setProjects(allProjects);
    // Auto-select most recent project, or stay idle
    if (allProjects.length > 0) {
      const latest = allProjects.sort((a, b) => b.updatedAt - a.updatedAt)[0];
      loadProjectState(latest);
    }
  }, []);

  function loadProjectState(p: Project) {
    setCurrentProjectId(p.id);
    setPhase(p.phase);
    setMission(p.mission);
    setCompanyBrief(p.companyBrief);
    setPendingBrief(p.pendingBrief);
    setOutputs(p.outputs);
    setChatHistories(p.chatHistories);
    setDecisions(p.decisions);
    setDemoUrl(p.demoUrl);
    setWebUrl(p.webUrl);
    setLogoBase64(p.logoBase64);
    setCompetitiveVisualBase64(p.competitiveVisualBase64 ?? null);
    if (p.statuses) setStatuses(p.statuses);
    if (p.phase === 'delivered') {
      setStatuses({ ceo: 'done', research: 'done', product: 'done', architect: 'done', developer: 'done', tester: 'done' });
    }
    setSelectedAgent(null);
    setSpeeches({});
    setIsRunning(false);
  }

  // Save current project state on changes
  useEffect(() => {
    if (!currentProjectId || phase === 'idle') return;
    const p: Project = {
      id: currentProjectId,
      name: mission?.substring(0, 40) || 'Untitled',
      mission, createdAt: Date.now(), updatedAt: Date.now(),
      phase, companyBrief, pendingBrief, outputs, chatHistories,
      decisions, statuses, demoUrl, webUrl, logoBase64, competitiveVisualBase64,
      v0ChatId: null, v0ProjectId: null,
    };
    saveProject(p);
    setProjects(loadProjects());
  }, [phase, mission, companyBrief, pendingBrief, outputs, chatHistories, decisions, demoUrl, webUrl, logoBase64, competitiveVisualBase64, statuses, currentProjectId]);

  function handleNewProject() {
    const p = createNewProject();
    saveProject(p);
    setProjects(loadProjects());
    loadProjectState(p);
    setPhase('idle');
    setMission('');
    setCompanyBrief('');
    setPendingBrief(null);
    setOutputs({});
    setChatHistories({});
    setDecisions([]);
    setStatuses(initialStatuses);
    setPositions(initialPositions);
    setDemoUrl(null);
    setWebUrl(null);
    setLogoBase64(null);
    setCompetitiveVisualBase64(null);
    setMarketMapBase64(null);
    setArchDiagramBase64(null);
    setProductMockupBase64(null);
  }

  function handleSelectProject(projectId: string) {
    const p = projects.find(pr => pr.id === projectId);
    if (p) loadProjectState(p);
  }

  function handleDeleteProject(projectId: string) {
    // Find project before deleting to get v0 IDs for cleanup
    const projectToDelete = projects.find(p => p.id === projectId);

    // Fire server-side cleanup (v0 chat/project deletion) — non-blocking
    if (projectToDelete?.v0ChatId || projectToDelete?.v0ProjectId) {
      fetch('/api/project-cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          v0ChatId: projectToDelete.v0ChatId,
          v0ProjectId: projectToDelete.v0ProjectId,
        }),
      }).catch(console.error);
    }

    deleteProject(projectId);
    const remaining = loadProjects();
    setProjects(remaining);
    if (projectId === currentProjectId) {
      if (remaining.length > 0) {
        loadProjectState(remaining[0]);
      } else {
        // Reset to clean idle state
        setCurrentProjectId(null);
        setPhase('idle');
        setMission('');
        setCompanyBrief('');
        setPendingBrief(null);
        setOutputs({});
        setChatHistories({});
        setDecisions([]);
        setStatuses(initialStatuses);
        setPositions(initialPositions);
        setDemoUrl(null);
        setWebUrl(null);
        setLogoBase64(null);
        setCompetitiveVisualBase64(null);
        setMarketMapBase64(null);
        setArchDiagramBase64(null);
        setProductMockupBase64(null);
        setStartTime(null);
        setTotalTime(null);
      }
    }
  }

  const setSpeech = useCallback((agentId: string, text: string | null) => {
    setSpeeches(prev => ({ ...prev, [agentId]: text }));
    if (text) {
      setTimeout(() => setSpeeches(prev => ({ ...prev, [agentId]: null })), 5000);
    }
  }, []);

  const addDecision = useCallback((agent: AgentId, type: string, desc: string) => {
    setDecisions(prev => [...prev, { ts: Date.now(), agent, type, desc }]);
  }, []);

  // Derive currently active agent from statuses for status bar
  const activeAgent = useMemo(() => {
    for (const id of PIPELINE_ORDER) {
      if (statuses[id] === 'working') {
        return AGENTS.find(a => a.id === id) ?? null;
      }
    }
    return null;
  }, [statuses]);

  // Status text for bottom bar
  const statusText = useMemo(() => {
    if (phase === 'idle') return null;
    if (phase === 'ceo_conversation') {
      if (pendingBrief) return 'Brief ready. Say "go" to start building.';
      return 'Chatting with Nova...';
    }
    if (phase === 'pipeline') {
      if (activeAgent) {
        const verb: Record<AgentId, string> = {
          ceo: 'is planning...',
          research: 'is researching competitors...',
          product: 'is writing the product spec...',
          architect: 'is designing the architecture...',
          developer: 'is generating code...',
          tester: 'is running E2E tests...',
        };
        return `${activeAgent.name} ${verb[activeAgent.id as AgentId]}`;
      }
      return 'Agents are working...';
    }
    if (phase === 'delivered') {
      const timeStr = totalTime ? ` (${Math.floor(totalTime / 60)}m ${totalTime % 60}s)` : '';
      return `All agents complete${timeStr}. Click any agent to review.`;
    }
    return null;
  }, [phase, activeAgent, pendingBrief]);

  // ── CEO CONVERSATION ──
  const handleMissionSubmit = useCallback((m: string) => {
    setStartTime(Date.now());
    setTotalTime(null);
    // Create project if none exists
    if (!currentProjectId) {
      const p = createNewProject();
      p.mission = m;
      p.name = m.substring(0, 40);
      saveProject(p);
      setCurrentProjectId(p.id);
      setProjects(loadProjects());
    }
    setMission(m);
    setPhase('ceo_conversation');
    setStatuses(prev => ({ ...prev, ceo: 'working' }));
    setSelectedAgent('ceo');
    setSpeech('ceo', 'Analyzing your mission...');

    const initialMsg: ChatMessage = { from: 'user', text: m, ts: Date.now() };
    setChatHistories(prev => ({ ...prev, ceo: [initialMsg] }));
    setCeoChatLoading(true);

    fetch('/api/ceo-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mission: m, history: [initialMsg] }),
    })
      .then(r => r.json())
      .then(data => {
        const agentMsg: ChatMessage = { from: 'ceo', text: data.text, ts: Date.now() };
        setChatHistories(prev => ({ ...prev, ceo: [...(prev.ceo || []), agentMsg] }));
        setOutputs(prev => ({ ...prev, ceo: data.text }));
        setSpeech('ceo', data.text.substring(0, 100) + '...');

        if (data.briefReady && data.brief) {
          // Bug 1 Fix: Store the brief but DON'T auto-start the pipeline.
          // Instead, hold it as "pending" and ask the user to confirm.
          setPendingBrief(data.brief);
          const confirmMsg: ChatMessage = {
            from: 'ceo',
            text: "Brief is ready. Click the green Build Now button below, or tell me what to adjust.",
            ts: Date.now() + 1,
          };
          setChatHistories(prev => ({ ...prev, ceo: [...(prev.ceo || []), agentMsg, confirmMsg] }));
          setOutputs(prev => ({ ...prev, ceo: data.brief }));
          setSpeech('ceo', "Brief ready. Say 'go' when you're happy with it.");
        }
      })
      .catch(err => {
        console.error(err);
        setSpeech('ceo', 'Hit a snag, but I can work with this. Let me brief the team.');
      })
      .finally(() => setCeoChatLoading(false));
  }, [setSpeech]);

  // ── AGENT CHAT ──
  const handleAgentChat = useCallback((agentId: AgentId, message: string) => {
    const userMsg: ChatMessage = { from: 'user', text: message, ts: Date.now() };
    setChatHistories(prev => ({
      ...prev,
      [agentId]: [...(prev[agentId] || []), userMsg],
    }));

    if (agentId === 'ceo' && phase === 'ceo_conversation') {
      // Bug 1 Fix: If there's a pending brief AND user says a "go" keyword,
      // start the pipeline now.
      const trimmed = message.trim();
      if (pendingBrief && GO_KEYWORDS.test(trimmed)) {
        const goMsg: ChatMessage = {
          from: 'ceo',
          text: "Excellent. Briefing the team now — let's build this company.",
          ts: Date.now() + 1,
        };
        setChatHistories(prev => ({ ...prev, ceo: [...(prev.ceo || []), userMsg, goMsg] }));
        setCompanyBrief(pendingBrief);
        setPendingBrief(null);
        addDecision('ceo', 'Brief Approved', 'Company brief finalized and sent to team.');
        startPipelineRef.current(pendingBrief);
        return;
      }

      // Otherwise, normal CEO conversation (may revise brief)
      setCeoChatLoading(true);
      const history = [...(chatHistories.ceo || []), userMsg];
      fetch('/api/ceo-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mission, history }),
      })
        .then(r => r.json())
        .then(data => {
          const agentMsg: ChatMessage = { from: 'ceo', text: data.text, ts: Date.now() };
          setChatHistories(prev => ({ ...prev, ceo: [...(prev.ceo || []), agentMsg] }));
          setOutputs(prev => ({ ...prev, ceo: data.text }));
          setSpeech('ceo', data.text.substring(0, 80) + '...');

          if (data.briefReady && data.brief) {
            // New brief generated after revision — still DON'T auto-start.
            // Store as pending and ask for confirmation again.
            setPendingBrief(data.brief);
            const confirmMsg: ChatMessage = {
              from: 'ceo',
              text: "Updated brief is ready. Click Build Now below, or keep refining.",
              ts: Date.now() + 1,
            };
            setChatHistories(prev => ({ ...prev, ceo: [...(prev.ceo || []), agentMsg, confirmMsg] }));
            setOutputs(prev => ({ ...prev, ceo: data.brief }));
            setSpeech('ceo', "Revised brief ready. Say 'go' when you're happy.");
          }
        })
        .catch(console.error)
        .finally(() => setCeoChatLoading(false));
      return;
    }

    // Post-delivery agent chat
    fetch('/api/agent-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId,
        message,
        agentOutput: outputs[agentId],
        context: companyBrief,
      }),
    })
      .then(r => r.json())
      .then(data => {
        const agentMsg: ChatMessage = { from: agentId, text: data.text, ts: Date.now() };
        setChatHistories(prev => ({
          ...prev,
          [agentId]: [...(prev[agentId] || []), agentMsg],
        }));
      })
      .catch(console.error);
  }, [phase, mission, chatHistories, outputs, companyBrief, pendingBrief, setSpeech, addDecision]);

  // ── SSE PIPELINE ──
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const startPipeline = useCallback((brief: string) => {
    setPhase('pipeline');
    setIsRunning(true);
    setStatuses({
      ceo: 'done',
      research: 'waiting',
      product: 'waiting',
      architect: 'waiting',
      developer: 'waiting',
      tester: 'waiting',
    });
    setSpeech('ceo', 'Team, you have your brief. Let\'s build this company.');

    const controller = new AbortController();
    abortRef.current = controller;

    fetch('/api/simulation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyBrief: brief }),
      signal: controller.signal,
    })
      .then(async res => {
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          let currentEvent = '';
          for (const line of lines) {
            if (line.startsWith('event: ')) {
              currentEvent = line.slice(7);
            } else if (line.startsWith('data: ') && currentEvent) {
              try {
                const data = JSON.parse(line.slice(6));
                handleSSEEvent(currentEvent, data);
              } catch (e) {
                console.error('SSE parse error:', e);
              }
              currentEvent = '';
            }
          }
        }
      })
      .catch(err => {
        if (err.name !== 'AbortError') console.error('Pipeline error:', err);
      })
      .finally(() => {
        setIsRunning(false);
      });
  }, []);
  startPipelineRef.current = startPipeline;

  const handleSSEEvent = useCallback((event: string, data: Record<string, unknown>) => {
    const agent = data.agent as AgentId | undefined;

    switch (event) {
      case 'agent_start':
        if (agent) {
          setStatuses(prev => ({ ...prev, [agent]: 'working' }));
          const agentDef = AGENTS.find(a => a.id === agent);
          if (agentDef) {
            setPositions(prev => ({ ...prev, [agent]: agentDef.defaultPosition }));
          }
        }
        break;

      case 'agent_speech':
        if (agent) {
          setSpeech(agent, data.text as string);
          // Store debate/review messages in chat history so they persist
          const speechText = data.text as string;
          if (speechText && speechText.length > 20) {
            setChatHistories(prev => ({
              ...prev,
              [agent]: [...(prev[agent] || []), { from: agent, text: speechText, ts: Date.now() } as ChatMessage],
            }));
          }
        }
        break;

      case 'agent_output':
        if (agent) {
          setOutputs(prev => ({ ...prev, [agent]: data.output as string }));
          if (data.demoUrl) setDemoUrl(data.demoUrl as string);
          if (data.webUrl) setWebUrl(data.webUrl as string);
        }
        break;

      case 'agent_done':
        if (agent) {
          setStatuses(prev => ({ ...prev, [agent]: 'done' }));
          addDecision(agent, 'Completed', `${agent} agent finished work.`);
        }
        break;

      case 'approval_gate':
        setApprovalGate({
          question: data.question as string,
          details: data.details as string | undefined,
        });
        addDecision(
          (data.agent as AgentId) || 'ceo',
          'Approval Gate',
          data.question as string
        );
        break;

      case 'image_ready':
        if (data.type === 'logo') setLogoBase64(data.data as string);
        else if (data.type === 'competitive_visual') setCompetitiveVisualBase64(data.data as string);
        else if (data.type === 'market_map') setMarketMapBase64(data.data as string);
        else if (data.type === 'architecture_diagram') setArchDiagramBase64(data.data as string);
        else if (data.type === 'product_mockup') setProductMockupBase64(data.data as string);
        break;

      case 'deploy_status':
        if (data.demoUrl) setDemoUrl(data.demoUrl as string);
        if (data.webUrl) setWebUrl(data.webUrl as string);
        break;

      case 'phase_change':
        if (data.phase === 'delivered') {
          setPhase('delivered');
          setStatuses({
            ceo: 'done', research: 'done', product: 'done',
            architect: 'done', developer: 'done', tester: 'done',
          });
          if (startTime) {
            const elapsed = Math.round((Date.now() - startTime) / 1000);
            setTotalTime(elapsed);
            const mins = Math.floor(elapsed / 60);
            const secs = elapsed % 60;
            setSpeech('ceo', `Done in ${mins}m ${secs}s. Open the Fundraising Kit to see everything.`);
          } else {
            setSpeech('ceo', 'The company is built. Open the Fundraising Kit to see everything.');
          }
        }
        break;

      case 'error':
        if (agent) {
          setStatuses(prev => ({ ...prev, [agent]: 'error' }));
        }
        break;
    }
  }, [setSpeech, addDecision]);

  // Bug 2 Fix: Wrap approval gate callbacks to avoid setState-during-render.
  // The ApprovalGate auto-approve uses setTimeout internally, but we also
  // make sure the callbacks themselves are safe by deferring addDecision.
  const handleApprove = useCallback(() => {
    if (!approvalGate) return;
    const q = approvalGate.question;
    setApprovalGate(null);
    setTimeout(() => addDecision('ceo', 'Approved', q), 0);
  }, [approvalGate, addDecision]);

  const handleModify = useCallback((feedback: string) => {
    if (!approvalGate) return;
    const q = approvalGate.question;
    setApprovalGate(null);
    setTimeout(() => addDecision('ceo', 'Modified', `${q} — Feedback: ${feedback}`), 0);
  }, [approvalGate, addDecision]);

  const handleReject = useCallback(() => {
    if (!approvalGate) return;
    const q = approvalGate.question;
    setApprovalGate(null);
    setTimeout(() => addDecision('ceo', 'Rejected', q), 0);
  }, [approvalGate, addDecision]);

  const selectedAgentDef = selectedAgent ? AGENTS.find(a => a.id === selectedAgent) : null;

  // Phase pill config
  const phasePill = useMemo(() => {
    if (phase === 'ceo_conversation') return { label: 'Briefing', color: '#f59e0b', pulse: false };
    if (phase === 'pipeline') return { label: 'Building', color: '#10b981', pulse: true };
    if (phase === 'delivered') return { label: 'Complete', color: '#10b981', pulse: false };
    return null;
  }, [phase]);

  // Progress bar segments: which agents are done
  const agentProgress = useMemo(() => {
    return PIPELINE_ORDER.map(id => ({
      id,
      color: AGENTS.find(a => a.id === id)?.color ?? '#555',
      done: statuses[id] === 'done',
      working: statuses[id] === 'working',
    }));
  }, [statuses]);

  const showProgressBar = phase === 'pipeline' || phase === 'delivered';

  return (
    <div className="w-full h-screen flex flex-col overflow-hidden" style={{ background: '#F8F9FB' }}>
      {/* Header */}
      <header
        className="shrink-0"
        style={{ background: '#FFFFFF', borderBottom: '1px solid #E8EAF0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
      >
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-base font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}
            >
              F
            </div>
            <span className="font-bold text-lg tracking-tight" style={{ color: '#111827' }}>FounderSim</span>
            <span className="text-xs ml-1" style={{ color: '#9CA3AF' }}>from idea to investor-ready</span>

            {/* Phase status pill */}
            {phasePill && (
              <span
                className="ml-3 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase"
                style={{
                  background: `${phasePill.color}15`,
                  color: phasePill.color,
                  border: `1px solid ${phasePill.color}30`,
                }}
              >
                {phasePill.pulse && (
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      background: phasePill.color,
                      animation: 'pulse-dot 1.5s infinite',
                    }}
                  />
                )}
                {phasePill.label}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ProjectSwitcher
              projects={projects}
              currentProjectId={currentProjectId}
              onSelect={handleSelectProject}
              onNew={handleNewProject}
              onDelete={handleDeleteProject}
            />
            {phase !== 'idle' && (
              <button
                onClick={() => setShowArtifacts(true)}
                className="px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-all"
                style={{ background: '#F3F4F6', border: '1px solid #E8EAF0', color: '#6B7280' }}
              >
                Artifacts
              </button>
            )}
            {phase === 'delivered' && (
              <button
                onClick={() => setShowKit(true)}
                className="px-4 py-1.5 rounded-md font-semibold text-[13px] text-white cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)', border: 'none' }}
              >
                Fundraising Kit
              </button>
            )}
            {isRunning && (
              <div className="flex items-center gap-1.5 text-xs" style={{ color: '#f59e0b' }}>
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: '#f59e0b', animation: 'pulse-dot 1.5s infinite' }}
                />
                Agents working...
              </div>
            )}
          </div>
        </div>

        {/* Agent progress bar */}
        {showProgressBar && (
          <div className="flex w-full h-1 gap-px" style={{ background: '#F8F9FB' }}>
            {agentProgress.map(seg => (
              <div
                key={seg.id}
                className="flex-1 transition-all duration-700 ease-out"
                style={{
                  background: seg.done
                    ? seg.color
                    : seg.working
                      ? `${seg.color}50`
                      : '#F3F4F6',
                  ...(seg.working ? { animation: 'progress-pulse 2s ease-in-out infinite' } : {}),
                }}
              />
            ))}
          </div>
        )}
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Office view */}
        <div
          className="relative overflow-hidden transition-all duration-300 flex flex-col"
          style={{ flex: selectedAgent ? '0 0 60%' : '1' }}
        >
          {phase === 'idle' && <MissionInput onSubmit={handleMissionSubmit} />}

          <div className="flex-1 relative">
            <OfficeView
              agents={AGENTS}
              statuses={statuses}
              positions={positions}
              speeches={speeches}
              selectedAgentId={selectedAgent}
              onAgentClick={(id) => setSelectedAgent(selectedAgent === id ? null : id)}
            />

            {approvalGate && (
              <ApprovalGate
                question={approvalGate.question}
                details={approvalGate.details}
                onApprove={handleApprove}
                onModify={handleModify}
                onReject={handleReject}
              />
            )}
          </div>

          {/* Bottom status bar */}
          {statusText && (
            <div
              className="shrink-0 px-5 py-2.5 flex items-center gap-2 text-xs"
              style={{
                borderTop: '1px solid #E8EAF0',
                background: '#FFFFFF',
                color: '#9CA3AF',
              }}
            >
              {phase === 'pipeline' && activeAgent && (
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    background: activeAgent.color,
                    animation: 'pulse-dot 1.5s infinite',
                  }}
                />
              )}
              {phase === 'delivered' && (
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: '#10b981' }} />
              )}
              {phase === 'ceo_conversation' && !pendingBrief && (
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    background: '#f59e0b',
                    animation: 'pulse-dot 1.5s infinite',
                  }}
                />
              )}
              <span className="flex-1">{statusText}</span>

              {/* BUILD NOW button when brief is ready */}
              {pendingBrief && phase === 'ceo_conversation' && (
                <button
                  onClick={() => {
                    const goMsg: ChatMessage = { from: 'user', text: 'go', ts: Date.now() };
                    setChatHistories(prev => ({ ...prev, ceo: [...(prev.ceo || []), goMsg] }));
                    setCompanyBrief(pendingBrief);
                    setPendingBrief(null);
                    addDecision('ceo', 'Brief Approved', 'Company brief finalized and sent to team.');
                    startPipelineRef.current(pendingBrief);
                  }}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    border: 'none',
                    boxShadow: '0 2px 12px rgba(16,185,129,0.3)',
                  }}
                >
                  Build Now →
                </button>
              )}
            </div>
          )}
        </div>

        {/* Inspector panel */}
        {selectedAgentDef && (
          <div className="w-[40%] shrink-0">
            <InspectorPanel
              agent={selectedAgentDef}
              output={outputs[selectedAgent!] || null}
              chatHistory={chatHistories[selectedAgent!] || []}
              onSendMessage={handleAgentChat}
              onClose={() => setSelectedAgent(null)}
              logoBase64={logoBase64}
              competitiveVisual={competitiveVisualBase64}
              marketMap={marketMapBase64}
              archDiagram={archDiagramBase64}
              productMockup={productMockupBase64}
              agentStatus={statuses[selectedAgent!]}
            />
          </div>
        )}
      </div>

      {/* Artifacts panel */}
      {showArtifacts && (
        <ArtifactPanel
          outputs={outputs}
          companyBrief={companyBrief}
          demoUrl={demoUrl}
          webUrl={webUrl}
          logoBase64={logoBase64}
          marketMapBase64={marketMapBase64}
          archDiagramBase64={archDiagramBase64}
          productMockupBase64={productMockupBase64}
          onClose={() => setShowArtifacts(false)}
        />
      )}

      {/* Fundraising Kit modal */}
      {showKit && (
        <FundraisingKit
          researchOutput={outputs.research || ''}
          architectOutput={outputs.architect || ''}
          demoUrl={demoUrl}
          webUrl={webUrl}
          logoBase64={logoBase64}
          competitiveVisualBase64={competitiveVisualBase64}
          decisions={decisions}
          companyBrief={companyBrief}
          productOutput={outputs.product || ''}
          onClose={() => setShowKit(false)}
        />
      )}

    </div>
  );
}
