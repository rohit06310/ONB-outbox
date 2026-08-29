import React, { useState } from 'react';
import {
  ArrowLeft,
  Paperclip,
  Clock,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Quote,
  Link,
  Strikethrough,
  RotateCcw,
  RotateCw,
  FileText,
  X,
  Calendar,
} from 'lucide-react';
import type { User, ComposeFormState } from '../types';

interface ComposePageProps {
  user: User | null;
  onBack: () => void;
  onScheduleSuccess: () => void;
}

export const ComposePage: React.FC<ComposePageProps> = ({
  user,
  onBack,
  onScheduleSuccess,
}) => {
  const [form, setForm] = useState<ComposeFormState>({
    fromEmail: user?.email || 'oliver.brown@domain.io',
    recipients: [],
    toInput: '',
    subject: '',
    body: '',
    scheduledAt: new Date(Date.now() + 60000).toISOString().slice(0, 16), // 1 minute in future
    delayBetweenSec: 2,
    hourlyLimit: 50,
  });

  const [showSendLater, setShowSendLater] = useState(false);
  const [fileEmailsCount, setFileEmailsCount] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Handle CSV / Text File upload & email detection
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      // Regex to extract all valid email addresses from CSV/Text content
      const foundEmails = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
      const uniqueEmails = Array.from(new Set(foundEmails));

      if (uniqueEmails.length > 0) {
        setForm((prev) => ({
          ...prev,
          recipients: Array.from(new Set([...prev.recipients, ...uniqueEmails])),
        }));
        setFileEmailsCount(uniqueEmails.length);
      }
    };
    reader.readAsText(file);
  };

  const handleToInputBlur = () => {
    if (form.toInput.trim()) {
      const newEmails = form.toInput
        .split(/[,;\s]+/)
        .map((e) => e.trim())
        .filter((e) => e.includes('@'));

      setForm((prev) => ({
        ...prev,
        recipients: Array.from(new Set([...prev.recipients, ...newEmails])),
        toInput: '',
      }));
    }
  };

  const removeRecipient = (emailToRemove: string) => {
    setForm((prev) => ({
      ...prev,
      recipients: prev.recipients.filter((e) => e !== emailToRemove),
    }));
  };

  const setQuickSchedule = (_offsetHours: number, targetHour?: number) => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    if (targetHour !== undefined) {
      d.setHours(targetHour, 0, 0, 0);
    }
    setForm((prev) => ({
      ...prev,
      scheduledAt: d.toISOString().slice(0, 16),
    }));
  };

  const handleScheduleSubmit = async () => {
    setErrorMessage(null);

    const allRecipients = Array.from(
      new Set([
        ...form.recipients,
        ...(form.toInput.includes('@') ? [form.toInput.trim()] : []),
      ])
    );

    if (allRecipients.length === 0) {
      setErrorMessage('Please enter at least one recipient email or upload a CSV file.');
      return;
    }

    if (!form.subject.trim()) {
      setErrorMessage('Please enter a subject.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('http://localhost:4000/api/emails/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          fromEmail: form.fromEmail,
          recipients: allRecipients,
          subject: form.subject,
          body: form.body || '<p>No content</p>',
          scheduledAt: new Date(form.scheduledAt).toISOString(),
          delayBetweenMs: form.delayBetweenSec * 1000,
          hourlyLimit: form.hourlyLimit,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to schedule emails');
      }

      onScheduleSuccess();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 bg-white h-screen flex flex-col overflow-hidden font-sans relative">
      {/* Top Header */}
      <div className="px-8 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 text-gray-500 hover:text-gray-800 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold text-gray-900">Compose New Email</h2>
        </div>

        <div className="flex items-center space-x-3 relative">
          {/* Attachment CSV upload button */}
          <label className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
            <Paperclip className="w-5 h-5" />
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {/* Clock icon to toggle Send Later panel */}
          <button
            onClick={() => setShowSendLater(!showSendLater)}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
            title="Schedule time"
          >
            <Clock className="w-5 h-5" />
          </button>

          {/* Send / Schedule button */}
          <button
            onClick={handleScheduleSubmit}
            disabled={isSubmitting}
            className="py-1.5 px-6 rounded-full border border-[#00A859] text-[#00A859] hover:bg-[#EAF7EE] font-medium text-sm transition-all shadow-sm"
          >
            {isSubmitting ? 'Scheduling...' : 'Send'}
          </button>

          {/* Send Later Dropdown Popup */}
          {showSendLater && (
            <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Send Later</h3>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1.5">
                    Pick date & time
                  </label>
                  <div className="relative">
                    <input
                      type="datetime-local"
                      value={form.scheduledAt}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, scheduledAt: e.target.value }))
                      }
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:border-brand-500"
                    />
                    <Calendar className="w-4 h-4 text-gray-400 absolute right-3 top-2.5 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-gray-100 text-xs">
                  <button
                    onClick={() => setQuickSchedule(24)}
                    className="w-full text-left py-1.5 px-2 hover:bg-gray-50 rounded-lg text-gray-700 font-medium"
                  >
                    Tomorrow
                  </button>
                  <button
                    onClick={() => setQuickSchedule(24, 10)}
                    className="w-full text-left py-1.5 px-2 hover:bg-gray-50 rounded-lg text-gray-700 font-medium"
                  >
                    Tomorrow, 10:00 AM
                  </button>
                  <button
                    onClick={() => setQuickSchedule(24, 11)}
                    className="w-full text-left py-1.5 px-2 hover:bg-gray-50 rounded-lg text-gray-700 font-medium"
                  >
                    Tomorrow, 11:00 AM
                  </button>
                  <button
                    onClick={() => setQuickSchedule(24, 15)}
                    className="w-full text-left py-1.5 px-2 hover:bg-gray-50 rounded-lg text-gray-700 font-medium"
                  >
                    Tomorrow, 3:00 PM
                  </button>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-3">
                  <button
                    onClick={() => setShowSendLater(false)}
                    className="text-xs font-semibold text-gray-500 hover:text-gray-700 px-3 py-1.5"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setShowSendLater(false)}
                    className="py-1 px-4 rounded-full border border-[#00A859] text-[#00A859] text-xs font-semibold hover:bg-[#EAF7EE]"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error Message Toast */}
      {errorMessage && (
        <div className="mx-8 mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center justify-between">
          <span>{errorMessage}</span>
          <X className="w-4 h-4 cursor-pointer" onClick={() => setErrorMessage(null)} />
        </div>
      )}

      {/* Form Fields */}
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
        {/* From */}
        <div className="flex items-center space-x-4">
          <label className="w-16 text-sm font-semibold text-gray-400">From</label>
          <div className="flex items-center space-x-2">
            <input
              type="email"
              value={form.fromEmail}
              readOnly
              disabled
              className="px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 w-64 cursor-not-allowed"
            />
          </div>
        </div>

        {/* To / Recipients */}
        <div className="flex items-start space-x-4 pt-2">
          <label className="w-16 text-sm font-semibold text-gray-400 pt-2">To</label>
          <div className="flex-1 space-y-2">
            {/* Recipient Badges */}
            <div className="flex flex-wrap gap-1.5 items-center">
              {form.recipients.map((rec) => (
                <span
                  key={rec}
                  className="inline-flex items-center gap-1 bg-gray-100 text-gray-800 text-xs px-2.5 py-1 rounded-full border border-gray-200"
                >
                  {rec}
                  <X
                    className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-pointer"
                    onClick={() => removeRecipient(rec)}
                  />
                </span>
              ))}

              <input
                type="email"
                placeholder={form.recipients.length === 0 ? 'recipient@example.com' : 'Add email...'}
                value={form.toInput}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, toInput: e.target.value }))
                }
                onBlur={handleToInputBlur}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    handleToInputBlur();
                  }
                }}
                className="flex-1 min-w-[200px] py-1 text-sm border-b border-transparent focus:border-gray-300 focus:outline-none text-gray-800"
              />
            </div>

            {/* CSV File detected count badge */}
            {fileEmailsCount !== null && (
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">
                <FileText className="w-3.5 h-3.5" />
                <span>{fileEmailsCount} email addresses detected from CSV</span>
              </div>
            )}
          </div>
        </div>

        {/* Subject */}
        <div className="flex items-center space-x-4 border-t border-gray-100 pt-4">
          <label className="w-16 text-sm font-semibold text-gray-400">Subject</label>
          <input
            type="text"
            placeholder="Subject"
            value={form.subject}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, subject: e.target.value }))
            }
            className="flex-1 py-1 text-sm font-semibold text-gray-900 border-none focus:outline-none"
          />
        </div>

        {/* Delay & Hourly Limit */}
        <div className="flex items-center space-x-8 border-t border-gray-100 pt-4">
          <div className="flex items-center space-x-3">
            <label className="text-sm font-semibold text-gray-600">
              Delay between 2 emails
            </label>
            <input
              type="number"
              min="0"
              value={form.delayBetweenSec}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  delayBetweenSec: parseInt(e.target.value) || 0,
                }))
              }
              className="w-16 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-center text-gray-800 font-bold focus:outline-none focus:border-brand-500"
            />
            <span className="text-xs text-gray-400">sec</span>
          </div>

          <div className="flex items-center space-x-3">
            <label className="text-sm font-semibold text-gray-600">Hourly Limit</label>
            <input
              type="number"
              min="1"
              value={form.hourlyLimit}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  hourlyLimit: parseInt(e.target.value) || 1,
                }))
              }
              className="w-16 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-center text-gray-800 font-bold focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        {/* Rich Text Toolbar & Body Box */}
        <div className="border border-gray-200 rounded-2xl overflow-hidden bg-gray-50/50 mt-4">
          {/* Formatting Toolbar */}
          <div className="flex flex-wrap items-center gap-1.5 p-3 border-b border-gray-200 bg-white text-gray-500">
            <button type="button" className="p-1.5 hover:bg-gray-100 rounded">
              <RotateCcw className="w-4 h-4" />
            </button>
            <button type="button" className="p-1.5 hover:bg-gray-100 rounded">
              <RotateCw className="w-4 h-4" />
            </button>
            <span className="h-4 border-r border-gray-200 mx-1"></span>
            <span className="text-xs font-semibold px-2 py-1 hover:bg-gray-100 rounded cursor-pointer">
              Tt
            </span>
            <button type="button" className="p-1.5 hover:bg-gray-100 rounded">
              <Bold className="w-4 h-4" />
            </button>
            <button type="button" className="p-1.5 hover:bg-gray-100 rounded">
              <Italic className="w-4 h-4" />
            </button>
            <button type="button" className="p-1.5 hover:bg-gray-100 rounded">
              <Underline className="w-4 h-4" />
            </button>
            <span className="h-4 border-r border-gray-200 mx-1"></span>
            <button type="button" className="p-1.5 hover:bg-gray-100 rounded">
              <AlignLeft className="w-4 h-4" />
            </button>
            <button type="button" className="p-1.5 hover:bg-gray-100 rounded">
              <AlignCenter className="w-4 h-4" />
            </button>
            <button type="button" className="p-1.5 hover:bg-gray-100 rounded">
              <AlignRight className="w-4 h-4" />
            </button>
            <span className="h-4 border-r border-gray-200 mx-1"></span>
            <button type="button" className="p-1.5 hover:bg-gray-100 rounded">
              <ListOrdered className="w-4 h-4" />
            </button>
            <button type="button" className="p-1.5 hover:bg-gray-100 rounded">
              <List className="w-4 h-4" />
            </button>
            <button type="button" className="p-1.5 hover:bg-gray-100 rounded">
              <Quote className="w-4 h-4" />
            </button>
            <button type="button" className="p-1.5 hover:bg-gray-100 rounded">
              <Link className="w-4 h-4" />
            </button>
            <button type="button" className="p-1.5 hover:bg-gray-100 rounded">
              <Strikethrough className="w-4 h-4" />
            </button>
          </div>

          {/* Body Textarea */}
          <textarea
            placeholder="Type Your Reply..."
            value={form.body}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, body: e.target.value }))
            }
            className="w-full h-64 p-4 bg-transparent border-none focus:outline-none text-sm text-gray-800 resize-none"
          ></textarea>
        </div>
      </div>
    </div>
  );
};
