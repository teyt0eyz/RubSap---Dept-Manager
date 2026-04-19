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
    <div className={`rounded-2xl p-4 ${bgClass} flex items-center gap-4 shadow-sm`}>
      <div className={`p-3 rounded-xl bg-white shadow-sm ${colorClass}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500 font-medium truncate">{label}</p>
        <p className={`text-xl font-bold ${colorClass} truncate`}>{value}</p>
      </div>
    </div>
  );
}
