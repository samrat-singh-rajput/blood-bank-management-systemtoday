/**
 * ============================================================================
 * MCP TOOL: getBloodRequests
 * ============================================================================
 * Retrieves active blood requests from the 'requests' MongoDB collection.
 * Allows safe filtering by blood group, urgency level, status, and hospital.
 *
 * Real Schema Fields in 'requests':
 *   - donorName: string
 *   - bloodType: string
 *   - urgency: 'Critical' | 'Medium' | 'Low'
 *   - hospital: string
 *   - location: string
 *   - phone: string
 *   - type: 'Request' | 'Donation'
 *   - date: string
 *   - units: number
 *   - status: 'Pending' | 'Approved' | 'Completed' | 'Rejected'
 *   - createdAt: Date
 * ============================================================================
 */

import { z } from 'zod';
import { VALID_BLOOD_GROUPS } from './getBloodStock.js';

const VALID_STATUSES = ['Pending', 'Approved', 'Completed', 'Rejected'];
const VALID_URGENCIES = ['Low', 'Medium', 'Critical'];

export const toolDefinition = {
  name: 'getBloodRequests',
  description: 'Retrieve current blood requests and emergency requisitions from the Blood Bank system. Allows filtering by blood group, urgency, status, or hospital.',
  parameters: z.object({
    bloodType: z.string()
      .optional()
      .describe("Blood group needed (e.g. 'O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-')"),
    urgency: z.string()
      .optional()
      .describe("Urgency level ('Critical', 'Medium', 'Low')"),
    status: z.string()
      .optional()
      .describe("Request status ('Pending', 'Approved', 'Completed', 'Rejected')"),
    hospital: z.string()
      .optional()
      .describe('Hospital name to search for'),
    limit: z.number()
      .optional()
      .describe('Maximum number of requests to return (default 10, max 50)')
  })
};

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Executes the getBloodRequests query safely.
 *
 * @param {Object} args - Validated tool input arguments
 * @param {string} [args.bloodType]
 * @param {string} [args.urgency]
 * @param {string} [args.status]
 * @param {string} [args.hospital]
 * @param {number} [args.limit=10]
 * @param {Object} context
 * @param {import('mongodb').Db} context.db - Active MongoDB database instance
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export async function execute(args, { db }) {
  try {
    const query = {};

    // 1. Blood type validation
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

    // 2. Urgency validation
    if (args.urgency !== undefined && args.urgency !== null && args.urgency !== '') {
      if (typeof args.urgency !== 'string') {
        return { success: false, error: 'Urgency parameter must be a string.' };
      }
      const cleanUrgency = args.urgency.trim();
      const matchedUrgency = VALID_URGENCIES.find(u => u.toLowerCase() === cleanUrgency.toLowerCase());
      if (!matchedUrgency) {
        return {
          success: false,
          error: `Invalid urgency '${args.urgency}'. Allowed values: ${VALID_URGENCIES.join(', ')}`
        };
      }
      query.urgency = matchedUrgency;
    }

    // 3. Status validation
    if (args.status !== undefined && args.status !== null && args.status !== '') {
      if (typeof args.status !== 'string') {
        return { success: false, error: 'Status parameter must be a string.' };
      }
      const cleanStatus = args.status.trim();
      const matchedStatus = VALID_STATUSES.find(s => s.toLowerCase() === cleanStatus.toLowerCase());
      if (!matchedStatus) {
        return {
          success: false,
          error: `Invalid status '${args.status}'. Allowed values: ${VALID_STATUSES.join(', ')}`
        };
      }
      query.status = matchedStatus;
    }

    // 4. Hospital search (string guard + ReDoS-safe regex)
    if (args.hospital !== undefined && args.hospital !== null && args.hospital !== '') {
      if (typeof args.hospital !== 'string') {
        return { success: false, error: 'Hospital parameter must be a string.' };
      }
      const cleanHospital = escapeRegex(args.hospital.trim());
      if (cleanHospital) {
        query.hospital = { $regex: cleanHospital, $options: 'i' };
      }
    }

    const fetchLimit = Math.min(Math.max(Number(args.limit) || 10, 1), 50);

    const requests = await db.collection('requests')
      .find(query)
      .sort({ createdAt: -1 })
      .limit(fetchLimit)
      .toArray();

    const sanitizedData = requests.map(r => ({
      requestId: String(r._id),
      patientOrRequester: r.donorName || 'Confidential',
      bloodType: r.bloodType || 'Unknown',
      units: typeof r.units === 'number' ? r.units : 1,
      urgency: r.urgency || 'Medium',
      hospital: r.hospital || 'General Facility',
      location: r.location || 'N/A',
      status: r.status || 'Pending',
      type: r.type || 'Request',
      requestDate: r.date || (r.createdAt ? new Date(r.createdAt).toISOString().split('T')[0] : 'N/A')
    }));

    return {
      success: true,
      totalRequestsFound: sanitizedData.length,
      data: sanitizedData
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to retrieve blood requests: ${error.message}`
    };
  }
}
