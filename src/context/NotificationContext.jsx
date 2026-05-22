import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from './AuthContext';
import api, { getSubmissions, getSubmission } from '../api/api';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submissionTitleMap, setSubmissionTitleMap] = useState({});
  const [submissionStatusMap, setSubmissionStatusMap] = useState({});
  const [scheduleIdToUuid, setScheduleIdToUuid] = useState({});
  const fetchedUuids = useRef(new Set());

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
        if (s.submission_uuid && (s.overall_status || s.status)) {
          statusMap[s.submission_uuid] = s.overall_status || s.status;
        }
        if (s.schedule_id && s.submission_uuid) {
          schedMap[String(s.schedule_id)] = s.submission_uuid;
        }
      });
      setSubmissionTitleMap(map);
      setSubmissionStatusMap(statusMap);
      if (Object.keys(schedMap).length) setScheduleIdToUuid(schedMap);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setSubmissionTitleMap({});
      setSubmissionStatusMap({});
      fetchedUuids.current = new Set();
      return;
    }
    fetchNotifications();
    fetchSubmissionTitles();
    const id = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(id);
  }, [isAuthenticated, fetchNotifications, fetchSubmissionTitles]);

  // For roles where getSubmissions() returns nothing (e.g. attendees),
  // individually fetch each submission UUID seen in notifications so we
  // can check their status. Uses a ref to avoid re-fetching known UUIDs.
  useEffect(() => {
    if (!notifications.length) return;
    const missing = [...new Set(
      notifications
        .map(n => n.action_url?.match(/\/submissions\/([\w-]+)/)?.[1])
        .filter(uuid => uuid && !fetchedUuids.current.has(uuid))
    )];
    if (!missing.length) return;
    missing.forEach(uuid => fetchedUuids.current.add(uuid));
    Promise.allSettled(
      missing.map(uuid =>
        getSubmission(uuid)
          .then(({ data }) => {
            const s = data?.submission ?? data;
            const status = s?.overall_status || s?.status;
            const scheduleId = s?.schedule_id ? String(s.schedule_id) : null;
            return { uuid, status, scheduleId };
          })
          .catch(() => null)
      )
    ).then(results => {
      const statusUpdates = {};
      const schedUpdates = {};
      results.forEach(r => {
        if (r.status !== 'fulfilled' || !r.value) return;
        const { uuid, status, scheduleId } = r.value;
        if (status) statusUpdates[uuid] = status;
        if (scheduleId) schedUpdates[scheduleId] = uuid;
      });
      if (Object.keys(statusUpdates).length) {
        setSubmissionStatusMap(prev => ({ ...prev, ...statusUpdates }));
      }
      if (Object.keys(schedUpdates).length) {
        setScheduleIdToUuid(prev => ({ ...prev, ...schedUpdates }));
      }
    });
  }, [notifications]); // eslint-disable-line react-hooks/exhaustive-deps

  const approvedSubmissionIds = useMemo(() => {
    const ids = new Set(
      Object.entries(submissionStatusMap)
        .filter(([, status]) => status === 'approved')
        .map(([uuid]) => uuid)
    );
    // Also detect approval from notification text — covers cases where
    // the submission status isn't yet in the map.
    notifications.forEach(n => {
      if (!n.action_url) return;
      const text = `${n.title || ''} ${n.message || ''}`.toLowerCase();
      if (!text.includes('approved')) return;
      const subMatch = n.action_url.match(/\/submissions\/([\w-]+)/);
      if (subMatch) { ids.add(subMatch[1]); return; }
      const schedMatch = n.action_url.match(/\/schedules\/(\d+)/);
      if (schedMatch && scheduleIdToUuid[schedMatch[1]]) {
        ids.add(scheduleIdToUuid[schedMatch[1]]);
      }
    });
    return ids;
  }, [submissionStatusMap, notifications, scheduleIdToUuid]);

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

