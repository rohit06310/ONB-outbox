import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { ScheduledTable } from './components/ScheduledTable';
import { SentTable } from './components/SentTable';
import { ComposePage } from './components/ComposePage';
import { EmailDetailModal } from './components/EmailDetailModal';
import { Login } from './components/Login';
import { AuthCallback } from './components/AuthCallback';
import { api, getAuthToken, clearAuthToken } from './services/api';
import type { User, EmailJob, SlackStatus } from './types';

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    !!getAuthToken()
  );

  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] =
    useState<'scheduled' | 'sent'>('scheduled');
  const [viewMode, setViewMode] =
    useState<'list' | 'compose' | 'detail'>('list');

  const [scheduledJobs, setScheduledJobs] = useState<EmailJob[]>([]);
  const [sentJobs, setSentJobs] = useState<EmailJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<EmailJob | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [slackStatus, setSlackStatus] = useState<SlackStatus | null>(null);

  // Load current authenticated user
  const loadUserData = useCallback(async () => {
    const token = getAuthToken();

    if (!token) return;

    try {
      const data = await api.getCurrentUser();
      setUser(data.user);
    } catch (err) {
      console.error('Failed to load current user:', err);

      // Invalid/expired token
      clearAuthToken();
      setIsAuthenticated(false);
      setUser(null);
    }
  }, []);

  // Load email jobs
  const loadJobs = useCallback(async () => {
    if (!getAuthToken()) return;

    setLoading(true);

    try {
      const [scheduledRes, sentRes, slackRes] = await Promise.all([
        api.getScheduled(),
        api.getSent(),
        api.getSlackStatus().catch(() => ({ connected: false })),
      ]);

      setScheduledJobs(scheduledRes.jobs || []);
      setSentJobs(sentRes.jobs || []);
      setSlackStatus(slackRes);
    } catch (err) {
      console.error('Failed to load email jobs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load user + jobs after authentication
  useEffect(() => {
    if (!isAuthenticated) return;

    loadUserData();
    loadJobs();

    const interval = setInterval(loadJobs, 5000);

    return () => clearInterval(interval);
  }, [isAuthenticated, loadUserData, loadJobs]);

  // Search emails
  const handleSearchChange = async (q: string) => {
    setSearchQuery(q);

    if (!q.trim()) {
      loadJobs();
      return;
    }

    try {
      const searchRes = await api.searchEmails(q);
      const hits = searchRes.hits || [];

      setScheduledJobs(
        hits.filter(
          (h: any) =>
            h.status === 'SCHEDULED' ||
            h.status === 'PROCESSING'
        )
      );

      setSentJobs(
        hits.filter(
          (h: any) =>
            h.status === 'SENT' ||
            h.status === 'FAILED'
        )
      );
    } catch (err) {
      console.error('Search failed:', err);
    }
  };

  // Cancel scheduled email
  const handleCancelJob = async (id: string) => {
    if (
      !window.confirm(
        'Are you sure you want to cancel this scheduled email?'
      )
    ) {
      return;
    }

    try {
      await api.cancelEmail(id);
      loadJobs();
    } catch (err: any) {
      alert(`Error cancelling email: ${err.message}`);
    }
  };

  // Logout
  const handleLogout = () => {
    clearAuthToken();
    setIsAuthenticated(false);
    setUser(null);
  };

  // OAuth callback route
  if (window.location.pathname === '/auth/callback') {
    return (
      <AuthCallback
        onSuccess={() => {
          setIsAuthenticated(true);
          window.history.replaceState({}, '', '/');
          window.location.reload();
        }}
      />
    );
  }

  // Login screen
  if (!isAuthenticated) {
    return (
      <Login
        onLoginSuccess={() => setIsAuthenticated(true)}
      />
    );
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden font-sans">
      <Sidebar
        user={user}
        activeTab={activeTab}
        scheduledCount={scheduledJobs.length}
        sentCount={sentJobs.length}
        slackStatus={slackStatus}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setViewMode('list');
        }}
        onComposeClick={() => setViewMode('compose')}
        onLogout={handleLogout}
      />

      <main className="flex-1 flex flex-col min-w-0">
        {viewMode === 'compose' ? (
          <ComposePage
            user={user}
            onBack={() => setViewMode('list')}
            onScheduleSuccess={() => {
              setViewMode('list');
              setActiveTab('scheduled');
              loadJobs();
            }}
          />
        ) : viewMode === 'detail' && selectedJob ? (
          <EmailDetailModal
            job={selectedJob}
            onBack={() => setViewMode('list')}
          />
        ) : activeTab === 'scheduled' ? (
          <ScheduledTable
            jobs={scheduledJobs}
            loading={loading}
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            onRefresh={loadJobs}
            onSelectJob={(job) => {
              setSelectedJob(job);
              setViewMode('detail');
            }}
            onCancelJob={handleCancelJob}
          />
        ) : (
          <SentTable
            jobs={sentJobs}
            loading={loading}
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            onRefresh={loadJobs}
            onSelectJob={(job) => {
              setSelectedJob(job);
              setViewMode('detail');
            }}
          />
        )}
      </main>
    </div>
  );
}

export default App;