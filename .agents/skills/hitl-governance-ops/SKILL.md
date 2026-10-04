---
name: hitl-governance-ops
description: Complete specification for the Human-in-the-Loop (HITL) Governance Perimeter, risk assessment formulas, state transitions, and audit logging.
---

# 🛡️ Human-in-the-Loop (HITL) Governance Engine Skill

## 1. Core Purpose
The HITL Governance Engine acts as the **deterministic circuit breaker** between AI intent and real-world system mutation.

```
Agent Proposes Tool
         │
         ▼
[ Governance Policy Evaluator ]
         │
    Risk Assessment
         ├─────────────────────────────────────────┐
         │                                         │
   LOW / MEDIUM                               HIGH / CRITICAL
         │                                         │
         ▼                                         ▼
[ Direct Execution ]                     [ State: PENDING_APPROVAL ]
         │                                         │
         │                                 Push to Executive Cockpit
         │                                         │
         │                                   CEO Evaluates
         │                             ┌───────────┴───────────┐
         │                             │                       │
         │                         APPROVED                 REJECTED
         │                             │                       │
         ▼                             ▼                       ▼
   [ Log Success ]           [ Authorized Exec ]        [ Log Reason ]
         │                             │                       │
         └─────────────────────────────┴───────────────────────┘
                                       │
                                       ▼
                       [ Immutable Audit Trail Store ]
```

## 2. Risk Classification Rules

```javascript
function evaluateRisk(toolName, args) {
  // 1. Mandatory critical actions
  if (MANDATORY_CRITICAL_TOOLS.includes(toolName)) {
    return { riskLevel: 'CRITICAL', requiresApproval: true };
  }
  // 2. Financial liability check
  if (args.proposedValue > 50000 || args.amount > 50000 || args.budgetINR > 50000) {
    return { riskLevel: 'CRITICAL', requiresApproval: true };
  }
  // 3. Compensation threshold check
  if (args.offeredSalaryINR > 2000000) {
    return { riskLevel: 'CRITICAL', requiresApproval: true };
  }
  // 4. Safe default
  return { riskLevel: 'LOW', requiresApproval: false };
}
```

## 3. Cryptographic Audit Entry Contract
Each resolution produces an immutable log:
```json
{
  "id": "AUDIT-1791098079234",
  "approvalId": "APPR-1791098079234-887",
  "tool": "send_external_contract",
  "authorizedBy": "CEO (Anish)",
  "timestamp": "2026-10-04T07:14:39.234Z",
  "status": "SUCCESS",
  "result": { "dispatched": true, "contractValue": 150000 }
}
```
