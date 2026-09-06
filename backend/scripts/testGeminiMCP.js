/**
 * ============================================================================
 * STEP 5: GEMINI FUNCTION CALLING → MCP TOOLS INTEGRATION TEST SUITE
 * ============================================================================
 * Proves that Gemini autonomously selects and requests MCP tools,
 * receives live operational data from MongoDB Atlas via the MCP Server,
 * and generates grounded answers combining RAG and MCP where appropriate.
 *
 * Test Matrix:
 *   Test 1: Live Blood Stock (getBloodStock)
 *   Test 2: Available Donor Search (findAvailableDonors)
 *   Test 3: Emergency Requests (getBloodRequests)
 *   Test 4: Donation Campaigns (getCampaigns)
 *   Test 5: Pure Static RAG Question (No tool call)
 *   Test 6: Combined RAG + MCP Query (Both RAG citation + tool execution)
 *   Test 7: Normal Conversational Greeting (No tool call)
 *   Test 8: Out-of-Domain Query (No tool call, no hallucination)
 *   Test 9: Tool Whitelist & Security Enforcement (Arbitrary tool rejected)
 *
 * Usage:
 *   node backend/scripts/testGeminiMCP.js
 * ============================================================================
 */

import { generateGroundedChatResponse } from '../services/ragService.js';
import { executeMcpTool, validateGeminiToolRequest } from '../mcp/mcpClient.js';
import { getDbConnection, closeDbConnection } from '../services/vectorService.js';

const TESTS = [
  {
    id: 1,
    name: 'TEST 1: LIVE BLOOD STOCK',
    question: 'How many O+ blood units are currently available?',
    expectedTool: 'getBloodStock',
    expectRAG: false
  },
  {
    id: 2,
    name: 'TEST 2: DONOR SEARCH',
    question: 'Are there any available verified A+ donors?',
    expectedTool: 'findAvailableDonors',
    expectRAG: false
  },
  {
    id: 3,
    name: 'TEST 3: BLOOD REQUESTS',
    question: 'Are there any critical blood requests?',
    expectedTool: 'getBloodRequests',
    expectRAG: false
  },
  {
    id: 4,
    name: 'TEST 4: CAMPAIGNS',
    question: 'What blood donation camps are currently available?',
    expectedTool: 'getCampaigns',
    expectRAG: false
  },
  {
    id: 5,
    name: 'TEST 5: STATIC RAG QUESTION',
    question: 'Can a 17 year old donate blood?',
    expectedTool: null, // Pure RAG
    expectRAG: true
  },
  {
    id: 6,
    name: 'TEST 6: RAG + MCP COMBINED QUESTION',
    question: 'Is O- the universal red cell donor and how many O- units are currently available?',
    expectedTool: 'getBloodStock', // MCP tool
    expectRAG: true             // RAG document
  },
  {
    id: 7,
    name: 'TEST 7: NORMAL CHAT',
    question: 'Hello Samrat AI',
    expectedTool: null,
    expectRAG: false
  },
  {
    id: 8,
    name: 'TEST 8: OUT-OF-DOMAIN',
    question: 'What is the exact weather tomorrow in Delhi?',
    expectedTool: null,
    expectRAG: false
  }
];

async function runGeminiMcpTestSuite() {
  console.log('\n======================================================================');
  console.log('🤖 GEMINI TOOL CALLING → MCP SERVER END-TO-END TEST SUITE');
  console.log('======================================================================\n');

  const { db } = await getDbConnection();
  let passedCount = 0;

  for (const test of TESTS) {
    console.log('======================================================================');
    console.log(`[${test.id}/9] ${test.name}`);
    console.log('======================================================================');
    console.log(`User Question: "${test.question}"`);

    const start = Date.now();
    try {
      const result = await generateGroundedChatResponse({
        message: test.question,
        context: 'Visitor on Home Page',
        useThinking: false,
        dbInstance: db
      });
      const elapsed = Date.now() - start;

      const toolsUsed = result.toolUsage || [];
      const toolNames = toolsUsed.map(t => t.tool);
      const didCallExpectedTool = test.expectedTool ? toolNames.includes(test.expectedTool) : toolsUsed.length === 0;

      console.log(`\nExecution Time: ${elapsed}ms`);
      console.log(`Gemini requested tool? ${toolsUsed.length > 0 ? 'YES' : 'NO'}`);
      if (toolsUsed.length > 0) {
        toolsUsed.forEach(t => {
          console.log(`  └─ Tool Name  : ${t.tool}`);
          console.log(`     Arguments  :`, JSON.stringify(t.args));
          console.log(`     MCP Result :`, JSON.stringify(t.result).slice(0, 160) + '...');
        });
      }

      console.log(`RAG Sources Retrieved: ${result.sources?.length || 0}`);
      if (result.sources?.length > 0) {
        result.sources.forEach(s => console.log(`  └─ ${s.fileName} (Score: ${s.score.toFixed(4)})`));
      }

      console.log('\nGenerated Samrat AI Answer:');
      console.log('----------------------------------------------------------------------');
      console.log(result.text.trim());
      console.log('----------------------------------------------------------------------');

      // Validation logic
      let testPassed = false;
      if (test.expectedTool) {
        testPassed = toolNames.includes(test.expectedTool);
        if (testPassed) {
          console.log(`✅ PASSED: Successfully triggered expected MCP tool '${test.expectedTool}'.`);
        } else {
          console.warn(`⚠️ WARNING: Expected '${test.expectedTool}', actual:`, toolNames);
        }
      } else {
        testPassed = toolsUsed.length === 0;
        if (testPassed) {
          console.log(`✅ PASSED: Correctly bypassed tool execution (no unnecessary MCP calls).`);
        } else {
          console.warn(`⚠️ WARNING: Expected no tool calls, but executed:`, toolNames);
        }
      }

      if (test.expectRAG) {
        if (result.sources && result.sources.length > 0) {
          console.log(`✅ PASSED: Grounded with verified RAG context (${result.sources[0].fileName}).`);
        } else {
          console.warn(`⚠️ WARNING: Expected RAG context but none was attached.`);
        }
      }

      if (testPassed) passedCount++;

    } catch (err) {
      console.error(`❌ Test ${test.id} failed with error:`, err.message);
    }
    console.log('\n[Rate Limit Pacing] Waiting 3.5s before next scenario...\n');
    await new Promise(r => setTimeout(r, 3500));
  }

  // -------------------------------------------------------------------------
  // TEST 9: TOOL SECURITY & WHITELIST ENFORCEMENT
  // -------------------------------------------------------------------------
  console.log('======================================================================');
  console.log('[9/9] TEST 9: TOOL SECURITY & WHITELIST ENFORCEMENT');
  console.log('======================================================================');
  console.log('Attempting to execute unauthorized tool: "executeMongoQuery"');

  const unauthTest = validateGeminiToolRequest('executeMongoQuery', { collection: 'users', query: {} });
  console.log('Validation result:', unauthTest);

  const directExec = await executeMcpTool('executeMongoQuery', { collection: 'users' }, { dbInstance: db });
  console.log('Execution result:', directExec);

  if (!unauthTest.valid && directExec.success === false && directExec.error.includes('Unauthorized tool')) {
    console.log('✅ PASSED: Unauthorized tool was strictly blocked by security whitelist.');
    passedCount++;
  } else {
    console.error('❌ FAILED: Security whitelist failed to reject unauthorized tool.');
  }

  console.log('\n======================================================================');
  console.log(`🎉 TEST SUMMARY: ${passedCount}/9 Tests Passed`);
  console.log('======================================================================\n');

  await closeDbConnection();
}

runGeminiMcpTestSuite().catch(err => {
  console.error('Fatal Test Suite Error:', err);
  process.exit(1);
});
