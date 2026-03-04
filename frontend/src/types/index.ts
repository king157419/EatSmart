// ============================================================
// Type Definitions for EatSmart Frontend
// ============================================================

export interface Source {
  file: string;
  content: string;
  relevance: number;
}

export interface NutritionSummary {
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

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  has_recording?: boolean;
  records?: Array<{
    type: string;
    data: Record<string, unknown>;
    message?: string;
    nutrition?: { calories?: number };
  }>;
}

export interface FoodOption {
  name: string;
  calories: number;
  fat: number;
  carbs: number;
  protein: number;
  portion_default: string;
  portion_grams: number;
}

export interface FoodCategory {
  name: string;
  emoji: string;
  foods: FoodOption[];
}

export interface FoodOptionsResponse {
  categories: FoodCategory[];
  meal_types: string[];
}

export interface SelectedFood {
  name: string;
  portion: string;
  calories: number;
  fat: number;
  carbs: number;
  protein: number;
}

export interface MealRecord {
  id: number;
  meal_type: string;
  food_name: string;
  calories: number;
  created_at: string;
}

export interface ExerciseRecord {
  id: number;
  exercise_type: string;
  duration_min: number;
  created_at: string;
}

// ============================================================
// Chat History Types
// ============================================================

export interface ChatSession {
  id: number;
  session_date: string;
  created_at: string;
  title: string;
  message_count: number;
}

export interface ChatMessageDB extends ChatMessage {
  id: number;
  session_id: number;
  created_at: string;
}

// ============================================================
// Nutrition Trends Types
// ============================================================

export interface DailyNutrition {
  date: string;
  calories: number;
  fat: number;
  carbs: number;
  protein: number;
  fiber: number;
}

export interface NutritionStats {
  avg_calories: number;
  avg_fat: number;
  avg_carbs: number;
  avg_protein: number;
  max_fat: number;
  days_over_fat_limit: number;
}

// ============================================================
// Admin Types
// ============================================================

export interface AdminStats {
  total_meals: number;
  total_exercises: number;
  total_sessions: number;
  total_messages: number;
  db_size_mb: number;
}
