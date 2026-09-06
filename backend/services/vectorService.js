/**
 * ============================================================================
 * VECTOR SEARCH & RETRIEVAL SERVICE
 * ============================================================================
 * Provides semantic vector similarity search against the MongoDB Atlas
 * 'knowledge_embeddings' collection using native '$vectorSearch'.
 *
 * Architecture:
 *   User Query
 *       │
 *       ▼
 *   generateEmbedding(query) [gemini-embedding-001, 768 dimensions]
 *       │
 *       ▼
 *   MongoDB Atlas Vector Search ($vectorSearch via 'vector_index')
 *       │
 *       ▼
 *   Top-K Relevant Knowledge Chunks + Cosine Similarity Scores + Metadata
 * ============================================================================
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateEmbedding, EMBEDDING_MODEL, EMBEDDING_DIMENSION } from './embeddingService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
dotenv.config({ path: path.join(__dirname, '../../.env') });

const DB_NAME = 'bloodbank_system';
const COLLECTION_NAME = 'knowledge_embeddings';
const VECTOR_INDEX_NAME = 'vector_index';

// Cached MongoDB client instance for efficient connection reuse
let cachedClient = null;
let cachedDb = null;

/**
 * Retrieves or establishes a cached MongoDB Atlas database connection.
 *
 * @returns {Promise<{ db: import('mongodb').Db, client: MongoClient }>}
 */
export async function getDbConnection() {
  if (cachedDb && cachedClient) {
    return { db: cachedDb, client: cachedClient };
  }

  const uri = process.env.MONGODB_URI;
  if (!uri || uri.includes('your_username')) {
    throw new Error('Valid MONGODB_URI is not configured in backend environment variables.');
  }

  cachedClient = new MongoClient(uri, {
    connectTimeoutMS: 20000,
    socketTimeoutMS: 45000
  });

  await cachedClient.connect();
  cachedDb = cachedClient.db(DB_NAME);
  return { db: cachedDb, client: cachedClient };
}

/**
 * Closes the cached MongoDB connection (useful for graceful shutdown or CLI scripts).
 */
export async function closeDbConnection() {
  if (cachedClient) {
    await cachedClient.close();
    cachedClient = null;
    cachedDb = null;
  }
}

/**
 * Performs semantic vector search over the knowledge base in MongoDB Atlas.
 *
 * @param {string} query - The natural-language search query
 * @param {Object} [options]
 * @param {number} [options.topK=5] - Maximum number of relevant chunks to return
 * @param {number} [options.numCandidates] - Number of nearest neighbors evaluated during HNSW exploration
 * @param {number} [options.minScore=null] - Optional minimum similarity threshold (0.0 to 1.0)
 * @param {Object} [options.filter=null] - Optional pre-filter on indexed metadata fields (e.g., { 'metadata.fileName': '...' })
 * @param {import('mongodb').Db} [options.dbInstance=null] - Optional existing db instance to reuse
 * @returns {Promise<Array<{_id: string, text: string, score: number, metadata: Object}>>}
 */
export async function searchKnowledge(query, options = {}) {
  const {
    topK = 5,
    numCandidates = null,
    minScore = null,
    filter = null,
    dbInstance = null
  } = options;

  // 1. Validate query input
  if (!query || typeof query !== 'string' || !query.trim()) {
    return [];
  }

  const cleanQuery = query.trim();

  // 2. Generate vector embedding for the query using the identical model and dimension as Step 1
  let queryVector;
  try {
    queryVector = await generateEmbedding(cleanQuery);
  } catch (err) {
    throw new Error(`Failed to generate query embedding via Gemini (${EMBEDDING_MODEL}): ${err.message}`);
  }

  // Safety check: ensure the query vector matches the collection's indexed dimensionality
  if (!Array.isArray(queryVector) || queryVector.length !== EMBEDDING_DIMENSION) {
    throw new Error(
      `Query vector dimension mismatch: expected ${EMBEDDING_DIMENSION}, got ${queryVector?.length || 0}.`
    );
  }

  // 3. Obtain database reference
  let db = dbInstance;
  if (!db) {
    const conn = await getDbConnection();
    db = conn.db;
  }

  const collection = db.collection(COLLECTION_NAME);

  // 4. Determine optimal numCandidates for HNSW exploration
  // In Atlas Vector Search:
  // - numCandidates controls how many candidate nodes are evaluated in the graph.
  // - Must satisfy: numCandidates >= limit (topK).
  // - A ratio of 10x-20x topK (bounded between 50 and 150) balances high recall with speed.
  const resolvedCandidates = numCandidates && numCandidates >= topK
    ? numCandidates
    : Math.min(Math.max(topK * 10, 50), 150);

  // 5. Construct the MongoDB Atlas $vectorSearch Aggregation Pipeline
  /**
   * Pipeline Stage Definitions:
   * 
   * $vectorSearch:
   *   - index: Name of the Atlas Vector Search index ("vector_index")
   *   - path: The document field holding the vector embeddings ("embedding")
   *   - queryVector: 768-dimensional float array generated from the user query
   *   - numCandidates: Number of nearest-neighbor vector candidates evaluated by HNSW
   *   - limit: Maximum number of top-matching documents returned
   *   - filter: Optional pre-filter applied to metadata attributes (e.g., specific file)
   * 
   * $project:
   *   - text, metadata, _id: Returns the contextual text and citation source
   *   - score: Evaluated via { $meta: "vectorSearchScore" } representing cosine similarity (0 to 1)
   */
  const vectorSearchStage = {
    $vectorSearch: {
      index: VECTOR_INDEX_NAME,
      path: 'embedding',
      queryVector: queryVector,
      numCandidates: resolvedCandidates,
      limit: topK
    }
  };

  if (filter && typeof filter === 'object' && Object.keys(filter).length > 0) {
    vectorSearchStage.$vectorSearch.filter = filter;
  }

  const projectStage = {
    $project: {
      _id: 1,
      text: 1,
      metadata: 1,
      score: { $meta: 'vectorSearchScore' }
    }
  };

  const pipeline = [vectorSearchStage, projectStage];

  // 6. Execute search aggregation pipeline
  let rawResults = [];
  try {
    rawResults = await collection.aggregate(pipeline).toArray();
  } catch (err) {
    if (err.message.includes('index not found') || err.message.includes('not ready')) {
      throw new Error(
        `Atlas Vector Search Index '${VECTOR_INDEX_NAME}' is not ready or not found on '${COLLECTION_NAME}'. ` +
        `Ensure the index is configured in MongoDB Atlas.`
      );
    }
    throw new Error(`MongoDB $vectorSearch execution failed: ${err.message}`);
  }

  // 7. Sanitize and structure output (strip raw embedding floats)
  const results = rawResults.map(doc => ({
    _id: doc._id.toString(),
    text: doc.text || '',
    score: typeof doc.score === 'number' ? Number(doc.score.toFixed(4)) : 0,
    metadata: {
      source: doc.metadata?.source || 'Knowledge Base',
      fileName: doc.metadata?.fileName || 'unknown.md',
      chunkIndex: doc.metadata?.chunkIndex ?? 0,
      totalChunks: doc.metadata?.totalChunks ?? 1,
      chunkLength: doc.metadata?.chunkLength || (doc.text ? doc.text.length : 0)
    }
  }));

  // 8. Apply optional minimum similarity threshold
  if (typeof minScore === 'number' && minScore > 0) {
    return results.filter(r => r.score >= minScore);
  }

  return results;
}
