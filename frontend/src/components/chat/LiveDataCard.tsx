import React from 'react';
import { Database, Droplet, Users, AlertCircle, Calendar, ShieldCheck, Activity } from 'lucide-react';
import { ToolUsage } from '../../types';

interface LiveDataCardProps {
  toolUsage?: ToolUsage[];
}

export const LiveDataCard: React.FC<LiveDataCardProps> = ({ toolUsage }) => {
  // If no tool execution occurred, render nothing
  if (!toolUsage || !Array.isArray(toolUsage) || toolUsage.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-700/60 space-y-2.5 text-xs transition-all">
      {/* Top Banner Indicator */}
      <div className="flex items-center justify-between gap-1.5 text-rose-700 dark:text-rose-400 font-semibold">
        <div className="flex items-center gap-1.5">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600 dark:bg-rose-500"></span>
          </span>
          <span className="flex items-center gap-1">
            <Database size={13} className="text-rose-600 dark:text-rose-400" />
            <span>Live Database Data</span>
          </span>
        </div>
        <span className="text-[10px] font-normal text-gray-500 dark:text-gray-400">
          Live application data
        </span>
      </div>

      {/* Render each tool execution result */}
      {toolUsage.map((usage, idx) => {
        const { tool, result } = usage;

        // If tool failed or has no data
        if (!result || result.success === false) {
          return (
            <div
              key={`${tool}-${idx}`}
              className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 flex items-center gap-2"
            >
              <AlertCircle size={14} className="shrink-0 text-amber-600 dark:text-amber-400" />
              <span>Unable to query live data for {tool.replace(/([A-Z])/g, ' $1').toLowerCase()}.</span>
            </div>
          );
        }

        // 1. Tool: getBloodStock
        if (tool === 'getBloodStock') {
          const stocks = Array.isArray(result.data) ? result.data : [];
          return (
            <div
              key={`${tool}-${idx}`}
              className="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 text-gray-800 dark:text-gray-200"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 font-semibold text-rose-800 dark:text-rose-300">
                  <Droplet size={14} className="text-rose-600 dark:text-rose-400 fill-rose-500/20" />
                  <span>Live Blood Inventory</span>
                </div>
                <span className="text-[10px] text-gray-500 dark:text-gray-400">
                  {stocks.length} {stocks.length === 1 ? 'group' : 'groups'} found
                </span>
              </div>

              {stocks.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 italic">No matching blood stocks currently in inventory.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {stocks.map((item: any, sIdx: number) => {
                    const statusColor =
                      item.inventoryStatus === 'Critical'
                        ? 'bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-200 border-red-200 dark:border-red-800'
                        : item.inventoryStatus === 'Low'
                        ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-200 border-amber-200 dark:border-amber-800'
                        : 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800';

                    return (
                      <div
                        key={sIdx}
                        className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700 shadow-xs flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-gray-900 dark:text-white">
                            {item.bloodGroup}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium border ${statusColor}`}>
                            {item.inventoryStatus || 'Normal'}
                          </span>
                        </div>
                        <div className="mt-1 flex items-baseline justify-between text-xs">
                          <span className="font-semibold text-rose-600 dark:text-rose-400">
                            {item.units} <span className="text-[10px] font-normal text-gray-500 dark:text-gray-400">units</span>
                          </span>
                          {typeof item.maxCapacity === 'number' && item.maxCapacity > 0 && (
                            <span className="text-[10px] text-gray-400 dark:text-gray-500">
                              / {item.maxCapacity} cap
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }

        // 2. Tool: findAvailableDonors
        if (tool === 'findAvailableDonors') {
          const donors = Array.isArray(result.data) ? result.data : [];
          const totalCount = typeof result.totalDonorsFound === 'number' ? result.totalDonorsFound : donors.length;

          return (
            <div
              key={`${tool}-${idx}`}
              className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-gray-800 dark:text-gray-200"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 font-semibold text-blue-800 dark:text-blue-300">
                  <Users size={14} className="text-blue-600 dark:text-blue-400" />
                  <span>Available Donors</span>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 font-medium text-blue-800 dark:text-blue-200">
                  <ShieldCheck size={11} /> Verified Active
                </span>
              </div>

              {totalCount === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 italic">No registered verified donors matching the query criteria.</p>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                    <span className="text-blue-600 dark:text-blue-400 font-bold text-base">
                      {totalCount}
                    </span>
                    <span>{totalCount === 1 ? 'verified donor found' : 'verified donors available'}</span>
                  </div>

                  {/* Privacy-safe minimal donor list: NO phone numbers, emails, passwords, or tokens */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {donors.slice(0, 4).map((d: any, dIdx: number) => (
                      <span
                        key={dIdx}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white dark:bg-gray-800 border border-blue-200/70 dark:border-gray-700 text-[11px] text-gray-700 dark:text-gray-300 shadow-xs"
                      >
                        <span className="font-bold text-rose-600 dark:text-rose-400">{d.bloodType}</span>
                        <span>·</span>
                        <span className="truncate max-w-[110px]">{d.name || 'Active Donor'}</span>
                        {d.city && d.city !== 'Not Specified' && (
                          <span className="text-gray-400 dark:text-gray-500">({d.city})</span>
                        )}
                      </span>
                    ))}
                    {donors.length > 4 && (
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 self-center">
                        +{donors.length - 4} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        }

        // 3. Tool: getBloodRequests
        if (tool === 'getBloodRequests') {
          const requests = Array.isArray(result.data) ? result.data : [];
          const totalRequests = typeof result.totalRequestsFound === 'number' ? result.totalRequestsFound : requests.length;

          return (
            <div
              key={`${tool}-${idx}`}
              className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 text-gray-800 dark:text-gray-200"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 font-semibold text-amber-800 dark:text-amber-300">
                  <AlertCircle size={14} className="text-amber-600 dark:text-amber-400" />
                  <span>Blood Requests</span>
                </div>
                <span className="text-[10px] text-gray-500 dark:text-gray-400">
                  {totalRequests} {totalRequests === 1 ? 'request found' : 'requests found'}
                </span>
              </div>

              {requests.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 italic">No urgent blood requests currently pending.</p>
              ) : (
                <div className="space-y-1.5">
                  {requests.slice(0, 3).map((req: any, rIdx: number) => {
                    const urgencyStyle =
                      req.urgency === 'Critical'
                        ? 'bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-200 border-red-200'
                        : req.urgency === 'Medium'
                        ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-200 border-amber-200'
                        : 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-200 border-blue-200';

                    return (
                      <div
                        key={rIdx}
                        className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-amber-200/60 dark:border-gray-700 shadow-xs flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-bold text-rose-600 dark:text-rose-400 text-xs shrink-0">
                            {req.bloodType}
                          </span>
                          <div className="truncate text-xs">
                            <span className="font-medium text-gray-800 dark:text-gray-200">
                              {req.units} {req.units === 1 ? 'unit' : 'units'}
                            </span>
                            <span className="text-gray-400 dark:text-gray-500 mx-1">·</span>
                            <span className="text-gray-600 dark:text-gray-400 truncate">
                              {req.hospital || 'Hospital Facility'}
                            </span>
                          </div>
                        </div>

                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border ${urgencyStyle} shrink-0`}>
                          {req.urgency}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }

        // 4. Tool: getCampaigns
        if (tool === 'getCampaigns') {
          const campaigns = Array.isArray(result.data) ? result.data : [];
          const totalCampaigns = typeof result.totalCampaignsFound === 'number' ? result.totalCampaignsFound : campaigns.length;

          return (
            <div
              key={`${tool}-${idx}`}
              className="p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 text-gray-800 dark:text-gray-200"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 font-semibold text-purple-800 dark:text-purple-300">
                  <Calendar size={14} className="text-purple-600 dark:text-purple-400" />
                  <span>Donation Campaigns</span>
                </div>
                <span className="text-[10px] text-gray-500 dark:text-gray-400">
                  {totalCampaigns} {totalCampaigns === 1 ? 'drive scheduled' : 'drives scheduled'}
                </span>
              </div>

              {campaigns.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 italic">No upcoming donation drives currently scheduled.</p>
              ) : (
                <div className="space-y-1.5">
                  {campaigns.slice(0, 2).map((camp: any, cIdx: number) => (
                    <div
                      key={cIdx}
                      className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-purple-200/60 dark:border-gray-700 shadow-xs"
                    >
                      <div className="font-semibold text-xs text-gray-900 dark:text-gray-100">
                        {camp.title}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                        <span>📍 {camp.location}</span>
                        <span>·</span>
                        <span>📅 {camp.date}</span>
                        {typeof camp.attendees === 'number' && camp.attendees > 0 && (
                          <>
                            <span>·</span>
                            <span className="text-purple-600 dark:text-purple-400 font-medium">
                              👥 {camp.attendees} attendees
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        }

        // Generic fallback for any other safe tool query
        return (
          <div
            key={`${tool}-${idx}`}
            className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs flex items-center justify-between"
          >
            <div className="flex items-center gap-1.5 font-medium text-gray-700 dark:text-gray-300">
              <Activity size={13} className="text-gray-500" />
              <span>Query: {tool.replace(/([A-Z])/g, ' $1')}</span>
            </div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
              Live Data Retrieved
            </span>
          </div>
        );
      })}
    </div>
  );
};
