/**
 * ============================================================================
 * BLOOD BANK MANAGEMENT SYSTEM - MCP SERVER (Model Context Protocol)
 * ============================================================================
 * Provides a secure, controlled, and standardized tool interface for accessing
 * live operational data from MongoDB Atlas without allowing arbitrary database queries.
 *
 * Registered Operational Tools:
 *   1. getBloodStock        - Live inventory levels from 'stocks'
 *   2. findAvailableDonors  - Active, verified donors from 'users'
 *   3. getBloodRequests     - Requisitions and emergency needs from 'requests'
 *   4. getCampaigns         - Public drives and camps from 'campaigns'
 * ============================================================================
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { getDbConnection, closeDbConnection } from '../services/vectorService.js';
import * as getBloodStockTool from './tools/getBloodStock.js';
import * as findAvailableDonorsTool from './tools/findAvailableDonors.js';
import * as getBloodRequestsTool from './tools/getBloodRequests.js';
import * as getCampaignsTool from './tools/getCampaigns.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * Registry map of all available MCP tools
 */
export const MCP_TOOLS = {
  [getBloodStockTool.toolDefinition.name]: getBloodStockTool,
  [findAvailableDonorsTool.toolDefinition.name]: findAvailableDonorsTool,
  [getBloodRequestsTool.toolDefinition.name]: getBloodRequestsTool,
  [getCampaignsTool.toolDefinition.name]: getCampaignsTool
};

async function resolveDb(dbInstance) {
  if (dbInstance) {
    return typeof dbInstance.collection === 'function' ? dbInstance : dbInstance.db;
  }
  const conn = await getDbConnection();
  return conn.db || conn;
}

/**
 * Factory function to create and configure an McpServer instance with all tools registered.
 *
 * @param {Object} [options]
 * @param {import('mongodb').Db} [options.dbInstance] - Optional pre-existing MongoDB db connection
 * @returns {McpServer}
 */
export function createBloodBankMcpServer(options = {}) {
  const server = new McpServer({
    name: 'blood-bank-mcp-server',
    version: '1.0.0'
  });

  // Register each tool into the MCP server
  for (const [toolName, toolModule] of Object.entries(MCP_TOOLS)) {
    const { toolDefinition, execute } = toolModule;

    server.tool(
      toolDefinition.name,
      toolDefinition.description,
      toolDefinition.parameters.shape,
      async (args) => {
        try {
          const db = await resolveDb(options.dbInstance);
          const result = await execute(args, { db });

          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            isError: !result.success
          };
        } catch (err) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: `Internal MCP tool execution error: ${err.message}`
              }, null, 2)
            }],
            isError: true
          };
        }
      }
    );
  }

  return server;
}

/**
 * Directly executes an MCP tool by name without transport overhead.
 * Useful for internal validation, unit testing, and direct orchestration.
 *
 * @param {string} toolName
 * @param {Object} args
 * @param {Object} [options]
 * @param {import('mongodb').Db} [options.dbInstance]
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function executeToolDirect(toolName, args = {}, options = {}) {
  const toolModule = MCP_TOOLS[toolName];
  if (!toolModule) {
    return {
      success: false,
      error: `Unknown MCP tool '${toolName}'. Available tools: ${Object.keys(MCP_TOOLS).join(', ')}`
    };
  }

  const db = await resolveDb(options.dbInstance);
  return await toolModule.execute(args, { db });
}

/**
 * Starts the MCP server on stdio transport for external MCP hosts (e.g. CLI or Claude Desktop).
 */
export async function startStdioServer() {
  const db = await getDbConnection();
  const server = createBloodBankMcpServer({ dbInstance: db });
  const transport = new StdioServerTransport();

  await server.connect(transport);
  console.error('🚀 Blood Bank MCP Server running on stdio transport');
}

// If invoked directly from CLI (e.g., node backend/mcp/mcpServer.js)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startStdioServer().catch(err => {
    console.error('Fatal MCP Server error:', err);
    process.exit(1);
  });
}
