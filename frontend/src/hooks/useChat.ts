import { useState, useCallback, useEffect } from "react";
import type { ChatMessage } from "../types";
import { apiChatStream, apiGetTodaySession, apiSaveChatMessage } from "../services/api";

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);

  // Load messages from localStorage on mount
  useEffect(() => {
    const cached = localStorage.getItem('current_session');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setMessages(parsed);
      } catch (e) {
        console.error('Failed to parse cached session', e);
      }
    }

    // Get or create today's session
    apiGetTodaySession().then(session => {
      setSessionId(session.id);
    }).catch(err => {
      console.error('Failed to get today session', err);
    });
  }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('current_session', JSON.stringify(messages));
    }
  }, [messages]);

  // Save message to backend
  const saveMessageToBackend = async (role: string, content: string, sources?: any[], hasRecording?: boolean, records?: any[]) => {
    if (!sessionId) return;

    try {
      await apiSaveChatMessage(sessionId, role, content, sources, hasRecording, records);
    } catch (err) {
      console.error('Failed to save message to backend', err);
    }
  };

  const sendMessage = useCallback(
    async (
      userMessage: string,
      onRecordingComplete?: (data: {
        has_recording?: boolean;
        nutrition_summary?: any;
        records?: any[];
      }) => void
    ) => {
      if (!userMessage.trim() || loading) return;

      const newUserMessage: ChatMessage = { role: "user", content: userMessage };
      setMessages((prev) => [...prev, newUserMessage]);
      setLoading(true);

      // Save user message to backend
      saveMessageToBackend("user", userMessage);

      // Create placeholder assistant message
      const assistantMsgIndex = messages.length + 1;
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "", sources: [] },
      ]);

      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      let assistantContent = "";
      let assistantSources: any[] = [];
      let assistantHasRecording = false;
      let assistantRecords: any[] = [];

      await apiChatStream(userMessage, history, {
        onPrepare: () => {
          // Loading state already handled
        },
        onSources: (sources) => {
          assistantSources = sources;
          setMessages((prev) => {
            const updated = [...prev];
            if (updated[assistantMsgIndex]) {
              updated[assistantMsgIndex] = {
                ...updated[assistantMsgIndex],
                sources,
              };
            }
            return updated;
          });
        },
        onContent: (delta) => {
          assistantContent += delta;
          setMessages((prev) => {
            const updated = [...prev];
            if (updated[assistantMsgIndex]) {
              updated[assistantMsgIndex] = {
                ...updated[assistantMsgIndex],
                content: updated[assistantMsgIndex].content + delta,
              };
            }
            return updated;
          });
        },
        onDone: (data) => {
          assistantHasRecording = data.has_recording || false;
          assistantRecords = data.records || [];

          setMessages((prev) => {
            const updated = [...prev];
            if (updated[assistantMsgIndex]) {
              updated[assistantMsgIndex] = {
                ...updated[assistantMsgIndex],
                has_recording: data.has_recording,
                records: data.records,
              };
            }
            return updated;
          });
          setLoading(false);

          // Save assistant message to backend
          saveMessageToBackend(
            "assistant",
            assistantContent,
            assistantSources,
            assistantHasRecording,
            assistantRecords
          );

          if (onRecordingComplete) {
            onRecordingComplete(data);
          }
        },
        onError: (error) => {
          setMessages((prev) => {
            const updated = [...prev];
            if (updated[assistantMsgIndex]) {
              updated[assistantMsgIndex] = {
                ...updated[assistantMsgIndex],
                content: `抱歉，我暂时无法回复。${error}。请检查后端服务是否正在运行。`,
              };
            }
            return updated;
          });
          setLoading(false);
        },
      });
    },
    [messages, loading, sessionId]
  );

  const loadSession = useCallback((newMessages: ChatMessage[]) => {
    setMessages(newMessages);
    localStorage.setItem('current_session', JSON.stringify(newMessages));
  }, []);

  return {
    messages,
    loading,
    sendMessage,
    loadSession,
  };
}
