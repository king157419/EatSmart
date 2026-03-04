import type { FoodCategory } from "../../types";

interface FoodOptionsModalProps {
  categories: FoodCategory[];
  onClose: () => void;
  onStartRecord: () => void;
}

export default function FoodOptionsModal({
  categories,
  onClose,
  onStartRecord,
}: FoodOptionsModalProps) {
  return (
    <div className="recipe-modal-overlay" onClick={onClose}>
      <div className="recipe-card food-options-card" onClick={(e) => e.stopPropagation()}>
        <h2>📝 记录饮食</h2>
        <p className="food-options-hint">从食物库选择，快速记录营养数据</p>

        <div className="food-categories">
          {categories.map((cat, idx) => (
            <div key={idx} className="food-category">
              <h3>{cat.emoji} {cat.name}</h3>
              <div className="food-grid">
                {cat.foods.map((food, fidx) => (
                  <div key={fidx} className="food-option-card">
                    <div className="food-name">{food.name}</div>
                    <div className="food-nutrition">
                      <span>{food.calories.toFixed(0)} kcal</span>
                      <span>脂肪 {food.fat.toFixed(1)}g</span>
                    </div>
                    <div className="food-portion">{food.portion_default}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="food-options-actions">
          <button className="btn-secondary" onClick={onClose}>关闭</button>
          <button className="btn-primary" onClick={onStartRecord}>✅ 开始选择</button>
        </div>
      </div>
    </div>
  );
}
