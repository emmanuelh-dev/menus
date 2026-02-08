import React from 'react';

interface BlockTypeButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

export function BlockTypeButton({ icon, label, onClick }: BlockTypeButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-3 bg-white hover:bg-blue-50 rounded-xl border-2 border-gray-200 hover:border-blue-400 transition-colors group"
    >
      <div className="text-blue-600 group-hover:text-blue-700">{icon}</div>
      <span className="text-[10px] font-semibold text-gray-700 uppercase tracking-wide">{label}</span>
    </button>
  );
}
