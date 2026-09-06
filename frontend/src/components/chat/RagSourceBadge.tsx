import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, FileText, CheckCircle2 } from 'lucide-react';
import { RagSource } from '../../types';

interface RagSourceBadgeProps {
  sources?: RagSource[];
}

export const RagSourceBadge: React.FC<RagSourceBadgeProps> = ({ sources }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Return null if no verified knowledge sources exist (e.g. general greeting or out of domain)
  if (!sources || !Array.isArray(sources) || sources.length === 0) {
    return null;
  }

  // Format relevance score safely (e.g. 0.8407 -> 84% relevance)
  const formatRelevance = (score: number): string => {
    if (typeof score !== 'number' || isNaN(score)) return 'N/A';
    const percent = Math.round(score * 100);
    return `${percent}% relevance`;
  };

  // Format friendly display title from filename or source property
  const formatDocumentName = (fileName: string, sourceTitle?: string): string => {
    if (sourceTitle && sourceTitle.trim()) return sourceTitle;
    return fileName || 'Knowledge Document';
  };

  const isMultiple = sources.length > 1;

  return (
    <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-700/60 text-xs transition-all">
      {/* Header / Summary Bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
          <BookOpen size={14} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>Verified Knowledge</span>
          <span className="text-[10px] font-normal px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            {sources.length} {sources.length === 1 ? 'source' : 'sources'}
          </span>
        </div>

        {/* Collapsible toggle for multiple sources */}
        {isMultiple && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 bg-gray-100/80 dark:bg-gray-800 px-2 py-0.5 rounded-md transition-colors"
            aria-expanded={isExpanded}
            title={isExpanded ? "Collapse knowledge sources" : "Expand all knowledge sources"}
          >
            <span>{isExpanded ? 'Hide' : 'Details'}</span>
            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}
      </div>

      {/* Single Source Compact View (always visible if exactly 1 source) */}
      {!isMultiple && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-gray-600 dark:text-gray-300 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 rounded-lg px-2.5 py-1.5">
          <FileText size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {formatDocumentName(sources[0].fileName, sources[0].source)}
          </span>
          <span className="text-gray-400 dark:text-gray-500">·</span>
          <span className="text-gray-500 dark:text-gray-400">
            Chunk #{typeof sources[0].chunkIndex === 'number' ? sources[0].chunkIndex : 1}
          </span>
          <span className="text-gray-400 dark:text-gray-500">·</span>
          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 size={11} />
            {formatRelevance(sources[0].score)}
          </span>
        </div>
      )}

      {/* Multiple Sources Summary View (when collapsed) */}
      {isMultiple && !isExpanded && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-gray-600 dark:text-gray-300">
          <span className="text-gray-500 dark:text-gray-400">Top match:</span>
          <span className="font-medium text-gray-800 dark:text-gray-200 truncate max-w-[200px]">
            {formatDocumentName(sources[0].fileName, sources[0].source)}
          </span>
          <span className="text-gray-400">·</span>
          <span className="font-semibold text-emerald-700 dark:text-emerald-400">
            {formatRelevance(sources[0].score)}
          </span>
        </div>
      )}

      {/* Multiple Sources Expanded List */}
      {isMultiple && isExpanded && (
        <div className="mt-2 space-y-1.5 animate-fade-in">
          {sources.map((src, idx) => (
            <div
              key={`${src.fileName}-${src.chunkIndex}-${idx}`}
              className="flex items-center justify-between gap-2 p-2 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100/80 dark:border-emerald-900/40 text-gray-700 dark:text-gray-300"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="truncate">
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {formatDocumentName(src.fileName, src.source)}
                  </span>
                  <span className="ml-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                    (Chunk #{typeof src.chunkIndex === 'number' ? src.chunkIndex : idx + 1})
                  </span>
                </div>
              </div>

              <div className="shrink-0">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 font-semibold text-emerald-800 dark:text-emerald-200 text-[11px]">
                  <CheckCircle2 size={10} />
                  {formatRelevance(src.score)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
