import { useState } from "react";
import type { NutritionSummary } from "../../types";
import NutritionBar from "./NutritionBar";
import NutritionChart from "./NutritionChart";
import { useNutritionTrends } from "../../hooks/useNutritionTrends";

interface NutritionPanelProps {
  nutrition: NutritionSummary | null;
  collapsed: boolean;
  onToggle: () => void;
}

export default function NutritionPanel({
  nutrition,
  collapsed,
  onToggle,
}: NutritionPanelProps) {
  const [showTrends, setShowTrends] = useState(false);
  const [trendDays, setTrendDays] = useState(7);
  const { data, stats, loading } = useNutritionTrends(trendDays);

  return (
    <div className={`side-panel desktop-only ${collapsed ? "collapsed" : ""}`}>
      <div className="panel-header" onClick={onToggle}>
        <h2>📊 今日营养摄入</h2>
        <button className="panel-toggle">
          {collapsed ? "展开" : "收起"}
        </button>
      </div>

      {!collapsed && nutrition && (
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

          {/* Trends Section */}
          <div className="nutrition-trends-section">
            <button
              className="trends-toggle-btn"
              onClick={() => setShowTrends(!showTrends)}
            >
              {showTrends ? "📉 隐藏趋势" : "📈 查看趋势"}
            </button>

            {showTrends && (
              <div className="trends-content">
                <div className="trends-controls">
                  <button
                    className={`trend-period-btn ${trendDays === 7 ? 'active' : ''}`}
                    onClick={() => setTrendDays(7)}
                  >
                    7天
                  </button>
                  <button
                    className={`trend-period-btn ${trendDays === 30 ? 'active' : ''}`}
                    onClick={() => setTrendDays(30)}
                  >
                    30天
                  </button>
                </div>

                {loading ? (
                  <p className="trends-loading">加载中...</p>
                ) : data.length === 0 ? (
                  <p className="trends-empty">暂无数据</p>
                ) : (
                  <>
                    <NutritionChart data={data} />
                    {stats && (
                      <div className="trends-stats">
                        <div className="stat-item">
                          <span className="stat-label">平均热量:</span>
                          <span className="stat-value">{stats.avg_calories?.toFixed(0) || 0} kcal</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">平均脂肪:</span>
                          <span className="stat-value">{stats.avg_fat?.toFixed(1) || 0} g</span>
                        </div>
                        <div className="stat-item danger">
                          <span className="stat-label">脂肪超标天数:</span>
                          <span className="stat-value">{stats.days_over_fat_limit || 0} 天</span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
