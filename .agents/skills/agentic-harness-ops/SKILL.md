---
name: agentic-harness-ops
description: Operational playbook for developing, orchestrating, and extending the CodeSharks Enterprise Agentic Harness with Human-in-the-Loop governance.
---

# Agentic Harness Operations & Extension Skill

This skill provides comprehensive instructions for managing, operating, and extending the multi-agent system.

## 1. System Philosophy
The core tenet of the harness is **Constrained Autonomy**:
- Autonomous agents can execute read-only queries and low-impact tasks freely.
- Any action with financial liability, external brand communication, or destructive system modification MUST halt and request Human-in-the-Loop (HITL) approval.

## 2. Directory & Monorepo Structure
```
HackPulse-CodeSharks-Harness/
├── packages/
│   ├── shared/         # Enums (RiskLevel, Department, ApprovalStatus), constants
│   ├── tools/          # Reusable Tool Registry & In-Memory/Supabase Db
│   └── agent-core/     # Reasoning loop, ApprovalManager, and Policy Engine
├── apps/
│   ├── api/            # Express REST endpoints & WebSocket server
│   └── web/            # Vite + React Executive Cockpit
├── docs/               # In-depth architectural & API specifications
└── scripts/            # CLI utilities and verification suites
```

## 3. How to Add a New Tool
To introduce a new business tool:
1. Open `packages/tools/src/registry.js`.
2. Define the tool definition:
```javascript
export const my_new_tool = {
  name: 'my_new_tool',
  department: Department.FINANCE,
  description: 'Explain clearly what this tool accomplishes',
  parameters: { paramName: 'type' },
  evaluateRisk: (args) => {
    if (args.thresholdCondition) {
      return {
        riskLevel: RiskLevel.HIGH,
        requiresApproval: true,
        reason: 'Explicit rationale for requiring CEO sign-off'
      };
    }
    return { riskLevel: RiskLevel.LOW, requiresApproval: false, reason: 'Safe operation' };
  },
  execute: async (args) => {
    // Perform database update or API dispatch
    return { success: true };
  }
};
```
3. Re-export in `packages/tools/src/index.js`.
4. Register the tool in `packages/agent-core/src/engine.js` within the appropriate department's planner.

## 4. How to Run and Test
- Run verification script: `node scripts/verify-monorepo.js`
- Start full stack: `npm run dev`
- WebSocket feed connects on `ws://localhost:3001`
- REST endpoints are on `http://localhost:3001/api`
