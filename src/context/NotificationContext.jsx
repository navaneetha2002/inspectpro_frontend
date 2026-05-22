import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import api, { getSubmissions } from '../api/api';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submissionTitleMap, setSubmissionTitleMap] = useState({});
  const [submissionStatusMap, setSubmissionStatusMap] = useState({});
  const [scheduleIdToUuid, setScheduleIdToUuid] = useState({});

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/notifications');
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      // silent — network errors don't break the app
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSubmissionTitles = useCallback(async () => {
    try {
      const { data } = await getSubmissions();
      const rows = Array.isArray(data) ? data : [];
      const map = {};
      const statusMap = {};
      const schedMap = {};
      rows.forEach(s => {
        if (s.submission_uuid && s.schedule_title) {
          map[s.submission_uuid] = s.schedule_title;
        }
        if (s.submission_uuid && s.overall_status) {
          statusMap[s.submission_uuid] = s.overall_status;
        }
        if (s.schedule_id && s.submission_uuid) {
          schedMap[s.schedule_id] = s.submission_uuid;
        }
      });
      setSubmissionTitleMap(map);
      setSubmissionStatusMap(statusMap);
      setScheduleIdToUuid(schedMap);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setSubmissionTitleMap({});
      setSubmissionStatusMap({});
      return;
    }
    fetchNotifications();
    fetchSubmissionTitles();
    const id = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(id);
  }, [isAuthenticated, fetchNotifications, fetchSubmissionTitles]);

  // Approved set: submissions the API flagged as approved + any submission UUID
  // where a notification contains "approved" text (covers inspector/reviewer roles
  // whose assignments don't appear in getSubmissions()).
  const approvedSubmissionIds = useMemo(() => {
    const ids = new Set(
      Object.entries(submissionStatusMap)
        .filter(([, status]) => status === 'approved')
        .map(([uuid]) => uuid)
    );
    notifications.forEach(n => {
      if (!n.action_url) return;
      const match = n.action_url.match(/\/submissions\/([\w-]+)/);
      if (!match) return;
      const text = `${n.title || ''} ${n.message || ''}`.toLowerCase();
      if (text.includes('approved')) ids.add(match[1]);
    });
    return ids;
  }, [submissionStatusMap, notifications]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  async function markRead(id) {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
    } catch {}
  }

  async function markAllRead() {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch {}
  }

  async function remove(id) {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch {}
  }

  async function clearAll() {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch {}
  }

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      submissionTitleMap,
      approvedSubmissionIds,
      scheduleIdToUuid,
      markRead,
      markAllRead,
      remove,
      clearAll,
      refresh: fetchNotifications,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}

