# 📡 API & WebSocket Specification

## 1. REST Endpoints (`http://localhost:3001/api`)

### Health & Monitoring
* `GET /api/health` — Service uptime, active agent count, pending approvals.
* `GET /api/metrics` — Aggregate KPI stats (hours saved, risk mitigation rate, intercepted actions).
* `GET /api/db` — Live JSON snapshot of leads, invoices, incidents, and candidates.

### Agent Operations
* `GET /api/agents` — List of all 6 registered departmental agents.
* `POST /api/agents/:department/run` — Triggers an autonomous workflow for a specific department (`SALES`, `FINANCE`, `MARKETING`, `HR`, `TECH`).
* `POST /api/agents/run-all` — Triggers a parallel autonomous enterprise sweep across all departments.

### Human-in-the-Loop Approval Queue
* `GET /api/approvals` — Retrieves pending approval queue and historical audit entries.
* `POST /api/approvals/:id/approve` — Executes the paused tool immediately with approver signature.
* `POST /api/approvals/:id/reject` — Halts and cancels the tool with logged rejection rationale.

### Presets & Judge Scenarios
* `POST /api/simulate` — Dispatches one of the demonstration scenarios:
  * `ENTERPRISE_CONTRACT` (Sales)
  * `HIGH_VALUE_INVOICE` (Finance)
  * `SEV1_INCIDENT` (Tech)
  * `TALENT_OFFER` (HR)
  * `AD_BUDGET` (Marketing)

---

## 2. WebSocket Protocol (`ws://localhost:3001`)

### Event Types Broadcast to Clients:
1. `agent:start` — Fired when an agent begins an autonomous cycle.
2. `agent:thought` — Streams the agent's chain-of-thought reasoning and goal formulation.
3. `agent:tool_call` — Proposes a tool call with intended parameters.
4. `agent:policy_eval` — Emits the risk assessment result (`LOW`, `HIGH`, `CRITICAL`).
5. `agent:paused_for_approval` — Signals that the tool was intercepted and queued for human review.
6. `agent:tool_executed` — Fired when an autonomous or approved tool finishes executing.
7. `approval:executed` — Broadcast when a human signs off and execution succeeds.
8. `approval:rejected` — Broadcast when a human rejects the proposed action.
