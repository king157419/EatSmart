import { useState, useEffect } from 'react';
import { apiNutritionRange, apiNutritionStats } from '../services/api';
import type { DailyNutrition, NutritionStats } from '../types';

export function useNutritionTrends(days: number = 7) {
  const [data, setData] = useState<DailyNutrition[]>([]);
  const [stats, setStats] = useState<NutritionStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTrends = async () => {
    setLoading(true);
    setError(null);
    try {
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - (days - 1));

      const start = startDate.toISOString().split('T')[0];
      const end = today.toISOString().split('T')[0];

      const [trendData, statsData] = await Promise.all([
        apiNutritionRange(start, end),
        apiNutritionStats(days),
      ]);

      setData(trendData);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrends();
  }, [days]);

  return { data, stats, loading, error, loadTrends };
}
