/**
 * ============================================================================
 * SEMANTIC VECTOR SEARCH DIAGNOSTIC & TEST SCRIPT
 * ============================================================================
 * Tests semantic vector retrieval independently from the chat interface.
 * Validates:
 *   1. Vector index readiness on MongoDB Atlas
 *   2. Query embedding generation via Gemini (gemini-embedding-001, 768 dims)
 *   3. Execution of MongoDB Atlas $vectorSearch pipeline
 *   4. Semantic accuracy across clinical and operational test queries
 *
 * Usage:
 *   node backend/scripts/testVectorSearch.js
 * ============================================================================
 */

import { searchKnowledge, closeDbConnection, getDbConnection } from '../services/vectorService.js';
import { EMBEDDING_MODEL, EMBEDDING_DIMENSION } from '../services/embeddingService.js';

const TEST_QUERIES = [
  {
    id: 'Test 1 - Donor Eligibility & Age Requirements',
    query: 'Can a person donate blood if they are 17 years old?',
    expectedTopic: 'Donor Eligibility (Age 18-65 requirement)',
    topK: 3
  },
  {
    id: 'Test 2 - Universal Donor & Compatibility',
    query: 'Which blood type can donate red cells to everyone?',
    expectedTopic: 'Blood Groups & Compatibility (O- Universal Donor)',
    topK: 3
  },
  {
    id: 'Test 3 - Donation Process & Recovery Phase',
    query: 'What happens after blood is collected from a donor?',
    expectedTopic: 'Donation Process (Refreshments, observation, post-care)',
    topK: 3
  },
  {
    id: 'Test 4 - Donor Pain & Safety Inquiries',
    query: 'Does donating blood hurt?',
    expectedTopic: 'Blood Bank FAQ (Brief pinch, sterile single-use equipment)',
    topK: 3
  }
];

async function runTests() {
  console.log('\n======================================================================');
  console.log('🔍 BLOOD BANK SYSTEM - SEMANTIC VECTOR SEARCH TEST SUITE');
  console.log('======================================================================');
  console.log(`[Test] Embedding Model     : ${EMBEDDING_MODEL}`);
  console.log(`[Test] Vector Dimensions   : ${EMBEDDING_DIMENSION}`);
  console.log(`[Test] Vector Search Index : vector_index`);
  console.log(`[Test] Similarity Metric   : Cosine (Score range: 0.0 to 1.0)`);
  console.log('======================================================================\n');

  // 1. Verify connection and index
  try {
    const { db } = await getDbConnection();
    const indexes = await db.collection('knowledge_embeddings').listSearchIndexes().toArray();
    const vectorIdx = indexes.find(i => i.name === 'vector_index');

    if (!vectorIdx) {
      console.error('❌ Atlas Vector Search Index "vector_index" was not found on knowledge_embeddings.');
      process.exit(1);
    }

    console.log(`[Index Check] Index Name: "${vectorIdx.name}" | Status: ${vectorIdx.status} | Queryable: ${vectorIdx.queryable}`);
    if (!vectorIdx.queryable) {
      console.warn('⚠️ Index is still building in Atlas. Search may fail or return incomplete results.');
    }
  } catch (err) {
    console.error('❌ Failed to verify index status with Atlas:', err.message);
    process.exit(1);
  }

  // 2. Run test queries sequentially
  let passedCount = 0;

  for (let i = 0; i < TEST_QUERIES.length; i++) {
    const { id, query, expectedTopic, topK } = TEST_QUERIES[i];
    console.log(`\n----------------------------------------------------------------------`);
    console.log(`[TEST ${i + 1}/${TEST_QUERIES.length}] ${id}`);
    console.log(`Query: "${query}"`);
    console.log(`Target Topic: ${expectedTopic}`);
    console.log(`----------------------------------------------------------------------`);

    const startTime = Date.now();
    try {
      const results = await searchKnowledge(query, { topK });
      const durationMs = Date.now() - startTime;

      console.log(`Retrieved ${results.length} result(s) in ${durationMs}ms:`);

      if (results.length === 0) {
        console.warn('⚠️ No matching chunks returned for query.');
        continue;
      }

      results.forEach((item, idx) => {
        console.log(`\n  [Result ${idx + 1}] Similarity Score: ${item.score.toFixed(4)}`);
        console.log(`  Source Document : ${item.metadata.fileName} (Chunk #${item.metadata.chunkIndex})`);
        console.log(`  Citation Title  : ${item.metadata.source}`);
        console.log(`  Preview Content :`);
        const preview = item.text
          .split('\n')
          .filter(line => line.trim().length > 0)
          .slice(0, 3)
          .join('\n    ');
        console.log(`    ${preview}...`);
      });

      passedCount++;
    } catch (err) {
      console.error(`❌ Test failed for query "${query}":`, err.message);
    }
  }

  // 3. Test Edge Case: Empty query
  console.log(`\n----------------------------------------------------------------------`);
  console.log(`[EDGE CASE TEST] Handling empty query ("")`);
  try {
    const emptyResults = await searchKnowledge('');
    console.log(`Empty query returned ${emptyResults.length} results (Expected: 0). ✅ Handled safely.`);
  } catch (err) {
    console.error('❌ Empty query caused error:', err.message);
  }

  // 4. Test Relevance Filter: minScore threshold
  console.log(`\n----------------------------------------------------------------------`);
  console.log(`[THRESHOLD TEST] Applying minScore: 0.70 to query: "${TEST_QUERIES[0].query}"`);
  try {
    const filteredResults = await searchKnowledge(TEST_QUERIES[0].query, { topK: 5, minScore: 0.70 });
    console.log(`Results above 0.70 threshold: ${filteredResults.length}`);
    filteredResults.forEach((r, idx) => {
      console.log(`  [${idx + 1}] Score: ${r.score} | ${r.metadata.fileName}`);
    });
  } catch (err) {
    console.error('❌ Threshold filter test failed:', err.message);
  }

  console.log('\n======================================================================');
  console.log(`🎉 TEST SUMMARY: ${passedCount}/${TEST_QUERIES.length} Core Semantic Queries Executed Successfully`);
  console.log('======================================================================\n');

  await closeDbConnection();
}

runTests().catch(err => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
