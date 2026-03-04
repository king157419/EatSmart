import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { DailyNutrition } from '../../types';

interface NutritionChartProps {
  data: DailyNutrition[];
}

export default function NutritionChart({ data }: NutritionChartProps) {
  return (
    <div className="nutrition-chart">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => {
              const date = new Date(value);
              return `${date.getMonth() + 1}/${date.getDate()}`;
            }}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
            labelStyle={{ color: '#fff' }}
          />
          <Legend wrapperStyle={{ fontSize: '14px' }} />

          {/* Reference lines for targets */}
          <ReferenceLine y={30} stroke="#ef4444" strokeDasharray="3 3" label={{ value: '脂肪上限', position: 'right', fill: '#ef4444', fontSize: 12 }} />
          <ReferenceLine y={1800} stroke="#10b981" strokeDasharray="3 3" label={{ value: '热量目标', position: 'right', fill: '#10b981', fontSize: 12 }} />

          {/* Data lines */}
          <Line type="monotone" dataKey="calories" stroke="#10b981" name="热量 (kcal)" strokeWidth={2} dot={{ r: 4 }} />
          <Line type="monotone" dataKey="fat" stroke="#ef4444" name="脂肪 (g)" strokeWidth={2} dot={{ r: 4 }} />
          <Line type="monotone" dataKey="carbs" stroke="#3b82f6" name="碳水 (g)" strokeWidth={2} dot={{ r: 4 }} />
          <Line type="monotone" dataKey="protein" stroke="#f59e0b" name="蛋白质 (g)" strokeWidth={2} dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
