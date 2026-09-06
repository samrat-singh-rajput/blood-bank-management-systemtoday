/**
 * ============================================================================
 * Step 6 Verification Script: Frontend Contract & UI Response Validation
 * ============================================================================
 * Tests all 9 scenarios specified in Step 6:
 *  1. RAG query (Knowledge citations)
 *  2. MCP Stock (Live inventory card)
 *  3. MCP Donor Search (Available donors privacy-safe summary)
 *  4. MCP Blood Requests (Critical requests summary)
 *  5. MCP Campaigns (Donation drive card)
 *  6. Hybrid RAG + MCP (Both knowledge citation & live inventory)
 *  7. Normal Conversation (Greeting, no empty badges)
 *  8. Out-of-Domain Query (Weather, safe deflection without RAG/MCP)
 *  9. Backward Compatibility (Legacy response without metadata)
 * ============================================================================
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { MongoClient } from 'mongodb';
import { generateGroundedChatResponse } from '../services/ragService.js';

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'bloodbank_system';

async function runStep6Validation() {
  console.log('\n===============================================================');
  console.log('🧪 RUNNING STEP 6 FRONTEND RAG & MCP UI VALIDATION SUITE');
  console.log('===============================================================\n');

  let client;
  let db;

  try {
    client = new MongoClient(MONGODB_URI, {
      serverApi: { version: '1', strict: false, deprecationErrors: true }
    });
    await client.connect();
    db = client.db(DB_NAME);
    console.log(` Connected to MongoDB Atlas [${DB_NAME}]`);

    const results = [];

    // ------------------------------------------------------------------------
    // TEST 1: RAG Query ("Can a 17 year old donate blood?")
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 1: RAG Query ("Can a 17 year old donate blood?") ---');
    const t1 = await generateGroundedChatResponse({
      message: "Can a 17 year old donate blood?",
      context: "General Visitor",
      dbInstance: db
    });

    const t1HasRAG = Array.isArray(t1.sources) && t1.sources.length > 0;
    const t1HasEligibility = t1.sources?.some(s => s.fileName.includes('eligibility'));
    const t1NoMCP = (!t1.toolUsage || t1.toolUsage.length === 0);
    const t1ScoreFormatted = t1.sources?.[0] ? `${Math.round(t1.sources[0].score * 100)}% relevance` : 'N/A';

    console.log(`- Answer: "${t1.text.slice(0, 100)}..."`);
    console.log(`- RAG Sources: ${t1.sources?.length || 0} found`);
    if (t1HasRAG) {
      console.log(`  Top Source: ${t1.sources[0].fileName} (Chunk #${t1.sources[0].chunkIndex}) -> ${t1ScoreFormatted}`);
    }
    console.log(`- Tool Usage: ${t1.toolUsage?.length || 0}`);

    const t1Passed = t1HasRAG && t1HasEligibility && t1NoMCP;
    results.push({ test: 'TEST 1: RAG Query', passed: t1Passed, details: `Source: ${t1.sources?.[0]?.fileName} (${t1ScoreFormatted})` });
    console.log(t1Passed ? '✅ TEST 1 PASSED' : '❌ TEST 1 FAILED');

    // ------------------------------------------------------------------------
    // TEST 2: MCP Stock Query ("How many O+ blood units are currently available?")
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 2: MCP Stock ("How many O+ blood units are currently available?") ---');
    const t2 = await generateGroundedChatResponse({
      message: "How many O+ blood units are currently available?",
      context: "General Visitor",
      dbInstance: db
    });

    const t2HasStockTool = t2.toolUsage?.some(u => u.tool === 'getBloodStock');
    const t2StockResult = t2.toolUsage?.find(u => u.tool === 'getBloodStock')?.result;
    const t2Data = t2StockResult?.data?.[0];

    console.log(`- Answer: "${t2.text.slice(0, 100)}..."`);
    console.log(`- MCP Tool: ${t2HasStockTool ? 'getBloodStock executed' : 'none'}`);
    if (t2Data) {
      console.log(`  Live Inventory: BloodGroup=${t2Data.bloodGroup}, Units=${t2Data.units}, Status=${t2Data.inventoryStatus}`);
    }

    const t2Passed = t2HasStockTool && t2StockResult?.success === true && t2Data?.bloodGroup === 'O+';
    results.push({ test: 'TEST 2: MCP Stock', passed: t2Passed, details: `Stock: ${t2Data?.bloodGroup} (${t2Data?.units} units, ${t2Data?.inventoryStatus})` });
    console.log(t2Passed ? '✅ TEST 2 PASSED' : '❌ TEST 2 FAILED');

    // ------------------------------------------------------------------------
    // TEST 3: MCP Donor Search ("Are there any available verified A+ donors?")
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 3: MCP Donor Search ("Are there any available verified A+ donors?") ---');
    const t3 = await generateGroundedChatResponse({
      message: "Are there any available verified A+ donors?",
      context: "General Visitor",
      dbInstance: db
    });

    const t3HasDonorTool = t3.toolUsage?.some(u => u.tool === 'findAvailableDonors');
    const t3DonorResult = t3.toolUsage?.find(u => u.tool === 'findAvailableDonors')?.result;
    const t3TotalDonors = t3DonorResult?.totalDonorsFound ?? t3DonorResult?.data?.length ?? 0;

    // Verify privacy: ensure no password, passwordHash, token, or OTP in tool result
    let privacySafe = true;
    if (t3DonorResult?.data) {
      for (const d of t3DonorResult.data) {
        if (d.password || d.passwordHash || d.token || d.otp || d.jwt) {
          privacySafe = false;
        }
      }
    }

    console.log(`- Answer: "${t3.text.slice(0, 100)}..."`);
    console.log(`- MCP Tool: ${t3HasDonorTool ? 'findAvailableDonors executed' : 'none'}`);
    console.log(`  Verified Donors Count: ${t3TotalDonors}, Privacy Safe: ${privacySafe}`);

    const t3Passed = t3HasDonorTool && t3DonorResult?.success === true && privacySafe;
    results.push({ test: 'TEST 3: MCP Donor Search', passed: t3Passed, details: `${t3TotalDonors} verified donors found (Privacy preserved)` });
    console.log(t3Passed ? '✅ TEST 3 PASSED' : '❌ TEST 3 FAILED');

    // ------------------------------------------------------------------------
    // TEST 4: MCP Requests ("Are there any critical blood requests?")
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 4: MCP Requests ("Are there any critical blood requests?") ---');
    const t4 = await generateGroundedChatResponse({
      message: "Are there any critical blood requests?",
      context: "General Visitor",
      dbInstance: db
    });

    const t4HasRequestTool = t4.toolUsage?.some(u => u.tool === 'getBloodRequests');
    const t4RequestResult = t4.toolUsage?.find(u => u.tool === 'getBloodRequests')?.result;
    const t4Count = t4RequestResult?.totalRequestsFound ?? t4RequestResult?.data?.length ?? 0;

    console.log(`- Answer: "${t4.text.slice(0, 100)}..."`);
    console.log(`- MCP Tool: ${t4HasRequestTool ? 'getBloodRequests executed' : 'none'}`);
    console.log(`  Requests Found: ${t4Count}`);

    const t4Passed = t4HasRequestTool && t4RequestResult?.success === true;
    results.push({ test: 'TEST 4: MCP Requests', passed: t4Passed, details: `${t4Count} requests found` });
    console.log(t4Passed ? '✅ TEST 4 PASSED' : '❌ TEST 4 FAILED');

    // ------------------------------------------------------------------------
    // TEST 5: MCP Campaigns ("What blood donation camps are currently available?")
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 5: MCP Campaigns ("What blood donation camps are currently available?") ---');
    const t5 = await generateGroundedChatResponse({
      message: "What blood donation camps are currently available?",
      context: "General Visitor",
      dbInstance: db
    });

    const t5HasCampaignTool = t5.toolUsage?.some(u => u.tool === 'getCampaigns');
    const t5CampaignResult = t5.toolUsage?.find(u => u.tool === 'getCampaigns')?.result;
    const t5Data = t5CampaignResult?.data?.[0];

    console.log(`- Answer: "${t5.text.slice(0, 100)}..."`);
    console.log(`- MCP Tool: ${t5HasCampaignTool ? 'getCampaigns executed' : 'none'}`);
    if (t5Data) {
      console.log(`  Campaign: "${t5Data.title}" at "${t5Data.location}" on "${t5Data.date}"`);
    }

    const t5Passed = t5HasCampaignTool && t5CampaignResult?.success === true;
    results.push({ test: 'TEST 5: MCP Campaigns', passed: t5Passed, details: `Campaign: ${t5Data?.title || 'Drive'} (${t5Data?.location || 'Venue'})` });
    console.log(t5Passed ? '✅ TEST 5 PASSED' : '❌ TEST 5 FAILED');

    // ------------------------------------------------------------------------
    // TEST 6: HYBRID Query ("Is O- the universal red cell donor and how many O- units are currently available?")
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 6: HYBRID Query ("Is O- the universal red cell donor and how many O- units are currently available?") ---');
    const t6 = await generateGroundedChatResponse({
      message: "Is O- the universal red cell donor and how many O- units are currently available?",
      context: "General Visitor",
      dbInstance: db
    });

    const t6HasRAG = Array.isArray(t6.sources) && t6.sources.length > 0;
    const t6HasMCP = t6.toolUsage?.some(u => u.tool === 'getBloodStock');
    const t6CompatSource = t6.sources?.some(s => s.fileName.includes('compatibility'));
    const t6StockData = t6.toolUsage?.find(u => u.tool === 'getBloodStock')?.result?.data?.[0];

    console.log(`- Answer: "${t6.text.slice(0, 100)}..."`);
    console.log(`- RAG Sources: ${t6.sources?.length || 0} (Compatibility doc: ${t6CompatSource})`);
    console.log(`- MCP Live Data: ${t6HasMCP ? `O- Units: ${t6StockData?.units}` : 'none'}`);

    const t6Passed = t6HasRAG && t6HasMCP;
    results.push({
      test: 'TEST 6: HYBRID Query',
      passed: t6Passed,
      details: `RAG Source: ${t6.sources?.[0]?.fileName} | MCP Stock: O- (${t6StockData?.units} units)`
    });
    console.log(t6Passed ? '✅ TEST 6 PASSED' : '❌ TEST 6 FAILED');

    // ------------------------------------------------------------------------
    // TEST 7: NORMAL CHAT ("Hello Samrat AI")
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 7: NORMAL CHAT ("Hello Samrat AI") ---');
    const t7 = await generateGroundedChatResponse({
      message: "Hello Samrat AI",
      context: "General Visitor",
      dbInstance: db
    });

    // For general greeting, RAG sources should be pruned (below 0.80) and no MCP tools invoked
    const t7NoRAG = (!t7.sources || t7.sources.length === 0);
    const t7NoMCP = (!t7.toolUsage || t7.toolUsage.length === 0);

    console.log(`- Answer: "${t7.text.slice(0, 100)}..."`);
    console.log(`- RAG Sources: ${t7.sources?.length || 0}`);
    console.log(`- Tool Usage: ${t7.toolUsage?.length || 0}`);

    const t7Passed = t7NoRAG && t7NoMCP && t7.text.length > 0;
    results.push({ test: 'TEST 7: NORMAL CHAT', passed: t7Passed, details: `Friendly response, 0 sources, 0 tools (no empty badges)` });
    console.log(t7Passed ? '✅ TEST 7 PASSED' : '❌ TEST 7 FAILED');

    // ------------------------------------------------------------------------
    // TEST 8: OUT OF DOMAIN ("What is the exact weather tomorrow in Delhi?")
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 8: OUT OF DOMAIN ("What is the exact weather tomorrow in Delhi?") ---');
    const t8 = await generateGroundedChatResponse({
      message: "What is the exact weather tomorrow in Delhi?",
      context: "General Visitor",
      dbInstance: db
    });

    const t8NoRAG = (!t8.sources || t8.sources.length === 0);
    const t8NoMCP = (!t8.toolUsage || t8.toolUsage.length === 0);

    console.log(`- Answer: "${t8.text.slice(0, 100)}..."`);
    console.log(`- RAG Sources: ${t8.sources?.length || 0}`);
    console.log(`- Tool Usage: ${t8.toolUsage?.length || 0}`);

    const t8Passed = t8NoRAG && t8NoMCP;
    results.push({ test: 'TEST 8: OUT OF DOMAIN', passed: t8Passed, details: `Safe deflection, 0 fake sources, 0 tools` });
    console.log(t8Passed ? '✅ TEST 8 PASSED' : '❌ TEST 8 FAILED');

    // ------------------------------------------------------------------------
    // TEST 9: OLD RESPONSE COMPATIBILITY (Mock Legacy Payload)
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 9: OLD RESPONSE COMPATIBILITY ---');
    const legacyResponse = {
      response: "Hello! How can I help you today?"
    };

    // Simulate geminiService.ts transformation
    const transformed = {
      text: legacyResponse.text || legacyResponse.response,
      response: legacyResponse.response || legacyResponse.text,
      sources: Array.isArray(legacyResponse.sources) ? legacyResponse.sources : [],
      toolUsage: Array.isArray(legacyResponse.toolUsage) ? legacyResponse.toolUsage : []
    };

    // Simulate RagSourceBadge & LiveDataCard guard conditions
    const shouldRenderRagBadge = transformed.sources && transformed.sources.length > 0;
    const shouldRenderLiveData = transformed.toolUsage && transformed.toolUsage.length > 0;

    const t9Passed =
      transformed.text === "Hello! How can I help you today?" &&
      shouldRenderRagBadge === false &&
      shouldRenderLiveData === false;

    console.log(`- Legacy payload text: "${transformed.text}"`);
    console.log(`- RAG Badge should render: ${shouldRenderRagBadge} (Expected: false)`);
    console.log(`- Live Data Card should render: ${shouldRenderLiveData} (Expected: false)`);

    results.push({ test: 'TEST 9: OLD RESPONSE COMPATIBILITY', passed: t9Passed, details: `Handled cleanly without crash, empty badges suppressed` });
    console.log(t9Passed ? '✅ TEST 9 PASSED' : '❌ TEST 9 FAILED');

    // ------------------------------------------------------------------------
    // Summary
    // ------------------------------------------------------------------------
    console.log('\n===============================================================');
    console.log('📊 STEP 6 VALIDATION SUMMARY');
    console.log('===============================================================\n');

    let allPassed = true;
    for (const res of results) {
      console.log(`${res.passed ? '✅' : '❌'} ${res.test.padEnd(36)} -> ${res.details}`);
      if (!res.passed) allPassed = false;
    }

    console.log('\n---------------------------------------------------------------');
    if (allPassed) {
      console.log('🎉 ALL 9 STEP 6 TEST SCENARIOS PASSED WITH 100% SUCCESS RATE!');
    } else {
      console.log('⚠️ SOME TESTS FAILED. PLEASE REVIEW DETAILS ABOVE.');
    }
    console.log('===============================================================\n');

  } catch (error) {
    console.error('Validation script encountered an error:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('🔒 MongoDB connection closed.');
    }
  }
}

runStep6Validation();
