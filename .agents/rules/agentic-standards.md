# CodeSharks Agentic Engineering Standards

## 1. Monorepo Integrity
- All shared types, risk enums, and constants must reside in `packages/shared`. Never duplicate enums across apps.
- Tools must be completely decoupled from the web UI and live inside `packages/tools`.
- The agent reasoning engine (`packages/agent-core`) must remain headless and transport-agnostic.

## 2. Agent Safety Principles
- **No Unsupervised Mutating Actions**: Any tool that performs mutations outside the staging sandbox must provide an `evaluateRisk()` function.
- **Fail-Safe Gatekeeping**: If a tool's risk assessment fails or throws an unhandled exception, it must default to `RiskLevel.CRITICAL` and require human approval.
- **Audit Immutability**: Every approved, rejected, or autonomously executed tool call must be appended to the operational audit log with timestamps and actor signatures.
