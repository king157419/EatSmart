import { useState, useCallback } from "react";
import type { FoodCategory } from "../types";
import { apiFoodOptions } from "../services/api";

export function useFoodOptions() {
  const [foodCategories, setFoodCategories] = useState<FoodCategory[]>([]);

  const loadFoodOptions = useCallback(async () => {
    try {
      const data = await apiFoodOptions();
      if (data.categories && data.categories.length > 0) {
        setFoodCategories(data.categories);
        return true;
      } else {
        throw new Error("暂无食物选项数据");
      }
    } catch (error) {
      console.error("加载食物选项失败:", error);
      throw error;
    }
  }, []);

  return {
    foodCategories,
    loadFoodOptions,
  };
}
