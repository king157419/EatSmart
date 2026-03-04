import { useState } from "react";
import { useSwipeable } from "react-swipeable";
import type { MealRecord, ExerciseRecord } from "../../types";

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
  const [swipedMealId, setSwipedMealId] = useState<number | null>(null);
  const [swipedExerciseId, setSwipedExerciseId] = useState<number | null>(null);

  const handleMealSwipe = (mealId: number) => {
    setSwipedMealId(mealId);
    setTimeout(() => setSwipedMealId(null), 3000);
  };

  const handleExerciseSwipe = (exerciseId: number) => {
    setSwipedExerciseId(exerciseId);
    setTimeout(() => setSwipedExerciseId(null), 3000);
  };

  return (
    <div className="recipe-modal-overlay" onClick={onClose}>
      <div className="recipe-card history-card" onClick={(e) => e.stopPropagation()}>
        <h2>📋 今日记录</h2>

        <div className="history-section">
          <h3>🍽️ 饮食记录 ({meals.length} 条)</h3>
          {meals.length === 0 ? (
            <p className="empty-hint">暂无记录</p>
          ) : (
            <ul className="history-list">
              {meals.map((m) => {
                const swipeHandlers = useSwipeable({
                  onSwipedLeft: () => handleMealSwipe(m.id),
                  preventScrollOnSwipe: true,
                  trackMouse: false,
                });

                return (
                  <li
                    key={m.id}
                    {...swipeHandlers}
                    className={`swipeable-item ${swipedMealId === m.id ? 'swiping' : ''}`}
                  >
                    <span className="meal-type">{m.meal_type}</span>
                    <span className="food-name">{m.food_name}</span>
                    <span className="calories">{m.calories.toFixed(0)} kcal</span>
                    <button
                      className="delete-btn"
                      onClick={() => onDeleteMeal(m.id)}
                      title="删除此记录"
                    >
                      ×
                    </button>
                  </li>
                );
              })}
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
              {exercises.map((e) => {
                const swipeHandlers = useSwipeable({
                  onSwipedLeft: () => handleExerciseSwipe(e.id),
                  preventScrollOnSwipe: true,
                  trackMouse: false,
                });

                return (
                  <li
                    key={e.id}
                    {...swipeHandlers}
                    className={`swipeable-item ${swipedExerciseId === e.id ? 'swiping' : ''}`}
                  >
                    <span className="exercise-type">{e.exercise_type}</span>
                    <span className="duration">{e.duration_min} 分钟</span>
                    <button
                      className="delete-btn"
                      onClick={() => onDeleteExercise(e.id)}
                      title="删除此记录"
                    >
                      ×
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <button className="close-btn" onClick={onClose}>关闭</button>
      </div>
    </div>
  );
}
