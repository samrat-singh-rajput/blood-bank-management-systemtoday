/**
 * ============================================================================
 * MCP (MODEL CONTEXT PROTOCOL) INTEGRATION & SECURITY TEST SUITE
 * ============================================================================
 * Tests all 4 operational tools both directly and via the official MCP
 * protocol Client-Server JSON-RPC transport (InMemoryTransport).
 *
 * Verifies:
 *   1. Tool 1: getBloodStock (all inventory & filtered by blood group)
 *   2. Tool 2: findAvailableDonors (filtered by bloodType)
 *   3. Tool 3: getBloodRequests (filtered by status or urgency)
 *   4. Tool 4: getCampaigns (active campaigns)
 *   5. Input Validation & Error Handling (invalid blood group rejected)
 *   6. Security & Credential Protection (zero password, token, or OTP leakage)
 *   7. Full MCP JSON-RPC Protocol conformance (listTools and callTool)
 *
 * Usage:
 *   node backend/scripts/testMCP.js
 * ============================================================================
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createBloodBankMcpServer, executeToolDirect, MCP_TOOLS } from '../mcp/mcpServer.js';
import { getDbConnection, closeDbConnection } from '../services/vectorService.js';

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /hash/i,
  /secret/i,
  /token/i,
  /jwt/i,
  /otp/i,
  /api[_-]?key/i,
  /credentials/i
];

/**
 * Recursively scans an object for sensitive property names.
 */
function scanForSensitiveKeys(obj, path = '') {
  const leaks = [];
  if (!obj || typeof obj !== 'object') return leaks;

  for (const [key, value] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key;
    if (SENSITIVE_KEY_PATTERNS.some(p => p.test(key))) {
      leaks.push({ path: currentPath, key, value });
    }
    if (value && typeof value === 'object') {
      leaks.push(...scanForSensitiveKeys(value, currentPath));
    }
  }
  return leaks;
}

async function runMCPTests() {
  console.log('\n======================================================================');
  console.log('🛡️  BLOOD BANK MANAGEMENT SYSTEM - MCP TOOLS TEST SUITE');
  console.log('======================================================================\n');

  const { db } = await getDbConnection();
  let totalTests = 0;
  let passedTests = 0;

  // -------------------------------------------------------------------------
  // SECTION 1: Direct Tool Invocations
  // -------------------------------------------------------------------------

  // Test 1: getBloodStock (All Groups)
  totalTests++;
  console.log('----------------------------------------------------------------------');
  console.log('[TEST 1] getBloodStock - Retrieve Full Inventory');
  console.log('----------------------------------------------------------------------');
  const stockResult = await executeToolDirect('getBloodStock', {}, { dbInstance: db });
  console.log('Success:', stockResult.success);
  console.log('Total Groups Returned:', stockResult.totalGroupsReturned);
  console.log('Inventory Sample:', stockResult.data?.slice(0, 3));
  if (stockResult.success && stockResult.data?.length > 0) {
    console.log('✅ TEST 1 PASSED: Retrieved full inventory successfully.\n');
    passedTests++;
  } else {
    console.error('❌ TEST 1 FAILED\n');
  }

  // Test 2: getBloodStock (Filtered by valid blood group)
  totalTests++;
  console.log('----------------------------------------------------------------------');
  console.log('[TEST 2] getBloodStock - Filter by Blood Group ("B-")');
  console.log('----------------------------------------------------------------------');
  const bMinusResult = await executeToolDirect('getBloodStock', { bloodGroup: 'B-' }, { dbInstance: db });
  console.log('Success:', bMinusResult.success);
  console.log('Returned Data:', bMinusResult.data);
  if (bMinusResult.success && bMinusResult.data?.length === 1 && bMinusResult.data[0].bloodGroup === 'B-') {
    console.log('✅ TEST 2 PASSED: Filtered stock for B- correctly.\n');
    passedTests++;
  } else {
    console.error('❌ TEST 2 FAILED\n');
  }

  // Test 3: findAvailableDonors (Filtered by bloodType "A+")
  totalTests++;
  console.log('----------------------------------------------------------------------');
  console.log('[TEST 3] findAvailableDonors - Filter by bloodType ("A+")');
  console.log('----------------------------------------------------------------------');
  const donorResult = await executeToolDirect('findAvailableDonors', { bloodType: 'A+' }, { dbInstance: db });
  console.log('Success:', donorResult.success);
  console.log('Donors Found:', donorResult.totalDonorsFound);
  console.log('Donor Sample:', donorResult.data?.slice(0, 2));
  if (donorResult.success && Array.isArray(donorResult.data)) {
    console.log('✅ TEST 3 PASSED: Retrieved available verified donors.\n');
    passedTests++;
  } else {
    console.error('❌ TEST 3 FAILED\n');
  }

  // Test 4: getBloodRequests (Retrieve active requests)
  totalTests++;
  console.log('----------------------------------------------------------------------');
  console.log('[TEST 4] getBloodRequests - Retrieve Requests');
  console.log('----------------------------------------------------------------------');
  const reqResult = await executeToolDirect('getBloodRequests', { limit: 5 }, { dbInstance: db });
  console.log('Success:', reqResult.success);
  console.log('Requests Found:', reqResult.totalRequestsFound);
  console.log('Requests Sample:', reqResult.data?.slice(0, 2));
  if (reqResult.success && Array.isArray(reqResult.data)) {
    console.log('✅ TEST 4 PASSED: Retrieved requests successfully.\n');
    passedTests++;
  } else {
    console.error('❌ TEST 4 FAILED\n');
  }

  // Test 5: getCampaigns (Retrieve community campaigns)
  totalTests++;
  console.log('----------------------------------------------------------------------');
  console.log('[TEST 5] getCampaigns - Retrieve Active Drives');
  console.log('----------------------------------------------------------------------');
  const campResult = await executeToolDirect('getCampaigns', {}, { dbInstance: db });
  console.log('Success:', campResult.success);
  console.log('Campaigns Found:', campResult.totalCampaignsFound);
  console.log('Campaigns Sample:', campResult.data?.slice(0, 2));
  if (campResult.success && Array.isArray(campResult.data)) {
    console.log('✅ TEST 5 PASSED: Retrieved campaigns successfully.\n');
    passedTests++;
  } else {
    console.error('❌ TEST 5 FAILED\n');
  }

  // -------------------------------------------------------------------------
  // SECTION 2: Input Validation & Error Handling (PART O)
  // -------------------------------------------------------------------------

  totalTests++;
  console.log('----------------------------------------------------------------------');
  console.log('[TEST 6] Input Validation - Malformed Blood Group ("XYZ+")');
  console.log('----------------------------------------------------------------------');
  const invalidResult = await executeToolDirect('getBloodStock', { bloodGroup: 'XYZ+' }, { dbInstance: db });
  console.log('Returned payload:', invalidResult);
  if (invalidResult.success === false && invalidResult.error.includes('Invalid blood group')) {
    console.log('✅ TEST 6 PASSED: Correctly caught malformed blood group without crashing database.\n');
    passedTests++;
  } else {
    console.error('❌ TEST 6 FAILED: Failed to reject malformed input.\n');
  }

  // -------------------------------------------------------------------------
  // SECTION 3: Security & Credential Leakage Audit (PART P)
  // -------------------------------------------------------------------------

  totalTests++;
  console.log('----------------------------------------------------------------------');
  console.log('[TEST 7] Security Audit - Verify Zero Password/OTP/Token Leakage');
  console.log('----------------------------------------------------------------------');
  const allDonors = await executeToolDirect('findAvailableDonors', { limit: 50 }, { dbInstance: db });
  const leaks = scanForSensitiveKeys(allDonors);
  if (leaks.length === 0) {
    console.log('Scan completed: 0 sensitive keys found in output.');
    console.log('✅ TEST 7 PASSED: Passwords, OTPs, and tokens strictly excluded.\n');
    passedTests++;
  } else {
    console.error('❌ TEST 7 FAILED: Sensitive keys detected:', leaks);
  }

  // -------------------------------------------------------------------------
  // SECTION 4: Full MCP Client-Server JSON-RPC Protocol Test
  // -------------------------------------------------------------------------

  totalTests++;
  console.log('----------------------------------------------------------------------');
  console.log('[TEST 8] MCP Protocol - Client listTools & callTool via InMemoryTransport');
  console.log('----------------------------------------------------------------------');
  
  const mcpServer = createBloodBankMcpServer({ dbInstance: db });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  await mcpServer.connect(serverTransport);
  const client = new Client({ name: 'bloodbank-test-client', version: '1.0.0' });
  await client.connect(clientTransport);

  // 1. List tools
  const toolsList = await client.listTools();
  console.log('Tools registered with MCP Server:', toolsList.tools.map(t => t.name));

  // 2. Execute tool through MCP Client
  const mcpCallResult = await client.callTool({
    name: 'getBloodStock',
    arguments: { bloodGroup: 'O+' }
  });
  const parsedContent = JSON.parse(mcpCallResult.content[0].text);
  console.log('MCP Client callTool Response:', parsedContent);

  const registeredNames = toolsList.tools.map(t => t.name);
  const hasAllTools = ['getBloodStock', 'findAvailableDonors', 'getBloodRequests', 'getCampaigns']
    .every(name => registeredNames.includes(name));

  if (hasAllTools && parsedContent.success && parsedContent.data?.[0]?.bloodGroup === 'O+') {
    console.log('✅ TEST 8 PASSED: Full MCP JSON-RPC protocol verified successfully.\n');
    passedTests++;
  } else {
    console.error('❌ TEST 8 FAILED: MCP JSON-RPC protocol handshake or tool call failed.\n');
  }

  await client.close();

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log('======================================================================');
  console.log(`🎉 MCP TEST SUMMARY: ${passedTests}/${totalTests} Tests Passed`);
  console.log('======================================================================\n');

  await closeDbConnection();
}

runMCPTests().catch(err => {
  console.error('Fatal MCP Test Suite Error:', err);
  process.exit(1);
});
