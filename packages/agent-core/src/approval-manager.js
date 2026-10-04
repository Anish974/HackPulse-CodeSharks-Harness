import { ApprovalStatus } from '@codesharks/shared';
import { TOOL_REGISTRY, operationalDb } from '@codesharks/tools';

class ApprovalManager {
  constructor() {
    this.queue = [];
    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(event, payload) {
    for (const listener of this.listeners) {
      try {
        listener(event, payload);
      } catch (err) {
        console.error('Listener notification error:', err);
      }
    }
  }

  createApprovalRequest({
    agentId,
    department,
    toolName,
    toolArgs,
    riskLevel,
    reason,
    proposalSummary
  }) {
    const id = `APPR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const request = {
      id,
      agentId,
      department,
      toolName,
      toolArgs,
      riskLevel,
      status: ApprovalStatus.PENDING,
      reason,
      proposalSummary,
      proposedAt: new Date().toISOString(),
      resolvedAt: null,
      resolvedBy: null,
      executionResult: null
    };

    this.queue.unshift(request);
    this.notify('approval:created', request);
    return request;
  }

  getPending() {
    return this.queue.filter(item => item.status === ApprovalStatus.PENDING);
  }

  getAll() {
    return this.queue;
  }

  getById(id) {
    return this.queue.find(item => item.id === id);
  }

  async approve(id, approver = 'CEO (Human-in-the-Loop)') {
    const request = this.getById(id);
    if (!request) throw new Error(`Approval request ${id} not found`);
    if (request.status !== ApprovalStatus.PENDING) {
      throw new Error(`Request ${id} is already ${request.status}`);
    }

    request.status = ApprovalStatus.APPROVED;
    request.resolvedAt = new Date().toISOString();
    request.resolvedBy = approver;

    // Execute the underlying tool safely now that human signed off
    const tool = TOOL_REGISTRY[request.toolName];
    if (!tool) throw new Error(`Tool ${request.toolName} not found in registry`);

    try {
      const result = await tool.execute(request.toolArgs);
      request.status = ApprovalStatus.EXECUTED;
      request.executionResult = result;

      // Add to audit trail
      operationalDb.auditLog.push({
        id: `AUDIT-${Date.now()}`,
        approvalId: request.id,
        tool: request.toolName,
        authorizedBy: approver,
        timestamp: request.resolvedAt,
        status: 'SUCCESS',
        result
      });

      this.notify('approval:executed', request);
      return request;
    } catch (err) {
      request.status = ApprovalStatus.FAILED;
      request.executionResult = { error: err.message };
      this.notify('approval:failed', request);
      throw err;
    }
  }

  reject(id, reason = 'Rejected by CEO', reviewer = 'CEO (Human-in-the-Loop)') {
    const request = this.getById(id);
    if (!request) throw new Error(`Approval request ${id} not found`);
    if (request.status !== ApprovalStatus.PENDING) {
      throw new Error(`Request ${id} is already ${request.status}`);
    }

    request.status = ApprovalStatus.REJECTED;
    request.resolvedAt = new Date().toISOString();
    request.resolvedBy = reviewer;
    request.executionResult = { rejectionReason: reason };

    operationalDb.auditLog.push({
      id: `AUDIT-${Date.now()}`,
      approvalId: request.id,
      tool: request.toolName,
      rejectedBy: reviewer,
      rejectionReason: reason,
      timestamp: request.resolvedAt,
      status: 'REJECTED'
    });

    this.notify('approval:rejected', request);
    return request;
  }
}

export const approvalManager = new ApprovalManager();
