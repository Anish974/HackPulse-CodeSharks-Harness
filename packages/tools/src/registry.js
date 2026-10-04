import { RiskLevel, Department, GOVERNANCE_POLICY, formatINR } from '@codesharks/shared';

/**
 * In-Memory Operational Store to make all tools live, interactive, and persistent during runtime
 */
export const operationalDb = {
  leads: [
    { id: 'lead_1', company: 'Apex Cloud Solutions', contact: 'Rohan Sharma', email: 'rohan@apexcloud.io', budget: 150000, status: 'NEW', notes: 'Interested in enterprise AI automation workflow' },
    { id: 'lead_2', company: 'Nova Retail Corp', contact: 'Pooja Nair', email: 'pooja@novaretail.in', budget: 45000, status: 'QUALIFIED', notes: 'Needs inventory tracking integration' },
    { id: 'lead_3', company: 'Zenith Logistics', contact: 'Amit Verma', email: 'amit@zenithlog.com', budget: 350000, status: 'PROPOSAL_REQUESTED', notes: 'High value multi-warehouse automation' }
  ],
  invoices: [
    { id: 'INV-2026-089', client: 'Starlight Media', amount: 120000, dueDate: '2026-09-15', status: 'OVERDUE', daysOverdue: 19, risk: 'HIGH' },
    { id: 'INV-2026-094', client: 'BlueWave Labs', amount: 35000, dueDate: '2026-10-01', status: 'PENDING', daysOverdue: 3, risk: 'LOW' },
    { id: 'INV-2026-102', client: 'Titan FinTech', amount: 480000, dueDate: '2026-09-20', status: 'OVERDUE', daysOverdue: 14, risk: 'CRITICAL' }
  ],
  campaigns: [
    { id: 'camp_1', title: 'Q4 Enterprise AI Launch', channel: 'LinkedIn & Twitter', budget: 85000, status: 'DRAFT' },
    { id: 'camp_2', title: 'Founder Weekly Newsletter', channel: 'Email', budget: 5000, status: 'SCHEDULED' }
  ],
  candidates: [
    { id: 'cand_101', name: 'Devendra Patel', role: 'Senior AI Engineer', experience: '5 years', matchScore: 94, status: 'SCREENED' },
    { id: 'cand_102', name: 'Ananya Roy', role: 'Fullstack Product Designer', experience: '4 years', matchScore: 89, status: 'INTERVIEW_PENDING' }
  ],
  systemIncidents: [
    { id: 'INC-404', component: 'Production API Gateway', severity: 'SEV-1', cpuLoad: '96%', affectedUsers: 420, proposedFix: 'Rollback v2.4.1 to v2.4.0 hotfix' }
  ],
  auditLog: []
};

/**
 * Complete Reusable Tool Registry
 */
export const TOOL_REGISTRY = {
  // === FINANCE TOOLS ===
  query_overdue_invoices: {
    name: 'query_overdue_invoices',
    department: Department.FINANCE,
    description: 'Fetch all overdue client invoices with risk scores and payment delinquency data.',
    parameters: {},
    evaluateRisk: () => ({ riskLevel: RiskLevel.LOW, requiresApproval: false, reason: 'Read-only financial query' }),
    execute: async () => {
      const overdues = operationalDb.invoices.filter(i => i.status === 'OVERDUE');
      return { count: overdues.length, invoices: overdues };
    }
  },

  send_invoice_reminder: {
    name: 'send_invoice_reminder',
    department: Department.FINANCE,
    description: 'Send automated polite payment reminder email for overdue invoice.',
    parameters: { invoiceId: 'string', tone: 'string' },
    evaluateRisk: (args) => {
      const invoice = operationalDb.invoices.find(i => i.id === args.invoiceId);
      if (invoice && invoice.amount > GOVERNANCE_POLICY.FINANCIAL_APPROVAL_THRESHOLD_INR) {
        return {
          riskLevel: RiskLevel.HIGH,
          requiresApproval: true,
          reason: `Invoice value (${formatINR(invoice.amount)}) exceeds autonomous communication threshold (${formatINR(GOVERNANCE_POLICY.FINANCIAL_APPROVAL_THRESHOLD_INR)}). Requires CEO review.`
        };
      }
      return { riskLevel: RiskLevel.LOW, requiresApproval: false, reason: 'Standard reminder under threshold' };
    },
    execute: async (args) => {
      const invoice = operationalDb.invoices.find(i => i.id === args.invoiceId);
      if (!invoice) throw new Error(`Invoice ${args.invoiceId} not found`);
      return { sent: true, recipient: invoice.client, amount: invoice.amount, message: `Dispatched payment reminder for ${invoice.id}` };
    }
  },

  issue_financial_settlement_or_discount: {
    name: 'issue_financial_settlement_or_discount',
    department: Department.FINANCE,
    description: 'Offer a settlement waiver or discount to recover delinquent debt.',
    parameters: { invoiceId: 'string', discountPercent: 'number', reason: 'string' },
    evaluateRisk: (args) => {
      return {
        riskLevel: RiskLevel.CRITICAL,
        requiresApproval: true,
        reason: `Debt settlement/discount of ${args.discountPercent}% requested on ${args.invoiceId}. High financial impact requires CEO authorization.`
      };
    },
    execute: async (args) => {
      const invoice = operationalDb.invoices.find(i => i.id === args.invoiceId);
      if (!invoice) throw new Error(`Invoice ${args.invoiceId} not found`);
      const originalAmount = invoice.amount;
      const revisedAmount = Math.round(originalAmount * (1 - args.discountPercent / 100));
      invoice.amount = revisedAmount;
      invoice.status = 'DISCOUNTED_PENDING_PAYMENT';
      return { success: true, originalAmount, revisedAmount, discountPercent: args.discountPercent };
    }
  },

  // === SALES TOOLS ===
  qualify_inbound_lead: {
    name: 'qualify_inbound_lead',
    department: Department.SALES,
    description: 'Analyze incoming prospect requirements, match with agency offerings, and score deal viability.',
    parameters: { leadId: 'string' },
    evaluateRisk: () => ({ riskLevel: RiskLevel.LOW, requiresApproval: false, reason: 'Internal CRM scoring' }),
    execute: async (args) => {
      const lead = operationalDb.leads.find(l => l.id === args.leadId);
      if (!lead) throw new Error(`Lead ${args.leadId} not found`);
      lead.status = 'QUALIFIED';
      lead.score = lead.budget > 100000 ? 'ENTERPRISE_TIER_A' : 'MID_TIER_B';
      return { leadId: lead.id, company: lead.company, tier: lead.score, budget: lead.budget };
    }
  },

  send_external_contract: {
    name: 'send_external_contract',
    department: Department.SALES,
    description: 'Dispatch legally binding commercial agreement and contract to client.',
    parameters: { leadId: 'string', proposedValue: 'number', scope: 'string' },
    evaluateRisk: (args) => ({
      riskLevel: RiskLevel.CRITICAL,
      requiresApproval: true,
      reason: `Binding commercial agreement valued at ${formatINR(args.proposedValue)} ready for dispatch. CEO signature required.`
    }),
    execute: async (args) => {
      const lead = operationalDb.leads.find(l => l.id === args.leadId);
      if (!lead) throw new Error(`Lead ${args.leadId} not found`);
      lead.status = 'CONTRACT_DISPATCHED';
      return { dispatched: true, recipient: lead.email, contractValue: args.proposedValue, timestamp: new Date().toISOString() };
    }
  },

  // === MARKETING TOOLS ===
  generate_campaign_hooks: {
    name: 'generate_campaign_hooks',
    department: Department.MARKETING,
    description: 'Brainstorm high-converting content angles and copywriting hooks.',
    parameters: { topic: 'string', platform: 'string' },
    evaluateRisk: () => ({ riskLevel: RiskLevel.LOW, requiresApproval: false, reason: 'Content ideation' }),
    execute: async (args) => ({
      hooks: [
        `"90% of business tasks are repetitive. Here is how our autonomous agentic harness handles ops."`,
        `"Why AI agents without human-in-the-loop approvals are an enterprise nightmare."`,
        `"CodeSharks: The future of autonomous AI operations."`
      ],
      topic: args.topic,
      platform: args.platform
    })
  },

  publish_sponsored_campaign: {
    name: 'publish_sponsored_campaign',
    department: Department.MARKETING,
    description: 'Launch paid advertisement campaign with ad budget spend.',
    parameters: { campaignId: 'string', budgetINR: 'number', channels: 'array' },
    evaluateRisk: (args) => ({
      riskLevel: RiskLevel.HIGH,
      requiresApproval: true,
      reason: `Ad spend budget of ${formatINR(args.budgetINR)} requested. Requires executive budget approval.`
    }),
    execute: async (args) => {
      return { launched: true, budgetApproved: args.budgetINR, status: 'LIVE_ACTIVE', channels: args.channels };
    }
  },

  // === TECH TOOLS ===
  triage_production_incident: {
    name: 'triage_production_incident',
    department: Department.TECH,
    description: 'Analyze telemetry, stack traces, and cluster load to identify root cause.',
    parameters: { incidentId: 'string' },
    evaluateRisk: () => ({ riskLevel: RiskLevel.LOW, requiresApproval: false, reason: 'Diagnostic read-only triage' }),
    execute: async (args) => {
      const inc = operationalDb.systemIncidents.find(i => i.id === args.incidentId) || operationalDb.systemIncidents[0];
      return { incident: inc, rootCause: 'Memory leak in worker connection pool causing CPU surge to 96%' };
    }
  },

  deploy_production_hotfix: {
    name: 'deploy_production_hotfix',
    department: Department.TECH,
    description: 'Trigger autonomous rollback or emergency production server hotfix deployment.',
    parameters: { serviceName: 'string', targetVersion: 'string', rollback: 'boolean' },
    evaluateRisk: (args) => ({
      riskLevel: RiskLevel.CRITICAL,
      requiresApproval: true,
      reason: `Critical production mutation: Rollback/Deploy to ${args.serviceName} (${args.targetVersion}). Requires authorization.`
    }),
    execute: async (args) => {
      const inc = operationalDb.systemIncidents[0];
      if (inc) {
        inc.cpuLoad = '18%';
        inc.severity = 'RESOLVED';
      }
      return { deployed: true, service: args.serviceName, targetVersion: args.targetVersion, serverStatus: 'HEALTHY' };
    }
  },

  // === HR TOOLS ===
  screen_candidate_resumes: {
    name: 'screen_candidate_resumes',
    department: Department.HR,
    description: 'Evaluate incoming developer portfolios, technical skills, and role alignment.',
    parameters: { role: 'string' },
    evaluateRisk: () => ({ riskLevel: RiskLevel.LOW, requiresApproval: false, reason: 'Talent evaluation analysis' }),
    execute: async () => ({
      qualifiedCandidates: operationalDb.candidates.filter(c => c.matchScore >= 85)
    })
  },

  send_employment_offer: {
    name: 'send_employment_offer',
    department: Department.HR,
    description: 'Dispatch official employment offer letter and compensation package to candidate.',
    parameters: { candidateId: 'string', offeredSalaryINR: 'number', role: 'string' },
    evaluateRisk: (args) => ({
      riskLevel: RiskLevel.CRITICAL,
      requiresApproval: true,
      reason: `Official employment offer letter with CTC ${formatINR(args.offeredSalaryINR)} for role ${args.role}. Requires CEO approval.`
    }),
    execute: async (args) => {
      const cand = operationalDb.candidates.find(c => c.id === args.candidateId);
      if (cand) cand.status = 'OFFER_EXTENDED';
      return { offerExtended: true, candidate: cand ? cand.name : args.candidateId, ctc: args.offeredSalaryINR };
    }
  }
};
