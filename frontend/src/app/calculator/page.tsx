"use client";

import { useState } from "react";

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

  const activityLevels = {
    sedentary: "久坐（很少运动）",
    light: "轻度活动（每周1-3天）",
    moderate: "中度活动（每周3-5天）",
    active: "高度活动（每周6-7天）",
    very_active: "非常活跃（每天高强度运动）",
  };

  const handleCalculate = async () => {
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
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">
          🧮 个性化营养目标计算器
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* 基本信息 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              体重（公斤）
            </label>
            <input
              type="number"
              value={profile.weight_kg}
              onChange={(e) =>
                setProfile({ ...profile, weight_kg: Number(e.target.value) })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              身高（厘米）
            </label>
            <input
              type="number"
              value={profile.height_cm}
              onChange={(e) =>
                setProfile({ ...profile, height_cm: Number(e.target.value) })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              年龄
            </label>
            <input
              type="number"
              value={profile.age}
              onChange={(e) =>
                setProfile({ ...profile, age: Number(e.target.value) })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              性别
            </label>
            <select
              value={profile.gender}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  gender: e.target.value as "male" | "female",
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="male">男性</option>
              <option value="female">女性</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              活动水平
            </label>
            <select
              value={profile.activity_level}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  activity_level: e.target.value as UserProfile["activity_level"],
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(activityLevels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* 健康状况 */}
          <div className="md:col-span-2 space-y-3">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={profile.has_diabetes}
                onChange={(e) =>
                  setProfile({ ...profile, has_diabetes: e.target.checked })
                }
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">有糖尿病</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={profile.has_pancreatitis}
                onChange={(e) =>
                  setProfile({ ...profile, has_pancreatitis: e.target.checked })
                }
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">有胰腺炎病史</span>
            </label>
          </div>
        </div>

        {/* 按钮 */}
        <div className="flex gap-3">
          <button
            onClick={handleCalculate}
            disabled={loading}
            className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "计算中..." : "🧮 计算营养目标"}
          </button>

          {result && (
            <button
              onClick={handleApply}
              disabled={applying}
              className="flex-1 bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {applying ? "应用中..." : "✅ 应用到系统"}
            </button>
          )}
        </div>

        {/* 计算结果 */}
        {result && (
          <div className="mt-6 space-y-4">
            {/* BMI 信息 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-2">📊 BMI 分析</h3>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="font-medium">BMI:</span> {result.bmi.bmi} (
                  {result.bmi.status})
                </p>
                <p className="text-gray-600">{result.bmi.recommendation}</p>
              </div>
            </div>

            {/* 营养目标 */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-3">
                🎯 个性化营养目标
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="bg-white rounded p-3">
                  <div className="text-xs text-gray-500 mb-1">热量</div>
                  <div className="text-lg font-bold text-gray-800">
                    {result.targets.calories}
                    <span className="text-sm font-normal text-gray-500 ml-1">
                      千卡
                    </span>
                  </div>
                </div>

                <div className="bg-white rounded p-3">
                  <div className="text-xs text-gray-500 mb-1">蛋白质</div>
                  <div className="text-lg font-bold text-gray-800">
                    {result.targets.protein}
                    <span className="text-sm font-normal text-gray-500 ml-1">
                      克
                    </span>
                  </div>
                </div>

                <div className="bg-white rounded p-3">
                  <div className="text-xs text-gray-500 mb-1">
                    脂肪 <span className="text-red-500">⚠️</span>
                  </div>
                  <div className="text-lg font-bold text-red-600">
                    {result.targets.fat}
                    <span className="text-sm font-normal text-gray-500 ml-1">
                      克
                    </span>
                  </div>
                </div>

                <div className="bg-white rounded p-3">
                  <div className="text-xs text-gray-500 mb-1">碳水化合物</div>
                  <div className="text-lg font-bold text-gray-800">
                    {result.targets.carbs}
                    <span className="text-sm font-normal text-gray-500 ml-1">
                      克
                    </span>
                  </div>
                </div>

                <div className="bg-white rounded p-3">
                  <div className="text-xs text-gray-500 mb-1">膳食纤维</div>
                  <div className="text-lg font-bold text-gray-800">
                    {result.targets.fiber}
                    <span className="text-sm font-normal text-gray-500 ml-1">
                      克
                    </span>
                  </div>
                </div>
              </div>

              {profile.has_pancreatitis && (
                <div className="mt-3 text-xs text-red-600 bg-red-50 p-2 rounded">
                  ⚠️ 胰腺炎患者：脂肪摄入严格限制在 {result.targets.fat} 克/天
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
