import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "slate" | "emerald" | "amber" | "blue" | "red";
  className?: string;
}

export const Badge = ({ children, variant = "slate", className = "" }: BadgeProps) => {
  const variants = {
    slate: "bg-slate-50 text-slate-500 border-slate-200",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    red: "bg-red-50 text-red-600 border-red-100",
  };

  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};
