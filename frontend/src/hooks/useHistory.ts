import { useState, useCallback } from "react";
import type { MealRecord, ExerciseRecord } from "../types";
import { apiGetMealsToday, apiDeleteMeal, apiDeleteExercise } from "../services/api";

export function useHistory() {
  const [todayMeals, setTodayMeals] = useState<MealRecord[]>([]);
  const [todayExercises, setTodayExercises] = useState<ExerciseRecord[]>([]);

  const loadHistory = useCallback(async () => {
    try {
      const data = await apiGetMealsToday();
      setTodayMeals(data.meals || []);
      // TODO: Add exercise API
      setTodayExercises([]);
    } catch (error) {
      throw new Error("加载历史记录失败");
    }
  }, []);

  const handleDeleteMeal = useCallback(
    async (mealId: number) => {
      try {
        await apiDeleteMeal(mealId);
        setTodayMeals((prev) => prev.filter((m) => m.id !== mealId));
        return true;
      } catch {
        throw new Error("删除饮食记录失败");
      }
    },
    []
  );

  const handleDeleteExercise = useCallback(
    async (exerciseId: number) => {
      try {
        await apiDeleteExercise(exerciseId);
        setTodayExercises((prev) => prev.filter((e) => e.id !== exerciseId));
        return true;
      } catch {
        throw new Error("删除运动记录失败");
      }
    },
    []
  );

  return {
    todayMeals,
    todayExercises,
    loadHistory,
    handleDeleteMeal,
    handleDeleteExercise,
  };
}
