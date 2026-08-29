import React from 'react';
import { ArrowLeft, Star, Trash2, ExternalLink, CheckCircle, Clock } from 'lucide-react';
import type { EmailJob } from '../types';
import { format } from 'date-fns';

interface EmailDetailModalProps {
  job: EmailJob;
  onBack: () => void;
}

export const EmailDetailModal: React.FC<EmailDetailModalProps> = ({ job, onBack }) => {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      return format(new Date(dateStr), 'MMM d, h:mm a');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="flex-1 bg-white h-screen flex flex-col overflow-hidden font-sans">
      {/* Header Bar */}
      <div className="px-8 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center space-x-3 min-w-0">
          <button
            onClick={onBack}
            className="p-2 text-gray-500 hover:text-gray-800 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold text-gray-900 truncate">
            {job.subject} <span className="text-gray-400 font-normal">| {job.id.slice(0, 8)}</span>
          </h2>
        </div>

        <div className="flex items-center space-x-3">
          <Star className="w-5 h-5 text-gray-300 hover:text-amber-400 cursor-pointer" />
          <Trash2 className="w-5 h-5 text-gray-300 hover:text-red-500 cursor-pointer" />
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
            alt="User"
            className="w-8 h-8 rounded-full border border-gray-200"
          />
        </div>
      </div>

      {/* Main Detail Body */}
      <div className="flex-1 overflow-y-auto px-12 py-8 max-w-4xl">
        {/* Sender Info */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-base">
              {job.fromEmail[0].toUpperCase()}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <p className="text-sm font-bold text-gray-900">{job.fromEmail.split('@')[0]}</p>
                <span className="text-xs text-gray-400">&lt;{job.fromEmail}&gt;</span>
              </div>
              <p className="text-xs text-gray-400">to {job.toEmail}</p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-xs text-gray-400">
              {formatDate(job.sentAt || job.scheduledAt)}
            </p>
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded mt-1 ${
                job.status === 'SENT'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-amber-50 text-amber-700'
              }`}
            >
              {job.status === 'SENT' ? (
                <>
                  <CheckCircle className="w-3 h-3" /> Sent
                </>
              ) : (
                <>
                  <Clock className="w-3 h-3" /> Scheduled
                </>
              )}
            </span>
          </div>
        </div>

        {/* Ethereal SMTP Link Banner */}
        {job.previewUrl && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              <div>
                <p className="text-xs font-bold text-emerald-900">Delivered via Ethereal Fake SMTP</p>
                <p className="text-[11px] text-emerald-700">Click to view raw email message in browser</p>
              </div>
            </div>
            <a
              href={job.previewUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-sm"
            >
              <span>Open Ethereal Email</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* Email Content */}
        <div className="prose prose-sm max-w-none text-gray-800 leading-relaxed space-y-4 mb-8">
          <p>Hey {job.toEmail.split('@')[0]},</p>
          <div dangerouslySetInnerHTML={{ __html: job.body }} />
        </div>
      </div>
    </div>
  );
};
