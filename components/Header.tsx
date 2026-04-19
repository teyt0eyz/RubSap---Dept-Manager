"use client";

import { Bell } from "lucide-react";
import { useState, useEffect } from "react";
import { getSummary } from "@/lib/store";

interface HeaderProps {
  title: string;
  showBack?: boolean;
}

export default function Header({ title }: HeaderProps) {
  const [alertCount, setAlertCount] = useState(0);
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    const summary = getSummary();
    setAlertCount(summary.overdueCount + summary.dueSoonCount);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-white border-b-2 border-blue-100 shadow-sm">
      <div className="flex items-center justify-between px-5 py-4 max-w-lg mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-blue-800">{title}</h1>
          <p className="text-sm text-blue-400 font-medium">RubSap Lending</p>
        </div>
        <button
          onClick={() => setShowAlert(!showAlert)}
          className="relative p-3 rounded-full bg-blue-50 hover:bg-blue-100 transition-colors"
          aria-label="Notifications"
        >
          <Bell size={24} className="text-blue-600" />
          {alertCount > 0 && (
            <span className="absolute top-1 right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
              {alertCount > 9 ? "9+" : alertCount}
            </span>
          )}
        </button>
      </div>
      {showAlert && alertCount > 0 && (
        <div className="mx-5 mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 font-medium">
          ⚠️ You have {alertCount} payment{alertCount > 1 ? "s" : ""} that need attention!
        </div>
      )}
    </header>
  );
}
