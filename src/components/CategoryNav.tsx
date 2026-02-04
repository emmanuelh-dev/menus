import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Tag } from 'lucide-react';

interface Section {
  id: string;
  data: {
    title: string;
    category?: string;
  }
}

interface Props {
  blocks: any[];
}

export default function CategoryNav({ blocks }: Props) {
  const [activeId, setActiveId] = useState<string>('');
  const [isSticky, setIsSticky] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  const sections = blocks.filter(b => b.type === 'section') as Section[];

  // Group sections by category
  const groups: { [key: string]: Section[] } = {};
  const topLevelSections: Section[] = [];

  sections.forEach(s => {
    if (s.data.category) {
      if (!groups[s.data.category]) groups[s.data.category] = [];
      groups[s.data.category].push(s);
    } else {
      topLevelSections.push(s);
    }
  });

  const categories = Object.keys(groups);

  useEffect(() => {
    const handleScroll = () => {
      if (!navRef.current) return;
      const offset = navRef.current.offsetTop;
      setIsSticky(window.scrollY > offset - 10);

      // Find active section
      for (const section of sections) {
        const el = document.getElementById(section.id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top >= 0 && rect.top <= 200) {
            setActiveId(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [sections]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      window.scrollTo({
        top: el.offsetTop - 120,
        behavior: 'smooth'
      });
    }
    setOpenDropdown(null);
  };

  if (sections.length < 3) return null;

  return (
    <div
      ref={navRef}
      className={`z-40 transition-all duration-300 ${isSticky
        ? 'fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md  border-b border-gray-100 py-2'
        : 'relative py-4'
        }`}
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {categories.map(cat => {
            const groupSections = groups[cat];
            const isGroupActive = groupSections.some(s => s.id === activeId);

            return (
              <div key={cat} className="relative shrink-0">
                <button
                  onClick={() => setOpenDropdown(openDropdown === cat ? null : cat)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${isGroupActive
                    ? 'bg-gray-900 text-white shadow-md'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                >
                  <Tag size={12} className={isGroupActive ? 'text-emerald-400' : 'text-gray-300'} />
                  {cat}
                  <ChevronDown size={10} className={`transition-transform ${openDropdown === cat ? 'rotate-180' : ''}`} />
                </button>

                {openDropdown === cat && (
                  <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-gray-100 shadow-2xl rounded-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {groupSections.map(s => (
                      <button
                        key={s.id}
                        onClick={() => scrollTo(s.id)}
                        className={`w-full text-left p-3 rounded-xl text-[10px] font-bold uppercase tracking-tight transition-all ${activeId === s.id
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                      >
                        {s.data.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {topLevelSections.map(s => (
            <button
              key={s.id}
              onClick={() => scrollTo(s.id)}
              className={`shrink-0 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeId === s.id
                ? 'bg-gray-900 text-white shadow-md'
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
                }`}
            >
              {s.data.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
