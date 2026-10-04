import React, { useState, useEffect, useRef } from 'react';
import AyusReactor from './components/AyusReactor.jsx';
import './index.css';
import './groundcontrol.css';

const API_BASE = 'http://localhost:3001';
const WS_URL = 'ws://localhost:3001';

const AGENTS = ['sales', 'finance', 'marketing', 'secretary', 'hr', 'cto'];

const AGENT_NAMES = {
  sales: 'Arjun',
  finance: 'Meera',
  marketing: 'Kabir',
  secretary: 'AYUS',
  hr: 'Isha',
  cto: 'Vikram',
};

const AGENT_META = {
  sales:     { display: 'Sales & Growth',   subtitle: 'RESEARCH & DEALS',   icon: '💼', color: '#5fb3d9', desc: 'Performs market research, qualifies inbound leads, and prepares commercial agreements.' },
  finance:   { display: 'Finance & Risk',   subtitle: 'TREASURY SYSTEM',    icon: '📊', color: '#56c2a6', desc: 'Manages invoices, chases overdue accounts receivable, and tracks payment delinquency.' },
  marketing: { display: 'Creative & Growth', subtitle: 'SCRIPTWRITING & ADS', icon: '🚀', color: '#8a8fe0', desc: 'Writes high-converting copy, plans viral campaigns, and coordinates ad spend.' },
  secretary: { display: 'AYUS Core',        subtitle: 'EXECUTIVE ASSISTANT', icon: '🧠', color: '#7dd3d8', desc: 'Your JARVIS-style operations intelligence — coordinates, drafts, and runs daily ops.' },
  hr:        { display: 'People Operations', subtitle: 'TALENT & HIRING',    icon: '👥', color: '#b088d9', desc: 'Screens developer portfolios, conducts technical matching, and prepares offer letters.' },
  cto:       { display: 'Builder & Infra',  subtitle: 'BUILD SYSTEM & CTO', icon: '⚡', color: '#4f9fd4', desc: 'Monitors cluster telemetry, triages production alerts, and executes safe rollbacks.' },
};

const NAV_TIERS = [
  {
    label: 'Flight deck',
    items: [
      { id: 'ayus',      icon: '🧠', label: 'AYUS HUD' },
      { id: 'approvals', icon: '🔒', label: 'Clearances' },
      { id: 'insights',  icon: '📈', label: 'Insights' },
    ],
  },
  {
    label: 'The org',
    items: [
      { id: 'agents',    icon: '👥', label: 'Agents' },
      { id: 'missions',  icon: '⚡', label: 'Missions' },
      { id: 'workflows', icon: '🔄', label: 'Workflows' },
    ],
  },
  {
    label: 'Records',
    items: [
      { id: 'leads',     icon: '💼', label: 'Lead Pipeline' },
      { id: 'invoices',  icon: '📊', label: 'Treasury / Invoices' },
      { id: 'audit',     icon: '📜', label: 'Audit Ledger' },
    ],
  },
];

function money(amount) {
  if (typeof amount !== 'number') return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function App() {
  const [activeTab, setActiveTab] = useState('ayus');
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [runningAgent, setRunningAgent] = useState(null);
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
  const [dbData, setDbData] = useState(null);
  const [logs, setLogs] = useState([]);
  const [reactorState, setReactorState] = useState('standby');
  const [reactorTranscript, setReactorTranscript] = useState('Ground Control active. Department agents operational.');
  const [now, setNow] = useState(() => new Date());
  const [lastSweepTime, setLastSweepTime] = useState(null);
  const terminalEndRef = useRef(null);

  // Live Clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Auto-scroll terminal
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Fetch initial data
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
        } else if (!busy) {
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
  }, [busy]);

  const addLog = (tag, text, type = 'info') => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev.slice(-100), { time, tag, text, type }]);
  };

  const handleIncomingEvent = (payload) => {
    const { type, data } = payload;

    if (type === 'agent:start') {
      setBusy(true);
      setReactorState('thinking');
      setReactorTranscript(`Autonomous flight cycle started for ${data.department}.`);
      addLog(data.agent?.name || 'AGENT', `Autonomous cycle triggered for ${data.department}`, 'thought');
    } else if (type === 'agent:thought') {
      addLog(data.agentName, `🧠 Plan: ${data.thought}`, 'thought');
    } else if (type === 'agent:tool_call') {
      addLog(data.agentName, `🔧 Proposing: ${data.tool} (${data.intent})`, 'tool');
    } else if (type === 'agent:policy_eval') {
      addLog('HARNESS', `🛡️ Governance: ${data.tool} -> Risk=${data.riskLevel}, Halt=${data.requiresApproval}`, 'policy');
    } else if (type === 'agent:paused_for_approval') {
      setReactorState('alert');
      setReactorTranscript(`CRITICAL ACTION HALTED: ${data.summary}. Pushed to Amber Clearance Queue.`);
      addLog('GATEKEEPER', `⛔ Intercepted ${data.agentName}: Action halted! Awaiting founder clearance.`, 'approval');
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
    } else if (type === 'agent:finished') {
      setBusy(false);
      setLastSweepTime(new Date());
    }
  };

  const runAllAgents = async () => {
    setBusy(true);
    setReactorState('thinking');
    setReactorTranscript('Executing full multi-department autonomous sweep across all 5 specialized seats...');
    addLog('ORCHESTRATOR', 'Running full autonomous enterprise sweep across all 5 departments...', 'thought');
    try {
      await fetch(`${API_BASE}/api/agents/run-all`, { method: 'POST' });
      setLastSweepTime(new Date());
      await refreshAllData();
    } catch (e) {
      addLog('ERROR', `Run all failed: ${e.message}`, 'approval');
    } finally {
      setBusy(false);
    }
  };

  const runSingleAgent = async (deptKey) => {
    setRunningAgent(deptKey);
    setBusy(true);
    try {
      await fetch(`${API_BASE}/api/agents/${deptKey.toUpperCase()}/run`, { method: 'POST' });
      await refreshAllData();
    } catch (e) {
      addLog('ERROR', `Run failed: ${e.message}`, 'approval');
    } finally {
      setRunningAgent(null);
      setBusy(false);
    }
  };

  const triggerScenario = async (scenarioType) => {
    setBusy(true);
    setReactorState('thinking');
    setReactorTranscript(`Mission scenario ${scenarioType} dispatched...`);
    addLog('SIMULATOR', `Dispatching mission: ${scenarioType}...`, 'tool');
    try {
      await fetch(`${API_BASE}/api/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioType })
      });
      await refreshAllData();
    } catch (e) {
      addLog('ERROR', `Mission failed: ${e.message}`, 'approval');
      setReactorState('standby');
    } finally {
      setBusy(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await fetch(`${API_BASE}/api/approvals/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approver: 'Founder (Anish)' })
      });
      await refreshAllData();
    } catch (e) {
      alert(`Approval error: ${e.message}`);
    }
  };

  const handleReject = async (id) => {
    const reason = prompt('Enter rejection rationale for audit ledger:', 'Risk exceeds current Q4 budget tolerance');
    if (!reason) return;
    try {
      await fetch(`${API_BASE}/api/approvals/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, reviewer: 'Founder (Anish)' })
      });
      await refreshAllData();
    } catch (e) {
      alert(`Rejection error: ${e.message}`);
    }
  };

  return (
    <div className="app-shell" style={{ display: 'flex', minHeight: '100vh', background: 'var(--void)' }}>
      {/* Scope Radar Sweep & Grid */}
      <div className="ambient-grid" />
      <div className="gc-radar-bg" />
      <div className="gc-radar-sweep" />

      {/* ================================================================
          LEFT RAIL (3-TIER SIDEBAR)
         ================================================================ */}
      <aside
        className="sidebar"
        style={{
          width: navCollapsed ? '64px' : 'var(--sidebar-w)',
          transition: 'var(--transition)',
          flexShrink: 0,
          background: 'var(--deck)',
          borderRight: '1px solid var(--line-soft)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 50,
          position: 'sticky',
          top: 0,
          height: '100vh'
        }}
      >
        {/* Brand Block */}
        <div
          className="brand-block"
          style={{
            padding: '16px',
            borderBottom: '1px solid var(--line-soft)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              background: 'var(--deck-2)',
              border: '1px solid var(--ice)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              borderRadius: '2px',
              boxShadow: '0 0 10px rgba(95, 179, 217, 0.25)'
            }}
          >
            🦈
          </div>
          {!navCollapsed && (
            <div>
              <div style={{ fontFamily: 'var(--display)', fontSize: '13px', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--ink-bright)', textTransform: 'uppercase' }}>
                AYUS OPS
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '0.14em', color: 'var(--ice)', textTransform: 'uppercase' }}>
                GROUND CONTROL
              </div>
            </div>
          )}
        </div>

        {/* 3-Tier Navigation */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 8px' }}>
          {NAV_TIERS.map((tier, idx) => (
            <div key={idx} style={{ marginBottom: '18px' }}>
              {!navCollapsed && (
                <div
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: '9px',
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    color: 'var(--muted)',
                    padding: '4px 10px 8px',
                    fontWeight: 600
                  }}
                >
                  {tier.label}
                </div>
              )}
              {tier.items.map((item) => {
                const isActive = activeTab === item.id;
                const isClearance = item.id === 'approvals';
                const hasPending = isClearance && approvals.length > 0;

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: navCollapsed ? 'center' : 'space-between',
                      gap: '10px',
                      padding: '8px 10px',
                      marginBottom: '2px',
                      background: isActive
                        ? isClearance && hasPending
                          ? 'var(--amber-dim)'
                          : 'var(--ice-dim)'
                        : 'transparent',
                      border: 'none',
                      borderLeft: isActive
                        ? isClearance && hasPending
                          ? '2px solid var(--amber)'
                          : '2px solid var(--ice)'
                        : '2px solid transparent',
                      color: isActive
                        ? isClearance && hasPending
                          ? 'var(--amber)'
                          : 'var(--ice)'
                        : 'var(--muted-bright)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: 'var(--display)',
                      fontSize: '12px',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      transition: 'var(--transition)'
                    }}
                    title={item.label}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px' }}>{item.icon}</span>
                      {!navCollapsed && <span>{item.label}</span>}
                    </div>

                    {!navCollapsed && isClearance && approvals.length > 0 && (
                      <span
                        className="pending-badge-red"
                        style={{
                          fontFamily: 'var(--mono)',
                          fontSize: '9px',
                          padding: '1px 6px',
                          color: 'var(--amber)',
                          border: '1px solid rgba(232, 168, 56, 0.45)',
                          background: 'rgba(232, 168, 56, 0.12)'
                        }}
                      >
                        {approvals.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Bottom Operator Block */}
        {!navCollapsed && (
          <div
            style={{
              padding: '12px 14px',
              borderTop: '1px solid var(--line-soft)',
              fontFamily: 'var(--mono)',
              fontSize: '10px',
              color: 'var(--muted)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--ink)' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--amber)' }} />
              <strong>FOUNDER: ANISH</strong>
            </div>
            <div style={{ fontSize: '8.5px', marginTop: '2px', letterSpacing: '0.06em' }}>
              SEAT: CEO • FULL CLEARANCE
            </div>
          </div>
        )}
      </aside>

      {/* ================================================================
          MAIN CONTENT AREA & TOPBAR
         ================================================================ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* TopBar */}
        <header
          className="topbar"
          style={{
            height: 'var(--topbar-h)',
            background: 'rgba(11, 14, 18, 0.85)',
            borderBottom: '1px solid var(--line-soft)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            position: 'sticky',
            top: 0,
            zIndex: 45,
            backdropFilter: 'blur(12px)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button
              className="nav-toggle-btn"
              onClick={() => setNavCollapsed(!navCollapsed)}
              style={{
                background: 'transparent',
                border: '1px solid var(--line-soft)',
                color: 'var(--muted-bright)',
                padding: '4px 8px',
                cursor: 'pointer'
              }}
            >
              ☰
            </button>

            {approvals.length > 0 && (
              <button
                className="topbar-pending-btn"
                onClick={() => setActiveTab('approvals')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  cursor: 'pointer'
                }}
              >
                <span className="red-dot-pulse" style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--amber)' }} />
                <span>{approvals.length} PENDING CLEARANCE</span>
              </button>
            )}

            <div className={`topbar-status ${busy ? 'is-running' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="top-dot" style={{ width: '6px', height: '6px', borderRadius: '50%' }} />
              <span>{busy ? 'Agents Executing Swarm' : 'Ground Control Operational'}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="topbar-clock" style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--ink)' }}>
              {now.toLocaleTimeString('en-IN', { hour12: false })} IST
            </div>

            <button
              className="run-btn"
              disabled={busy}
              onClick={runAllAgents}
              style={{ padding: '6px 14px', cursor: 'pointer' }}
            >
              {busy ? 'SWEEPING...' : '⚡ SWEEP ORG NOW'}
            </button>
          </div>
        </header>

        {/* The Signature Clearance Strip (26px band across org state) */}
        <div className="clearance-strip">
          <span className="clearance-label" style={{ color: 'var(--amber)', fontWeight: 700 }}>
            CLEARANCES
          </span>

          <div className="clearance-ticks">
            {AGENTS.map((id) => {
              const isHolding = approvals.some(a => a.agentId?.includes(id));
              const state = isHolding ? 'holding' : busy ? 'busy' : '';
              return (
                <span
                  key={id}
                  className={`clearance-tick ${state}`}
                  title={`${AGENT_NAMES[id]} — ${isHolding ? 'Waiting for founder clearance' : busy ? 'Working' : 'Idle'}`}
                />
              );
            })}
          </div>

          <div className="clearance-readout">
            <span><b>{AGENTS.length}</b> AGENTS</span>
            {approvals.length > 0 ? (
              <button
                className="holding-count"
                onClick={() => setActiveTab('approvals')}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: '9.5px', textTransform: 'uppercase' }}
              >
                <b className="holding-count">{approvals.length}</b> HOLDING FOR FOUNDER
              </button>
            ) : (
              <span style={{ color: 'var(--signal)' }}>AIRSPACE CLEAR</span>
            )}
            {lastSweepTime && (
              <span>
                LAST SWEEP <b>{lastSweepTime.toLocaleTimeString('en-IN', { hour12: false })}</b>
              </span>
            )}
          </div>
        </div>

        {/* Content Body */}
        <main style={{ padding: '24px', flex: 1, position: 'relative', zIndex: 10 }}>
          {/* TAB 1: FLIGHT DECK (AYUS HUD) */}
          {activeTab === 'ayus' && (
            <div>
              {/* AYUS Reactor Hero Band */}
              <AyusReactor
                currentState={reactorState}
                transcript={reactorTranscript}
                onTriggerSweep={runAllAgents}
              />

              {/* Quick Metrics Bar */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
                <div className="card-urgent" style={{ background: 'var(--deck)', padding: '14px 18px' }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: '9.5px', letterSpacing: '0.12em', color: 'var(--amber)', textTransform: 'uppercase' }}>
                    [CRITICAL INTERCEPTIONS]
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: '24px', fontWeight: 700, color: 'var(--amber)', marginTop: '4px' }}>
                    {approvals.length + metrics.approvedAndExecutedCount + metrics.rejectedSafetyCount}
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--muted)', marginTop: '2px' }}>
                    Halted prior to external mutation
                  </div>
                </div>

                <div className="card-urgent" style={{ background: 'var(--deck)', padding: '14px 18px' }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: '9.5px', letterSpacing: '0.12em', color: 'var(--amber)', textTransform: 'uppercase' }}>
                    [PENDING CLEARANCE]
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: '24px', fontWeight: 700, color: '#fff', marginTop: '4px' }}>
                    {approvals.length}
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--muted)', marginTop: '2px' }}>
                    Awaiting founder sign-off
                  </div>
                </div>

                <div style={{ background: 'var(--deck)', border: '1px solid var(--line-soft)', padding: '14px 18px', borderLeft: '2px solid var(--ice)' }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: '9.5px', letterSpacing: '0.12em', color: 'var(--ice)', textTransform: 'uppercase' }}>
                    [HOURS AUTOMATED]
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: '24px', fontWeight: 700, color: 'var(--ice)', marginTop: '4px' }}>
                    {metrics.hoursSavedAutonomousOps} hrs
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--muted)', marginTop: '2px' }}>
                    Autonomously executed
                  </div>
                </div>

                <div style={{ background: 'var(--deck)', border: '1px solid var(--line-soft)', padding: '14px 18px', borderLeft: '2px solid var(--signal)' }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: '9.5px', letterSpacing: '0.12em', color: 'var(--signal)', textTransform: 'uppercase' }}>
                    [SAFETY ADHERENCE]
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: '24px', fontWeight: 700, color: 'var(--signal)', marginTop: '4px' }}>
                    {metrics.riskMitigationRate}
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--muted)', marginTop: '2px' }}>
                    Zero unapproved actions
                  </div>
                </div>
              </div>

              {/* Two Column Deck: Mission Dispatcher vs Live Telemetry Stream */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.25fr', gap: '20px' }}>
                {/* Left: Mission Simulator */}
                <div style={{ background: 'var(--deck)', border: '1px solid var(--line-soft)', padding: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--line-soft)', paddingBottom: '10px', marginBottom: '14px' }}>
                    <div style={{ fontFamily: 'var(--display)', fontSize: '13px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ice)' }}>
                      ⚡ LIVE MISSION SIMULATOR
                    </div>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '9.5px', color: 'var(--muted)' }}>
                      JUDGE PITCH SUITE
                    </span>
                  </div>

                  <p style={{ fontFamily: 'var(--mono)', fontSize: '10.5px', color: 'var(--muted-bright)', marginBottom: '14px', lineHeight: 1.5 }}>
                    Inject real-world operational anomalies to demonstrate autonomous tool calling and the Human-in-the-Loop circuit breaker:
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button
                      className="run-btn"
                      disabled={busy}
                      onClick={() => triggerScenario('ENTERPRISE_CONTRACT')}
                      style={{ padding: '10px 14px', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <span>💼 Enterprise Deal Proposal (₹1.5L Contract)</span>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--amber)' }}>ARJUN // SALES</span>
                    </button>

                    <button
                      className="run-btn"
                      disabled={busy}
                      onClick={() => triggerScenario('HIGH_VALUE_INVOICE')}
                      style={{ padding: '10px 14px', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <span>📊 High-Debt Overdue Notice (₹1.2L Invoice)</span>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--amber)' }}>MEERA // FINANCE</span>
                    </button>

                    <button
                      className="run-btn"
                      disabled={busy}
                      onClick={() => triggerScenario('SEV1_INCIDENT')}
                      style={{ padding: '10px 14px', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <span>⚡ SEV-1 Production Incident Hotfix &amp; Rollback</span>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--amber)' }}>VIKRAM // CTO</span>
                    </button>

                    <button
                      className="run-btn"
                      disabled={busy}
                      onClick={() => triggerScenario('TALENT_OFFER')}
                      style={{ padding: '10px 14px', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <span>👥 Extend Lead Engineer Offer Letter (₹28L CTC)</span>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--amber)' }}>ISHA // HR</span>
                    </button>

                    <button
                      className="run-btn"
                      disabled={busy}
                      onClick={() => triggerScenario('AD_BUDGET')}
                      style={{ padding: '10px 14px', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <span>🚀 Commit Q4 Ad Spend Budget (₹85k Campaign)</span>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--amber)' }}>KABIR // MKTG</span>
                    </button>
                  </div>
                </div>

                {/* Right: Machine Telemetry Feed */}
                <div style={{ background: 'var(--deck)', border: '1px solid var(--line-soft)', padding: '18px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--line-soft)', paddingBottom: '10px', marginBottom: '14px' }}>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--ice)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                      TELEMETRY STREAM [ICE]
                    </div>
                    <button
                      onClick={() => setLogs([])}
                      style={{ background: 'transparent', border: '1px solid var(--line-soft)', color: 'var(--muted)', fontSize: '9px', fontFamily: 'var(--mono)', padding: '2px 8px', cursor: 'pointer' }}
                    >
                      CLEAR
                    </button>
                  </div>

                  <div style={{ flex: 1, maxHeight: '360px', overflowY: 'auto', fontFamily: 'var(--mono)', fontSize: '10.5px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {logs.length === 0 ? (
                      <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '3rem 0' }}>
                        &gt; Awaiting agent swarm actions. Click any mission scenario to begin stream.
                      </div>
                    ) : (
                      logs.map((log, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '8px', lineHeight: 1.45 }}>
                          <span style={{ color: 'var(--muted)', fontSize: '9px', flexShrink: 0 }}>{log.time}</span>
                          <span style={{ color: log.type === 'approval' ? 'var(--amber)' : log.type === 'exec' ? 'var(--signal)' : 'var(--ice)', fontWeight: 600, flexShrink: 0 }}>
                            [{log.tag}]
                          </span>
                          <span style={{ color: 'var(--ink)' }}>{log.text}</span>
                        </div>
                      ))
                    )}
                    <div ref={terminalEndRef} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CLEARANCES (APPROVAL QUEUE) */}
          {activeTab === 'approvals' && (
            <div>
              <div style={{ borderBottom: '1px solid var(--line-soft)', paddingBottom: '12px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontFamily: 'var(--display)', fontSize: '18px', color: 'var(--amber)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                    FOUNDER CLEARANCE QUEUE [AMBER]
                  </h2>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: '10.5px', color: 'var(--muted-bright)', marginTop: '2px' }}>
                    Actions requiring explicit founder authorization prior to real-world execution.
                  </div>
                </div>
                <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--amber)', padding: '3px 10px', border: '1px solid var(--amber)', background: 'var(--amber-dim)' }}>
                  {approvals.length} HOLDING
                </span>
              </div>

              {approvals.length === 0 ? (
                <div style={{ background: 'var(--deck)', border: '1px solid var(--line-soft)', padding: '48px', textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', marginBottom: '8px' }}>🛡️</div>
                  <div style={{ fontFamily: 'var(--display)', fontSize: '14px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-bright)' }}>
                    AIRSPACE CLEAR • NO PENDING CLEARANCES
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: '10.5px', color: 'var(--muted)', marginTop: '6px' }}>
                    All autonomous agents are operating within policy thresholds. Trigger a scenario from the Flight Deck to simulate a critical action.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {approvals.map((req) => (
                    <div
                      key={req.id}
                      className="gc-clearance-card"
                      style={{ background: 'var(--deck)', borderLeft: '3px solid var(--amber)', border: '1px solid rgba(232, 168, 56, 0.3)', padding: '18px' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontFamily: 'var(--display)', fontSize: '15px', fontWeight: 700, color: '#fff', letterSpacing: '0.06em' }}>
                          {req.proposalSummary}
                        </span>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--amber)', background: 'var(--amber-dim)', border: '1px solid var(--amber)', padding: '2px 8px', textTransform: 'uppercase' }}>
                          {req.riskLevel} CLEARANCE
                        </span>
                      </div>

                      <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', background: '#000', borderLeft: '3px solid var(--amber)', padding: '10px 14px', color: '#fde68a', marginBottom: '12px' }}>
                        ⚠️ <strong>POLICY RESTRICTION:</strong> {req.reason}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--muted)' }}>
                          SEAT: <strong style={{ color: 'var(--ice)' }}>{req.department}</strong> • TARGET TOOL: <code style={{ color: '#fff' }}>{req.toolName}</code>
                        </span>

                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button
                            className="gc-clearance-btn-reject"
                            onClick={() => handleReject(req.id)}
                            style={{ padding: '8px 18px', cursor: 'pointer' }}
                          >
                            ✕ REJECT
                          </button>
                          <button
                            className="gc-clearance-btn-approve"
                            onClick={() => handleApprove(req.id)}
                            style={{ padding: '8px 20px', cursor: 'pointer' }}
                          >
                            ✓ APPROVE &amp; EXECUTE
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: AGENTS (THE ORG) */}
          {activeTab === 'agents' && (
            <div>
              <div style={{ borderBottom: '1px solid var(--line-soft)', paddingBottom: '12px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontFamily: 'var(--display)', fontSize: '18px', color: 'var(--ice)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                    THE ORG • 6 SPECIALIZED SEATS
                  </h2>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: '10.5px', color: 'var(--muted-bright)', marginTop: '2px' }}>
                    Modular agents conforming to HackPulse Problem 04 monorepo architecture.
                  </div>
                </div>
                <button className="run-btn" disabled={busy} onClick={runAllAgents} style={{ padding: '6px 14px' }}>
                  RUN ALL 6 AGENTS
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                {Object.entries(AGENT_META).map(([key, meta]) => (
                  <div
                    key={key}
                    style={{
                      background: 'var(--deck)',
                      border: '1px solid var(--line-soft)',
                      borderLeft: `3px solid ${meta.color}`,
                      padding: '18px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '20px' }}>{meta.icon}</span>
                          <div>
                            <h3 style={{ fontFamily: 'var(--display)', fontSize: '15px', color: '#fff', textTransform: 'uppercase' }}>
                              {AGENT_NAMES[key]}
                            </h3>
                            <div style={{ fontFamily: 'var(--mono)', fontSize: '9.5px', color: meta.color, letterSpacing: '0.1em' }}>
                              {meta.subtitle}
                            </div>
                          </div>
                        </div>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', padding: '2px 6px', border: '1px solid var(--line-soft)', color: 'var(--muted)' }}>
                          SEAT // {key.toUpperCase()}
                        </span>
                      </div>

                      <p style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--ink)', lineHeight: 1.5, marginTop: '8px' }}>
                        {meta.desc}
                      </p>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', borderTop: '1px solid var(--line-soft)', paddingTop: '10px' }}>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: '9.5px', color: 'var(--muted)' }}>
                        STATUS: <strong style={{ color: 'var(--signal)' }}>READY</strong>
                      </span>

                      <button
                        className="run-btn"
                        disabled={busy || runningAgent === key}
                        onClick={() => runSingleAgent(key)}
                        style={{ padding: '4px 12px', fontSize: '10.5px' }}
                      >
                        {runningAgent === key ? 'RUNNING...' : `RUN ${AGENT_NAMES[key].toUpperCase()}`}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: MISSIONS */}
          {activeTab === 'missions' && (
            <div>
              <div style={{ borderBottom: '1px solid var(--line-soft)', paddingBottom: '12px', marginBottom: '20px' }}>
                <h2 style={{ fontFamily: 'var(--display)', fontSize: '18px', color: 'var(--ice)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  OPERATIONAL MISSIONS
                </h2>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '10.5px', color: 'var(--muted-bright)', marginTop: '2px' }}>
                  Standard Operating Procedures and executable multi-step plans.
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                <div style={{ background: 'var(--deck)', border: '1px solid var(--line-soft)', padding: '16px' }}>
                  <div style={{ fontFamily: 'var(--display)', fontSize: '13px', color: '#fff', fontWeight: 700 }}>
                    MISSION 01: INBOUND QUALIFICATION
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--ice)', marginTop: '4px' }}>
                    SEAT: ARJUN // SALES
                  </div>
                  <p style={{ fontFamily: 'var(--mono)', fontSize: '10.5px', color: 'var(--muted)', marginTop: '8px' }}>
                    Observe new CRM leads, score budget alignment, verify capabilities, and draft proposal terms.
                  </p>
                  <button className="run-btn" onClick={() => triggerScenario('ENTERPRISE_CONTRACT')} style={{ width: '100%', marginTop: '12px' }}>
                    DISPATCH MISSION
                  </button>
                </div>

                <div style={{ background: 'var(--deck)', border: '1px solid var(--line-soft)', padding: '16px' }}>
                  <div style={{ fontFamily: 'var(--display)', fontSize: '13px', color: '#fff', fontWeight: 700 }}>
                    MISSION 02: CASH-FLOW DEBT AUDIT
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--finance)', marginTop: '4px' }}>
                    SEAT: MEERA // FINANCE
                  </div>
                  <p style={{ fontFamily: 'var(--mono)', fontSize: '10.5px', color: 'var(--muted)', marginTop: '8px' }}>
                    Query overdue accounts, calculate delinquency risk scores, draft reminders, and propose debt settlements.
                  </p>
                  <button className="run-btn" onClick={() => triggerScenario('HIGH_VALUE_INVOICE')} style={{ width: '100%', marginTop: '12px' }}>
                    DISPATCH MISSION
                  </button>
                </div>

                <div style={{ background: 'var(--deck)', border: '1px solid var(--line-soft)', padding: '16px' }}>
                  <div style={{ fontFamily: 'var(--display)', fontSize: '13px', color: '#fff', fontWeight: 700 }}>
                    MISSION 03: CLUSTER SEV-1 MITIGATION
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--cto)', marginTop: '4px' }}>
                    SEAT: VIKRAM // CTO
                  </div>
                  <p style={{ fontFamily: 'var(--mono)', fontSize: '10.5px', color: 'var(--muted)', marginTop: '8px' }}>
                    Detect CPU/memory load anomalies, isolate stack traces, and request authorization for hotfix deployment.
                  </p>
                  <button className="run-btn" onClick={() => triggerScenario('SEV1_INCIDENT')} style={{ width: '100%', marginTop: '12px' }}>
                    DISPATCH MISSION
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: LEADS (RECORDS) */}
          {activeTab === 'leads' && (
            <div>
              <div style={{ borderBottom: '1px solid var(--line-soft)', paddingBottom: '12px', marginBottom: '20px' }}>
                <h2 style={{ fontFamily: 'var(--display)', fontSize: '18px', color: 'var(--ice)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  CRM INBOUND LEADS PIPELINE
                </h2>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '10.5px', color: 'var(--muted-bright)', marginTop: '2px' }}>
                  Live prospect data audited by Sales Agent Arjun.
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {dbData?.leads?.map((lead) => (
                  <div
                    key={lead.id}
                    style={{
                      background: 'var(--deck)',
                      border: '1px solid var(--line-soft)',
                      padding: '14px 18px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontFamily: 'var(--display)', fontSize: '14px', color: '#fff', fontWeight: 700 }}>
                        {lead.company}
                      </div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: '10.5px', color: 'var(--muted)', marginTop: '2px' }}>
                        CONTACT: {lead.contact} ({lead.email}) • NOTES: {lead.notes}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: '15px', fontWeight: 700, color: 'var(--signal)' }}>
                        {money(lead.budget)}
                      </div>
                      <span
                        style={{
                          fontFamily: 'var(--mono)',
                          fontSize: '9px',
                          color: lead.status === 'QUALIFIED' ? 'var(--ice)' : 'var(--amber)',
                          border: `1px solid ${lead.status === 'QUALIFIED' ? 'var(--ice)' : 'var(--amber)'}`,
                          padding: '1px 6px',
                          textTransform: 'uppercase'
                        }}
                      >
                        STATUS: {lead.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: INVOICES (TREASURY) */}
          {activeTab === 'invoices' && (
            <div>
              <div style={{ borderBottom: '1px solid var(--line-soft)', paddingBottom: '12px', marginBottom: '20px' }}>
                <h2 style={{ fontFamily: 'var(--display)', fontSize: '18px', color: 'var(--finance)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  TREASURY &amp; ACCOUNTS RECEIVABLE
                </h2>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '10.5px', color: 'var(--muted-bright)', marginTop: '2px' }}>
                  Live invoicing ledger monitored by Finance Agent Meera.
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {dbData?.invoices?.map((inv) => (
                  <div
                    key={inv.id}
                    style={{
                      background: 'var(--deck)',
                      border: '1px solid var(--line-soft)',
                      borderLeft: inv.amount > 50000 ? '3px solid var(--amber)' : '3px solid var(--ice)',
                      padding: '14px 18px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontFamily: 'var(--display)', fontSize: '14px', color: '#fff', fontWeight: 700 }}>
                        {inv.client} <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--muted)' }}>[{inv.id}]</span>
                      </div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: '10.5px', color: 'var(--muted)', marginTop: '2px' }}>
                        DUE DATE: {inv.dueDate} • DELINQUENCY: <strong style={{ color: 'var(--amber)' }}>{inv.daysOverdue} DAYS OVERDUE</strong>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: '15px', fontWeight: 700, color: inv.amount > 50000 ? 'var(--amber)' : 'var(--ice)' }}>
                        {money(inv.amount)}
                      </div>
                      <span
                        style={{
                          fontFamily: 'var(--mono)',
                          fontSize: '9px',
                          color: inv.amount > 50000 ? 'var(--amber)' : 'var(--signal)',
                          border: `1px solid ${inv.amount > 50000 ? 'var(--amber)' : 'var(--signal)'}`,
                          padding: '1px 6px',
                          textTransform: 'uppercase'
                        }}
                      >
                        {inv.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: AUDIT LEDGER */}
          {activeTab === 'audit' && (
            <div>
              <div style={{ borderBottom: '1px solid var(--line-soft)', paddingBottom: '12px', marginBottom: '20px' }}>
                <h2 style={{ fontFamily: 'var(--display)', fontSize: '18px', color: 'var(--signal)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  IMMUTABLE AUDIT LEDGER
                </h2>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '10.5px', color: 'var(--muted-bright)', marginTop: '2px' }}>
                  Cryptographically stamped execution records of all founder clearances.
                </div>
              </div>

              {dbData?.auditLog?.length === 0 ? (
                <div style={{ background: 'var(--deck)', border: '1px solid var(--line-soft)', padding: '36px', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--muted)' }}>
                  Ledger empty. Approved actions from the Clearance Queue will be appended here.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {dbData?.auditLog?.map((entry) => (
                    <div
                      key={entry.id}
                      style={{
                        background: 'var(--deck)',
                        border: '1px solid var(--line-soft)',
                        borderLeft: '2px solid var(--signal)',
                        padding: '10px 14px',
                        fontFamily: 'var(--mono)',
                        fontSize: '10.5px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <strong style={{ color: 'var(--signal)' }}>[{entry.id}]</strong> TOOL: <code>{entry.tool}</code>
                        <div style={{ color: 'var(--muted)', fontSize: '9.5px', marginTop: '2px' }}>
                          AUTHORIZED BY: {entry.authorizedBy} • TIME: {entry.timestamp}
                        </div>
                      </div>
                      <span style={{ color: 'var(--signal)', border: '1px solid var(--signal)', padding: '1px 6px', fontSize: '9px' }}>
                        {entry.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 8: INSIGHTS */}
          {activeTab === 'insights' && (
            <div>
              <div style={{ borderBottom: '1px solid var(--line-soft)', paddingBottom: '12px', marginBottom: '20px' }}>
                <h2 style={{ fontFamily: 'var(--display)', fontSize: '18px', color: 'var(--ice)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  ENTERPRISE OPERATIONS INSIGHTS
                </h2>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '10.5px', color: 'var(--muted-bright)', marginTop: '2px' }}>
                  Efficiency metrics and risk avoidance telemetry.
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                <div style={{ background: 'var(--deck)', border: '1px solid var(--line-soft)', padding: '20px' }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase' }}>
                    AUTONOMOUS TIME SAVED
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: '32px', fontWeight: 700, color: 'var(--ice)', margin: '8px 0' }}>
                    {metrics.hoursSavedAutonomousOps} hrs
                  </div>
                  <p style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--muted-bright)' }}>
                    Calculated across lead triage, invoice queries, and incident diagnosis.
                  </p>
                </div>

                <div style={{ background: 'var(--deck)', border: '1px solid var(--line-soft)', padding: '20px' }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase' }}>
                    CRITICAL ACTIONS HALTED
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: '32px', fontWeight: 700, color: 'var(--amber)', margin: '8px 0' }}>
                    {approvals.length + metrics.approvedAndExecutedCount + metrics.rejectedSafetyCount}
                  </div>
                  <p style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--muted-bright)' }}>
                    High-value contracts, debt discounts, and server rollbacks safely intercepted.
                  </p>
                </div>

                <div style={{ background: 'var(--deck)', border: '1px solid var(--line-soft)', padding: '20px' }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase' }}>
                    SAFETY GOVERNANCE RATE
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: '32px', fontWeight: 700, color: 'var(--signal)', margin: '8px 0' }}>
                    {metrics.riskMitigationRate}
                  </div>
                  <p style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--muted-bright)' }}>
                    100% adherence to defined policy thresholds without hallucinated bypass.
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
