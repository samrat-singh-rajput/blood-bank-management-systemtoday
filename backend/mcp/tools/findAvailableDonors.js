/**
 * ============================================================================
 * MCP TOOL: findAvailableDonors
 * ============================================================================
 * Queries active, verified blood donors from the 'users' MongoDB collection.
 * Strictly projects out sensitive credentials, tokens, hashes, and OTPs.
 *
 * Real Schema Fields in 'users' for donors:
 *   - role: 'DONOR'
 *   - status: 'Active'
 *   - bloodType: string (e.g. 'A+', 'O-')
 *   - is_verified: 1
 *   - name: string
 *   - phone: string
 *   - email: string
 *   - location: string (city)
 * ============================================================================
 */

import { z } from 'zod';
import { VALID_BLOOD_GROUPS } from './getBloodStock.js';

export const toolDefinition = {
  name: 'findAvailableDonors',
  description: 'Search for active, verified blood donors in the Blood Bank registry. Allows filtering by required blood group and city. Never exposes passwords, OTPs, or authentication secrets.',
  parameters: z.object({
    bloodType: z.string()
      .optional()
      .describe("Blood group required (e.g. 'O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-')"),
    city: z.string()
      .optional()
      .describe("City or geographical location to search within (e.g. 'New Delhi', 'Mumbai')"),
    limit: z.number()
      .optional()
      .describe('Maximum number of donors to return (default 10, max 50)')
  })
};

/**
 * Escapes special regex characters to prevent Regular Expression Denial of Service (ReDoS).
 *
 * @param {string} str
 * @returns {string} Safe escaped string
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Executes the findAvailableDonors query safely.
 *
 * @param {Object} args - Validated tool input arguments
 * @param {string} [args.bloodType]
 * @param {string} [args.city]
 * @param {number} [args.limit=10]
 * @param {Object} context
 * @param {import('mongodb').Db} context.db - Active MongoDB database instance
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export async function execute(args, { db }) {
  try {
    // Enforce base role and active status query
    const query = {
      role: 'DONOR',
      status: 'Active',
      is_verified: 1
    };

    // 1. Blood type filter validation
    if (args.bloodType !== undefined && args.bloodType !== null && args.bloodType !== '') {
      const cleanType = String(args.bloodType).trim().toUpperCase();
      if (!VALID_BLOOD_GROUPS.includes(cleanType)) {
        return {
          success: false,
          error: `Invalid bloodType '${args.bloodType}'. Allowed values: ${VALID_BLOOD_GROUPS.join(', ')}`
        };
      }
      query.bloodType = cleanType;
    }

    // 2. City filter with string type guard and ReDoS-safe regex
    if (args.city !== undefined && args.city !== null) {
      if (typeof args.city !== 'string') {
        return { success: false, error: 'City parameter must be a string.' };
      }
      const cleanCity = escapeRegex(args.city.trim());
      if (cleanCity) {
        query.location = { $regex: cleanCity, $options: 'i' };
      }
    }

    const fetchLimit = Math.min(Math.max(Number(args.limit) || 10, 1), 50);

    // Explicit projection guaranteeing no sensitive authentication fields are ever fetched
    const projection = {
      _id: 1,
      name: 1,
      bloodType: 1,
      location: 1,
      phone: 1,
      email: 1,
      status: 1,
      joinDate: 1,
      is_verified: 1
    };

    const donors = await db.collection('users')
      .find(query, { projection })
      .limit(fetchLimit)
      .toArray();

    // PII mask helpers protecting donor phone and email privacy against scraping/injection
    const maskPhone = (phone) => {
      if (!phone || phone === 'N/A') return 'Confidential';
      const str = String(phone).trim();
      if (str.length <= 4) return '***';
      return `${str.slice(0, 3)}****${str.slice(-3)}`;
    };

    const maskEmail = (email) => {
      if (!email || email === 'N/A' || !email.includes('@')) return 'Confidential';
      const [user, domain] = email.split('@');
      return `${user.slice(0, 2)}***@${domain}`;
    };

    // Secondary sanitization layer with masked PII
    const sanitizedData = donors.map(d => ({
      donorId: String(d._id),
      name: d.name ? d.name.trim() : 'Anonymous Donor',
      bloodType: d.bloodType || 'Unknown',
      city: d.location || 'Not Specified',
      contactPhone: maskPhone(d.phone),
      contactEmail: maskEmail(d.email),
      contactNote: 'Official contact managed via Blood Bank Administration',
      availabilityStatus: d.status === 'Active' ? 'Available' : 'Unavailable',
      isVerified: d.is_verified === 1
    }));

    return {
      success: true,
      totalDonorsFound: sanitizedData.length,
      data: sanitizedData
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to search donors: ${error.message}`
    };
  }
}
