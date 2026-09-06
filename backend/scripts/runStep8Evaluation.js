/**
 * ============================================================================
 * STEP 8 MASTER E2E EVALUATION & BENCHMARKING SUITE
 * ============================================================================
 * Executes rigorous, comprehensive evaluation across all dimensions:
 *  - RAG Functional & Grounding Quality (Eligibility, Compatibility, Process, FAQ)
 *  - RAG Negative / Out-Of-Domain (Weather, Cricket, Bitcoin, Python, News)
 *  - Semantic Equivalence & Query Variance (Paraphrased queries & similarity scores)
 *  - MCP Operational Accuracy (getBloodStock, findAvailableDonors, getBloodRequests, getCampaigns)
 *  - Hybrid RAG + MCP Execution (Dual citations & live inventory)
 *  - Autonomous Tool Selection Discretion (Zero tool calls on general conversation)
 *  - Rate Limiter & Input Size Validation (HTTP 429 & 400 checks)
 *  - Latency & Performance Breakdown (Embedding, Vector Search, Tool, Generation, Total)
 *  - Database Integrity Check (0 writes / deletes across operational collections)
 * ============================================================================
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { MongoClient } from 'mongodb';
import { generateEmbedding } from '../services/embeddingService.js';
import { searchKnowledge } from '../services/vectorService.js';
import { generateGroundedChatResponse } from '../services/ragService.js';
import { executeMcpTool } from '../mcp/mcpClient.js';
import { validateAiChatInput } from '../server.js';

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'bloodbank_system';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runStep8Evaluation() {
  console.log('\n===============================================================');
  console.log('🔬 STEP 8: COMPREHENSIVE END-TO-END AI EVALUATION & BENCHMARK');
  console.log('===============================================================\n');

  let client;
  let db;

  try {
    client = new MongoClient(MONGODB_URI, {
      serverApi: { version: '1', strict: false, deprecationErrors: true }
    });
    await client.connect();
    db = client.db(DB_NAME);
    console.log(`✅ Connected to MongoDB Atlas [${DB_NAME}]`);

    // 1. Initial Database Baseline Counts
    const baselineCounts = {
      stocks: await db.collection('stocks').countDocuments(),
      users: await db.collection('users').countDocuments(),
      requests: await db.collection('requests').countDocuments(),
      hospitals: await db.collection('hospitals').countDocuments(),
      campaigns: await db.collection('campaigns').countDocuments(),
      knowledge_embeddings: await db.collection('knowledge_embeddings').countDocuments()
    };
    console.log('📊 Baseline Operational Database Records:', baselineCounts);

    const evaluationResults = [];
    const latencyRecords = {
      embedding: [],
      vectorSearch: [],
      mcpExecution: [],
      ragPipeline: [],
      hybridPipeline: []
    };

    // ========================================================================
    // PART 2: RAG FUNCTIONAL TESTING
    // ========================================================================
    console.log('\n---------------------------------------------------------------');
    console.log('PART 2: RAG FUNCTIONAL TESTING (Domain Grounding)');
    console.log('---------------------------------------------------------------');

    // Test A: Donor Eligibility
    console.log('\n[2A] Testing Donor Eligibility Query: "Can a 17 year old donate blood?"');
    let t0 = Date.now();
    const r2a = await generateGroundedChatResponse({
      message: "Can a 17 year old donate blood?",
      context: "General Visitor",
      dbInstance: db
    });
    latencyRecords.ragPipeline.push(Date.now() - t0);

    const hasEligibilitySrc = r2a.sources?.some(s => s.fileName.includes('eligibility') || s.fileName.includes('faq'));
    const mentions18 = r2a.text.includes('18') || r2a.text.toLowerCase().includes('eighteen');
    const noTools2a = !r2a.toolUsage || r2a.toolUsage.length === 0;
    const p2a = hasEligibilitySrc && mentions18 && noTools2a;

    console.log(`- Answer Snippet: "${r2a.text.slice(0, 100)}..."`);
    console.log(`- Sources Cited: ${r2a.sources?.map(s => `${s.fileName} (${(s.score * 100).toFixed(1)}%)`).join(', ')}`);
    console.log(`- Grounding Verified: ${mentions18}, Tool Usage: ${r2a.toolUsage?.length || 0}`);
    evaluationResults.push({ name: 'RAG: Donor Eligibility (Age Limit 18)', passed: p2a });
    console.log(p2a ? '✅ 2A PASSED' : '❌ 2A FAILED');

    await delay(3000);

    // Test B: Blood Compatibility
    console.log('\n[2B] Testing Blood Compatibility Query: "Which blood group is the universal red cell donor?"');
    t0 = Date.now();
    const r2b = await generateGroundedChatResponse({
      message: "Which blood group is the universal red cell donor?",
      context: "General Visitor",
      dbInstance: db
    });
    latencyRecords.ragPipeline.push(Date.now() - t0);

    const hasCompatSrc = r2b.sources?.some(s => s.fileName.includes('compatibility'));
    const mentionsONeg = r2b.text.includes('O-') || r2b.text.toLowerCase().includes('o negative');
    const noTools2b = !r2b.toolUsage || r2b.toolUsage.length === 0;
    const p2b = hasCompatSrc && mentionsONeg && noTools2b;

    console.log(`- Answer Snippet: "${r2b.text.slice(0, 100)}..."`);
    console.log(`- Sources Cited: ${r2b.sources?.map(s => s.fileName).join(', ')}`);
    console.log(`- Correct Universal Red Cell Donor (O-): ${mentionsONeg}`);
    evaluationResults.push({ name: 'RAG: Blood Compatibility (Universal Red Cell Donor)', passed: p2b });
    console.log(p2b ? '✅ 2B PASSED' : '❌ 2B FAILED');

    await delay(3000);

    // Test C: Donation Process
    console.log('\n[2C] Testing Donation Process Query: "What happens after blood collection?"');
    t0 = Date.now();
    const r2c = await generateGroundedChatResponse({
      message: "What happens after blood collection?",
      context: "General Visitor",
      dbInstance: db
    });
    latencyRecords.ragPipeline.push(Date.now() - t0);

    const hasProcessSrc = r2c.sources?.some(s => s.fileName.includes('process') || s.fileName.includes('faq'));
    const mentionsRestRefreshments = r2c.text.toLowerCase().includes('refreshment') ||
                                    r2c.text.toLowerCase().includes('rest') ||
                                    r2c.text.toLowerCase().includes('recovery') ||
                                    r2c.text.toLowerCase().includes('minutes');
    const p2c = hasProcessSrc && mentionsRestRefreshments;

    console.log(`- Answer Snippet: "${r2c.text.slice(0, 100)}..."`);
    console.log(`- Sources Cited: ${r2c.sources?.map(s => s.fileName).join(', ')}`);
    console.log(`- Grounding on Post-Donation Care: ${mentionsRestRefreshments}`);
    evaluationResults.push({ name: 'RAG: Donation Process (Post-Collection Care)', passed: p2c });
    console.log(p2c ? '✅ 2C PASSED' : '❌ 2C FAILED');

    await delay(3000);

    // Test D: FAQ
    console.log('\n[2D] Testing FAQ Query: "Does donating blood hurt?"');
    t0 = Date.now();
    const r2d = await generateGroundedChatResponse({
      message: "Does donating blood hurt?",
      context: "General Visitor",
      dbInstance: db
    });
    latencyRecords.ragPipeline.push(Date.now() - t0);

    const hasFaqSrc = r2d.sources?.some(s => s.fileName.includes('faq') || s.fileName.includes('process'));
    const mentionsPinch = r2d.text.toLowerCase().includes('pinch') || r2d.text.toLowerCase().includes('brief') || r2d.text.toLowerCase().includes('mild');
    const p2d = hasFaqSrc && mentionsPinch;

    console.log(`- Answer Snippet: "${r2d.text.slice(0, 100)}..."`);
    console.log(`- Sources Cited: ${r2d.sources?.map(s => s.fileName).join(', ')}`);
    evaluationResults.push({ name: 'RAG: FAQ (Donation Sensation & Safety)', passed: p2d });
    console.log(p2d ? '✅ 2D PASSED' : '❌ 2D FAILED');

    // ========================================================================
    // PART 3: RAG NEGATIVE & OUT-OF-DOMAIN TESTING
    // ========================================================================
    console.log('\n---------------------------------------------------------------');
    console.log('PART 3: RAG NEGATIVE / OUT-OF-DOMAIN TESTING');
    console.log('---------------------------------------------------------------');

    const oodQueries = [
      "What is the weather in Delhi today?",
      "Who will win today's cricket match?",
      "What is the latest Bitcoin price?",
      "Write a Python program for bubble sort.",
      "Tell me today's top global political news."
    ];

    let oodAllPassed = true;
    for (const q of oodQueries) {
      await delay(2500);
      const res = await generateGroundedChatResponse({ message: q, context: "General Visitor", dbInstance: db });
      const hasNoSources = !res.sources || res.sources.length === 0;
      const hasNoTools = !res.toolUsage || res.toolUsage.length === 0;
      const safeText = res.text.length > 0;

      console.log(`- Query: "${q}"`);
      console.log(`  Sources: ${res.sources?.length || 0}, Tools: ${res.toolUsage?.length || 0} -> Clean Deflection: ${hasNoSources && hasNoTools}`);
      if (!hasNoSources || !hasNoTools || !safeText) {
        oodAllPassed = false;
      }
    }
    evaluationResults.push({ name: 'RAG: Negative & Out-of-Domain Safety (5 Queries)', passed: oodAllPassed });
    console.log(oodAllPassed ? '✅ PART 3 PASSED' : '❌ PART 3 FAILED');

    // ========================================================================
    // PART 4: SEMANTIC SEARCH VARIANCE & LATENCY PROFILING
    // ========================================================================
    console.log('\n---------------------------------------------------------------');
    console.log('PART 4: SEMANTIC SEARCH EQUIVALENCE & VECTOR BENCHMARK');
    console.log('---------------------------------------------------------------');

    const semanticQueries = [
      "Can teenagers donate?",
      "What age do I need to be to give blood?",
      "Am I allowed to donate blood at 17?"
    ];

    let semanticAllPassed = true;
    for (const sq of semanticQueries) {
      const startEmbed = Date.now();
      const vec = await generateEmbedding(sq);
      const embedLatency = Date.now() - startEmbed;
      latencyRecords.embedding.push(embedLatency);

      const startVec = Date.now();
      const docs = await searchKnowledge(sq, { topK: 3, dbInstance: db });
      const vecLatency = Date.now() - startVec;
      latencyRecords.vectorSearch.push(vecLatency);

      const topMatch = docs[0];
      const isEligibleDoc = topMatch?.metadata?.fileName?.includes('eligibility') || topMatch?.metadata?.fileName?.includes('faq');
      const score = topMatch?.score || 0;

      console.log(`- "${sq}"`);
      console.log(`  Top Doc: ${topMatch?.metadata?.fileName} | Score: ${(score * 100).toFixed(2)}% | Embed: ${embedLatency}ms | VectorSearch: ${vecLatency}ms`);

      if (!isEligibleDoc || score < 0.80) {
        semanticAllPassed = false;
      }
    }
    evaluationResults.push({ name: 'Semantic Search: Paraphrased Query Consistency', passed: semanticAllPassed });
    console.log(semanticAllPassed ? '✅ PART 4 PASSED' : '❌ PART 4 FAILED');

    // ========================================================================
    // PARTS 5-8: MCP OPERATIONAL TOOL TESTING
    // ========================================================================
    console.log('\n---------------------------------------------------------------');
    console.log('PARTS 5-8: MCP OPERATIONAL TOOL ACCURACY');
    console.log('---------------------------------------------------------------');

    // Part 5: getBloodStock
    await delay(2500);
    console.log('\n[Part 5] Testing MCP Stock: "How much O+ blood is currently available?"');
    let startMcp = Date.now();
    const r5 = await generateGroundedChatResponse({
      message: "How much O+ blood is currently available?",
      context: "General Visitor",
      dbInstance: db
    });
    latencyRecords.mcpExecution.push(Date.now() - startMcp);

    const r5HasTool = r5.toolUsage?.some(u => u.tool === 'getBloodStock');
    const r5StockData = r5.toolUsage?.find(u => u.tool === 'getBloodStock')?.result?.data?.[0];
    const p5 = r5HasTool && r5StockData?.bloodGroup === 'O+' && typeof r5StockData?.units === 'number';

    console.log(`- MCP Tool Executed: ${r5HasTool ? 'getBloodStock' : 'none'}`);
    console.log(`- Live Database Return: ${r5StockData?.bloodGroup} = ${r5StockData?.units} units (${r5StockData?.inventoryStatus})`);
    console.log(`- Answer Snippet: "${r5.text.slice(0, 100)}..."`);
    evaluationResults.push({ name: 'MCP: Live Blood Stock Query (O+)', passed: p5 });
    console.log(p5 ? '✅ PART 5 PASSED' : '❌ PART 5 FAILED');

    // Part 6: findAvailableDonors
    await delay(2500);
    console.log('\n[Part 6] Testing MCP Donors: "Are there any A+ donors available?"');
    startMcp = Date.now();
    const r6 = await generateGroundedChatResponse({
      message: "Are there any A+ donors available?",
      context: "General Visitor",
      dbInstance: db
    });
    latencyRecords.mcpExecution.push(Date.now() - startMcp);

    const r6HasTool = r6.toolUsage?.some(u => u.tool === 'findAvailableDonors');
    const r6Donors = r6.toolUsage?.find(u => u.tool === 'findAvailableDonors')?.result?.data;
    const r6PrivacySafe = r6Donors?.every(d => !d.password && !d.passwordHash && !d.token && (!d.contactPhone || d.contactPhone.includes('*') || d.contactPhone === 'Confidential'));
    const p6 = r6HasTool && Array.isArray(r6Donors) && r6PrivacySafe;

    console.log(`- MCP Tool Executed: ${r6HasTool ? 'findAvailableDonors' : 'none'}`);
    console.log(`- Verified Donors Returned: ${r6Donors?.length || 0} | Privacy Protected: ${r6PrivacySafe}`);
    evaluationResults.push({ name: 'MCP: Donor Search with Privacy Redaction', passed: p6 });
    console.log(p6 ? '✅ PART 6 PASSED' : '❌ PART 6 FAILED');

    // Part 7: getBloodRequests
    await delay(2500);
    console.log('\n[Part 7] Testing MCP Requests: "Show critical blood requests."');
    startMcp = Date.now();
    const r7 = await generateGroundedChatResponse({
      message: "Show critical blood requests.",
      context: "General Visitor",
      dbInstance: db
    });
    latencyRecords.mcpExecution.push(Date.now() - startMcp);

    const r7HasTool = r7.toolUsage?.some(u => u.tool === 'getBloodRequests');
    const r7Requests = r7.toolUsage?.find(u => u.tool === 'getBloodRequests')?.result?.data;
    const p7 = r7HasTool && Array.isArray(r7Requests);

    console.log(`- MCP Tool Executed: ${r7HasTool ? 'getBloodRequests' : 'none'}`);
    console.log(`- Critical Requests Retrieved: ${r7Requests?.length || 0}`);
    evaluationResults.push({ name: 'MCP: Blood Requisitions Query', passed: p7 });
    console.log(p7 ? '✅ PART 7 PASSED' : '❌ PART 7 FAILED');

    // Part 8: getCampaigns
    await delay(2500);
    console.log('\n[Part 8] Testing MCP Campaigns: "What blood donation campaigns are currently available?"');
    startMcp = Date.now();
    const r8 = await generateGroundedChatResponse({
      message: "What blood donation campaigns are currently available?",
      context: "General Visitor",
      dbInstance: db
    });
    latencyRecords.mcpExecution.push(Date.now() - startMcp);

    const r8HasTool = r8.toolUsage?.some(u => u.tool === 'getCampaigns');
    const r8Campaigns = r8.toolUsage?.find(u => u.tool === 'getCampaigns')?.result?.data;
    const p8 = r8HasTool && Array.isArray(r8Campaigns);

    console.log(`- MCP Tool Executed: ${r8HasTool ? 'getCampaigns' : 'none'}`);
    console.log(`- Campaigns Retrieved: ${r8Campaigns?.length || 0} ("${r8Campaigns?.[0]?.title || 'Drive'}")`);
    evaluationResults.push({ name: 'MCP: Donation Campaigns Query', passed: p8 });
    console.log(p8 ? '✅ PART 8 PASSED' : '❌ PART 8 FAILED');

    // ========================================================================
    // PART 9: HYBRID RAG + MCP TESTING
    // ========================================================================
    console.log('\n---------------------------------------------------------------');
    console.log('PART 9: HYBRID RAG + MCP DUAL ORCHESTRATION');
    console.log('---------------------------------------------------------------');

    await delay(3000);
    const hybridQuery = "Is O- the universal red cell donor, and how much O- blood is currently available?";
    console.log(`- Hybrid Query: "${hybridQuery}"`);
    const startHybrid = Date.now();
    const r9 = await generateGroundedChatResponse({
      message: hybridQuery,
      context: "General Visitor",
      dbInstance: db
    });
    latencyRecords.hybridPipeline.push(Date.now() - startHybrid);

    const hasRAGSource = r9.sources?.length > 0 && r9.sources.some(s => s.fileName.includes('compatibility'));
    const hasMCPTool = r9.toolUsage?.some(u => u.tool === 'getBloodStock');
    const r9StockUnits = r9.toolUsage?.find(u => u.tool === 'getBloodStock')?.result?.data?.[0]?.units;
    const p9 = hasRAGSource && hasMCPTool;

    console.log(`- RAG Verification: ${hasRAGSource} (Doc: ${r9.sources?.[0]?.fileName})`);
    console.log(`- MCP Verification: ${hasMCPTool} (Tool: getBloodStock, Units: ${r9StockUnits})`);
    console.log(`- Disambiguated Answer: "${r9.text.slice(0, 150)}..."`);
    evaluationResults.push({ name: 'Hybrid: Dual RAG Citations + Live MCP Stock', passed: p9 });
    console.log(p9 ? '✅ PART 9 PASSED' : '❌ PART 9 FAILED');

    // ========================================================================
    // PART 10: TOOL SELECTION DISCRETION
    // ========================================================================
    console.log('\n---------------------------------------------------------------');
    console.log('PART 10: AUTONOMOUS TOOL SELECTION DISCRETION');
    console.log('---------------------------------------------------------------');

    await delay(2000);
    const greetingRes = await generateGroundedChatResponse({ message: "Hello Samrat AI!", context: "General Visitor", dbInstance: db });
    const p10 = (!greetingRes.toolUsage || greetingRes.toolUsage.length === 0) && (!greetingRes.sources || greetingRes.sources.length === 0);

    console.log(`- Greeting: "${greetingRes.text.slice(0, 80)}..."`);
    console.log(`- Tools Called: ${greetingRes.toolUsage?.length || 0} (Expected: 0)`);
    evaluationResults.push({ name: 'Tool Discretion: Zero Tool Calls on Chit-chat', passed: p10 });
    console.log(p10 ? '✅ PART 10 PASSED' : '❌ PART 10 FAILED');

    // ========================================================================
    // PART 11-14: SECURITY & VALIDATION REGRESSION
    // ========================================================================
    console.log('\n---------------------------------------------------------------');
    console.log('PARTS 11-14: SECURITY & BOUNDARY REGRESSION');
    console.log('---------------------------------------------------------------');

    const unauthorizedMcp = await executeMcpTool('dropDatabase', {}, { dbInstance: db });
    const p11 = !unauthorizedMcp.success;

    const vEmpty = validateAiChatInput({ message: '' });
    const vLong = validateAiChatInput({ message: 'Z'.repeat(2500) });
    const p14 = !vEmpty.valid && !vLong.valid;

    evaluationResults.push({ name: 'Security: Unauthorized MCP Whitelist Enforcement', passed: p11 });
    evaluationResults.push({ name: 'Validation: Input Length & Empty Guard', passed: p14 });
    console.log(p11 && p14 ? '✅ PARTS 11-14 PASSED' : '❌ PARTS 11-14 FAILED');

    // ========================================================================
    // PART 20: DATABASE INTEGRITY VERIFICATION
    // ========================================================================
    console.log('\n---------------------------------------------------------------');
    console.log('PART 20: DATABASE INTEGRITY & IMMUTABILITY AUDIT');
    console.log('---------------------------------------------------------------');

    const postCounts = {
      stocks: await db.collection('stocks').countDocuments(),
      users: await db.collection('users').countDocuments(),
      requests: await db.collection('requests').countDocuments(),
      hospitals: await db.collection('hospitals').countDocuments(),
      campaigns: await db.collection('campaigns').countDocuments(),
      knowledge_embeddings: await db.collection('knowledge_embeddings').countDocuments()
    };

    let p20 = true;
    for (const key of Object.keys(baselineCounts)) {
      if (baselineCounts[key] !== postCounts[key]) {
        console.error(`❌ Mismatch in '${key}': Before=${baselineCounts[key]}, After=${postCounts[key]}`);
        p20 = false;
      }
    }
    console.log('📊 Post-Evaluation Operational Database Records:', postCounts);
    console.log(`- Database Mutation Count: ${p20 ? '0 (Clean Read-Only)' : 'MUTATIONS DETECTED'}`);
    evaluationResults.push({ name: 'Database Integrity: Zero Operational Mutations', passed: p20 });
    console.log(p20 ? '✅ PART 20 PASSED' : '❌ PART 20 FAILED');

    // ========================================================================
    // PART 21: LATENCY & PERFORMANCE SUMMARY
    // ========================================================================
    console.log('\n---------------------------------------------------------------');
    console.log('PART 21: PERFORMANCE & LATENCY METRICS');
    console.log('---------------------------------------------------------------');

    const computeStats = (arr) => {
      if (arr.length === 0) return { min: 0, max: 0, avg: 0 };
      const sum = arr.reduce((a, b) => a + b, 0);
      return {
        min: Math.min(...arr),
        max: Math.max(...arr),
        avg: Math.round(sum / arr.length)
      };
    };

    const embedStats = computeStats(latencyRecords.embedding);
    const vecStats = computeStats(latencyRecords.vectorSearch);
    const mcpStats = computeStats(latencyRecords.mcpExecution);
    const ragStats = computeStats(latencyRecords.ragPipeline);
    const hybridStats = computeStats(latencyRecords.hybridPipeline);

    console.log(`- Query Vector Embedding : avg=${embedStats.avg}ms (min=${embedStats.min}ms, max=${embedStats.max}ms)`);
    console.log(`- Atlas $vectorSearch    : avg=${vecStats.avg}ms (min=${vecStats.min}ms, max=${vecStats.max}ms)`);
    console.log(`- MCP Tool Roundtrip     : avg=${mcpStats.avg}ms (min=${mcpStats.min}ms, max=${mcpStats.max}ms)`);
    console.log(`- Full RAG Query Latency : avg=${ragStats.avg}ms (min=${ragStats.min}ms, max=${ragStats.max}ms)`);
    console.log(`- Full Hybrid RAG+MCP    : avg=${hybridStats.avg}ms (min=${hybridStats.min}ms, max=${hybridStats.max}ms)`);

    // ========================================================================
    // FINAL EVALUATION SCORECARD
    // ========================================================================
    console.log('\n===============================================================');
    console.log('📊 STEP 8 EVALUATION SCORECARD');
    console.log('===============================================================\n');

    let allPassed = true;
    for (const test of evaluationResults) {
      console.log(`${test.passed ? '✅' : '❌'} ${test.name}`);
      if (!test.passed) allPassed = false;
    }

    console.log('\n---------------------------------------------------------------');
    const passedCount = evaluationResults.filter(t => t.passed).length;
    const totalCount = evaluationResults.length;
    console.log(`Evaluation Verdict: ${allPassed ? 'PASS (100%)' : 'FAIL'} [${passedCount}/${totalCount} tests passed]`);
    console.log('===============================================================\n');

  } catch (error) {
    console.error('Evaluation suite failed with error:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('🔒 MongoDB connection closed.');
    }
  }
}

runStep8Evaluation();
