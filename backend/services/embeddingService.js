/**
 * ============================================================================
 * EMBEDDING SERVICE MODULE
 * ============================================================================
 * Handles knowledge base document parsing, deterministic text chunking with
 * overlap, and vector embedding generation using the Google Gemini Gen AI SDK.
 *
 * Configured Model: gemini-embedding-001
 * Verified Vector Dimensions: 768 (via outputDimensionality: 768)
 * ============================================================================
 */

import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

export const EMBEDDING_MODEL = 'gemini-embedding-001';
export const EMBEDDING_DIMENSION = 768;

/**
 * Initializes and returns the Gemini AI client using backend environment variables.
 */
function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey || apiKey.includes('your_gemini_api_key')) {
    throw new Error('Gemini API key is not configured in environment variables.');
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * Cleans extracted text by normalizing line endings and trimming excess whitespace.
 *
 * @param {string} rawText
 * @returns {string} Cleaned text
 */
export function cleanText(rawText) {
  if (!rawText) return '';
  return rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

/**
 * Splits document content into deterministic, semantically coherent chunks with overlap.
 * Preserves markdown headers, list blocks, and section continuity.
 *
 * @param {string} content - Raw document text
 * @param {Object} options
 * @param {number} [options.chunkSize=750] - Target maximum characters per chunk
 * @param {number} [options.chunkOverlap=120] - Characters to carry over into adjacent chunk
 * @returns {string[]} Array of chunk text strings
 */
export function chunkText(content, { chunkSize = 750, chunkOverlap = 120 } = {}) {
  const normalized = cleanText(content);
  if (!normalized) return [];

  // Group lines into natural blocks (headers, paragraphs, list groups)
  const lines = normalized.split('\n');
  const blocks = [];
  let currentBlock = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (currentBlock) {
        blocks.push(currentBlock.trim());
        currentBlock = '';
      }
    } else if (trimmed.startsWith('#') || trimmed.startsWith('---')) {
      if (currentBlock) {
        blocks.push(currentBlock.trim());
        currentBlock = '';
      }
      blocks.push(trimmed);
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\.\s/.test(trimmed)) {
      if (currentBlock && currentBlock.length + trimmed.length > 400) {
        blocks.push(currentBlock.trim());
        currentBlock = trimmed;
      } else {
        currentBlock = currentBlock ? `${currentBlock}\n${trimmed}` : trimmed;
      }
    } else {
      currentBlock = currentBlock ? `${currentBlock}\n${trimmed}` : trimmed;
    }
  }
  if (currentBlock) blocks.push(currentBlock.trim());

  const chunks = [];
  let currentChunk = '';

  for (const block of blocks) {
    if (!currentChunk) {
      currentChunk = block;
    } else if ((currentChunk + '\n\n' + block).length <= chunkSize) {
      currentChunk += '\n\n' + block;
    } else {
      chunks.push(currentChunk.trim());

      // Create bounded overlap from end of currentChunk
      const overlapSlice = currentChunk.slice(-chunkOverlap).trim();
      const firstSpace = overlapSlice.indexOf(' ');
      const cleanOverlap = firstSpace > 0 ? overlapSlice.slice(firstSpace + 1) : overlapSlice;
      currentChunk = cleanOverlap ? `${cleanOverlap}\n\n${block}` : block;
    }
  }

  if (currentChunk && currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Generates a vector embedding for a given text snippet using Gemini API.
 *
 * @param {string} text - The text chunk to embed
 * @returns {Promise<number[]>} Array of floating-point numbers representing the vector
 */
export async function generateEmbedding(text) {
  if (!text || !text.trim()) {
    throw new Error('Cannot generate embedding for empty text.');
  }

  const ai = getAiClient();
  const response = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text.trim(),
    config: {
      outputDimensionality: EMBEDDING_DIMENSION
    }
  });

  const values = response.embeddings?.[0]?.values;
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error(`Embedding generation returned empty vector for model ${EMBEDDING_MODEL}.`);
  }

  return values;
}

/**
 * Parses and processes a markdown document file from disk into embedded chunks.
 *
 * @param {string} filePath - Absolute or relative path to the markdown file
 * @param {Object} [options]
 * @returns {Promise<Array<{text: string, embedding: number[], metadata: Object}>>}
 */
export async function processDocument(filePath, options = {}) {
  const content = await fs.readFile(filePath, 'utf-8');
  const fileName = path.basename(filePath);

  // Extract source from markdown header metadata if present
  let source = 'Blood Bank Management System Knowledge Base';
  const sourceMatch = content.match(/\*\*Source:\*\*\s*([^\n]+)/i);
  if (sourceMatch && sourceMatch[1]) {
    source = sourceMatch[1].trim();
  }

  const chunks = chunkText(content, options);
  const embeddedChunks = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunkTextContent = chunks[i];
    const embedding = await generateEmbedding(chunkTextContent);

    embeddedChunks.push({
      text: chunkTextContent,
      embedding,
      metadata: {
        source,
        fileName,
        chunkIndex: i,
        totalChunks: chunks.length,
        chunkLength: chunkTextContent.length
      },
      createdAt: new Date()
    });
  }

  return embeddedChunks;
}
