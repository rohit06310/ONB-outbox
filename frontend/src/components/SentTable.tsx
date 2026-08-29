import React from 'react';
import { Search, Filter, RefreshCw, Star, CheckCircle, ExternalLink, Send } from 'lucide-react';
import type { EmailJob } from '../types';

interface SentTableProps {
  jobs: EmailJob[];
  loading: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onRefresh: () => void;
  onSelectJob: (job: EmailJob) => void;
}

export const SentTable: React.FC<SentTableProps> = ({
  jobs,
  loading,
  searchQuery,
  onSearchChange,
  onRefresh,
  onSelectJob,
}) => {
  return (
    <div className="flex-1 flex flex-col bg-white h-screen overflow-hidden">
      {/* Top Search Header Bar */}
      <div className="p-4 border-b border-gray-100 flex items-center space-x-3">
        <div className="flex-1 relative flex items-center">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5" />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-transparent rounded-full text-sm focus:outline-none focus:bg-white focus:border-gray-300 transition-all"
          />
        </div>
        <button
          onClick={onRefresh}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
          title="Filter"
        >
          <Filter className="w-4 h-4" />
        </button>
        <button
          onClick={onRefresh}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Main List */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
        {loading ? (
          <div className="p-8 text-center text-gray-400 space-y-3">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs">Loading sent emails...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="p-16 text-center text-gray-400">
            <Send className="w-12 h-12 text-gray-300 mx-auto mb-3 stroke-[1.5]" />
            <p className="text-sm font-medium text-gray-600">No sent emails yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Scheduled emails will appear here after being sent by BullMQ worker.
            </p>
          </div>
        ) : (
          jobs.map((job) => (
            <div
              key={job.id}
              onClick={() => onSelectJob(job)}
              className="flex items-center justify-between px-6 py-4 hover:bg-gray-50/80 cursor-pointer transition-colors group"
            >
              <div className="flex items-center space-x-4 min-w-0 flex-1">
                {/* Recipient */}
                <span className="text-sm font-bold text-gray-900 w-44 shrink-0 truncate">
                  To: {job.toEmail.split('@')[0]}
                </span>

                {/* Sent Badge & Subject Preview */}
                <div className="flex items-center space-x-2 min-w-0 flex-1">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded shrink-0">
                    <CheckCircle className="w-3 h-3 text-emerald-500" />
                    Sent
                  </span>
                  <span className="text-sm font-bold text-gray-800 shrink-0">
                    {job.subject}
                  </span>
                  <span className="text-sm text-gray-400 truncate font-normal">
                    - {job.body.replace(/<[^>]*>/g, '')}
                  </span>
                </div>
              </div>

              {/* Ethereal Link & Star */}
              <div className="flex items-center space-x-3 ml-4 shrink-0">
                {job.previewUrl && (
                  <a
                    href={job.previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium hover:underline bg-emerald-50 px-2 py-1 rounded"
                    title="View email in Ethereal Fake SMTP"
                  >
                    <span>Ethereal Preview</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                <Star className="w-4 h-4 text-gray-300 hover:text-amber-400 cursor-pointer transition-colors" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
