"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import MarkdownRenderer from "../components/MarkdownRenderer";
import { exportToImage, exportToPDF } from "../utils/export";

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
// 使用相对路径，由 Next.js rewrite 代理到后端
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

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

interface StreamCallbacks {
  onPrepare: (message: string) => void;
  onSources: (sources: Source[]) => void;
  onContent: (delta: string) => void;
  onDone: (data: { nutrition_summary?: NutritionSummary; records?: Array<{ type: string; data: Record<string, unknown> }>; has_recording?: boolean }) => void;
  onError: (error: string) => void;
}

async function apiChatStream(
  message: string,
  history: Array<{ role: string; content: string }>,
  callbacks: StreamCallbacks
) {
  try {
    const res = await fetch(`${API_BASE}/api/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, conversation_history: history }),
    });

    if (!res.ok) {
      callbacks.onError("API 请求失败");
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) {
      callbacks.onError("无法读取响应流");
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));
            switch (data.type) {
              case "prepare":
                callbacks.onPrepare(data.message);
                break;
              case "sources":
                callbacks.onSources(data.sources);
                break;
              case "content":
                callbacks.onContent(data.delta);
                break;
              case "done":
                callbacks.onDone(data);
                break;
            }
          } catch {
            // 忽略解析错误
          }
        }
      }
    }
  } catch {
    callbacks.onError("网络请求失败");
  }
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

async function apiSaveRecipe(content: string, title: string = "") {
  const res = await fetch(`${API_BASE}/api/recipe/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, title }),
  });
  if (!res.ok) throw new Error("保存失败");
  return res.json();
}

// ============================================================
// Sub-components
// ============================================================

// Toast 通知组件
function Toast({
  message,
  type = "success",
  onClose
}: {
  message: string;
  type?: "success" | "warning" | "error";
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = { success: "✅", warning: "⚠️", error: "❌" };
  return (
    <div className={`toast toast-${type}`}>
      <span>{icons[type]} {message}</span>
      <button onClick={onClose}>×</button>
    </div>
  );
}

// 获取进度条颜色类名
function getProgressColorClass(percentage: number, isFat: boolean = false): string {
  if (isFat && percentage > 100) return "danger";  // 脂肪超标是危险
  if (percentage > 100) return "warning";           // 其他超标是警告
  if (percentage > 80) return "caution";            // 接近上限
  return "ok";                                       // 正常
}

function NutritionBar({
  name,
  current,
  target,
  percentage,
  unit,
  isFat = false,
}: {
  name: string;
  current: number;
  target: number;
  percentage: number;
  unit: string;
  isFat?: boolean;
}) {
  const isOver = percentage > 100;
  const colorClass = getProgressColorClass(percentage, isFat);
  return (
    <div className="nutrition-item">
      <div className="nutrition-label">
        <span className="name">{name}</span>
        <span className="value">
          {current.toFixed(1)}/{target}
          {unit} ({percentage.toFixed(0)}%)
          {isOver && isFat && <span className="danger-text"> ⚠️超标!</span>}
        </span>
      </div>
      <div className="progress-bar">
        <div
          className={`progress-fill ${colorClass}`}
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

// 历史记录 Modal
interface MealRecord {
  id: number;
  meal_type: string;
  food_name: string;
  calories: number;
  created_at: string;
}

interface ExerciseRecord {
  id: number;
  exercise_type: string;
  duration_min: number;
  created_at: string;
}

function HistoryModal({
  meals,
  exercises,
  onClose,
}: {
  meals: MealRecord[];
  exercises: ExerciseRecord[];
  onClose: () => void;
}) {
  const totalCalories = meals.reduce((sum, m) => sum + m.calories, 0);

  return (
    <div className="recipe-modal-overlay" onClick={onClose}>
      <div className="recipe-card history-card" onClick={(e) => e.stopPropagation()}>
        <h2>📋 今日记录</h2>

        <div className="history-section">
          <h3>🍽️ 饮食记录 ({meals.length} 条)</h3>
          {meals.length === 0 ? (
            <p className="empty-hint">暂无记录</p>
          ) : (
            <ul className="history-list">
              {meals.map((m) => (
                <li key={m.id}>
                  <span className="meal-type">{m.meal_type}</span>
                  <span className="food-name">{m.food_name}</span>
                  <span className="calories">{m.calories.toFixed(0)} kcal</span>
                </li>
              ))}
            </ul>
          )}
          <div className="history-total">
            总计: {totalCalories.toFixed(0)} kcal
          </div>
        </div>

        <div className="history-section">
          <h3>🏃 运动记录 ({exercises.length} 条)</h3>
          {exercises.length === 0 ? (
            <p className="empty-hint">暂无记录</p>
          ) : (
            <ul className="history-list">
              {exercises.map((e) => (
                <li key={e.id}>
                  <span className="exercise-type">{e.exercise_type}</span>
                  <span className="duration">{e.duration_min} 分钟</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button className="close-btn" onClick={onClose}>关闭</button>
      </div>
    </div>
  );
}

function RecipeModal({
  recipe,
  loading,
  saved,
  onClose,
  onRefresh,
  onSave,
  onExportImage,
  onExportPDF,
  recipeRef,
}: {
  recipe: string;
  loading: boolean;
  saved: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onSave: () => void;
  onExportImage: () => void;
  onExportPDF: () => void;
  recipeRef: React.RefObject<HTMLDivElement | null>;
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
          <div className="recipe-content" ref={recipeRef}>
            <MarkdownRenderer content={recipe} />
          </div>
        )}
        <div className="recipe-actions">
          <div className="recipe-actions-left">
            <button className="btn-icon" onClick={onExportImage} title="导出图片">
              🖼️
            </button>
            <button className="btn-icon" onClick={onExportPDF} title="导出PDF">
              📄
            </button>
            <button
              className={`btn-icon ${saved ? "saved" : ""}`}
              onClick={onSave}
              disabled={saved}
              title={saved ? "已保存" : "保存"}
            >
              {saved ? "✅" : "💾"}
            </button>
          </div>
          <div className="recipe-actions-right">
            <button className="btn-secondary" onClick={onRefresh}>
              🔄 换一套
            </button>
            <button className="btn-primary" onClick={onClose}>
              👍 好的
            </button>
          </div>
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
  const [recipeSaved, setRecipeSaved] = useState(false);

  // 新增状态
  const [toast, setToast] = useState<{ message: string; type: "success" | "warning" | "error" } | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [todayMeals, setTodayMeals] = useState<MealRecord[]>([]);
  const [todayExercises, setTodayExercises] = useState<ExerciseRecord[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recipeContentRef = useRef<HTMLDivElement>(null);

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

    // 创建占位的助手消息
    const assistantMsgIndex = messages.length + 1;
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "", sources: [] },
    ]);

    const history = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    await apiChatStream(userMsg, history, {
      onPrepare: () => {
        // 可以显示加载状态，但我们已经有了占位消息
      },
      onSources: (sources) => {
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
        if (data.has_recording && data.nutrition_summary) {
          setNutrition(data.nutrition_summary);
          // 显示 Toast 通知
          if (data.records && data.records.length > 0) {
            const record = data.records[0];
            if (record.message) {
              setToast({ message: record.message, type: "success" });
            } else if (record.type === "record_meal") {
              const food = record.data?.food || "食物";
              const calories = record.nutrition?.calories || 0;
              setToast({ message: `已记录: ${food} (${calories.toFixed(0)} kcal)`, type: "success" });
            } else if (record.type?.includes("delete")) {
              setToast({ message: record.message || "已删除记录", type: "success" });
            }
          }
        }
        setLoading(false);
        inputRef.current?.focus();
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
  };

  // 食谱推荐
  const loadRecipe = async (forceNew: boolean = false) => {
    setShowRecipe(true);
    setRecipeLoading(true);
    setRecipeSaved(false);
    try {
      const data = await apiRecipe(forceNew ? "new" : "");
      setRecipeText(data.recipe);
      setRecipeSaved(data.saved || false);
    } catch {
      setRecipeText("食谱生成失败，请检查后端服务。");
    } finally {
      setRecipeLoading(false);
    }
  };

  // 保存食谱
  const saveRecipeHandler = async () => {
    if (!recipeText || recipeSaved) return;
    try {
      await apiSaveRecipe(recipeText, "今日食谱");
      setRecipeSaved(true);
    } catch {
      alert("保存失败，请重试");
    }
  };

  // 加载今日历史记录
  const loadHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/meals/today`);
      const data = await res.json();
      setTodayMeals(data.meals || []);
      // TODO: 添加运动记录 API
      setTodayExercises([]);
      setShowHistory(true);
    } catch {
      setToast({ message: "加载历史记录失败", type: "error" });
    }
  };

  // 导出为图片
  const exportImageHandler = async () => {
    if (!recipeContentRef.current) return;
    try {
      await exportToImage(recipeContentRef.current, `eatsmart-recipe-${new Date().toISOString().slice(0, 10)}`);
    } catch {
      alert("导出图片失败");
    }
  };

  // 导出为PDF
  const exportPDFHandler = async () => {
    if (!recipeContentRef.current) return;
    try {
      await exportToPDF(recipeContentRef.current, `eatsmart-recipe-${new Date().toISOString().slice(0, 10)}`);
    } catch {
      alert("导出PDF失败");
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
          <button className="header-btn" onClick={loadHistory}>
            📋 记录
          </button>
          <button className="header-btn" onClick={() => loadRecipe()}>
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
                  <button className="quick-action-btn" onClick={() => loadRecipe()}>
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
                    {msg.role === "assistant" && !msg.content ? (
                      <div className="loading-dots">
                        <span /><span /><span />
                      </div>
                    ) : (
                      <MarkdownRenderer content={msg.content} />
                    )}
                    {msg.has_recording && (
                      <div className="record-badge">✅ 已记录到记忆库</div>
                    )}
                  </div>
                  {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                    <CitationPanel sources={msg.sources} />
                  )}
                </div>
              </div>
            ))}

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
                  unit="kcal"
                />
                <NutritionBar
                  name="🫒 脂肪"
                  current={nutrition.total_fat}
                  target={nutrition.targets?.fat || 30}
                  percentage={nutrition.percentages?.fat || 0}
                  unit="g"
                  isFat={true}
                />
                <NutritionBar
                  name="🍚 碳水"
                  current={nutrition.total_carbs}
                  target={nutrition.targets?.carbs || 200}
                  percentage={nutrition.percentages?.carbs || 0}
                  unit="g"
                />
                <NutritionBar
                  name="🥩 蛋白质"
                  current={nutrition.total_protein}
                  target={nutrition.targets?.protein || 60}
                  percentage={nutrition.percentages?.protein || 0}
                  unit="g"
                />
                <NutritionBar
                  name="🌾 膳食纤维"
                  current={nutrition.total_fiber}
                  target={nutrition.targets?.fiber || 25}
                  percentage={nutrition.percentages?.fiber || 0}
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
          saved={recipeSaved}
          onClose={() => setShowRecipe(false)}
          onRefresh={() => loadRecipe(true)}
          onSave={saveRecipeHandler}
          onExportImage={exportImageHandler}
          onExportPDF={exportPDFHandler}
          recipeRef={recipeContentRef}
        />
      )}

      {/* History Modal */}
      {showHistory && (
        <HistoryModal
          meals={todayMeals}
          exercises={todayExercises}
          onClose={() => setShowHistory(false)}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
