/**
 * @codesharks/shared/constants.js
 * Core domain enums and governance thresholds for the Agentic Harness.
 */

export const RiskLevel = Object.freeze({
  LOW: 'LOW',           // Informational or internal read-only actions
  MEDIUM: 'MEDIUM',     // Minor mutations (drafting content, tagging leads)
  HIGH: 'HIGH',         // External contact, discount offers > 10%
  CRITICAL: 'CRITICAL'  // Financial transfer, payment > 50k, legal contracts, destructive DB
});

export const ApprovalStatus = Object.freeze({
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  EXECUTED: 'EXECUTED',
  FAILED: 'FAILED'
});

export const Department = Object.freeze({
  SALES: 'SALES',
  FINANCE: 'FINANCE',
  MARKETING: 'MARKETING',
  HR: 'HR',
  TECH: 'TECH',
  EXECUTIVE: 'EXECUTIVE'
});

export const AGENT_REGISTRY = Object.freeze({
  [Department.SALES]: {
    id: 'agent_sales_arjun',
    name: 'Arjun',
    title: 'VP of Sales & Growth',
    department: Department.SALES,
    avatar: '💼',
    badgeColor: '#3b82f6',
    description: 'Autonomous lead qualification, CRM updates, custom client proposals, and deal pipeline management.'
  },
  [Department.FINANCE]: {
    id: 'agent_finance_meera',
    name: 'Meera',
    title: 'Head of Finance & Risk',
    department: Department.FINANCE,
    avatar: '📊',
    badgeColor: '#10b981',
    description: 'Invoice chasing, cash-flow monitoring, overdue debt recovery, and financial risk mitigation.'
  },
  [Department.MARKETING]: {
    id: 'agent_marketing_kabir',
    name: 'Kabir',
    title: 'Creative Director',
    department: Department.MARKETING,
    avatar: '🚀',
    badgeColor: '#ec4899',
    description: 'Multi-channel campaigns, content creation, social hooks, and brand positioning analytics.'
  },
  [Department.HR]: {
    id: 'agent_hr_isha',
    name: 'Isha',
    title: 'People Operations Lead',
    department: Department.HR,
    avatar: '👥',
    badgeColor: '#8b5cf6',
    description: 'Resume screening, candidate evaluation, interview brief synthesis, and team onboarding workflows.'
  },
  [Department.TECH]: {
    id: 'agent_tech_vikram',
    name: 'Vikram',
    title: 'CTO & Infrastructure Guard',
    department: Department.TECH,
    avatar: '⚡',
    badgeColor: '#f59e0b',
    description: 'Incident triage, bug prioritization, system health alerts, and release safety verification.'
  },
  [Department.EXECUTIVE]: {
    id: 'agent_exec_ayus',
    name: 'AYUS Core',
    title: 'Executive Harness Orchestrator',
    department: Department.EXECUTIVE,
    avatar: '🧠',
    badgeColor: '#06b6d4',
    description: 'Cross-agent alignment, Human-in-the-Loop policy gatekeeper, and CEO daily operational synthesis.'
  }
});

export const GOVERNANCE_POLICY = Object.freeze({
  // Any financial action exceeding this amount in INR requires CEO sign-off
  FINANCIAL_APPROVAL_THRESHOLD_INR: 50000,
  // Any discount higher than this % needs approval
  MAX_AUTONOMOUS_DISCOUNT_PERCENT: 15,
  // Actions that ALWAYS require human approval
  MANDATORY_APPROVAL_TOOLS: [
    'send_external_contract',
    'execute_refund',
    'deploy_production_hotfix',
    'publish_sponsored_campaign',
    'terminate_vendor_agreement',
    'bulk_email_dispatch'
  ]
});
