import type { NutritionSummary } from "../../types";
import NutritionBar from "../Nutrition/NutritionBar";

interface NutritionModalProps {
  nutrition: NutritionSummary | null;
  onClose: () => void;
}

export default function NutritionModal({
  nutrition,
  onClose,
}: NutritionModalProps) {
  return (
    <div className="recipe-modal-overlay" onClick={onClose}>
      <div className="recipe-card nutrition-modal-card" onClick={(e) => e.stopPropagation()}>
        <h2>📊 今日营养进度</h2>
        {nutrition && (
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
                    className={`warning-item ${w.includes("超标") ? "danger" : ""}`}
                  >
                    {w}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        <button className="close-btn" onClick={onClose}>关闭</button>
      </div>
    </div>
  );
}
