"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface UserProfile {
  weight_kg: number;
  height_cm: number;
  age: number;
  gender: "male" | "female";
  activity_level: "sedentary" | "light" | "moderate" | "active" | "very_active";
  has_diabetes: boolean;
  has_pancreatitis: boolean;
}

interface NutritionTargets {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
}

interface BMIInfo {
  bmi: number;
  status: string;
  recommendation: string;
}

interface CalculationResult {
  targets: NutritionTargets;
  bmi: BMIInfo;
  profile: UserProfile;
}

interface CalculationHistory {
  timestamp: number;
  count: number;
}

const STORAGE_KEY = "nutrition_calc_history";
const MAX_CALCULATIONS_PER_WEEK = 2;
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export default function NutritionCalculator() {
  const [profile, setProfile] = useState<UserProfile>({
    weight_kg: 70,
    height_cm: 170,
    age: 65,
    gender: "male",
    activity_level: "light",
    has_diabetes: true,
    has_pancreatitis: true,
  });

  const [result, setResult] = useState<CalculationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [remainingCalculations, setRemainingCalculations] = useState(MAX_CALCULATIONS_PER_WEEK);
  const [nextResetDate, setNextResetDate] = useState<Date | null>(null);

  const activityLevels = {
    sedentary: "久坐（很少运动）",
    light: "轻度活动（每周1-3天）",
    moderate: "中度活动（每周3-5天）",
    active: "高度活动（每周6-7天）",
    very_active: "非常活跃（每天高强度运动）",
  };

  // 检查计算次数限制
  useEffect(() => {
    const checkCalculationLimit = () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      const now = Date.now();

      if (!stored) {
        setRemainingCalculations(MAX_CALCULATIONS_PER_WEEK);
        return;
      }

      const history: CalculationHistory = JSON.parse(stored);
      const timeSinceFirst = now - history.timestamp;

      if (timeSinceFirst >= ONE_WEEK_MS) {
        // 超过一周，重置
        localStorage.removeItem(STORAGE_KEY);
        setRemainingCalculations(MAX_CALCULATIONS_PER_WEEK);
        setNextResetDate(null);
      } else {
        // 还在一周内
        const remaining = MAX_CALCULATIONS_PER_WEEK - history.count;
        setRemainingCalculations(remaining);
        setNextResetDate(new Date(history.timestamp + ONE_WEEK_MS));
      }
    };

    checkCalculationLimit();
  }, []);

  const recordCalculation = () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const now = Date.now();

    if (!stored) {
      const newHistory: CalculationHistory = {
        timestamp: now,
        count: 1,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
      setRemainingCalculations(MAX_CALCULATIONS_PER_WEEK - 1);
      setNextResetDate(new Date(now + ONE_WEEK_MS));
    } else {
      const history: CalculationHistory = JSON.parse(stored);
      history.count += 1;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
      setRemainingCalculations(MAX_CALCULATIONS_PER_WEEK - history.count);
    }
  };

  const handleCalculate = async () => {
    if (remainingCalculations <= 0) {
      alert("本周计算次数已用完，请等待重置后再试");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/nutrition/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });

      if (!response.ok) throw new Error("计算失败");

      const data = await response.json();
      setResult(data);
      recordCalculation();
    } catch (error) {
      console.error("计算营养目标失败:", error);
      alert("计算失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    setApplying(true);
    try {
      const response = await fetch("/api/nutrition/apply-calculated", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });

      if (!response.ok) throw new Error("应用失败");

      const data = await response.json();
      alert("✅ 个性化营养目标已应用！");
      setResult(data);
    } catch (error) {
      console.error("应用营养目标失败:", error);
      alert("应用失败，请重试");
    } finally {
      setApplying(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      padding: "var(--space-xl) var(--space-md)",
      position: "relative",
      zIndex: 1
    }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        {/* 返回按钮 */}
        <Link href="/" style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "var(--space-sm)",
          color: "var(--text-secondary)",
          textDecoration: "none",
          marginBottom: "var(--space-lg)",
          fontSize: "14px",
          transition: "color 0.2s"
        }}>
          ← 返回主页
        </Link>

        {/* 标题卡片 */}
        <div style={{
          background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-xl)",
          marginBottom: "var(--space-lg)",
          boxShadow: "var(--shadow-glow)",
          color: "white"
        }}>
          <h1 style={{
            fontSize: "28px",
            fontWeight: 600,
            marginBottom: "var(--space-sm)",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-md)"
          }}>
            🧮 个性化营养目标计算器
          </h1>
          <p style={{
            fontSize: "15px",
            opacity: 0.9,
            lineHeight: 1.6
          }}>
            根据身高、体重、年龄和活动水平，科学计算每日营养需求
          </p>

          {/* 使用次数提示 */}
          <div style={{
            marginTop: "var(--space-md)",
            padding: "var(--space-md)",
            background: "rgba(255, 255, 255, 0.15)",
            borderRadius: "var(--radius-sm)",
            fontSize: "14px",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-sm)"
          }}>
            <span>📊</span>
            <span>
              本周剩余计算次数：<strong>{remainingCalculations}</strong> / {MAX_CALCULATIONS_PER_WEEK}
              {nextResetDate && ` · 重置时间：${nextResetDate.toLocaleDateString()}`}
            </span>
          </div>
        </div>

        {/* 主表单卡片 */}
        <div style={{
          background: "var(--bg-card)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-xl)",
          boxShadow: "var(--shadow-md)",
          marginBottom: "var(--space-lg)"
        }}>
          <h2 style={{
            fontSize: "18px",
            fontWeight: 600,
            color: "var(--text)",
            marginBottom: "var(--space-lg)",
            paddingBottom: "var(--space-md)",
            borderBottom: "2px solid var(--border-light)"
          }}>
            基本信息
          </h2>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "var(--space-lg)"
          }}>
            {/* 体重 */}
            <div>
              <label style={{
                display: "block",
                fontSize: "14px",
                fontWeight: 500,
                color: "var(--text-secondary)",
                marginBottom: "var(--space-sm)"
              }}>
                体重（公斤）
              </label>
              <input
                type="number"
                value={profile.weight_kg}
                onChange={(e) => setProfile({ ...profile, weight_kg: Number(e.target.value) })}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "2px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "15px",
                  transition: "all 0.2s",
                  background: "var(--bg-warm)"
                }}
                onFocus={(e) => e.target.style.borderColor = "var(--primary)"}
                onBlur={(e) => e.target.style.borderColor = "var(--border)"}
              />
            </div>

            {/* 身高 */}
            <div>
              <label style={{
                display: "block",
                fontSize: "14px",
                fontWeight: 500,
                color: "var(--text-secondary)",
                marginBottom: "var(--space-sm)"
              }}>
                身高（厘米）
              </label>
              <input
                type="number"
                value={profile.height_cm}
                onChange={(e) => setProfile({ ...profile, height_cm: Number(e.target.value) })}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "2px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "15px",
                  transition: "all 0.2s",
                  background: "var(--bg-warm)"
                }}
                onFocus={(e) => e.target.style.borderColor = "var(--primary)"}
                onBlur={(e) => e.target.style.borderColor = "var(--border)"}
              />
            </div>

            {/* 年龄 */}
            <div>
              <label style={{
                display: "block",
                fontSize: "14px",
                fontWeight: 500,
                color: "var(--text-secondary)",
                marginBottom: "var(--space-sm)"
              }}>
                年龄
              </label>
              <input
                type="number"
                value={profile.age}
                onChange={(e) => setProfile({ ...profile, age: Number(e.target.value) })}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "2px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "15px",
                  transition: "all 0.2s",
                  background: "var(--bg-warm)"
                }}
                onFocus={(e) => e.target.style.borderColor = "var(--primary)"}
                onBlur={(e) => e.target.style.borderColor = "var(--border)"}
              />
            </div>

            {/* 性别 */}
            <div>
              <label style={{
                display: "block",
                fontSize: "14px",
                fontWeight: 500,
                color: "var(--text-secondary)",
                marginBottom: "var(--space-sm)"
              }}>
                性别
              </label>
              <select
                value={profile.gender}
                onChange={(e) => setProfile({ ...profile, gender: e.target.value as "male" | "female" })}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "2px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "15px",
                  background: "var(--bg-warm)",
                  cursor: "pointer"
                }}
              >
                <option value="male">男性</option>
                <option value="female">女性</option>
              </select>
            </div>
          </div>

          {/* 活动水平 */}
          <div style={{ marginTop: "var(--space-lg)" }}>
            <label style={{
              display: "block",
              fontSize: "14px",
              fontWeight: 500,
              color: "var(--text-secondary)",
              marginBottom: "var(--space-sm)"
            }}>
              活动水平
            </label>
            <select
              value={profile.activity_level}
              onChange={(e) => setProfile({ ...profile, activity_level: e.target.value as UserProfile["activity_level"] })}
              style={{
                width: "100%",
                padding: "12px 16px",
                border: "2px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                fontSize: "15px",
                background: "var(--bg-warm)",
                cursor: "pointer"
              }}
            >
              {Object.entries(activityLevels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* 健康状况 */}
          <div style={{ marginTop: "var(--space-lg)" }}>
            <label style={{
              display: "block",
              fontSize: "14px",
              fontWeight: 500,
              color: "var(--text-secondary)",
              marginBottom: "var(--space-md)"
            }}>
              健康状况
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
              <label style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-sm)",
                cursor: "pointer",
                padding: "var(--space-md)",
                background: profile.has_diabetes ? "var(--primary-bg)" : "var(--bg-warm)",
                borderRadius: "var(--radius-sm)",
                border: `2px solid ${profile.has_diabetes ? "var(--primary)" : "var(--border)"}`,
                transition: "all 0.2s"
              }}>
                <input
                  type="checkbox"
                  checked={profile.has_diabetes}
                  onChange={(e) => setProfile({ ...profile, has_diabetes: e.target.checked })}
                  style={{ width: "18px", height: "18px", cursor: "pointer" }}
                />
                <span style={{ fontSize: "15px", color: "var(--text)" }}>有糖尿病</span>
              </label>

              <label style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-sm)",
                cursor: "pointer",
                padding: "var(--space-md)",
                background: profile.has_pancreatitis ? "var(--danger-light)" : "var(--bg-warm)",
                borderRadius: "var(--radius-sm)",
                border: `2px solid ${profile.has_pancreatitis ? "var(--danger)" : "var(--border)"}`,
                transition: "all 0.2s"
              }}>
                <input
                  type="checkbox"
                  checked={profile.has_pancreatitis}
                  onChange={(e) => setProfile({ ...profile, has_pancreatitis: e.target.checked })}
                  style={{ width: "18px", height: "18px", cursor: "pointer" }}
                />
                <span style={{ fontSize: "15px", color: "var(--text)" }}>有胰腺炎病史</span>
              </label>
            </div>
          </div>

          {/* 按钮组 */}
          <div style={{
            marginTop: "var(--space-xl)",
            display: "flex",
            gap: "var(--space-md)",
            flexWrap: "wrap"
          }}>
            <button
              onClick={handleCalculate}
              disabled={loading || remainingCalculations <= 0}
              style={{
                flex: 1,
                minWidth: "200px",
                padding: "16px 24px",
                background: remainingCalculations <= 0
                  ? "var(--text-muted)"
                  : "linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)",
                color: "white",
                border: "none",
                borderRadius: "var(--radius-sm)",
                fontSize: "16px",
                fontWeight: 600,
                cursor: remainingCalculations <= 0 ? "not-allowed" : "pointer",
                transition: "all 0.2s",
                boxShadow: remainingCalculations > 0 ? "var(--shadow-md)" : "none"
              }}
              onMouseEnter={(e) => {
                if (remainingCalculations > 0) {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "var(--shadow-lg)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = remainingCalculations > 0 ? "var(--shadow-md)" : "none";
              }}
            >
              {loading ? "计算中..." : remainingCalculations <= 0 ? "本周次数已用完" : "🧮 计算营养目标"}
            </button>

            {result && (
              <button
                onClick={handleApply}
                disabled={applying}
                style={{
                  flex: 1,
                  minWidth: "200px",
                  padding: "16px 24px",
                  background: "linear-gradient(135deg, var(--accent) 0%, var(--warning) 100%)",
                  color: "white",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "16px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  boxShadow: "var(--shadow-md)"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "var(--shadow-lg)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "var(--shadow-md)";
                }}
              >
                {applying ? "应用中..." : "✅ 应用到系统"}
              </button>
            )}
          </div>
        </div>

        {/* 计算结果 */}
        {result && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
            {/* BMI 卡片 */}
            <div style={{
              background: "linear-gradient(135deg, var(--info-light) 0%, var(--bg-card) 100%)",
              borderRadius: "var(--radius-lg)",
              padding: "var(--space-xl)",
              boxShadow: "var(--shadow-md)",
              border: "2px solid var(--info)"
            }}>
              <h3 style={{
                fontSize: "18px",
                fontWeight: 600,
                color: "var(--text)",
                marginBottom: "var(--space-md)",
                display: "flex",
                alignItems: "center",
                gap: "var(--space-sm)"
              }}>
                📊 BMI 分析
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-lg)", flexWrap: "wrap" }}>
                <div style={{
                  fontSize: "48px",
                  fontWeight: 700,
                  color: "var(--info)"
                }}>
                  {result.bmi.bmi}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: "20px",
                    fontWeight: 600,
                    color: "var(--text)",
                    marginBottom: "var(--space-xs)"
                  }}>
                    {result.bmi.status}
                  </div>
                  <div style={{
                    fontSize: "14px",
                    color: "var(--text-secondary)",
                    lineHeight: 1.6
                  }}>
                    {result.bmi.recommendation}
                  </div>
                </div>
              </div>
            </div>

            {/* 营养目标卡片 */}
            <div style={{
              background: "var(--bg-card)",
              borderRadius: "var(--radius-lg)",
              padding: "var(--space-xl)",
              boxShadow: "var(--shadow-md)"
            }}>
              <h3 style={{
                fontSize: "18px",
                fontWeight: 600,
                color: "var(--text)",
                marginBottom: "var(--space-lg)",
                display: "flex",
                alignItems: "center",
                gap: "var(--space-sm)"
              }}>
                🎯 个性化营养目标
              </h3>

              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: "var(--space-md)"
              }}>
                {/* 热量 */}
                <div style={{
                  background: "var(--accent-soft)",
                  padding: "var(--space-lg)",
                  borderRadius: "var(--radius-md)",
                  border: "2px solid var(--accent)"
                }}>
                  <div style={{
                    fontSize: "12px",
                    color: "var(--text-secondary)",
                    marginBottom: "var(--space-xs)",
                    fontWeight: 500
                  }}>
                    热量
                  </div>
                  <div style={{
                    fontSize: "28px",
                    fontWeight: 700,
                    color: "var(--accent)"
                  }}>
                    {result.targets.calories}
                  </div>
                  <div style={{
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    marginTop: "var(--space-xs)"
                  }}>
                    千卡/天
                  </div>
                </div>

                {/* 蛋白质 */}
                <div style={{
                  background: "var(--primary-bg)",
                  padding: "var(--space-lg)",
                  borderRadius: "var(--radius-md)",
                  border: "2px solid var(--primary)"
                }}>
                  <div style={{
                    fontSize: "12px",
                    color: "var(--text-secondary)",
                    marginBottom: "var(--space-xs)",
                    fontWeight: 500
                  }}>
                    蛋白质
                  </div>
                  <div style={{
                    fontSize: "28px",
                    fontWeight: 700,
                    color: "var(--primary)"
                  }}>
                    {result.targets.protein}
                  </div>
                  <div style={{
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    marginTop: "var(--space-xs)"
                  }}>
                    克/天
                  </div>
                </div>

                {/* 脂肪 */}
                <div style={{
                  background: "var(--danger-light)",
                  padding: "var(--space-lg)",
                  borderRadius: "var(--radius-md)",
                  border: "2px solid var(--danger)"
                }}>
                  <div style={{
                    fontSize: "12px",
                    color: "var(--text-secondary)",
                    marginBottom: "var(--space-xs)",
                    fontWeight: 500,
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                  }}>
                    脂肪 <span style={{ color: "var(--danger)" }}>⚠️</span>
                  </div>
                  <div style={{
                    fontSize: "28px",
                    fontWeight: 700,
                    color: "var(--danger)"
                  }}>
                    {result.targets.fat}
                  </div>
                  <div style={{
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    marginTop: "var(--space-xs)"
                  }}>
                    克/天
                  </div>
                </div>

                {/* 碳水 */}
                <div style={{
                  background: "var(--info-light)",
                  padding: "var(--space-lg)",
                  borderRadius: "var(--radius-md)",
                  border: "2px solid var(--info)"
                }}>
                  <div style={{
                    fontSize: "12px",
                    color: "var(--text-secondary)",
                    marginBottom: "var(--space-xs)",
                    fontWeight: 500
                  }}>
                    碳水化合物
                  </div>
                  <div style={{
                    fontSize: "28px",
                    fontWeight: 700,
                    color: "var(--info)"
                  }}>
                    {result.targets.carbs}
                  </div>
                  <div style={{
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    marginTop: "var(--space-xs)"
                  }}>
                    克/天
                  </div>
                </div>

                {/* 膳食纤维 */}
                <div style={{
                  background: "#f3f0ff",
                  padding: "var(--space-lg)",
                  borderRadius: "var(--radius-md)",
                  border: "2px solid var(--fiber-color)"
                }}>
                  <div style={{
                    fontSize: "12px",
                    color: "var(--text-secondary)",
                    marginBottom: "var(--space-xs)",
                    fontWeight: 500
                  }}>
                    膳食纤维
                  </div>
                  <div style={{
                    fontSize: "28px",
                    fontWeight: 700,
                    color: "var(--fiber-color)"
                  }}>
                    {result.targets.fiber}
                  </div>
                  <div style={{
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    marginTop: "var(--space-xs)"
                  }}>
                    克/天
                  </div>
                </div>
              </div>

              {/* 胰腺炎警告 */}
              {profile.has_pancreatitis && (
                <div style={{
                  marginTop: "var(--space-lg)",
                  padding: "var(--space-md)",
                  background: "var(--danger-light)",
                  borderRadius: "var(--radius-sm)",
                  border: "2px solid var(--danger)",
                  fontSize: "14px",
                  color: "var(--danger)",
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-sm)"
                }}>
                  <span>⚠️</span>
                  <span>
                    <strong>胰腺炎患者特别提醒：</strong>脂肪摄入严格限制在 {result.targets.fat} 克/天以下
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
