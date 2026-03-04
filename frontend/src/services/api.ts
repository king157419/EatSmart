// ============================================================
// API Service Layer - Centralized API calls
// ============================================================

import type {
  ChatMessage,
  NutritionSummary,
  FoodOptionsResponse,
  SelectedFood,
  MealRecord,
  ExerciseRecord,
  Source,
  ChatSession,
  ChatMessageDB,
  DailyNutrition,
  NutritionStats,
  AdminStats,
} from "../types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

// ============================================================
// Stream Callbacks Interface
// ============================================================
export interface StreamCallbacks {
  onPrepare: (message: string) => void;
  onSources: (sources: Source[]) => void;
  onContent: (delta: string) => void;
  onDone: (data: {
    nutrition_summary?: NutritionSummary;
    records?: Array<{
      type: string;
      data: Record<string, unknown>;
      message?: string;
      nutrition?: { calories?: number };
    }>;
    has_recording?: boolean;
  }) => void;
  onError: (error: string) => void;
}

// ============================================================
// Chat APIs
// ============================================================
export async function apiChat(
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

export async function apiChatStream(
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
            // Ignore parse errors
          }
        }
      }
    }
  } catch {
    callbacks.onError("网络请求失败");
  }
}

// ============================================================
// Nutrition APIs
// ============================================================
export async function apiNutrition(): Promise<NutritionSummary> {
  const res = await fetch(`${API_BASE}/api/nutrition/today`);
  if (!res.ok) throw new Error("获取营养数据失败");
  return res.json();
}

// ============================================================
// Recipe APIs
// ============================================================
export async function apiRecipe(
  preferences: string = ""
): Promise<{ recipe: string }> {
  const res = await fetch(`${API_BASE}/api/recipe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ preferences }),
  });
  if (!res.ok) throw new Error("食谱生成失败");
  return res.json();
}

// ============================================================
// Meal & Exercise Record APIs
// ============================================================
export async function apiGetMealsToday(): Promise<{ meals: MealRecord[] }> {
  const res = await fetch(`${API_BASE}/api/meals/today`);
  if (!res.ok) throw new Error("获取饮食记录失败");
  return res.json();
}

export async function apiDeleteMeal(mealId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/meal/${mealId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("删除饮食记录失败");
}

export async function apiDeleteExercise(exerciseId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/exercise/${exerciseId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("删除运动记录失败");
}

// ============================================================
// Food Options APIs
// ============================================================
export async function apiFoodOptions(): Promise<FoodOptionsResponse> {
  const res = await fetch(`${API_BASE}/api/food-options`);
  if (!res.ok) throw new Error(`API返回 ${res.status}`);
  return res.json();
}

export async function apiQuickRecord(
  mealType: string,
  foods: SelectedFood[]
): Promise<{ recorded: boolean }> {
  const res = await fetch(`${API_BASE}/api/quick-record`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      meal_type: mealType,
      foods: foods.map((f) => ({ name: f.name, portion: f.portion })),
    }),
  });
  if (!res.ok) throw new Error("快捷记录失败");
  return res.json();
}

// ============================================================
// Chat History APIs
// ============================================================
export async function apiGetChatSessions(): Promise<ChatSession[]> {
  const res = await fetch(`${API_BASE}/api/chat/sessions`);
  if (!res.ok) throw new Error("获取会话列表失败");
  const data = await res.json();
  return data.sessions;
}

export async function apiGetChatSession(sessionId: number): Promise<ChatMessageDB[]> {
  const res = await fetch(`${API_BASE}/api/chat/session/${sessionId}`);
  if (!res.ok) throw new Error("获取会话详情失败");
  const data = await res.json();
  return data.messages;
}

export async function apiDeleteChatSession(sessionId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/chat/session/${sessionId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("删除会话失败");
}

export async function apiGetTodaySession(): Promise<ChatSession> {
  const res = await fetch(`${API_BASE}/api/chat/session/today`);
  if (!res.ok) throw new Error("获取今日会话失败");
  return res.json();
}

export async function apiSaveChatMessage(
  sessionId: number,
  role: string,
  content: string,
  sources?: Source[],
  hasRecording?: boolean,
  records?: any[]
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/chat/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: sessionId,
      role,
      content,
      sources,
      has_recording: hasRecording,
      records,
    }),
  });
  if (!res.ok) throw new Error("保存消息失败");
}

// ============================================================
// Nutrition Trends APIs
// ============================================================
export async function apiNutritionRange(
  startDate: string,
  endDate: string
): Promise<DailyNutrition[]> {
  const res = await fetch(
    `${API_BASE}/api/nutrition/range?start=${startDate}&end=${endDate}`
  );
  if (!res.ok) throw new Error("获取营养趋势失败");
  const data = await res.json();
  return data.data;
}

export async function apiNutritionStats(days: number): Promise<NutritionStats> {
  const res = await fetch(`${API_BASE}/api/nutrition/stats?days=${days}`);
  if (!res.ok) throw new Error("获取营养统计失败");
  return res.json();
}

// ============================================================
// Admin APIs
// ============================================================
export async function apiAdminVerify(password: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/api/admin/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) throw new Error("验证失败");
  const data = await res.json();
  return data.valid;
}

export async function apiAdminStats(password: string): Promise<AdminStats> {
  const res = await fetch(`${API_BASE}/api/admin/stats`, {
    headers: { "x-admin-password": password },
  });
  if (!res.ok) throw new Error("获取统计失败");
  return res.json();
}

export async function apiAdminReloadKnowledge(password: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/knowledge/reload`, {
    method: "POST",
    headers: { "x-admin-password": password },
  });
  if (!res.ok) throw new Error("重载知识库失败");
}
