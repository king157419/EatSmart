import type { MealRecord, ExerciseRecord } from "../../types";
import SwipeableListItem from "./SwipeableListItem";

interface HistoryModalProps {
  meals: MealRecord[];
  exercises: ExerciseRecord[];
  onClose: () => void;
  onDeleteMeal: (mealId: number) => void;
  onDeleteExercise: (exerciseId: number) => void;
}

export default function HistoryModal({
  meals,
  exercises,
  onClose,
  onDeleteMeal,
  onDeleteExercise,
}: HistoryModalProps) {
  const totalCalories = meals.reduce((sum, m) => sum + m.calories, 0);

  return (
    <div className="recipe-modal-overlay" onClick={onClose}>
      <div className="recipe-card history-card" onClick={(e) => e.stopPropagation()}>
        <h2>📋 查看记录</h2>

        <div className="history-section">
          <h3>🍽️ 饮食记录 ({meals.length} 条)</h3>
          {meals.length === 0 ? (
            <p className="empty-hint">暂无记录</p>
          ) : (
            <ul className="history-list">
              {meals.map((m) => (
                <SwipeableListItem
                  key={m.id}
                  onDelete={() => onDeleteMeal(m.id)}
                >
                  <span className="meal-type">{m.meal_type}</span>
                  <span className="food-name">{m.food_name}</span>
                  <span className="calories">{m.calories.toFixed(0)} kcal</span>
                </SwipeableListItem>
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
                <SwipeableListItem
                  key={e.id}
                  onDelete={() => onDeleteExercise(e.id)}
                >
                  <span className="exercise-type">{e.exercise_type}</span>
                  <span className="duration">{e.duration_min} 分钟</span>
                </SwipeableListItem>
              ))}
            </ul>
          )}
        </div>

        <button className="close-btn" onClick={onClose}>关闭</button>
      </div>
    </div>
  );
}
