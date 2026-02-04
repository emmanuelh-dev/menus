import React, { useState, useEffect, useRef } from 'react';
import {
  Layout,
  Receipt,
  Truck,
  PlusCircle,
  Coins,
  Grid,
  ChevronDown,
  Settings,
  ShoppingBag,
  MoreHorizontal,
  X
} from 'lucide-react';

interface Props {
  placeId: string;
  currentPath: string;
}

export default function PlaceSecondaryNav({ placeId, currentPath }: Props) {
  const [showMore, setShowMore] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const groups = [
    {
      id: 'op',
      label: 'Operación',
      icon: ShoppingBag,
      items: [
        {
          label: 'POS Tactil',
          href: `/admin/place/${placeId}/pos`,
          icon: Receipt,
          active: currentPath.includes('/pos')
        },
        {
          label: 'Nueva Comanda',
          href: `/admin/place/${placeId}/comanda`,
          icon: PlusCircle,
          active: currentPath.includes('/comanda')
        },
        {
          label: 'Mapa de Mesas',
          href: `/admin/place/${placeId}/mesas`,
          icon: Grid,
          active: currentPath.includes('/mesas')
        }
      ]
    },
    {
      id: 'fin',
      label: 'Caja y Dinero',
      icon: Coins,
      items: [
        {
          label: 'Historial / Caja',
          href: `/admin/place/${placeId}/caja`,
          icon: Receipt,
          active: currentPath.includes('/caja') || currentPath.includes('/orders')
        },
        {
          label: 'Arqueos',
          href: `/admin/place/${placeId}/arqueo`,
          icon: Coins,
          active: currentPath.includes('/arqueo')
        }
      ]
    },
    {
      id: 'config',
      label: 'Configuración',
      icon: Settings,
      items: [
        {
          label: 'Editor de Menú',
          href: `/admin/place/${placeId}`,
          icon: Layout,
          active: currentPath === `/admin/place/${placeId}`
        },
        {
          label: 'Zonas de Envío',
          href: `/admin/place/${placeId}/shipping`,
          icon: Truck,
          active: currentPath.includes('/shipping')
        }
      ]
    }
  ];

  const allItems = groups.flatMap(g => g.items);
  const activeItem = allItems.find(i => i.active);

  return (
    <>
      {/* Desktop Sub-navigation (Top) */}
      <div className="hidden md:block bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-2 h-14" ref={dropdownRef}>
            {groups.map((group) => {
              const hasActiveChild = group.items.some(i => i.active);
              return (
                <div key={group.id} className="relative h-full">
                  <button
                    onClick={() => setActiveDropdown(activeDropdown === group.id ? null : group.id)}
                    className={`flex items-center gap-2 text-[11px] font-black uppercase tracking-widest transition-all h-full border-b-2 px-4 hover:bg-gray-50 ${hasActiveChild
                      ? 'border-gray-900 text-gray-900 bg-gray-50/50'
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                      }`}
                  >
                    <group.icon size={14} className={hasActiveChild ? 'text-gray-900' : 'text-gray-300'} />
                    {group.label}
                    <ChevronDown size={12} className={`transition-transform duration-300 ${activeDropdown === group.id ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu */}
                  {activeDropdown === group.id && (
                    <div className="absolute top-full left-0 w-64 bg-white border border-gray-100 shadow-2xl rounded-2xl p-2 mt-1 animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                      {group.items.map((item) => (
                        <a
                          key={item.label}
                          href={item.href}
                          onClick={() => setActiveDropdown(null)}
                          className={`flex items-center gap-3 p-3 rounded-xl transition-all ${item.active
                            ? 'bg-gray-900 text-white '
                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                        >
                          <item.icon size={16} />
                          <span className="text-xs font-bold">{item.label}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation (Smart Grouped) */}
      <div className="md:hidden fixed bottom-6 left-0 right-0 z-[100] px-6">
        <div className="bg-white/95 backdrop-blur-xl border border-gray-200/50 shadow-[0_-15px_40px_-15px_rgba(0,0,0,0.15)] rounded-[2.5rem] p-1.5 flex items-center justify-between ring-1 ring-black/[0.03]">
          {/* Main 3 Actions */}
          <a
            href={`/admin/place/${placeId}/pos`}
            className={`flex flex-col items-center gap-1.5 py-3 px-5 rounded-[2rem] transition-all duration-300 relative ${currentPath.includes('/pos') ? 'text-gray-900 bg-gray-100 shadow-inner' : 'text-gray-400'
              }`}
          >
            <Receipt size={20} className={currentPath.includes('/pos') ? 'stroke-[2.5px]' : ''} />
            <span className="text-[10px] font-black uppercase tracking-tighter">POS</span>
          </a>

          <a
            href={`/admin/place/${placeId}/comanda`}
            className={`flex flex-col items-center gap-1.5 py-3 px-5 rounded-[2rem] transition-all duration-300 relative ${currentPath.includes('/comanda') ? 'text-gray-900 bg-gray-100 shadow-inner' : 'text-gray-400'
              }`}
          >
            <PlusCircle size={20} className={currentPath.includes('/comanda') ? 'stroke-[2.5px]' : ''} />
            <span className="text-[10px] font-black uppercase tracking-tighter">Orden</span>
          </a>

          <a
            href={`/admin/place/${placeId}/caja`}
            className={`flex flex-col items-center gap-1.5 py-3 px-5 rounded-[2rem] transition-all duration-300 relative ${currentPath.includes('/caja') || currentPath.includes('/orders') ? 'text-gray-900 bg-gray-100 shadow-inner' : 'text-gray-400'
              }`}
          >
            <Coins size={20} className={currentPath.includes('/caja') ? 'stroke-[2.5px]' : ''} />
            <span className="text-[10px] font-black uppercase tracking-tighter">Caja</span>
          </a>

          {/* More Menu Toggle */}
          <button
            onClick={() => setShowMore(true)}
            className={`flex flex-col items-center gap-1.5 py-3 px-5 rounded-[2rem] transition-all duration-300 relative ${showMore ? 'text-gray-900 bg-gray-100' : 'text-gray-400'
              }`}
          >
            <MoreHorizontal size={20} />
            <span className="text-[10px] font-black uppercase tracking-tighter">Más</span>
          </button>
        </div>
      </div>

      {/* Mobile Fullscreen Menu (Submenus Overlay) */}
      {showMore && (
        <div className="fixed inset-0 z-[110] md:hidden animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setShowMore(false)}></div>
          <div className="absolute bottom-4 left-4 right-4 bg-white rounded-[3rem] p-8 pb-12 shadow-2xl animate-in slide-in-from-bottom-20 duration-500">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Explorar</h2>
              <button
                onClick={() => setShowMore(false)}
                className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-8">
              {groups.map(group => (
                <div key={group.id} className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <group.icon size={14} className="text-gray-300" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">{group.label}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {group.items.map(item => (
                      <a
                        key={item.label}
                        href={item.href}
                        className={`flex items-center justify-between p-4 rounded-2xl transition-all border-2 ${item.active
                          ? 'bg-gray-900 border-gray-900 text-white shadow-xl translate-x-1'
                          : 'bg-gray-50 border-gray-50 text-gray-600'
                          }`}
                      >
                        <div className="flex items-center gap-4">
                          <item.icon size={20} className={item.active ? 'text-white' : 'text-gray-400'} />
                          <span className="text-sm font-bold uppercase tracking-tight">{item.label}</span>
                        </div>
                        {item.active && <div className="w-2 h-2 bg-emerald-400 rounded-full shadow-[0_0_10px_rgba(52,211,153,0.8)]" />}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
