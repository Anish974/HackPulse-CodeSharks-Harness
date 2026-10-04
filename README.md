# 🦈 CodeSharks • Enterprise Agentic Harness
### Autonomous Multi-Agent Operations with Human-in-the-Loop Governance
> **HackPulse 1.0 Submission** • **Problem Statement 04: Business Operations**

---

## 🎯 Executive Overview

Autonomous agents operating without supervision pose severe operational, financial, and legal risks to real businesses. 

**CodeSharks Agentic Harness** solves this by establishing an **Agent Governance & Safety Perimeter**. Specialized departmental agents autonomously analyze goals, plan actions, and call tools. However, any action exceeding risk policies (e.g. contracts > ₹50,000, debt discounts, refunds, production server modifications) is **intercepted by the Harness Gatekeeper** and placed into an **Executive Human-in-the-Loop Approval Queue**.

```
                           ┌────────────────────────┐
                           │      CEO / Human       │
                           │   Approval Dashboard   │
                           └───────────▲────────────┘
                                       │ (Approve / Reject)
                                       │
                      ┌────────────────┴────────────────┐
                      │    Agentic Harness Gatekeeper    │
                      │       Policy Evaluator          │
                      └──────▲────────────────────▲─────┘
                             │ (Safe)             │ (High Risk Intercepted)
                             │                    │
                ┌────────────▼─────────┐    ┌─────┴───────────────┐
                │ Immediate Tool Exec  │    │  Approval Queue     │
                └──────────────────────┘    └─────────────────────┘
                             ▲
                             │ (Reason & Propose)
        ┌────────────┬───────┴─────┬────────────┬─────────────┐
        │            │             │            │             │
     💼 Sales    📊 Finance    👥 HR        ⚡ Tech       🚀 Marketing
     (Arjun)      (Meera)       (Isha)       (Vikram)      (Kabir)
```

---

## 🧩 Monorepo Architecture

Conforms strictly to HackPulse Problem 04 requirements (*Monorepo + reusable agents, tools, APIs, and shared packages*):

```text
HackPulse-CodeSharks-Harness/
├── packages/
│   ├── shared/         # Domain constants, RiskLevel enums, Governance thresholds
│   ├── tools/          # Reusable tool registry (Invoices, Leads, Hotfix, Ad spend, Offers)
│   └── agent-core/     # Agent planning engine, reasoning loop, and approval state machine
├── apps/
│   ├── api/            # Express REST + WebSocket server for real-time live event streaming
│   └── web/            # Mission Control Executive Dashboard (React + Vite + Glassmorphism)
└── package.json        # Root npm workspaces monorepo
```

---

## 🏢 Departmental Agent Roster

| Department | Agent | Role | Tools Used | Governed Critical Actions |
| :--- | :--- | :--- | :--- | :--- |
| **Sales** | **Arjun** | VP of Sales & Growth | `qualify_inbound_lead`, `send_external_contract` | Commercial contracts > ₹50,000 |
| **Finance** | **Meera** | Head of Finance & Risk | `query_overdue_invoices`, `send_invoice_reminder`, `issue_financial_settlement_or_discount` | Overdue recovery > ₹50,000, Debt write-offs |
| **Tech/CTO** | **Vikram** | Infrastructure Guard | `triage_production_incident`, `deploy_production_hotfix` | Production rollbacks & deployment |
| **HR** | **Isha** | People Operations | `screen_candidate_resumes`, `send_employment_offer` | Executive employment offers (> ₹20L CTC) |
| **Marketing**| **Kabir** | Creative Director | `generate_campaign_hooks`, `publish_sponsored_campaign` | Paid ad spend allocation |
| **Executive**| **AYUS** | Harness Orchestrator | Multi-department synchronization | Cross-agent synthesis & CEO briefing |

---

## 🚀 Quickstart Guide

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Both Backend & Frontend
```bash
npm run dev
```
* **Executive Dashboard:** [http://localhost:5173](http://localhost:5173)
* **Agentic API & WebSocket:** [http://localhost:3001](http://localhost:3001)

### 3. Or Run Independently
```bash
npm run dev:api    # Start API server on :3001
npm run dev:web    # Start Vite web app on :5173
```

---

## 🎤 3-Minute Demo Script for Judges

1. **Open the Dashboard**: Show the 4 live KPI cards (*Critical Actions Intercepted*, *Pending Approvals*, *Autonomous Hours Saved*, *Safety Adherence*).
2. **Click "Enterprise Deal (₹1.5L Contract)"**:
   * Watch the **Live Stream** show Arjun (Sales) reason and qualify the lead autonomously.
   * Watch the **Harness Gatekeeper** evaluate the contract: *Value is ₹1,50,000 > ₹50,000 threshold*.
   * Action is paused and pops into the **Human-in-the-Loop Approval Queue**.
3. **Click "Approve & Execute"**:
   * The tool executes immediately, updates the CRM status, and logs into the tamper-proof Audit Trail.
4. **Click "Run Full Enterprise Sweep"**:
   * All 5 department agents run simultaneously, showing true multi-agent parallelism and strict safety gating!
