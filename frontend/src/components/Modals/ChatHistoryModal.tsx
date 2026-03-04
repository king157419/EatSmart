import { useState, useEffect } from "react";
import { useChatHistory } from "../../hooks/useChatHistory";
import type { ChatSession } from "../../types";

interface ChatHistoryModalProps {
  onClose: () => void;
  onLoadSession: (messages: any[]) => void;
}

export default function ChatHistoryModal({
  onClose,
  onLoadSession,
}: ChatHistoryModalProps) {
  const { sessions, currentMessages, loading, error, loadSessions, loadSession, deleteSession } = useChatHistory();
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const handleSessionClick = async (sessionId: number) => {
    setSelectedSessionId(sessionId);
    await loadSession(sessionId);
  };

  const handleDeleteSession = async (sessionId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("确定要删除这个会话吗？")) {
      await deleteSession(sessionId);
      if (selectedSessionId === sessionId) {
        setSelectedSessionId(null);
      }
    }
  };

  const handleLoadToChat = () => {
    if (currentMessages.length > 0) {
      const messages = currentMessages.map(msg => ({
        role: msg.role,
        content: msg.content,
        sources: msg.sources,
        has_recording: msg.has_recording,
        records: msg.records,
      }));
      onLoadSession(messages);
      onClose();
    }
  };

  const groupSessionsByDate = (sessions: ChatSession[]) => {
    const groups: { [key: string]: ChatSession[] } = {};
    sessions.forEach(session => {
      const date = session.session_date;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(session);
    });
    return groups;
  };

  const sessionGroups = groupSessionsByDate(sessions);

  return (
    <div className="recipe-modal-overlay" onClick={onClose}>
      <div className="recipe-card chat-history-card" onClick={(e) => e.stopPropagation()}>
        <h2>💬 对话历史</h2>

        {error && <p className="error-hint">{error}</p>}

        <div className="chat-history-container">
          {/* 左侧：会话列表 */}
          <div className="session-list">
            {loading && sessions.length === 0 ? (
              <p className="empty-hint">加载中...</p>
            ) : Object.keys(sessionGroups).length === 0 ? (
              <p className="empty-hint">暂无历史对话</p>
            ) : (
              Object.keys(sessionGroups).sort().reverse().map(date => (
                <div key={date} className="session-group">
                  <div className="session-date-header">{date}</div>
                  {sessionGroups[date].map(session => (
                    <div
                      key={session.id}
                      className={`session-item ${selectedSessionId === session.id ? 'active' : ''}`}
                      onClick={() => handleSessionClick(session.id)}
                    >
                      <div className="session-title">{session.title}</div>
                      <div className="session-meta">
                        {session.message_count} 条消息
                      </div>
                      <button
                        className="delete-btn-small"
                        onClick={(e) => handleDeleteSession(session.id, e)}
                        title="删除会话"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>

          {/* 右侧：消息详情 */}
          <div className="message-detail">
            {selectedSessionId === null ? (
              <p className="empty-hint">← 选择一个会话查看详情</p>
            ) : loading ? (
              <p className="empty-hint">加载中...</p>
            ) : currentMessages.length === 0 ? (
              <p className="empty-hint">该会话无消息</p>
            ) : (
              <>
                <div className="message-list">
                  {currentMessages.map((msg, idx) => (
                    <div key={idx} className={`history-message ${msg.role}`}>
                      <div className="message-role">
                        {msg.role === 'user' ? '👤 用户' : '🤖 助手'}
                      </div>
                      <div className="message-content">{msg.content}</div>
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="message-sources">
                          📚 引用了 {msg.sources.length} 个知识来源
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <button className="load-session-btn" onClick={handleLoadToChat}>
                  加载到当前对话
                </button>
              </>
            )}
          </div>
        </div>

        <button className="close-btn" onClick={onClose}>关闭</button>
      </div>
    </div>
  );
}
