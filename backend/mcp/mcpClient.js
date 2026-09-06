/**
 * ============================================================================
 * MCP CLIENT & GEMINI TOOL BRIDGE
 * ============================================================================
 * Bridges Google Gemini function calling with the Blood Bank MCP Server.
 * Exposes Gemini-compliant function declarations, enforces a strict tool
 * whitelist, validates arguments, and executes tools over the MCP layer.
 *
 * Whitelisted Operational Tools:
 *   - getBloodStock
 *   - findAvailableDonors
 *   - getBloodRequests
 *   - getCampaigns
 * ============================================================================
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createBloodBankMcpServer } from './mcpServer.js';
import { getDbConnection } from '../services/vectorService.js';

/**
 * Strict whitelist of permissible MCP tool names.
 * Gemini may NEVER execute tools outside this set.
 */
export const ALLOWED_MCP_TOOLS = new Set([
  'getBloodStock',
  'findAvailableDonors',
  'getBloodRequests',
  'getCampaigns'
]);

/**
 * Gemini-compliant function declarations for all 4 MCP tools.
 * Equipped with explicit semantic boundaries so Gemini knows when to use
 * live operational tools vs static RAG documentation.
 */
export const GEMINI_TOOL_DECLARATIONS = [
  {
    name: 'getBloodStock',
    description: 'Retrieve real-time blood stock levels and available units from the Blood Bank inventory. Use ONLY when the user asks about current blood availability, stock levels, or available units (e.g., "How many O+ units are available?", "Check inventory"). Do NOT use for static blood compatibility rules or donor health guidelines.',
    parameters: {
      type: 'OBJECT',
      properties: {
        bloodGroup: {
          type: 'STRING',
          description: "Optional blood group code to filter by (e.g. 'O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-')"
        }
      }
    }
  },
  {
    name: 'findAvailableDonors',
    description: 'Search for active, verified blood donors in the Blood Bank registry. Use when the user asks to find, list, or contact available donors (e.g., "Are there any A+ donors?", "Find donors in Delhi"). Never exposes passwords, OTPs, or private security tokens.',
    parameters: {
      type: 'OBJECT',
      properties: {
        bloodType: {
          type: 'STRING',
          description: "Blood group required (e.g. 'O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-')"
        },
        city: {
          type: 'STRING',
          description: "City or geographical location to search within"
        },
        limit: {
          type: 'NUMBER',
          description: "Maximum number of donors to return (1-50, default: 10)"
        }
      }
    }
  },
  {
    name: 'getBloodRequests',
    description: 'Retrieve current blood requisitions and hospital emergency requests. Use when the user asks about active blood requests, emergency needs, or request statuses (e.g., "Are there any critical blood requests?", "Check pending requisitions").',
    parameters: {
      type: 'OBJECT',
      properties: {
        bloodType: {
          type: 'STRING',
          description: "Blood group needed (e.g. 'O+', 'A-', etc.)"
        },
        urgency: {
          type: 'STRING',
          description: "Urgency level to filter by ('Critical', 'Medium', 'Low')"
        },
        status: {
          type: 'STRING',
          description: "Request status to filter by ('Pending', 'Approved', 'Completed', 'Rejected')"
        },
        hospital: {
          type: 'STRING',
          description: "Hospital name substring to search for"
        },
        limit: {
          type: 'NUMBER',
          description: "Maximum number of requests to return (1-50, default: 10)"
        }
      }
    }
  },
  {
    name: 'getCampaigns',
    description: 'Retrieve upcoming and active community blood donation drives, camps, and awareness events. Use when the user asks about scheduled camps, donation drives, or campaign venues (e.g., "What blood donation camps are active?").',
    parameters: {
      type: 'OBJECT',
      properties: {
        location: {
          type: 'STRING',
          description: "City or venue location to filter campaigns"
        },
        limit: {
          type: 'NUMBER',
          description: "Maximum number of campaigns to return (1-50, default: 10)"
        }
      }
    }
  }
];

/**
 * Validates tool name and input arguments from Gemini before MCP dispatch.
 *
 * @param {string} toolName
 * @param {any} rawArgs
 * @returns {{valid: boolean, cleanArgs: Object, error?: string}}
 */
export function validateGeminiToolRequest(toolName, rawArgs) {
  if (!ALLOWED_MCP_TOOLS.has(toolName)) {
    return {
      valid: false,
      cleanArgs: {},
      error: `Unauthorized tool '${toolName}'. Permitted tools: ${Array.from(ALLOWED_MCP_TOOLS).join(', ')}`
    };
  }

  if (rawArgs === null || rawArgs === undefined) {
    return { valid: true, cleanArgs: {} };
  }

  if (typeof rawArgs !== 'object' || Array.isArray(rawArgs)) {
    return {
      valid: false,
      cleanArgs: {},
      error: 'Tool arguments must be a structured JSON object.'
    };
  }

  // Defend against prototype pollution
  const cleanArgs = {};
  for (const [k, v] of Object.entries(rawArgs)) {
    if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
    cleanArgs[k] = v;
  }

  return { valid: true, cleanArgs };
}

/**
 * Executes an allowed MCP tool using the MCP Client-Server protocol.
 *
 * @param {string} toolName - Name of the MCP tool requested by Gemini
 * @param {Object} args - Arguments passed by Gemini
 * @param {Object} [options]
 * @param {import('mongodb').Db} [options.dbInstance]
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function executeMcpTool(toolName, args = {}, options = {}) {
  // 1. Enforce strict whitelist and validate input shape
  const validation = validateGeminiToolRequest(toolName, args);
  if (!validation.valid) {
    console.warn(`[MCP Bridge] Rejected tool call '${toolName}': ${validation.error}`);
    return { success: false, error: validation.error };
  }

  try {
    const { db } = options.dbInstance ? { db: options.dbInstance } : await getDbConnection();

    // 2. Spin up in-memory MCP client-server pair for protocol execution
    const mcpServer = createBloodBankMcpServer({ dbInstance: db });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await mcpServer.connect(serverTransport);
    const client = new Client({ name: 'gemini-mcp-bridge', version: '1.0.0' });
    await client.connect(clientTransport);

    // 3. Execute the tool through the MCP protocol
    const callResult = await client.callTool({
      name: toolName,
      arguments: validation.cleanArgs
    });

    await client.close();

    // 4. Parse content block returned by MCP
    if (callResult?.content?.[0]?.text) {
      try {
        return JSON.parse(callResult.content[0].text);
      } catch {
        return { success: true, rawText: callResult.content[0].text };
      }
    }

    return { success: false, error: 'No content returned by MCP tool.' };
  } catch (error) {
    console.error(`[MCP Bridge] Error executing tool '${toolName}':`, error.message);
    return {
      success: false,
      error: `MCP tool execution failed: ${error.message}`
    };
  }
}
