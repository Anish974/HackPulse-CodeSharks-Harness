# 🛡️ Governance & Safety Policy Framework

## 1. Risk Classification Matrix

The CodeSharks Agentic Harness enforces a strict 4-tier risk classification:

| Risk Level | Impact Scope | Autonomous Execution Permitted? | Example Scenarios |
| :--- | :--- | :--- | :--- |
| **LOW** | Internal, Read-Only, Diagnostic | ✅ YES | Fetching invoices, scoring inbound leads, analyzing stack traces. |
| **MEDIUM** | Internal Mutation, Reversible | ✅ YES (Logged) | Internal tag updates, draft generation, preliminary summaries. |
| **HIGH** | External Communication, Sub-threshold spend | ⚠️ Conditionally (Approval default) | Client emails for amounts > ₹50,000, paid ad tests < ₹100,000. |
| **CRITICAL** | Financial transfer, Contract, Infrastructure rollback | ⛔ STRICTLY FORBIDDEN WITHOUT CEO APPROVAL | Commercial contracts, debt discounts, server rollbacks, offer letters. |

---

## 2. Policy Threshold Rules

```javascript
export const GOVERNANCE_POLICY = {
  // Monetary threshold for autonomous client actions
  FINANCIAL_APPROVAL_THRESHOLD_INR: 50000,
  
  // Maximum autonomous discount percentage allowed
  MAX_AUTONOMOUS_DISCOUNT_PERCENT: 15,
  
  // Tools requiring mandatory human sign-off
  MANDATORY_APPROVAL_TOOLS: [
    'send_external_contract',
    'execute_refund',
    'deploy_production_hotfix',
    'publish_sponsored_campaign',
    'terminate_vendor_agreement',
    'bulk_email_dispatch'
  ]
};
```

---

## 3. Tamper-Proof Audit Logging
Every action that passes through the harness records:
* `id`: Unique cryptographic audit identifier
* `approvalId`: Originating approval ticket reference
* `tool`: Executed tool name
* `authorizedBy`: Human identity who authorized execution (e.g. `CEO (Anish)`)
* `timestamp`: ISO-8601 UTC timestamp
* `status`: `SUCCESS`, `REJECTED`, or `FAILED`
* `result`: Full payload snapshot returned by the execution
