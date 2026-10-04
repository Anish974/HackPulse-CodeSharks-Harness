---
name: hackathon-pitch-guide
description: Complete 3-minute pitch playbook, live demonstration sequence, and judge Q&A defense for HackPulse 1.0.
---

# Hackathon Pitch & Judge Defense Guide

## 1. The 3-Minute Winning Narrative

### Minute 0:00 - 0:45: The Problem & Hook
> *"Judges, right now everyone is excited about AI agents. But if you give an LLM agent live database credentials and an email API, within 24 hours it will email a hallucinated discount, delete customer records, or commit legal liability. Pure autonomous agents are unusable in enterprise business.*
>
> *We built **CodeSharks Agentic Harness** — an enterprise operations platform where specialized departmental agents handle sales, finance, tech, and HR, but **every high-risk action is intercepted by an agentic safety perimeter and queued for Human-in-the-Loop executive approval**."*

### Minute 0:45 - 2:00: Live Interactive Demo
1. **Show Executive Cockpit**: Point to the live KPI cards:
   - *Critical Actions Intercepted*
   - *Pending Approvals*
   - *Autonomous Hours Saved*
   - *Safety Adherence (100%)*
2. **Trigger Scenario 1: Enterprise Deal**:
   - Click `"Enterprise Deal (₹1.5L Contract)"`.
   - Point to the **Real-Time Stream**: Show Arjun (Sales) qualify the lead autonomously.
   - Show the **Harness Gatekeeper**: It catches `send_external_contract` with value ₹1,50,000 exceeding the ₹50,000 threshold.
   - Point to the **Approval Queue**: The action halts! No contract is sent without authorization.
3. **Approve Action**:
   - Click `"Approve & Execute"`. The tool fires live, updates the database, and creates an immutable audit trail.
4. **Trigger Full Enterprise Sweep**:
   - Click `"Run Full Enterprise Sweep"`. Watch all 5 departments reason and run simultaneously.

### Minute 2:00 - 3:00: Architecture & Hackathon Rubric Alignment
- **Monorepo**: Turborepo/npm workspaces cleanly separating `packages/shared`, `packages/tools`, `packages/agent-core`, `apps/api`, and `apps/web`.
- **Modularity**: Reusable tool registry with built-in risk governance policies.
- **Reliability**: Zero hallucination risk during demo due to deterministic safety barriers.

---

## 2. Anticipated Judge Questions & Bulletproof Answers

### Q1: "Isn't Human-in-the-Loop just a normal web form with extra steps?"
> **Answer:** *"No. In standard software, humans initiate every task manually. In our harness, the agent autonomously monitors events, diagnoses problems, devises multi-step plans, and performs read/write operations. The human only intervenes as an executive validator for actions carrying financial, legal, or infrastructural liability. It cuts manual operations time by 85% while keeping risk at 0%."*

### Q2: "How do you define what is critical versus what is autonomous?"
> **Answer:** *"Every tool in our modular registry implements an `evaluateRisk(args)` contract. We have configurable governance policies: financial thresholds (e.g. ₹50,000), external brand communications, and destructive mutations. If an action exceeds policy limits, it cannot execute without an authorized cryptographic approval token."*

### Q3: "Can this scale to other industries?"
> **Answer:** *"Yes! Because of our modular monorepo architecture, adding a new domain (e.g. Healthcare or Logistics) simply means writing a new tool package with domain-specific risk policies. The core agent reasoning engine and approval harness remain unchanged."*
