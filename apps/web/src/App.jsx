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
  sales:     { display: 'Researcher',       subtitle: 'RESEARCH & DEALS',   icon: '💼', color: '#5fb3d9', desc: 'Performs market research, qualifies inbound leads, and prepares commercial agreements.' },
  finance:   { display: 'Finance',          subtitle: 'TREASURY SYSTEM',    icon: '📊', color: '#56c2a6', desc: 'Manages invoices, chases overdue accounts receivable, and tracks payment delinquency.' },
  marketing: { display: 'Content Writer',   subtitle: 'SCRIPTWRITING & ADS', icon: '🚀', color: '#8a8fe0', desc: 'Writes high-converting copy, plans viral campaigns, and coordinates ad spend.' },
  secretary: { display: 'AYUS',             subtitle: 'EXECUTIVE ASSISTANT', icon: '🧠', color: '#7dd3d8', desc: 'Your JARVIS-style operations intelligence — coordinates, drafts, and runs daily ops.' },
  hr:        { display: 'Talent & HR',      subtitle: 'CAMPAIGNS & HIRING', icon: '👥', color: '#b088d9', desc: 'Screens developer portfolios, conducts technical matching, and prepares offer letters.' },
  cto:       { display: 'Builder & CTO',    subtitle: 'BUILD SYSTEM & TECH', icon: '⚡', color: '#4f9fd4', desc: 'Monitors cluster telemetry, triages production alerts, and executes safe rollbacks.' },
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
  const [selectedAgentFilter, setSelectedAgentFilter] = useState('all');
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

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const refreshAllData = async () => {
    try {
      const [resApprovals, resMetrics, resDb] = await Promise.all([
        fetch(`${API_BASE}/api/approvals`).then(r => r.json()).catch(() => ({ pending: [], history: [] })),
        fetch(`${API_BASE}/api/metrics`).then(r => r.json()).catch(() => ({})),
        fetch(`${API_BASE}/api/db`).then(r => r.json()).catch(() => null)
      ]);

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
      setReactorTranscript(`Autonomous cycle started for ${data.department}.`);
      addLog(data.agent?.name || 'AGENT', `Autonomous cycle triggered for ${data.department}`, 'thought');
    } else if (type === 'agent:thought') {
      addLog(data.agentName, `🧠 Plan: ${data.thought}`, 'thought');
    } else if (type === 'agent:tool_call') {
      addLog(data.agentName, `🔧 Proposing: ${data.tool} (${data.intent})`, 'tool');
    } else if (type === 'agent:policy_eval') {
      addLog('HARNESS', `🛡️ Governance: ${data.tool} -> Risk=${data.riskLevel}, Halt=${data.requiresApproval}`, 'policy');
    } else if (type === 'agent:paused_for_approval') {
      setReactorState('alert');
      setReactorTranscript(`CRITICAL ACTION HALTED: ${data.summary}. Pushed to Clearance Queue.`);
      addLog('GATEKEEPER', `⛔ Intercepted ${data.agentName}: Action halted! Awaiting clearance.`, 'approval');
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
    setReactorTranscript('Executing full multi-department autonomous sweep across 6 specialized seats...');
    addLog('ORCHESTRATOR', 'Running full autonomous enterprise sweep across all departments...', 'thought');
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
    setBusy(true);
    try {
      await fetch(`${API_BASE}/api/agents/${deptKey.toUpperCase()}/run`, { method: 'POST' });
      await refreshAllData();
    } catch (e) {
      addLog('ERROR', `Run failed: ${e.message}`, 'approval');
    } finally {
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

  const visibleApprovals = selectedAgentFilter === 'all'
    ? approvals
    : approvals.filter(a => a.agentId?.toLowerCase().includes(selectedAgentFilter) || a.department?.toLowerCase() === selectedAgentFilter);

  return (
    <>
      {/* Background Ambience */}
      <div className="ambient" aria-hidden="true">
        <span /><span /><span /><span /><span />
        <i className="ambient-grid" />
      </div>

      {/* 3-Column Ground Control Grid Shell */}
      <div className={`app-shell ${navCollapsed ? 'nav-collapsed' : ''}`}>
        
        {/* ================================================================
            COLUMN 1: LEFT SIDEBAR RAIL
           ================================================================ */}
        <aside className="sidebar">
          {/* Logo Wordmark */}
          <div className="sidebar-logo">
            <div className="wordmark">
              <h1>AYUS&nbsp;OPS</h1>
              <span>v1</span>
            </div>
            <div className="sidebar-subtitle">Ground control</div>
          </div>

          {/* 3-Tier Navigation */}
          <nav className="sidebar-nav">
            {NAV_TIERS.map((tier) => (
              <div className="nav-tier" key={tier.label} style={{ marginBottom: '14px' }}>
                <div className="sidebar-nav-label">{tier.label}</div>
                {tier.items.map((item) => {
                  const isActive = activeTab === item.id;
                  const isClearances = item.id === 'approvals';
                  return (
                    <button
                      key={item.id}
                      className={`nav-item ${isActive ? 'active' : ''}`}
                      onClick={() => setActiveTab(item.id)}
                    >
                      <span className="nav-icon">{item.icon}</span>
                      <span>{item.label}</span>
                      {isClearances && approvals.length > 0 && (
                        <span className="nav-badge-red" title={`${approvals.length} waiting on you`}>
                          {approvals.length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Sidebar Footer */}
          <div className="sidebar-footer">
            <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--muted)', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--ink)' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--amber)' }} />
                <strong>FOUNDER: ANISH</strong>
              </div>
              <div style={{ fontSize: '8.5px', marginTop: '2px', letterSpacing: '0.06em' }}>
                SEAT: CEO • FULL CLEARANCE
              </div>
            </div>
            <button className="sidebar-signout" onClick={() => alert('Authenticated Founder Session')}>
              System Connected
            </button>
          </div>
        </aside>

        {/* ================================================================
            ROW 1, COL 2: TOPBAR
           ================================================================ */}
        <header className="topbar">
          <button
            className="nav-toggle-btn"
            onClick={() => setNavCollapsed(!navCollapsed)}
            title="Toggle navigation"
            aria-label="Toggle navigation"
          >
            ☰
          </button>

          {approvals.length > 0 && (
            <button
              className="topbar-pending-btn"
              onClick={() => setActiveTab('approvals')}
              title="View pending approvals"
            >
              <span className="red-dot-pulse" />
              <span>{approvals.length} Pending Decision{approvals.length > 1 ? 's' : ''}</span>
            </button>
          )}

          <div className={`topbar-status ${busy ? 'is-running' : ''}`}>
            <span className="top-dot" />
            <span>{busy ? 'Agents Running' : 'Ground Control Operational'}</span>
          </div>

          <div className="topbar-clock">
            {now.toLocaleTimeString('en-IN', { hour12: false })} IST
          </div>

          <button
            className="run-btn"
            disabled={busy}
            onClick={runAllAgents}
          >
            {busy ? 'Sweeping...' : '⚡ Sweep Org Now'}
          </button>
        </header>

        {/* ================================================================
            ROW 2, COL 2: MAIN CONTENT AREA
           ================================================================ */}
        <div className="main-content">
          {/* Signature Clearance Strip */}
          <div className="clearance-strip">
            <span className="clearance-label">Clearances</span>

            <div className="clearance-ticks">
              {AGENTS.map((id) => {
                const isHolding = approvals.some(a => a.agentId?.toLowerCase().includes(id));
                const state = isHolding ? 'holding' : busy ? 'busy' : '';
                return (
                  <span
                    key={id}
                    className={`clearance-tick ${state}`}
                    title={`${AGENT_NAMES[id]} — ${isHolding ? 'Waiting for founder' : busy ? 'Working' : 'Idle'}`}
                  />
                );
              })}
            </div>

            <div className="clearance-readout">
              <span><b>{AGENTS.length}</b> agents</span>
              {approvals.length > 0 ? (
                <button
                  className="holding-count"
                  onClick={() => setActiveTab('approvals')}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: '9.5px', textTransform: 'uppercase' }}
                >
                  <b className="holding-count">{approvals.length}</b> holding for you
                </button>
              ) : (
                <span style={{ color: 'var(--signal)' }}>airspace clear</span>
              )}
              {lastSweepTime && (
                <span>
                  last sweep <b>{lastSweepTime.toLocaleTimeString('en-IN', { hour12: false })}</b>
                </span>
              )}
            </div>
          </div>

          {/* TAB 1: FLIGHT DECK (AYUS HUD) */}
          {activeTab === 'ayus' && (
            <div>
              {/* AYUS Reactor Hero Band */}
              <AyusReactor
                currentState={reactorState}
                transcript={reactorTranscript}
                onTriggerSweep={runAllAgents}
              />

              {/* 4 Metric Tiles Row */}
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

              {/* 2-Column Split: Mission Simulator vs Telemetry Feed */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* Mission Simulator */}
                <div style={{ background: 'var(--deck)', border: '1px solid var(--line-soft)', padding: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--line-soft)', paddingBottom: '10px', marginBottom: '14px' }}>
                    <div style={{ fontFamily: 'var(--display)', fontSize: '13px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ice)' }}>
                      ⚡ LIVE MISSION SIMULATOR
                    </div>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '9.5px', color: 'var(--muted)' }}>
                      JUDGE DEMO PITCH
                    </span>
                  </div>

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

                {/* Telemetry Stream */}
                <div style={{ background: 'var(--deck)', border: '1px solid var(--line-soft)', padding: '18px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--line-soft)', paddingBottom: '10px', marginBottom: '14px' }}>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--ice)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                      MACHINE TELEMETRY STREAM [ICE]
                    </div>
                    <button
                      onClick={() => setLogs([])}
                      style={{ background: 'transparent', border: '1px solid var(--line-soft)', color: 'var(--muted)', fontSize: '9px', fontFamily: 'var(--mono)', padding: '2px 8px', cursor: 'pointer' }}
                    >
                      CLEAR
                    </button>
                  </div>

                  <div style={{ flex: 1, maxHeight: '280px', overflowY: 'auto', fontFamily: 'var(--mono)', fontSize: '10.5px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {logs.length === 0 ? (
                      <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '2rem 0' }}>
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

          {/* TAB 2: CLEARANCES */}
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
                  {visibleApprovals.length} HOLDING
                </span>
              </div>

              {visibleApprovals.length === 0 ? (
                <div style={{ background: 'var(--deck)', border: '1px solid var(--line-soft)', padding: '48px', textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', marginBottom: '8px' }}>🛡️</div>
                  <div style={{ fontFamily: 'var(--display)', fontSize: '14px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-bright)' }}>
                    AIRSPACE CLEAR • NO PENDING CLEARANCES
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: '10.5px', color: 'var(--muted)', marginTop: '6px' }}>
                    All autonomous agents are operating within policy thresholds.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {visibleApprovals.map((req) => (
                    <div
                      key={req.id}
                      className="card card-urgent"
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
                            className="btn btn-reject"
                            onClick={() => handleReject(req.id)}
                            style={{ padding: '8px 18px', cursor: 'pointer' }}
                          >
                            ✕ REJECT
                          </button>
                          <button
                            className="btn btn-approve"
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

          {/* TAB 3: AGENTS */}
          {activeTab === 'agents' && (
            <div>
              <div style={{ borderBottom: '1px solid var(--line-soft)', paddingBottom: '12px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontFamily: 'var(--display)', fontSize: '18px', color: 'var(--ice)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                    THE ORG • 6 SPECIALIZED SEATS
                  </h2>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: '10.5px', color: 'var(--muted-bright)', marginTop: '2px' }}>
                    Modular autonomous agents conforming to HackPulse Problem 04 monorepo architecture.
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
                        disabled={busy}
                        onClick={() => runSingleAgent(key)}
                        style={{ padding: '4px 12px', fontSize: '10.5px' }}
                      >
                        RUN {AGENT_NAMES[key].toUpperCase()}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: LEADS */}
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

          {/* TAB 5: INVOICES */}
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

          {/* TAB 6: AUDIT */}
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

          {/* TAB 7: INSIGHTS */}
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

          {/* TAB 8: MISSIONS */}
          {activeTab === 'missions' && (
            <div>
              <div style={{ borderBottom: '1px solid var(--line-soft)', paddingBottom: '12px', marginBottom: '20px' }}>
                <h2 style={{ fontFamily: 'var(--display)', fontSize: '18px', color: 'var(--ice)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  OPERATIONAL MISSIONS
                </h2>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '10.5px', color: 'var(--muted-bright)', marginTop: '2px' }}>
                  Multi-agent SOP missions dispatched to the swarm.
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
        </div>

        {/* ================================================================
            ROW 1-2, COL 3: RIGHT AGENT RAIL
           ================================================================ */}
        <aside className="right-agents-sidebar">
          <div className="right-agents-header">
            <div className="right-agents-title">AGENTS</div>
            <div className="right-agents-subtitle">Direct Voice &amp; Command</div>
          </div>

          <div className="right-agents-list">
            {AGENTS.map((id) => {
              const meta = AGENT_META[id];
              const pending = approvals.filter(a => a.agentId?.toLowerCase().includes(id) || a.department?.toLowerCase() === id).length;
              const isSelected = selectedAgentFilter === id;
              const status = busy ? 'working' : 'idle';

              return (
                <button
                  key={id}
                  className={`right-agent-card a-${id} ${isSelected ? 'active' : ''}`}
                  onClick={() => {
                    const next = selectedAgentFilter === id ? 'all' : id;
                    setSelectedAgentFilter(next);
                    if (next !== 'all') setActiveTab('approvals');
                  }}
                  title={`${AGENT_NAMES[id]} — ${meta.display}`}
                >
                  <div className="right-agent-avatar" style={{ color: meta.color, fontSize: '16px' }}>
                    {meta.icon}
                  </div>
                  <div className="right-agent-info">
                    <div className="right-agent-name">{AGENT_NAMES[id]}</div>
                    <div className="right-agent-role">{meta.subtitle}</div>
                  </div>
                  <div className="right-agent-status">
                    <span className={`status-dot ${status}`} />
                    {pending > 0 && (
                      <span className="pending-badge-red" title={`${pending} pending approval`}>
                        {pending}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>
      </div>
    </>
  );
}
