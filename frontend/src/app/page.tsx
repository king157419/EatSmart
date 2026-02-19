"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// ============================================================
// Types
// ============================================================
interface Source {
  file: string;
  content: string;
  relevance: number;
}

interface NutritionSummary {
  total_calories: number;
  total_protein: number;
  total_fat: number;
  total_carbs: number;
  total_fiber: number;
  meal_count: number;
  targets?: {
    calories: number;
    fat: number;
    carbs: number;
    protein: number;
    fiber: number;
  };
  percentages?: {
    calories: number;
    fat: number;
    carbs: number;
    protein: number;
    fiber: number;
  };
  warnings?: string[];
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  has_recording?: boolean;
  records?: Array<{ type: string; data: Record<string, unknown> }>;
}

// ============================================================
// API Helper
// ============================================================
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function apiChat(
  message: string,
  history: Array<{ role: string; content: string }>
) {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, conversation_history: history }),
  });
  if (!res.ok) throw new Error("API 请求失败");
  return res.json();
}

async function apiNutrition() {
  const res = await fetch(`${API_BASE}/api/nutrition/today`);
  if (!res.ok) throw new Error("获取营养数据失败");
  return res.json();
}

async function apiRecipe(preferences: string = "") {
  const res = await fetch(`${API_BASE}/api/recipe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ preferences }),
  });
  if (!res.ok) throw new Error("食谱生成失败");
  return res.json();
}

// ============================================================
// Sub-components
// ============================================================

function NutritionBar({
  name,
  current,
  target,
  percentage,
  colorClass,
  unit,
}: {
  name: string;
  current: number;
  target: number;
  percentage: number;
  colorClass: string;
  unit: string;
}) {
  const isOver = percentage > 100;
  return (
    <div className="nutrition-item">
      <div className="nutrition-label">
        <span className="name">{name}</span>
        <span className="value">
          {current.toFixed(1)}/{target}
          {unit} ({percentage.toFixed(0)}%)
        </span>
      </div>
      <div className="progress-bar">
        <div
          className={`progress-fill ${colorClass} ${isOver ? "over" : ""}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}

function CitationPanel({ sources }: { sources: Source[] }) {
  const [open, setOpen] = useState(false);
  if (!sources || sources.length === 0) return null;

  return (
    <div className="citations">
      <button
        className="citations-toggle"
        onClick={() => setOpen(!open)}
      >
        📎 查看参考来源 ({sources.length}) {open ? "▲" : "▼"}
      </button>
      {open && (
        <div className="citation-list">
          {sources.map((s, i) => (
            <div key={i} className="citation-item">
              <div className="source-name">📄 {s.file}</div>
              <div className="source-content">{s.content}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RecipeModal({
  recipe,
  loading,
  onClose,
  onRefresh,
}: {
  recipe: string;
  loading: boolean;
  onClose: () => void;
  onRefresh: () => void;
}) {
  return (
    <div className="recipe-modal-overlay" onClick={onClose}>
      <div className="recipe-card" onClick={(e) => e.stopPropagation()}>
        <h2>🍽️ 今日食谱推荐</h2>
        {loading ? (
          <div className="loading-dots">
            <span /><span /><span />
          </div>
        ) : (
          <div className="recipe-content">{recipe}</div>
        )}
        <div className="recipe-actions">
          <button className="btn-secondary" onClick={onRefresh}>
            🔄 换一套
          </button>
          <button className="btn-primary" onClick={onClose}>
            👍 好的
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Main Page
// ============================================================
export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [nutrition, setNutrition] = useState<NutritionSummary | null>(null);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [showRecipe, setShowRecipe] = useState(false);
  const [recipeText, setRecipeText] = useState("");
  const [recipeLoading, setRecipeLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 加载今日营养数据
  const loadNutrition = useCallback(async () => {
    try {
      const data = await apiNutrition();
      setNutrition(data);
    } catch {
      // API 未连接时显示默认数据
      setNutrition({
        total_calories: 0, total_protein: 0, total_fat: 0,
        total_carbs: 0, total_fiber: 0, meal_count: 0,
        targets: { calories: 1800, fat: 30, carbs: 200, protein: 60, fiber: 25 },
        percentages: { calories: 0, fat: 0, carbs: 0, protein: 0, fiber: 0 },
        warnings: [],
      });
    }
  }, []);

  useEffect(() => {
    loadNutrition();
  }, [loadNutrition]);

  // 发送消息
  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setLoading(true);

    const newUserMessage: ChatMessage = { role: "user", content: userMsg };
    setMessages((prev) => [...prev, newUserMessage]);

    try {
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const data = await apiChat(userMsg, history);

      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: data.reply,
        sources: data.sources,
        has_recording: data.has_recording,
        records: data.records,
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // 如果有记录行为，刷新营养数据
      if (data.has_recording && data.nutrition_summary) {
        setNutrition(data.nutrition_summary);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "抱歉，我暂时无法回复。请检查后端服务是否正在运行。",
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  // 食谱推荐
  const loadRecipe = async () => {
    setShowRecipe(true);
    setRecipeLoading(true);
    try {
      const data = await apiRecipe();
      setRecipeText(data.recipe);
    } catch {
      setRecipeText("食谱生成失败，请检查后端服务。");
    } finally {
      setRecipeLoading(false);
    }
  };

  // 快捷操作
  const quickAction = (text: string) => {
    setInput(text);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="app-container">
      {/* Header */}
      <div className="app-header">
        <div>
          <h1>🥗 EatSmart 健康管家</h1>
          <div className="subtitle">糖尿病 + 胰腺炎康复期 · AI 饮食管理</div>
        </div>
        <div className="header-actions">
          <button className="header-btn" onClick={loadRecipe}>
            🍽️ 食谱
          </button>
        </div>
      </div>

      <div className="main-area">
        {/* Chat Section */}
        <div className="chat-section">
          <div className="disclaimer">
            ⚕️ 本系统仅供参考，具体饮食方案请遵循主治医生的医嘱
          </div>

          <div className="chat-messages">
            {messages.length === 0 && (
              <div className="welcome">
                <div className="welcome-icon">🥗</div>
                <h2>你好呀！</h2>
                <p>
                  我是你的健康管家，可以帮你记录饮食、回答健康问题、推荐食谱。
                  有什么可以帮你的？
                </p>
                <div className="quick-actions">
                  <button
                    className="quick-action-btn"
                    onClick={() => quickAction("我今天中午吃了一碗面条和一个水煮蛋")}
                  >
                    📝 记录饮食
                  </button>
                  <button
                    className="quick-action-btn"
                    onClick={() => quickAction("我能不能吃红烧肉？")}
                  >
                    ❓ 饮食咨询
                  </button>
                  <button
                    className="quick-action-btn"
                    onClick={() => quickAction("今天散步了30分钟")}
                  >
                    🏃 记录运动
                  </button>
                  <button
                    className="quick-action-btn"
                    onClick={() => quickAction("今天空腹血糖6.5")}
                  >
                    💉 记录血糖
                  </button>
                  <button className="quick-action-btn" onClick={loadRecipe}>
                    🍽️ 推荐食谱
                  </button>
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={`message ${msg.role}`}>
                <div className="message-avatar">
                  {msg.role === "user" ? "👤" : "🤖"}
                </div>
                <div>
                  <div className="message-content">
                    {msg.content}
                    {msg.has_recording && (
                      <div className="record-badge">✅ 已记录到记忆库</div>
                    )}
                  </div>
                  {msg.role === "assistant" && msg.sources && (
                    <CitationPanel sources={msg.sources} />
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="message assistant">
                <div className="message-avatar">🤖</div>
                <div className="message-content">
                  <div className="loading-dots">
                    <span /><span /><span />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="chat-input-area">
            <div className="chat-input-wrapper">
              <input
                ref={inputRef}
                className="chat-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="告诉我你吃了什么，或者问我健康问题..."
                disabled={loading}
              />
              <button
                className="send-btn"
                onClick={sendMessage}
                disabled={!input.trim() || loading}
              >
                ↑
              </button>
            </div>
          </div>
        </div>

        {/* Nutrition Side Panel */}
        <div className={`side-panel ${panelCollapsed ? "collapsed" : ""}`}>
          <div
            className="panel-header"
            onClick={() => setPanelCollapsed(!panelCollapsed)}
          >
            <h2>📊 今日营养摄入</h2>
            <button className="panel-toggle">
              {panelCollapsed ? "展开" : "收起"}
            </button>
          </div>

          {!panelCollapsed && nutrition && (
            <>
              <div className="nutrition-bars">
                <NutritionBar
                  name="🔥 热量"
                  current={nutrition.total_calories}
                  target={nutrition.targets?.calories || 1800}
                  percentage={nutrition.percentages?.calories || 0}
                  colorClass="calories"
                  unit="kcal"
                />
                <NutritionBar
                  name="🫒 脂肪"
                  current={nutrition.total_fat}
                  target={nutrition.targets?.fat || 30}
                  percentage={nutrition.percentages?.fat || 0}
                  colorClass="fat"
                  unit="g"
                />
                <NutritionBar
                  name="🍚 碳水"
                  current={nutrition.total_carbs}
                  target={nutrition.targets?.carbs || 200}
                  percentage={nutrition.percentages?.carbs || 0}
                  colorClass="carbs"
                  unit="g"
                />
                <NutritionBar
                  name="🥩 蛋白质"
                  current={nutrition.total_protein}
                  target={nutrition.targets?.protein || 60}
                  percentage={nutrition.percentages?.protein || 0}
                  colorClass="protein"
                  unit="g"
                />
                <NutritionBar
                  name="🌾 膳食纤维"
                  current={nutrition.total_fiber}
                  target={nutrition.targets?.fiber || 25}
                  percentage={nutrition.percentages?.fiber || 0}
                  colorClass="fiber"
                  unit="g"
                />
              </div>

              {nutrition.warnings && nutrition.warnings.length > 0 && (
                <div className="nutrition-warnings">
                  {nutrition.warnings.map((w, i) => (
                    <div
                      key={i}
                      className={`warning-item ${w.includes("超标") ? "danger" : ""
                        }`}
                    >
                      {w}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Recipe Modal */}
      {showRecipe && (
        <RecipeModal
          recipe={recipeText}
          loading={recipeLoading}
          onClose={() => setShowRecipe(false)}
          onRefresh={loadRecipe}
        />
      )}
    </div>
  );
}
