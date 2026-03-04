import { useState, useCallback } from "react";
import { apiRecipe } from "../services/api";

export function useRecipe() {
  const [recipeText, setRecipeText] = useState("");
  const [recipeLoading, setRecipeLoading] = useState(false);

  const loadRecipe = useCallback(async (forceNew: boolean = false) => {
    setRecipeLoading(true);
    try {
      const data = await apiRecipe(forceNew ? "new" : "");
      setRecipeText(data.recipe);
    } catch {
      setRecipeText("食谱生成失败，请检查后端服务。");
    } finally {
      setRecipeLoading(false);
    }
  }, []);

  return {
    recipeText,
    recipeLoading,
    loadRecipe,
  };
}
