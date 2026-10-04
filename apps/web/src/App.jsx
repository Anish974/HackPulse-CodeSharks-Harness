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
  Lock
} from 'lucide-react';

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
  const terminalEndRef = useRef(null);

  // Scroll terminal on new logs
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Initial Data Fetch
  const refreshAllData = async () => {
    try {
      const [resAgents, resApprovals, resMetrics, resDb] = await Promise.all([
        fetch(`${API_BASE}/api/agents`).then(r => r.json()).catch(() => []),
        fetch(`${API_BASE}/api/approvals`).then(r => r.json()).catch(() => ({ pending: [], history: [] })),
        fetch(`${API_BASE}/api/metrics`).then(r => r.json()).catch(() => ({})),
        fetch(`${API_BASE}/api/db`).then(r => r.json()).catch(() => null)
      ]);

      if (Array.isArray(resAgents) && resAgents.length) setAgents(resAgents);
      if (resApprovals.pending) setApprovals(resApprovals.pending);
      if (resMetrics.totalApprovalsHandled !== undefined) setMetrics(resMetrics);
      if (resDb) setDbData(resDb);
    } catch (e) {
      console.error('Data refresh error:', e);
    }
  };

  useEffect(() => {
    refreshAllData();

    // WebSocket Connection
    let ws;
    const connectWs = () => {
      ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        addLog('SYSTEM', 'WebSocket Live Agent Feed Connected', 'CONNECTED');
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
      addLog(data.agent?.name || 'AGENT', `Autonomous cycle triggered for ${data.department}`, 'thought');
    } else if (type === 'agent:thought') {
      addLog(data.agentName, `🧠 Thought: ${data.thought}`, 'thought');
    } else if (type === 'agent:tool_call') {
      addLog(data.agentName, `🔧 Proposing tool: ${data.tool} (${data.intent})`, 'tool');
    } else if (type === 'agent:policy_eval') {
      addLog('HARNESS', `🛡️ Governance Check on ${data.tool}: Risk=${data.riskLevel}, ApprovalRequired=${data.requiresApproval}`, 'policy');
    } else if (type === 'agent:paused_for_approval') {
      addLog('GATEKEEPER', `⛔ Intercepted ${data.agentName}: Action halted! Pushed to Executive Approval Queue.`, 'approval');
      refreshAllData();
    } else if (type === 'agent:tool_executed') {
      addLog('EXECUTOR', `⚡ Tool ${data.tool} executed successfully.`, 'exec');
      refreshAllData();
    } else if (type === 'approval:executed') {
      addLog('HUMAN-IN-THE-LOOP', `✅ Action ${data.id} APPROVED & EXECUTED by CEO.`, 'exec');
      refreshAllData();
    } else if (type === 'approval:rejected') {
      addLog('HUMAN-IN-THE-LOOP', `❌ Action ${data.id} REJECTED by CEO.`, 'approval');
      refreshAllData();
    }
  };

  // Scenario Simulator
  const triggerScenario = async (scenarioType) => {
    setLoadingAction(scenarioType);
    addLog('SIMULATOR', `Dispatching scenario: ${scenarioType}...`, 'tool');
    try {
      await fetch(`${API_BASE}/api/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioType })
      });
      await refreshAllData();
    } catch (e) {
      addLog('ERROR', `Failed to simulate scenario: ${e.message}`, 'approval');
    } finally {
      setLoadingAction(null);
    }
  };

  // Run Department Agent
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

  // Run All
  const runAllAgents = async () => {
    setLoadingAction('ALL');
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

  // Approve Action
  const handleApprove = async (id) => {
    setLoadingAction(`approve_${id}`);
    try {
      await fetch(`${API_BASE}/api/approvals/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approver: 'CEO (Anish)' })
      });
      await refreshAllData();
    } catch (e) {
      alert(`Approval error: ${e.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  // Reject Action
  const handleReject = async (id) => {
    const reason = prompt('Enter rejection reason for audit log:', 'Risk exceeds current Q4 budget tolerance');
    if (!reason) return;
    setLoadingAction(`reject_${id}`);
    try {
      await fetch(`${API_BASE}/api/approvals/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, reviewer: 'CEO (Anish)' })
      });
      await refreshAllData();
    } catch (e) {
      alert(`Rejection error: ${e.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div>
      {/* Top Header */}
      <header>
        <div className="brand-wrapper">
          <div className="brand-logo">🦈</div>
          <div className="brand-text">
            <h1>CodeSharks • Agentic Harness</h1>
            <p>Autonomous Operations with Human-in-the-Loop Governance</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="button-group">
            <button
              className={`btn ${activeTab === 'cockpit' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('cockpit')}
            >
              <Activity size={15} /> Operations Cockpit
            </button>
            <button
              className={`btn ${activeTab === 'database' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setActiveTab('database'); refreshAllData(); }}
            >
              <Layers size={15} /> Live Database
            </button>
          </div>

          <div className="live-badge">
            <div className="pulse-dot"></div>
            <span>LIVE HARNESS</span>
          </div>
        </div>
      </header>

      <div className="app-container">
        {/* KPI Metrics */}
        <div className="metrics-grid">
          <div className="glass-panel metric-card">
            <span className="metric-title">Critical Actions Intercepted</span>
            <div className="metric-value" style={{ color: '#fb7185' }}>
              {approvals.length + metrics.approvedAndExecutedCount + metrics.rejectedSafetyCount}
            </div>
            <span className="metric-footer">Halted before unauthorized execution</span>
          </div>

          <div className="glass-panel metric-card">
            <span className="metric-title">Pending Human Approvals</span>
            <div className="metric-value" style={{ color: '#fbbf24' }}>
              {approvals.length}
            </div>
            <span className="metric-footer">Awaiting executive sign-off</span>
          </div>

          <div className="glass-panel metric-card">
            <span className="metric-title">Autonomous Hours Saved</span>
            <div className="metric-value" style={{ color: '#34d399' }}>
              {metrics.hoursSavedAutonomousOps} hrs
            </div>
            <span className="metric-footer">Across Sales, Finance, HR & Tech</span>
          </div>

          <div className="glass-panel metric-card">
            <span className="metric-title">Safety & Policy Adherence</span>
            <div className="metric-value" style={{ color: '#38bdf8' }}>
              {metrics.riskMitigationRate}
            </div>
            <span className="metric-footer">0 unapproved critical actions</span>
          </div>
        </div>

        {/* Judge Live Pitch Scenarios Bar */}
        <div className="glass-panel scenario-bar">
          <div className="scenario-info">
            <h3><Sparkles size={18} color="#38bdf8" /> Live Hackathon Demo Scenarios</h3>
            <p>Click any preset scenario to watch the autonomous agent reason, plan, and pause for approval:</p>
          </div>
          <div className="button-group">
            <button
              className="btn btn-secondary"
              disabled={loadingAction}
              onClick={() => triggerScenario('ENTERPRISE_CONTRACT')}
            >
              💼 Enterprise Deal (₹1.5L Contract)
            </button>
            <button
              className="btn btn-secondary"
              disabled={loadingAction}
              onClick={() => triggerScenario('HIGH_VALUE_INVOICE')}
            >
              📊 High-Value Overdue (₹1.2L)
            </button>
            <button
              className="btn btn-secondary"
              disabled={loadingAction}
              onClick={() => triggerScenario('SEV1_INCIDENT')}
            >
              ⚡ SEV-1 Incident Rollback
            </button>
            <button
              className="btn btn-secondary"
              disabled={loadingAction}
              onClick={() => triggerScenario('TALENT_OFFER')}
            >
              👥 Offer Letter (₹28L CTC)
            </button>
            <button
              className="btn btn-primary"
              disabled={loadingAction}
              onClick={runAllAgents}
            >
              <Zap size={15} /> Run Full Enterprise Sweep
            </button>
          </div>
        </div>

        {activeTab === 'cockpit' ? (
          <div className="main-grid">
            {/* Left Column: Department Agents Roster */}
            <div className="department-roster">
              <div className="section-header">
                <h2><Building2 size={18} /> Department Autonomous Agents</h2>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  {agents.length} Specialized Agents Active
                </span>
              </div>

              <div className="agent-cards-container">
                {agents.map((ag) => (
                  <div key={ag.id} className="glass-panel agent-card" style={{ borderLeftColor: ag.badgeColor }}>
                    <div className="agent-meta">
                      <div className="agent-avatar">{ag.avatar}</div>
                      <div className="agent-details">
                        <h4>
                          {ag.name}
                          <span style={{ fontSize: '0.7rem', color: ag.badgeColor, fontWeight: 700 }}>
                            • {ag.department}
                          </span>
                        </h4>
                        <div className="title">{ag.title}</div>
                        <div className="desc">{ag.description}</div>
                      </div>
                    </div>

                    <button
                      className="btn btn-secondary"
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem' }}
                      disabled={loadingAction}
                      onClick={() => runAgent(ag.department)}
                    >
                      <Play size={12} /> Run
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Approval Queue & Live Terminal Feed */}
            <div className="right-column">
              {/* Approval Queue */}
              <div className="glass-panel approval-queue-box">
                <div className="section-header" style={{ marginBottom: 0 }}>
                  <h2 style={{ color: '#fbbf24' }}>
                    <Lock size={18} /> Human-in-the-Loop Approval Queue
                  </h2>
                  <span className="risk-badge risk-HIGH">
                    {approvals.length} PENDING
                  </span>
                </div>

                {approvals.length === 0 ? (
                  <div className="empty-queue">
                    <div className="empty-icon">🛡️</div>
                    <div>All systems operating within autonomous risk boundaries.</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.3rem' }}>
                      Click any scenario above to trigger a critical business action.
                    </div>
                  </div>
                ) : (
                  approvals.map((req) => (
                    <div key={req.id} className="approval-item">
                      <div className="approval-top">
                        <span className="approval-summary">{req.proposalSummary}</span>
                        <span className={`risk-badge risk-${req.riskLevel}`}>{req.riskLevel} RISK</span>
                      </div>

                      <div className="approval-reason">
                        ⚠️ <strong>Policy Reason:</strong> {req.reason}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          Target Tool: <code>{req.toolName}</code>
                        </span>
                        <div className="approval-actions">
                          <button
                            className="btn btn-danger"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.78rem' }}
                            disabled={loadingAction}
                            onClick={() => handleReject(req.id)}
                          >
                            <XCircle size={14} /> Reject
                          </button>
                          <button
                            className="btn btn-success"
                            style={{ padding: '0.4rem 0.85rem', fontSize: '0.78rem' }}
                            disabled={loadingAction}
                            onClick={() => handleApprove(req.id)}
                          >
                            <CheckCircle2 size={14} /> Approve & Execute
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Live Terminal */}
              <div className="glass-panel live-terminal">
                <div className="terminal-header">
                  <div className="terminal-title">
                    <Terminal size={15} /> Real-Time Agent Reasoning & Harness Stream
                  </div>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                    onClick={() => setLogs([])}
                  >
                    Clear Feed
                  </button>
                </div>

                <div className="terminal-body">
                  {logs.length === 0 ? (
                    <div style={{ color: '#64748b', textAlign: 'center', padding: '3rem 0' }}>
                      Awaiting agent operations... Click "Run Full Enterprise Sweep" to start.
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
          /* Live Database View */
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h2 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={20} color="#38bdf8" /> Operational Enterprise Database (Live State)
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <h4 style={{ color: '#38bdf8', marginBottom: '0.6rem' }}>CRM Inbound Leads</h4>
                {dbData?.leads?.map((lead) => (
                  <div key={lead.id} style={{ background: 'rgba(0,0,0,0.3)', padding: '0.8rem', borderRadius: '8px', marginBottom: '0.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                      <span>{lead.company} ({lead.contact})</span>
                      <span style={{ color: '#10b981' }}>₹{lead.budget?.toLocaleString('en-IN')}</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                      Status: <strong>{lead.status}</strong> • {lead.notes}
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <h4 style={{ color: '#10b981', marginBottom: '0.6rem' }}>Accounts Receivable (Invoices)</h4>
                {dbData?.invoices?.map((inv) => (
                  <div key={inv.id} style={{ background: 'rgba(0,0,0,0.3)', padding: '0.8rem', borderRadius: '8px', marginBottom: '0.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                      <span>{inv.client} ({inv.id})</span>
                      <span style={{ color: inv.amount > 50000 ? '#fb7185' : '#38bdf8' }}>₹{inv.amount?.toLocaleString('en-IN')}</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                      Status: <strong>{inv.status}</strong> • Due: {inv.dueDate} ({inv.daysOverdue} days overdue)
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
