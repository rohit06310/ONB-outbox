import React from 'react';
import { Clock, Send, ChevronDown, Plus, LogOut, MessageSquare } from 'lucide-react';
import type { User, SlackStatus } from '../types';

interface SidebarProps {
  user: User | null;
  activeTab: 'scheduled' | 'sent';
  scheduledCount: number;
  sentCount: number;
  slackStatus: SlackStatus | null;
  onTabChange: (tab: 'scheduled' | 'sent') => void;
  onComposeClick: () => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  activeTab,
  scheduledCount,
  sentCount,
  slackStatus,
  onTabChange,
  onComposeClick,
  onLogout,
}) => {
  const handleConnectSlack = () => {
    // Initiate Slack OAuth flow
    window.location.href = 'http://localhost:4000/api/slack/connect';
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen select-none">
      {/* Top Logo */}
      <div className="p-6">
        <h1 className="text-2xl font-black tracking-tight text-gray-900 font-mono">ONB</h1>
      </div>

      {/* User Profile Card */}
      <div className="px-4 mb-4">
        <div className="flex items-center justify-between p-2 rounded-xl bg-gray-50 border border-gray-100">
          <div className="flex items-center space-x-3 overflow-hidden">
            <img
              src={
                user?.avatar ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
              }
              alt={user?.name || 'User'}
              className="w-9 h-9 rounded-full object-cover border border-gray-200"
            />
            <div className="truncate">
              <p className="text-xs font-bold text-gray-900 truncate">
                {user?.name || 'Oliver Brown'}
              </p>
              <p className="text-[11px] text-gray-500 truncate">
                {user?.email || 'oliver.brown@domain.io'}
              </p>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 ml-1" />
        </div>
      </div>

      {/* Compose Button */}
      <div className="px-4 mb-6">
        <button
          onClick={onComposeClick}
          className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-full border border-[#00A859] text-[#00A859] hover:bg-[#EAF7EE] font-medium text-sm transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Compose</span>
        </button>
      </div>

      {/* Core Nav Navigation */}
      <div className="px-3 flex-1 space-y-1">
        <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
          CORE
        </div>

        {/* Scheduled Tab */}
        <button
          onClick={() => onTabChange('scheduled')}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'scheduled'
              ? 'bg-[#EAF7EE] text-[#00A859] font-semibold'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center space-x-3">
            <Clock className="w-4 h-4" />
            <span>Scheduled</span>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-gray-500">
            {scheduledCount}
          </span>
        </button>

        {/* Sent Tab */}
        <button
          onClick={() => onTabChange('sent')}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'sent'
              ? 'bg-[#EAF7EE] text-[#00A859] font-semibold'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center space-x-3">
            <Send className="w-4 h-4" />
            <span>Sent</span>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-gray-500">
            {sentCount}
          </span>
        </button>
      </div>

      {/* Slack & Logout Section */}
      <div className="p-4 border-t border-gray-100 space-y-2">
        <button
          onClick={handleConnectSlack}
          className={`w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-xs font-medium border transition-all ${
            slackStatus?.connected
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>
            {slackStatus?.connected
              ? `Slack Connected (${slackStatus.teamName || 'Workspace'})`
              : 'Connect Slack'}
          </span>
        </button>

        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};
