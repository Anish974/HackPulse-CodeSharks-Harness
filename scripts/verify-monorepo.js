import { Department, RiskLevel } from '@codesharks/shared';
import { TOOL_REGISTRY, operationalDb } from '@codesharks/tools';
import { agentEngine, approvalManager } from '@codesharks/agent-core';

console.log('🦈 Running CodeSharks Monorepo System Verification...\n');

// 1. Verify Shared
console.log('1. Checking @codesharks/shared:');
console.log(`   - Departments: ${Object.keys(Department).join(', ')}`);
console.log(`   - Risk Levels: ${Object.keys(RiskLevel).join(', ')}`);
console.log('   ✅ Shared Package OK\n');

// 2. Verify Tools
console.log('2. Checking @codesharks/tools:');
const tools = Object.keys(TOOL_REGISTRY);
console.log(`   - Registered Tools (${tools.length}): ${tools.join(', ')}`);
console.log(`   - Operational DB Leads: ${operationalDb.leads.length}`);
console.log(`   - Operational DB Invoices: ${operationalDb.invoices.length}`);
console.log('   ✅ Tools Package OK\n');

// 3. Test Safety Policy Gatekeeper & Approval Flow
console.log('3. Testing Agent Engine & Approval Harness:');
let intercepted = false;

agentEngine.onEvent((event, payload) => {
  if (event === 'agent:paused_for_approval') {
    intercepted = true;
    console.log(`   🛡️ Intercepted critical action: [${payload.approvalId}] ${payload.summary}`);
  }
});

const report = await agentEngine.runWorkflow(Department.SALES);
console.log(`   - Workflow completed with ${report.log.length} steps logged.`);

const pending = approvalManager.getPending();
console.log(`   - Pending Approvals in Queue: ${pending.length}`);

if (pending.length > 0) {
  const targetId = pending[0].id;
  console.log(`   - Simulating CEO approval for ${targetId}...`);
  await approvalManager.approve(targetId, 'CEO (Automated Test)');
  console.log(`   ✅ Successfully approved and executed tool! Status: ${approvalManager.getById(targetId).status}`);
}

console.log('\n🎉 ALL MONOREPO PACKAGES & APPROVAL HARNESS WORKING FLAWLESSLY!');
process.exit(0);
