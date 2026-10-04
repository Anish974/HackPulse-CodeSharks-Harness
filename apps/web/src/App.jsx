import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Play,
  Terminal,
  Activity,
  Layers,
  Sparkles,
  Zap,
  TrendingUp,
  Clock,
  AlertTriangle,
  Send,
  Building2,
  Lock,
  Cpu,
  Radar
} from 'lucide-react';
import AyusReactor from './components/AyusReactor.jsx';
import './groundcontrol.css';

const API_BASE = 'http://localhost:3001';
const WS_URL = 'ws://localhost:3001';

export default function App() {
  const [agents, setAgents] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [metrics, setMetrics] = useState({
    totalApprovalsHandled: 0,
    pendingActionCount: 0,
    approvedAndExecutedCount: 0,
    rejectedSafetyCount: 0,
    riskMitigationRate: '100%',
    hoursSavedAutonomousOps: 38.5,
    criticalIncidentsPrevented: 0
  });
  const [logs, setLogs] = useState([]);
  const [loadingAction, setLoadingAction] = useState(null);
  const [activeTab, setActiveTab] = useState('cockpit'); // 'cockpit' | 'database'
  const [dbData, setDbData] = useState(null);
  const [reactorState, setReactorState] = useState('standby');
  const [reactorTranscript, setReactorTranscript] = useState('CodeSharks Ground Control active. Department agents operational.');
  const terminalEndRef = useRef(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const refreshAllData = async () => {
    try {
      const [resAgents, resApprovals, resMetrics, resDb] = await Promise.all([
        fetch(`${API_BASE}/api/agents`).then(r => r.json()).catch(() => []),
        fetch(`${API_BASE}/api/approvals`).then(r => r.json()).catch(() => ({ pending: [], history: [] })),
        fetch(`${API_BASE}/api/metrics`).then(r => r.json()).catch(() => ({})),
        fetch(`${API_BASE}/api/db`).then(r => r.json()).catch(() => null)
      ]);

      if (Array.isArray(resAgents) && resAgents.length) setAgents(resAgents);
      if (resApprovals.pending) {
        setApprovals(resApprovals.pending);
        if (resApprovals.pending.length > 0) {
          setReactorState('alert');
          setReactorTranscript(`ALERT: ${resApprovals.pending.length} critical action(s) require founder clearance.`);
        } else {
          setReactorState('standby');
        }
      }
      if (resMetrics.totalApprovalsHandled !== undefined) setMetrics(resMetrics);
      if (resDb) setDbData(resDb);
    } catch (e) {
      console.error('Data refresh error:', e);
    }
  };

  useEffect(() => {
    refreshAllData();

    let ws;
    const connectWs = () => {
      ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        addLog('SYSTEM', 'Ground Control Telemetry WebSocket Synced', 'CONNECTED');
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          handleIncomingEvent(payload);
        } catch (e) {
          console.error('WS Parse Error:', e);
        }
      };

      ws.onclose = () => {
        setTimeout(connectWs, 3000);
      };
    };

    connectWs();
    return () => ws?.close();
  }, []);

  const addLog = (tag, text, type = 'info') => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev.slice(-100), { time, tag, text, type }]);
  };

  const handleIncomingEvent = (payload) => {
    const { type, data } = payload;

    if (type === 'agent:start') {
      setReactorState('thinking');
      setReactorTranscript(`Autonomous cycle initiated for ${data.department}. Observing operational telemetry...`);
      addLog(data.agent?.name || 'AGENT', `Autonomous cycle triggered for ${data.department}`, 'thought');
    } else if (type === 'agent:thought') {
      addLog(data.agentName, `🧠 Plan: ${data.thought}`, 'thought');
    } else if (type === 'agent:tool_call') {
      addLog(data.agentName, `🔧 Proposing: ${data.tool} (${data.intent})`, 'tool');
    } else if (type === 'agent:policy_eval') {
      addLog('HARNESS', `🛡️ Governance Check: ${data.tool} -> Risk=${data.riskLevel}, Halt=${data.requiresApproval}`, 'policy');
    } else if (type === 'agent:paused_for_approval') {
      setReactorState('alert');
      setReactorTranscript(`CRITICAL ACTION HALTED: ${data.summary}. Awaiting founder authorization.`);
      addLog('GATEKEEPER', `⛔ Intercepted ${data.agentName}: Action halted! Pushed to Amber Clearance Queue.`, 'approval');
      refreshAllData();
    } else if (type === 'agent:tool_executed') {
      setReactorState('speaking');
      setReactorTranscript(`Safe tool ${data.tool} executed successfully.`);
      addLog('EXECUTOR', `⚡ Tool ${data.tool} executed autonomously.`, 'exec');
      refreshAllData();
    } else if (type === 'approval:executed') {
      setReactorState('speaking');
      setReactorTranscript(`Action ${data.id} APPROVED & EXECUTED by Founder.`);
      addLog('FOUNDER', `✅ Action ${data.id} APPROVED & EXECUTED by Founder.`, 'exec');
      refreshAllData();
    } else if (type === 'approval:rejected') {
      setReactorState('standby');
      setReactorTranscript(`Action ${data.id} REJECTED by Founder.`);
      addLog('FOUNDER', `❌ Action ${data.id} REJECTED by Founder.`, 'approval');
      refreshAllData();
    }
  };

  const triggerScenario = async (scenarioType) => {
    setLoadingAction(scenarioType);
    setReactorState('thinking');
    setReactorTranscript(`Scenario ${scenarioType} dispatched. Synthesizing multi-agent steps...`);
    addLog('SIMULATOR', `Dispatching scenario: ${scenarioType}...`, 'tool');
    try {
      await fetch(`${API_BASE}/api/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioType })
      });
      await refreshAllData();
    } catch (e) {
      addLog('ERROR', `Simulation failed: ${e.message}`, 'approval');
      setReactorState('standby');
    } finally {
      setLoadingAction(null);
    }
  };

  const runAgent = async (dept) => {
    setLoadingAction(dept);
    try {
      await fetch(`${API_BASE}/api/agents/${dept}/run`, { method: 'POST' });
      await refreshAllData();
    } catch (e) {
      addLog('ERROR', `Run failed: ${e.message}`, 'approval');
    } finally {
      setLoadingAction(null);
    }
  };

  const runAllAgents = async () => {
    setLoadingAction('ALL');
    setReactorState('thinking');
    setReactorTranscript('Executing full multi-department autonomous sweep across 5 specialized seats...');
    addLog('ORCHESTRATOR', 'Running full autonomous enterprise sweep across all 5 departments...', 'thought');
    try {
      await fetch(`${API_BASE}/api/agents/run-all`, { method: 'POST' });
      await refreshAllData();
    } catch (e) {
      addLog('ERROR', `Run all failed: ${e.message}`, 'approval');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleApprove = async (id) => {
    setLoadingAction(`approve_${id}`);
    try {
      await fetch(`${API_BASE}/api/approvals/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approver: 'Founder (Anish)' })
      });
      await refreshAllData();
    } catch (e) {
      alert(`Approval error: ${e.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleReject = async (id) => {
    const reason = prompt('Enter rejection rationale for audit ledger:', 'Risk exceeds current Q4 budget tolerance');
    if (!reason) return;
    setLoadingAction(`reject_${id}`);
    try {
      await fetch(`${API_BASE}/api/approvals/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, reviewer: 'Founder (Anish)' })
      });
      await refreshAllData();
    } catch (e) {
      alert(`Rejection error: ${e.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflowX: 'hidden' }}>
      {/* Scope Radar Sweep & Grid */}
      <div className="gc-radar-bg" />
      <div className="gc-radar-sweep" />

      {/* Ground Control Header */}
      <header style={{ position: 'relative', zIndex: 10 }}>
        <div className="brand-wrapper">
          <div className="brand-logo" style={{ background: '#0b1120', border: '1px solid var(--ice)' }}>
            🦈
          </div>
          <div className="brand-text">
            <h1 style={{ fontFamily: 'Chakra Petch', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              AYUS OPS • GROUND CONTROL
            </h1>
            <p style={{ fontFamily: 'IBM Plex Mono' }}>
              ENTERPRISE AGENTIC HARNESS • <span style={{ color: 'var(--amber)' }}>AMBER=HUMAN</span> | <span style={{ color: 'var(--ice)' }}>ICE=MACHINE</span>
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              className={`gc-tab-btn ${activeTab === 'cockpit' ? 'active' : ''}`}
              onClick={() => setActiveTab('cockpit')}
            >
              <Activity size={14} /> Mission Control
            </button>
            <button
              className={`gc-tab-btn ${activeTab === 'database' ? 'active' : ''}`}
              onClick={() => { setActiveTab('database'); refreshAllData(); }}
            >
              <Layers size={14} /> System Record
            </button>
          </div>

          <div className="live-badge" style={{ borderRadius: '0', background: 'var(--ice-dim)', border: '1px solid var(--ice)', color: 'var(--ice)' }}>
            <div className="pulse-dot" style={{ background: 'var(--ice)', boxShadow: '0 0 10px var(--ice)' }} />
            <span style={{ fontFamily: 'IBM Plex Mono', fontSize: '0.72rem' }}>GROUND CONTROL ON</span>
          </div>
        </div>
      </header>

      <div className="app-container" style={{ position: 'relative', zIndex: 5 }}>
        {/* AYUS Reactor Hero HUD */}
        <AyusReactor
          currentState={reactorState}
          transcript={reactorTranscript}
          onTriggerSweep={runAllAgents}
        />

        {/* Top Operational Metrics */}
        <div className="metrics-grid">
          <div className="gc-panel gc-panel-amber metric-card">
            <span className="metric-title" style={{ color: 'var(--amber)' }}>[CRITICAL INTERCEPTIONS]</span>
            <div className="metric-value gc-data" style={{ color: 'var(--amber)' }}>
              {approvals.length + metrics.approvedAndExecutedCount + metrics.rejectedSafetyCount}
            </div>
            <span className="metric-footer gc-data">Halted prior to external mutation</span>
          </div>

          <div className="gc-panel gc-panel-amber metric-card">
            <span className="metric-title" style={{ color: 'var(--amber)' }}>[PENDING CLEARANCE]</span>
            <div className="metric-value gc-data" style={{ color: '#fff' }}>
              {approvals.length}
            </div>
            <span className="metric-footer gc-data">Awaiting founder decision</span>
          </div>

          <div className="gc-panel gc-panel-ice metric-card">
            <span className="metric-title" style={{ color: 'var(--ice)' }}>[HOURS SAVED]</span>
            <div className="metric-value gc-data" style={{ color: 'var(--ice)' }}>
              {metrics.hoursSavedAutonomousOps} hrs
            </div>
            <span className="metric-footer gc-data">Autonomously handled</span>
          </div>

          <div className="gc-panel gc-panel-ice metric-card">
            <span className="metric-title" style={{ color: 'var(--ice)' }}>[SAFETY ADHERENCE]</span>
            <div className="metric-value gc-data" style={{ color: '#34d399' }}>
              {metrics.riskMitigationRate}
            </div>
            <span className="metric-footer gc-data">0 unapproved critical actions</span>
          </div>
        </div>

        {/* Preset Judge Demo Rail */}
        <div className="gc-panel scenario-bar" style={{ borderRadius: 0, border: '1px solid var(--border-surface)' }}>
          <div className="scenario-info">
            <h3 style={{ fontFamily: 'Chakra Petch', textTransform: 'uppercase' }}>
              <Radar size={18} color="var(--ice)" /> Live Mission Simulator
            </h3>
            <p style={{ fontFamily: 'IBM Plex Mono' }}>
              Inject business operational anomalies to trigger the Agentic Safety Harness:
            </p>
          </div>
          <div className="button-group">
            <button
              className="gc-tab-btn"
              disabled={loadingAction}
              onClick={() => triggerScenario('ENTERPRISE_CONTRACT')}
            >
              💼 Enterprise Deal (₹1.5L)
            </button>
            <button
              className="gc-tab-btn"
              disabled={loadingAction}
              onClick={() => triggerScenario('HIGH_VALUE_INVOICE')}
            >
              📊 High-Debt Overdue (₹1.2L)
            </button>
            <button
              className="gc-tab-btn"
              disabled={loadingAction}
              onClick={() => triggerScenario('SEV1_INCIDENT')}
            >
              ⚡ SEV-1 Incident Rollback
            </button>
            <button
              className="gc-tab-btn"
              disabled={loadingAction}
              onClick={() => triggerScenario('TALENT_OFFER')}
            >
              👥 Executive Offer (₹28L)
            </button>
            <button
              className="gc-tab-btn active"
              disabled={loadingAction}
              onClick={runAllAgents}
            >
              <Zap size={14} /> Full Enterprise Sweep
            </button>
          </div>
        </div>

        {activeTab === 'cockpit' ? (
          <div className="main-grid">
            {/* Left: Department Agent Network */}
            <div className="department-roster">
              <div className="section-header">
                <h2 className="gc-header" style={{ color: 'var(--ice)' }}>
                  <Cpu size={16} /> Autonomous Department Network
                </h2>
                <span className="gc-data" style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {agents.length} SPECIALIZED SEATS
                </span>
              </div>

              <div className="agent-cards-container">
                {agents.map((ag) => (
                  <div
                    key={ag.id}
                    className="gc-panel agent-card"
                    style={{
                      borderRadius: 0,
                      borderLeft: `3px solid ${ag.badgeColor || 'var(--ice)'}`,
                      background: 'var(--bg-surface)'
                    }}
                  >
                    <div className="agent-meta">
                      <div className="agent-avatar" style={{ borderRadius: 0, border: '1px solid var(--border-surface)' }}>
                        {ag.avatar}
                      </div>
                      <div className="agent-details">
                        <h4 style={{ fontFamily: 'Chakra Petch' }}>
                          {ag.name}
                          <span className="gc-data" style={{ fontSize: '0.68rem', color: ag.badgeColor, fontWeight: 700 }}>
                            // {ag.department}
                          </span>
                        </h4>
                        <div className="title gc-data">{ag.title}</div>
                        <div className="desc">{ag.description}</div>
                      </div>
                    </div>

                    <button
                      className="gc-tab-btn"
                      style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                      disabled={loadingAction}
                      onClick={() => runAgent(ag.department)}
                    >
                      <Play size={10} /> RUN
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Clearance Queue & Telemetry Feed */}
            <div className="right-column">
              {/* Founder Clearance Queue */}
              <div className="gc-panel gc-panel-amber approval-queue-box" style={{ borderRadius: 0 }}>
                <div className="section-header" style={{ marginBottom: 0 }}>
                  <h2 className="gc-header" style={{ color: 'var(--amber)' }}>
                    <Lock size={16} /> Founder Clearance Queue [AMBER]
                  </h2>
                  <span className="gc-data" style={{ color: 'var(--amber)', fontSize: '0.78rem', fontWeight: 700 }}>
                    {approvals.length} PENDING SIGN-OFF
                  </span>
                </div>

                {approvals.length === 0 ? (
                  <div className="empty-queue gc-data" style={{ padding: '2rem 1rem' }}>
                    <div className="empty-icon">🛡️</div>
                    <div style={{ color: '#94a3b8' }}>ALL AGENTS OPERATING WITHIN AUTONOMOUS LIMITS</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.3rem' }}>
                      Click any scenario above to trigger a critical action requiring clearance.
                    </div>
                  </div>
                ) : (
                  approvals.map((req) => (
                    <div key={req.id} className="gc-clearance-card">
                      <div className="approval-top">
                        <span style={{ fontFamily: 'Chakra Petch', fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>
                          {req.proposalSummary}
                        </span>
                        <span className="gc-data" style={{ color: 'var(--amber)', fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', background: 'var(--amber-dim)', border: '1px solid var(--amber)' }}>
                          {req.riskLevel} CLEARANCE
                        </span>
                      </div>

                      <div className="approval-reason gc-data" style={{ background: '#000', borderLeft: '3px solid var(--amber)' }}>
                        ⚠️ <strong>POLICY RESTRICTION:</strong> {req.reason}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                        <span className="gc-data" style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          TARGET TOOL: <code style={{ color: 'var(--ice)' }}>{req.toolName}</code>
                        </span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="gc-clearance-btn-reject"
                            disabled={loadingAction}
                            onClick={() => handleReject(req.id)}
                          >
                            <XCircle size={13} style={{ display: 'inline', marginRight: '4px' }} /> REJECT
                          </button>
                          <button
                            className="gc-clearance-btn-approve"
                            disabled={loadingAction}
                            onClick={() => handleApprove(req.id)}
                          >
                            <CheckCircle2 size={13} style={{ display: 'inline', marginRight: '4px' }} /> APPROVE &amp; EXECUTE
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Machine Telemetry Feed */}
              <div className="gc-panel gc-panel-ice live-terminal" style={{ borderRadius: 0 }}>
                <div className="terminal-header">
                  <div className="terminal-title" style={{ fontFamily: 'IBM Plex Mono', color: 'var(--ice)' }}>
                    <Terminal size={14} /> MACHINE REASONING &amp; HARNESS STREAM [ICE]
                  </div>
                  <button
                    className="gc-tab-btn"
                    style={{ padding: '2px 8px', fontSize: '0.68rem' }}
                    onClick={() => setLogs([])}
                  >
                    CLEAR
                  </button>
                </div>

                <div className="terminal-body gc-data">
                  {logs.length === 0 ? (
                    <div style={{ color: '#64748b', textAlign: 'center', padding: '3rem 0' }}>
                      &gt; Awaiting agent operations... Click "Full Enterprise Sweep" to observe.
                    </div>
                  ) : (
                    logs.map((log, idx) => (
                      <div key={idx} className="log-entry">
                        <span className="log-time">{log.time}</span>
                        <span className={`log-tag tag-${log.type}`}>{log.tag}</span>
                        <span className="log-text">{log.text}</span>
                      </div>
                    ))
                  )}
                  <div ref={terminalEndRef} />
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* System Record DB */
          <div className="gc-panel" style={{ padding: '1.5rem', borderRadius: 0 }}>
            <h2 className="gc-header" style={{ marginBottom: '1.25rem', color: 'var(--ice)' }}>
              <Layers size={18} /> OPERATIONAL ENTERPRISE LEDGER (LIVE STATE)
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <h4 className="gc-header" style={{ color: 'var(--ice)', marginBottom: '0.6rem' }}>
                  // CRM INBOUND LEADS
                </h4>
                {dbData?.leads?.map((lead) => (
                  <div key={lead.id} className="gc-panel gc-data" style={{ padding: '0.8rem', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                      <span style={{ color: '#fff' }}>{lead.company} ({lead.contact})</span>
                      <span style={{ color: '#10b981' }}>₹{lead.budget?.toLocaleString('en-IN')}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                      STATUS: <strong style={{ color: 'var(--ice)' }}>{lead.status}</strong> • {lead.notes}
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <h4 className="gc-header" style={{ color: '#10b981', marginBottom: '0.6rem' }}>
                  // ACCOUNTS RECEIVABLE (INVOICES)
                </h4>
                {dbData?.invoices?.map((inv) => (
                  <div key={inv.id} className="gc-panel gc-data" style={{ padding: '0.8rem', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                      <span style={{ color: '#fff' }}>{inv.client} ({inv.id})</span>
                      <span style={{ color: inv.amount > 50000 ? 'var(--amber)' : 'var(--ice)' }}>₹{inv.amount?.toLocaleString('en-IN')}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                      STATUS: <strong style={{ color: 'var(--amber)' }}>{inv.status}</strong> • DUE: {inv.dueDate} ({inv.daysOverdue}d overdue)
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
