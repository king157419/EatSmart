import { useState, useEffect, useCallback } from "react";
import type { NutritionSummary } from "../types";
import { apiNutrition } from "../services/api";

export function useNutrition() {
  const [nutrition, setNutrition] = useState<NutritionSummary | null>(null);

  const loadNutrition = useCallback(async () => {
    try {
      const data = await apiNutrition();
      setNutrition(data);
    } catch {
      // API not connected, show default data
      setNutrition({
        total_calories: 0,
        total_protein: 0,
        total_fat: 0,
        total_carbs: 0,
        total_fiber: 0,
        meal_count: 0,
        targets: { calories: 1800, fat: 30, carbs: 200, protein: 60, fiber: 25 },
        percentages: { calories: 0, fat: 0, carbs: 0, protein: 0, fiber: 0 },
        warnings: [],
      });
    }
  }, []);

  useEffect(() => {
    loadNutrition();
  }, [loadNutrition]);

  return {
    nutrition,
    loadNutrition,
  };
}
