import { ReactNode } from "react";

interface SummaryCardProps {
  label: string;
  value: string;
  icon: ReactNode;
  colorClass?: string;
  bgClass?: string;
}

export default function SummaryCard({
  label,
  value,
  icon,
  colorClass = "text-blue-700",
  bgClass = "bg-blue-50",
}: SummaryCardProps) {
  return (
    <div className={`rounded-2xl p-4 ${bgClass} shadow-sm`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`${colorClass} opacity-80`}>{icon}</div>
        <p className="text-xs text-gray-500 font-semibold leading-tight">{label}</p>
      </div>
      <p className={`text-lg font-extrabold ${colorClass} leading-tight break-all`}>{value}</p>
    </div>
  );
}
