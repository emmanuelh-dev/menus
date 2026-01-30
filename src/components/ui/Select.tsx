import React from "react";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string | number; label: string }[];
  error?: string;
}

export const Select = ({ label, options, error, className = "", ...props }: SelectProps) => {
  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-tight ml-1">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          className={`w-full bg-white border border-slate-200 px-3 py-2 rounded-lg text-sm outline-none appearance-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all cursor-pointer ${error ? "border-red-500" : ""
            } ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {error && <p className="text-[10px] text-red-500 ml-1 font-medium">{error}</p>}
    </div>
  );
};
