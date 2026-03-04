import type { ChatMessage } from "../../types";
import MarkdownRenderer from "../MarkdownRenderer";
import CitationPanel from "./CitationPanel";

interface ChatMessageProps {
  message: ChatMessage;
}

export default function ChatMessageComponent({ message }: ChatMessageProps) {
  return (
    <div className={`message ${message.role}`}>
      <div className="message-avatar">
        {message.role === "user" ? "👤" : "🤖"}
      </div>
      <div>
        <div className="message-content">
          {message.role === "assistant" && !message.content ? (
            <div className="loading-dots">
              <span /><span /><span />
            </div>
          ) : (
            <MarkdownRenderer content={message.content} />
          )}
          {message.has_recording && (
            <div className="record-badge">✅ 已记录到记忆库</div>
          )}
        </div>
        {message.role === "assistant" && message.sources && message.sources.length > 0 && (
          <CitationPanel sources={message.sources} />
        )}
      </div>
    </div>
  );
}
