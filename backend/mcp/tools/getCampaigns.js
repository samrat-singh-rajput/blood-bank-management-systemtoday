/**
 * ============================================================================
 * MCP TOOL: getCampaigns
 * ============================================================================
 * Retrieves scheduled blood donation camps and drives from 'campaigns' collection.
 * Allows filtering by location.
 *
 * Real Schema Fields in 'campaigns':
 *   - title: string
 *   - description: string
 *   - date: string
 *   - location: string
 *   - imageUrl: string
 *   - attendees: number
 * ============================================================================
 */

import { z } from 'zod';

export const toolDefinition = {
  name: 'getCampaigns',
  description: 'Retrieve upcoming and active blood donation drives, camps, and community awareness campaigns. Allows filtering by city or location.',
  parameters: z.object({
    location: z.string()
      .optional()
      .describe("City or venue location to filter campaigns (e.g. 'City Hall')"),
    limit: z.number()
      .optional()
      .describe('Maximum number of campaigns to return (default 10, max 50)')
  })
};

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Executes the getCampaigns query safely.
 *
 * @param {Object} args - Validated tool input arguments
 * @param {string} [args.location]
 * @param {number} [args.limit=10]
 * @param {Object} context
 * @param {import('mongodb').Db} context.db - Active MongoDB database instance
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export async function execute(args, { db }) {
  try {
    const query = {};

    if (args.location !== undefined && args.location !== null && args.location !== '') {
      if (typeof args.location !== 'string') {
        return { success: false, error: 'Location parameter must be a string.' };
      }
      const cleanLocation = escapeRegex(args.location.trim());
      if (cleanLocation) {
        query.location = { $regex: cleanLocation, $options: 'i' };
      }
    }

    const fetchLimit = Math.min(Math.max(Number(args.limit) || 10, 1), 50);

    const campaigns = await db.collection('campaigns')
      .find(query)
      .limit(fetchLimit)
      .toArray();

    const sanitizedData = campaigns.map(c => ({
      campaignId: String(c._id),
      title: c.title || 'Community Blood Drive',
      description: c.description || 'Blood donation awareness and collection drive.',
      date: c.date || 'TBA',
      location: c.location || 'Local Community Center',
      attendees: typeof c.attendees === 'number' ? c.attendees : 0
    }));

    return {
      success: true,
      totalCampaignsFound: sanitizedData.length,
      data: sanitizedData
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to retrieve campaigns: ${error.message}`
    };
  }
}
