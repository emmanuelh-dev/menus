import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = ({ label, error, className = "", ...props }: InputProps) => {
  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-tight ml-1">
          {label}
        </label>
      )}
      <input
        className={`w-full bg-white border border-neutral-200 px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-neutral-900/5 focus:border-neutral-900 transition-all placeholder:text-neutral-400 ${error ? "border-red-500 focus:ring-red-500/5 focus:border-red-500" : ""
          } ${className}`}
        {...props}
      />
      {error && <p className="text-[10px] text-red-500 ml-1 font-medium">{error}</p>}
    </div>
  );
};
