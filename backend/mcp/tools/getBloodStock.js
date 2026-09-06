/**
 * ============================================================================
 * MCP TOOL: getBloodStock
 * ============================================================================
 * Queries live blood inventory from the 'stocks' MongoDB collection.
 * Supports optional filtering by blood group.
 *
 * Real Schema Fields in 'stocks':
 *   - bloodGroup: string (e.g. 'O+', 'A-', 'B+', etc.)
 *   - units: number
 *   - maxCapacity: number
 *   - lastUpdated: Date
 * ============================================================================
 */

import { z } from 'zod';

export const VALID_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const toolDefinition = {
  name: 'getBloodStock',
  description: 'Retrieve real-time blood stock levels and storage capacity from the Blood Bank inventory. Optionally filter by a specific blood group.',
  parameters: z.object({
    bloodGroup: z.string()
      .optional()
      .describe("Optional blood group to filter by (e.g. 'O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-')")
  })
};

/**
 * Executes the getBloodStock query safely.
 *
 * @param {Object} args - Validated tool input arguments
 * @param {string} [args.bloodGroup]
 * @param {Object} context
 * @param {import('mongodb').Db} context.db - Active MongoDB database instance
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export async function execute(args, { db }) {
  try {
    const query = {};

    if (args.bloodGroup !== undefined && args.bloodGroup !== null && args.bloodGroup !== '') {
      const cleanGroup = String(args.bloodGroup).trim().toUpperCase();
      if (!VALID_BLOOD_GROUPS.includes(cleanGroup)) {
        return {
          success: false,
          error: `Invalid blood group '${args.bloodGroup}'. Allowed values: ${VALID_BLOOD_GROUPS.join(', ')}`
        };
      }
      query.bloodGroup = cleanGroup;
    }

    const stocks = await db.collection('stocks')
      .find(query, { projection: { _id: 0, bloodGroup: 1, units: 1, maxCapacity: 1, lastUpdated: 1 } })
      .toArray();

    const sanitizedData = stocks.map(item => ({
      bloodGroup: item.bloodGroup,
      units: typeof item.units === 'number' ? item.units : 0,
      maxCapacity: typeof item.maxCapacity === 'number' ? item.maxCapacity : 0,
      inventoryStatus: item.units <= 10 ? 'Critical' : item.units <= 30 ? 'Low' : 'Adequate',
      lastUpdated: item.lastUpdated ? new Date(item.lastUpdated).toISOString() : null
    }));

    return {
      success: true,
      totalGroupsReturned: sanitizedData.length,
      data: sanitizedData
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to retrieve blood stocks: ${error.message}`
    };
  }
}
