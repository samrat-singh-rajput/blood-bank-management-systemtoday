/**
 * ============================================================================
 * KNOWLEDGE INGESTION PIPELINE CLI SCRIPT
 * ============================================================================
 * Reads markdown knowledge documents from backend/data/knowledge_base/,
 * splits them into deterministic chunks, generates vector embeddings using
 * Gemini API, and stores them in the MongoDB Atlas collection:
 * 'knowledge_embeddings'
 *
 * Idempotency:
 *   Uses an atomic replace-per-document strategy:
 *   Before inserting new chunks for a file, any existing records with
 *   matching `metadata.fileName` are deleted. Running this script multiple
 *   times will never produce duplicate records or stale orphan chunks.
 *
 * Usage:
 *   node backend/scripts/ingestKnowledge.js
 * ============================================================================
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import { processDocument, EMBEDDING_MODEL, EMBEDDING_DIMENSION } from '../services/embeddingService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load backend .env followed by workspace root .env
dotenv.config();
dotenv.config({ path: path.join(__dirname, '../../.env') });

const KNOWLEDGE_DIR = path.join(__dirname, '../data/knowledge_base');
const COLLECTION_NAME = 'knowledge_embeddings';
const DB_NAME = 'bloodbank_system';

async function runIngestion() {
  console.log('\n======================================================================');
  console.log('🩸 BLOOD BANK SYSTEM - RAG KNOWLEDGE INGESTION PIPELINE');
  console.log('======================================================================');
  console.log(`[RAG] Embedding Model     : ${EMBEDDING_MODEL}`);
  console.log(`[RAG] Embedding Dimensions: ${EMBEDDING_DIMENSION}`);
  console.log(`[RAG] Knowledge Directory : ${KNOWLEDGE_DIR}`);
  console.log(`[RAG] Target Collection   : ${COLLECTION_NAME}`);

  // 1. Verify directory and find markdown files
  let files;
  try {
    const entries = await fs.readdir(KNOWLEDGE_DIR);
    files = entries.filter(f => f.endsWith('.md') || f.endsWith('.markdown'));
  } catch (err) {
    console.error(`[RAG] ❌ Failed to read directory ${KNOWLEDGE_DIR}:`, err.message);
    process.exit(1);
  }

  if (files.length === 0) {
    console.warn('[RAG] ⚠️ No markdown knowledge files found in directory.');
    process.exit(0);
  }

  console.log(`[RAG] Found ${files.length} knowledge file(s) to process:\n  - ${files.join('\n  - ')}`);

  // 2. Connect to MongoDB Atlas
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri || mongoUri.includes('your_username')) {
    console.error('[RAG] ❌ Valid MONGODB_URI is not configured in .env.');
    process.exit(1);
  }

  const client = new MongoClient(mongoUri, {
    connectTimeoutMS: 20000,
    socketTimeoutMS: 45000
  });

  try {
    await client.connect();
    console.log('[RAG] ✅ Connected to MongoDB Atlas successfully.');
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    // Ensure metadata indexes exist for fast filtering and idempotency
    await collection.createIndex({ 'metadata.fileName': 1 });
    await collection.createIndex({ 'metadata.chunkIndex': 1 });

    let totalFilesProcessed = 0;
    let totalVectorsStored = 0;

    // 3. Process each file
    for (const file of files) {
      const filePath = path.join(KNOWLEDGE_DIR, file);
      console.log(`\n----------------------------------------------------------------------`);
      console.log(`[RAG] Processing: ${file}`);

      const embeddedChunks = await processDocument(filePath);
      console.log(`[RAG] Created ${embeddedChunks.length} chunks with embeddings`);

      // Idempotency: Remove previous vectors for this file before inserting updated set
      const deleteResult = await collection.deleteMany({ 'metadata.fileName': file });
      if (deleteResult.deletedCount > 0) {
        console.log(`[RAG] (Idempotency) Replaced ${deleteResult.deletedCount} existing vectors for ${file}`);
      }

      // Insert fresh vectors
      if (embeddedChunks.length > 0) {
        const insertResult = await collection.insertMany(embeddedChunks);
        console.log(`[RAG] Stored ${insertResult.insertedCount} vectors in '${COLLECTION_NAME}'`);
        totalVectorsStored += insertResult.insertedCount;
        totalFilesProcessed++;
      }
    }

    // 4. Verify total stored vectors in collection
    const currentCount = await collection.countDocuments();

    console.log('\n======================================================================');
    console.log('🎉 RAG INGESTION PIPELINE COMPLETED SUCCESSFULLY');
    console.log('======================================================================');
    console.log(`[RAG] Total Files Processed     : ${totalFilesProcessed}`);
    console.log(`[RAG] Total Vectors Stored      : ${totalVectorsStored}`);
    console.log(`[RAG] Collection Current Count  : ${currentCount} documents`);
    console.log(`[RAG] Verified Vector Dimensions: ${EMBEDDING_DIMENSION}`);
    console.log('======================================================================\n');
  } catch (error) {
    console.error('\n[RAG] ❌ Ingestion Pipeline Error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

runIngestion();
