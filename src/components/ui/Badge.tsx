import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "slate" | "emerald" | "amber" | "blue" | "red";
  className?: string;
}

export const Badge = ({ children, variant = "slate", className = "" }: BadgeProps) => {
  const variants = {
    slate: "bg-neutral-50 text-neutral-500 border-neutral-200",
    emerald: "bg-marca-50 text-marca-600 border-marca-100",
    amber: "bg-neutral-50 text-neutral-600 border-neutral-100",
    blue: "bg-neutral-50 text-neutral-600 border-neutral-100",
    red: "bg-red-50 text-red-600 border-red-100",
  };

  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};
