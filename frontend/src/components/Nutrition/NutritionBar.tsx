// Get progress bar color class based on percentage
export function getProgressColorClass(percentage: number, isFat: boolean = false): string {
  if (isFat && percentage > 100) return "danger";  // Fat over limit is dangerous
  if (percentage > 100) return "warning";           // Other over limit is warning
  if (percentage > 80) return "caution";            // Close to limit
  return "ok";                                       // Normal
}

interface NutritionBarProps {
  name: string;
  current: number;
  target: number;
  percentage: number;
  unit: string;
  isFat?: boolean;
}

export default function NutritionBar({
  name,
  current,
  target,
  percentage,
  unit,
  isFat = false,
}: NutritionBarProps) {
  const isOver = percentage > 100;
  const colorClass = getProgressColorClass(percentage, isFat);

  return (
    <div className="nutrition-item">
      <div className="nutrition-label">
        <span className="name">{name}</span>
        <span className="value">
          {current.toFixed(1)}/{target}
          {unit} ({percentage.toFixed(0)}%)
          {isOver && isFat && <span className="danger-text"> ⚠️超标!</span>}
        </span>
      </div>
      <div className="progress-bar">
        <div
          className={`progress-fill ${colorClass}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}
