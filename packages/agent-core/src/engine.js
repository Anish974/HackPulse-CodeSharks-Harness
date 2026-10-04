import { Department, AGENT_REGISTRY, RiskLevel } from '@codesharks/shared';
import { TOOL_REGISTRY } from '@codesharks/tools';
import { approvalManager } from './approval-manager.js';

export class AgentHarnessEngine {
  constructor() {
    this.eventListeners = new Set();
  }

  onEvent(callback) {
    this.eventListeners.add(callback);
    return () => this.eventListeners.delete(callback);
  }

  emit(event, payload) {
    for (const cb of this.eventListeners) {
      try {
        cb(event, payload);
      } catch (e) {
        console.error('Agent Engine emit error:', e);
      }
    }
  }

  /**
   * Run an autonomous workflow for a specific department
   */
  async runWorkflow(department, scenario = null) {
    const agentMeta = AGENT_REGISTRY[department];
    if (!agentMeta) throw new Error(`Unknown department: ${department}`);

    const runId = `RUN-${Date.now()}`;
    this.emit('agent:start', { runId, agent: agentMeta, department, timestamp: new Date().toISOString() });

    // Step 1: Observation & Planning
    const plan = this.generatePlan(department, scenario);
    this.emit('agent:thought', {
      runId,
      agentId: agentMeta.id,
      agentName: agentMeta.name,
      thought: plan.thought,
      goal: plan.goal
    });

    const executionLog = [];

    // Step 2: Iterate through tool calls planned by the agent
    for (const step of plan.steps) {
      const tool = TOOL_REGISTRY[step.toolName];
      if (!tool) {
        this.emit('agent:error', { runId, message: `Tool not found: ${step.toolName}` });
        continue;
      }

      this.emit('agent:tool_call', {
        runId,
        agentName: agentMeta.name,
        tool: step.toolName,
        args: step.args,
        intent: step.intent
      });

      // Step 3: Safety / Governance Policy Evaluation
      const risk = tool.evaluateRisk(step.args);
      this.emit('agent:policy_eval', {
        runId,
        tool: step.toolName,
        riskLevel: risk.riskLevel,
        requiresApproval: risk.requiresApproval,
        reason: risk.reason
      });

      if (risk.requiresApproval) {
        // Human-in-the-Loop Interception
        const approvalReq = approvalManager.createApprovalRequest({
          agentId: agentMeta.id,
          department,
          toolName: step.toolName,
          toolArgs: step.args,
          riskLevel: risk.riskLevel,
          reason: risk.reason,
          proposalSummary: step.proposalSummary || step.intent
        });

        this.emit('agent:paused_for_approval', {
          runId,
          agentName: agentMeta.name,
          approvalId: approvalReq.id,
          summary: approvalReq.proposalSummary,
          reason: risk.reason
        });

        executionLog.push({
          step: step.toolName,
          status: 'PENDING_APPROVAL',
          approvalId: approvalReq.id,
          risk: risk.riskLevel
        });

        // Pause this action path until executive approves
        continue;
      }

      // Safe autonomous action: Execute immediately
      try {
        const result = await tool.execute(step.args);
        this.emit('agent:tool_executed', {
          runId,
          tool: step.toolName,
          result
        });
        executionLog.push({ step: step.toolName, status: 'EXECUTED', result });
      } catch (err) {
        this.emit('agent:tool_failed', { runId, tool: step.toolName, error: err.message });
        executionLog.push({ step: step.toolName, status: 'FAILED', error: err.message });
      }
    }

    // Step 4: Summary synthesis
    const finalReport = {
      runId,
      department,
      agent: agentMeta.name,
      completedAt: new Date().toISOString(),
      log: executionLog
    };

    this.emit('agent:finished', finalReport);
    return finalReport;
  }

  generatePlan(department, scenario) {
    if (scenario) return scenario;

    switch (department) {
      case Department.FINANCE:
        return {
          goal: 'Audit overdue invoices, send routine payment reminders, and flag high-risk debt',
          thought: 'Scanning accounts receivable. Starlight Media has an invoice of ₹1,20,000 overdue by 19 days. Titan FinTech has ₹4,80,000 overdue. For amounts over ₹50k, our harness policy strictly forbids autonomous external badgering without CEO sign-off.',
          steps: [
            {
              toolName: 'query_overdue_invoices',
              args: {},
              intent: 'Analyze current overdue ledger',
              proposalSummary: 'Read accounts receivable ledger'
            },
            {
              toolName: 'send_invoice_reminder',
              args: { invoiceId: 'INV-2026-089', tone: 'Firm & Professional' },
              intent: 'Dispatch reminder for ₹1,20,000 invoice to Starlight Media',
              proposalSummary: 'Send formal overdue payment demand for ₹1,20,000 to Starlight Media'
            }
          ]
        };

      case Department.SALES:
        return {
          goal: 'Review incoming enterprise inbound leads and draft proposals',
          thought: 'New inbound lead from Apex Cloud Solutions (budget ₹1,50,000) and Zenith Logistics (budget ₹3,50,000). Qualifying leads autonomously. Once qualified, proposing a full commercial agreement.',
          steps: [
            {
              toolName: 'qualify_inbound_lead',
              args: { leadId: 'lead_1' },
              intent: 'Qualify lead requirements and budget alignment',
              proposalSummary: 'Score Apex Cloud Solutions against agency enterprise capability'
            },
            {
              toolName: 'send_external_contract',
              args: { leadId: 'lead_1', proposedValue: 150000, scope: 'Enterprise Multi-Agent Workflow Implementation' },
              intent: 'Send binding ₹1,50,000 service contract to Apex Cloud Solutions',
              proposalSummary: 'Dispatch binding commercial agreement of ₹1,50,000 to Rohan Sharma (Apex Cloud)'
            }
          ]
        };

      case Department.TECH:
        return {
          goal: 'Investigate critical production telemetry alerts and mitigate downtime',
          thought: 'API Gateway is experiencing high CPU pressure (96%). Triaging telemetry first. If rollback is necessary, human approval will be mandatory to avoid unintended downtime.',
          steps: [
            {
              toolName: 'triage_production_incident',
              args: { incidentId: 'INC-404' },
              intent: 'Inspect live traces and connection pool errors',
              proposalSummary: 'Diagnose incident INC-404 in API Gateway'
            },
            {
              toolName: 'deploy_production_hotfix',
              args: { serviceName: 'API Gateway', targetVersion: 'v2.4.0', rollback: true },
              intent: 'Perform emergency cluster rollback to v2.4.0',
              proposalSummary: 'Emergency rollback of production API Gateway from v2.4.1 to v2.4.0'
            }
          ]
        };

      case Department.HR:
        return {
          goal: 'Process top candidates for Senior AI Engineer opening',
          thought: 'Screening applicant pool. Candidate Devendra Patel has 94% match score. Preparing formal offer proposal.',
          steps: [
            {
              toolName: 'screen_candidate_resumes',
              args: { role: 'Senior AI Engineer' },
              intent: 'Evaluate technical qualifications of applicants',
              proposalSummary: 'Screen candidates for Senior AI Engineer position'
            },
            {
              toolName: 'send_employment_offer',
              args: { candidateId: 'cand_101', offeredSalaryINR: 2800000, role: 'Senior AI Engineer' },
              intent: 'Issue formal offer letter with CTC ₹28,00,000',
              proposalSummary: 'Extend official offer letter of ₹28,00,000 CTC to Devendra Patel'
            }
          ]
        };

      default:
        return {
          goal: 'Generate weekly marketing hooks and draft ad spend',
          thought: 'Formulating Q4 campaigns. Safe ideation runs autonomously, while ad budget spends require CEO approval.',
          steps: [
            {
              toolName: 'generate_campaign_hooks',
              args: { topic: 'Enterprise Agentic Operations', platform: 'LinkedIn' },
              intent: 'Draft viral thought leadership hooks',
              proposalSummary: 'Generate creative campaign angles'
            },
            {
              toolName: 'publish_sponsored_campaign',
              args: { campaignId: 'camp_1', budgetINR: 85000, channels: ['LinkedIn Ads', 'Twitter Pro'] },
              intent: 'Launch Q4 paid distribution with ₹85,000 budget',
              proposalSummary: 'Commit ₹85,000 ad spend for Q4 campaign launch'
            }
          ]
        };
    }
  }
}

export const agentEngine = new AgentHarnessEngine();
