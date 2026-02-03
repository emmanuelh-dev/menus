import React, { useState, useEffect } from 'react';
import { Layout, Receipt, Truck, PlusCircle, Settings } from 'lucide-react';

interface Props {
  placeId: string;
  currentPath: string;
}

export default function PlaceSecondaryNav({ placeId, currentPath }: Props) {
  const navItems = [
    {
      label: 'Editor',
      href: `/admin/place/${placeId}`,
      icon: Layout,
      active: currentPath === `/admin/place/${placeId}`
    },
    {
      label: 'Caja',
      href: `/admin/place/${placeId}/caja`,
      icon: Receipt,
      active: currentPath.includes('/caja') || currentPath.includes('/orders')
    },
    {
      label: 'Zonas',
      href: `/admin/place/${placeId}/shipping`,
      icon: Truck,
      active: currentPath.includes('/shipping')
    },
    {
      label: 'Comanda',
      href: `/admin/place/${placeId}/comanda`,
      icon: PlusCircle,
      active: currentPath.includes('/comanda')
    }
  ];

  return (
    <>
      {/* Desktop Sub-navigation (Top) */}
      <div className="hidden md:block bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-8 h-14">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                data-astro-prefetch
                className={`flex items-center gap-2 text-sm font-bold transition-all h-full border-b-2 px-1 ${item.active
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-200'
                  }`}
              >
                <item.icon size={16} />
                {item.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation (App-like) */}
      <div className="md:hidden fixed bottom-4 left-0 right-0 z-[100] px-4">
        <div className="bg-white/95 backdrop-blur-xl border border-gray-200/50 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] rounded-[2rem] p-1.5 flex items-center justify-around ring-1 ring-black/[0.03]">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              data-astro-prefetch
              className={`flex flex-col items-center gap-1.5 py-2.5 px-4 rounded-2xl transition-all duration-300 relative ${item.active
                ? 'text-gray-900 bg-gray-50'
                : 'text-gray-400 active:scale-90 hover:text-gray-600'
                }`}
            >
              <item.icon size={20} className={item.active ? 'stroke-[2.5px]' : 'stroke-2'} />
              <span className={`text-[10px] font-black uppercase tracking-tighter ${item.active ? 'opacity-100' : 'opacity-60'}`}>
                {item.label}
              </span>
              {item.active && (
                <div className="absolute -bottom-1 w-1 h-1 bg-gray-900 rounded-full" />
              )}
            </a>
          ))}
        </div>
      </div>
    </>
  );
}
