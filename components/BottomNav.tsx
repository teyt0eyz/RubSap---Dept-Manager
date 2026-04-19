"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PlusCircle, Users, BarChart2 } from "lucide-react";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/add-debt", label: "Add", icon: PlusCircle },
  { href: "/debtors", label: "Debtors", icon: Users },
  { href: "/reports", label: "Reports", icon: BarChart2 },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-blue-100 shadow-lg max-w-lg mx-auto">
      <div className="flex justify-around items-center h-18 px-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center flex-1 py-3 rounded-xl transition-colors ${
                active
                  ? "text-blue-600"
                  : "text-gray-400 hover:text-blue-400"
              }`}
            >
              <Icon
                size={26}
                strokeWidth={active ? 2.5 : 2}
                className={active ? "text-blue-600" : ""}
              />
              <span className={`text-xs mt-1 font-semibold ${active ? "text-blue-600" : ""}`}>
                {label}
              </span>
              {active && (
                <span className="block w-1.5 h-1.5 rounded-full bg-blue-600 mt-0.5" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
