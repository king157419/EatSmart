import { useState } from 'react';
import { apiGetChatSessions, apiGetChatSession, apiDeleteChatSession } from '../services/api';
import type { ChatSession, ChatMessageDB } from '../types';

export function useChatHistory() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentMessages, setCurrentMessages] = useState<ChatMessageDB[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGetChatSessions();
      setSessions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const loadSession = async (sessionId: number) => {
    setLoading(true);
    setError(null);
    try {
      const messages = await apiGetChatSession(sessionId);
      setCurrentMessages(messages);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const deleteSession = async (sessionId: number) => {
    try {
      await apiDeleteChatSession(sessionId);
      setSessions(sessions.filter(s => s.id !== sessionId));
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    }
  };

  return {
    sessions,
    currentMessages,
    loading,
    error,
    loadSessions,
    loadSession,
    deleteSession,
  };
}
