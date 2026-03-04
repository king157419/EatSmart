import { useState } from "react";
import type { FoodCategory, FoodOption, SelectedFood } from "../../types";

interface QuickRecordModalProps {
  categories: FoodCategory[];
  onClose: () => void;
  onSubmit: (mealType: string, foods: SelectedFood[]) => void;
}

export default function QuickRecordModal({
  categories,
  onClose,
  onSubmit,
}: QuickRecordModalProps) {
  const [mealType, setMealType] = useState("午餐");
  const [selectedFoods, setSelectedFoods] = useState<SelectedFood[]>([]);

  const mealTypes = ["早餐", "午餐", "晚餐", "加餐"];

  const toggleFood = (food: FoodOption) => {
    setSelectedFoods((prev) => {
      const exists = prev.find((f) => f.name === food.name);
      if (exists) {
        return prev.filter((f) => f.name !== food.name);
      }
      return [
        ...prev,
        {
          name: food.name,
          portion: food.portion_default,
          calories: food.calories,
          fat: food.fat,
          carbs: food.carbs,
          protein: food.protein,
        },
      ];
    });
  };

  const isSelected = (name: string) => selectedFoods.some((f) => f.name === name);

  const totalCalories = selectedFoods.reduce((sum, f) => sum + f.calories, 0);
  const totalFat = selectedFoods.reduce((sum, f) => sum + f.fat, 0);

  const fatWarning = totalFat > 10;

  const handleSubmit = () => {
    if (selectedFoods.length > 0) {
      onSubmit(mealType, selectedFoods);
    }
  };

  return (
    <div className="recipe-modal-overlay" onClick={onClose}>
      <div className="recipe-card quick-record-card" onClick={(e) => e.stopPropagation()}>
        <h2>📝 选择食物</h2>

        {/* Meal type selector */}
        <div className="meal-type-selector">
          {mealTypes.map((t) => (
            <button
              key={t}
              className={`meal-type-btn ${mealType === t ? "active" : ""}`}
              onClick={() => setMealType(t)}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Food selection */}
        <div className="food-categories selectable">
          {categories.map((cat, idx) => (
            <div key={idx} className="food-category">
              <h3>{cat.emoji} {cat.name}</h3>
              <div className="food-grid">
                {cat.foods.map((food, fidx) => (
                  <div
                    key={fidx}
                    className={`food-option-card ${isSelected(food.name) ? "selected" : ""}`}
                    onClick={() => toggleFood(food)}
                  >
                    <div className="food-checkbox">{isSelected(food.name) ? "☑" : "☐"}</div>
                    <div className="food-name">{food.name}</div>
                    <div className="food-nutrition">
                      <span>{food.calories.toFixed(0)} kcal</span>
                      <span>脂肪 {food.fat.toFixed(1)}g</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Nutrition preview */}
        <div className={`nutrition-preview ${fatWarning ? "fat-warning" : ""}`}>
          <span>📊 预估: {totalCalories.toFixed(0)} kcal</span>
          <span>| 脂肪 {totalFat.toFixed(1)}g</span>
          {fatWarning && <span className="warning-text"> ⚠️ 脂肪较高</span>}
        </div>

        <div className="food-options-actions">
          <button className="btn-secondary" onClick={onClose}>取消</button>
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={selectedFoods.length === 0}
          >
            ✅ 记录 {selectedFoods.length} 项
          </button>
        </div>
      </div>
    </div>
  );
}
