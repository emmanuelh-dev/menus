import { useMemo, useState } from 'react';
import { PiImage, PiEye, PiEyeSlash, PiPlus } from 'react-icons/pi';
import type { Block, ItemData } from './types';

interface TableViewProps {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
}

export function TableView({ blocks, onChange }: TableViewProps) {
  const sections = useMemo(() => blocks.filter(b => b.type === 'section'), [blocks]);

  const [newCategoryTitle, setNewCategoryTitle] = useState('');
  const [newProductSectionId, setNewProductSectionId] = useState<string>('');
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState<string>('');
  const [productFilterSectionId, setProductFilterSectionId] = useState<string>('all');

  const updateSection = (blockId: string, newSectionData: any) => {
    const newBlocks = blocks.map(block => {
      if (block.id === blockId && block.type === 'section') {
        return { ...block, data: { ...block.data, ...newSectionData } };
      }
      return block;
    });
    onChange(newBlocks);
  };

  const updateItem = (blockId: string, itemIndex: number, newItemData: Partial<ItemData>) => {
    const newBlocks = blocks.map(block => {
      if (block.id === blockId && block.type === 'section') {
        const newItems = [...block.data.items];
        newItems[itemIndex] = { ...newItems[itemIndex], ...newItemData };
        return { ...block, data: { ...block.data, items: newItems } };
      }
      return block;
    });
    onChange(newBlocks);
  };

  const addCategory = () => {
    const title = newCategoryTitle.trim() || 'NUEVA CATEGORÍA';
    const newSection: Block = {
      id: `block-${Date.now()}-${Math.random()}`,
      type: 'section',
      data: { title, description: '', image: '', items: [] }
    };
    onChange([...blocks, newSection]);
    setNewCategoryTitle('');
    setNewProductSectionId(newSection.id);
  };

  const addProduct = () => {
    const targetSectionId = newProductSectionId || sections[0]?.id;
    if (!targetSectionId) return;

    const name = newProductName.trim();
    if (!name) return;

    const price = Number.parseFloat(newProductPrice || '0');
    const item: ItemData = {
      id: `item-${Date.now()}-${Math.random()}`,
      name,
      price: Number.isFinite(price) ? price : 0,
      description: '',
      image: '',
      available: true,
    };

    const newBlocks = blocks.map(block => {
      if (block.id === targetSectionId && block.type === 'section') {
        return { ...block, data: { ...block.data, items: [...(block.data.items || []), item] } };
      }
      return block;
    });

    onChange(newBlocks);
    setNewProductName('');
    setNewProductPrice('');
  };

  const moveItemToSection = (fromSectionId: string, itemIndex: number, toSectionId: string) => {
    if (!toSectionId || fromSectionId === toSectionId) return;

    const fromSection = blocks.find(b => b.id === fromSectionId && b.type === 'section');
    const toSection = blocks.find(b => b.id === toSectionId && b.type === 'section');
    if (!fromSection || !toSection) return;

    const itemToMove = fromSection.type === 'section' ? fromSection.data.items?.[itemIndex] : undefined;
    if (!itemToMove) return;

    const newBlocks = blocks.map(block => {
      if (block.type !== 'section') return block;
      if (block.id === fromSectionId) {
        const newItems = [...(block.data.items || [])];
        newItems.splice(itemIndex, 1);
        return { ...block, data: { ...block.data, items: newItems } };
      }
      if (block.id === toSectionId) {
        return { ...block, data: { ...block.data, items: [...(block.data.items || []), itemToMove] } };
      }
      return block;
    });

    onChange(newBlocks);
  };

  const sectionOptions = useMemo(() => {
    return sections.map(s => ({ id: s.id, title: s.data?.title || 'General' }));
  }, [sections]);

  const visibleProductSections = useMemo(() => {
    if (productFilterSectionId === 'all') return sections;
    return sections.filter(s => s.id === productFilterSectionId);
  }, [productFilterSectionId, sections]);

  const getItemVariantsSummary = (item: ItemData) => {
    const options = item.options || [];
    if (options.length === 0) return '';
    return options
      .map(opt => {
        const values = (opt.values || []).filter(Boolean);
        return values.length > 0 ? `${opt.name}: ${values.join(', ')}` : opt.name;
      })
      .join(' | ');
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Categorías</p>
              <p className="text-xs font-bold text-gray-700">Crea y edita las categorías del menú.</p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                value={newCategoryTitle}
                onChange={(e) => setNewCategoryTitle(e.target.value)}
                placeholder="Nueva categoría"
                className="flex-1 sm:w-64 text-sm px-3 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 bg-gray-50/30"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addCategory();
                }}
              />
              <button
                onClick={addCategory}
                className="px-4 py-2.5 rounded-xl bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-black active:scale-95 transition-all flex items-center gap-2 whitespace-nowrap"
              >
                <PiPlus className="w-4 h-4" />
                Agregar
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Categoría</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Productos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sections.length === 0 ? (
                <tr>
                  <td colSpan={2} className="p-10 text-center text-gray-400 font-bold uppercase text-xs tracking-[0.2em]">
                    Crea una categoría para empezar.
                  </td>
                </tr>
              ) : (
                sections.map(section => (
                  <tr key={section.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 min-w-[320px]">
                      <input
                        className="w-full bg-transparent font-black text-sm outline-none focus:text-indigo-600 transition-colors uppercase tracking-tight"
                        value={section.data.title || ''}
                        onChange={(e) => updateSection(section.id, { title: e.target.value })}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-black text-gray-500 bg-gray-100/80 px-3 py-1.5 rounded-xl uppercase tracking-widest">
                        {(section.data.items?.length || 0).toString()}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Productos</p>
              <p className="text-xs font-bold text-gray-700">Agrega productos y asigna su categoría.</p>
            </div>

            <div className="flex items-center gap-2 w-full lg:w-auto">
              <select
                value={productFilterSectionId}
                onChange={(e) => {
                  const next = e.target.value;
                  setProductFilterSectionId(next);
                  if (next !== 'all') setNewProductSectionId(next);
                }}
                disabled={sections.length === 0}
                className="flex-1 lg:flex-none lg:w-56 text-sm px-3 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 bg-gray-50/30 disabled:opacity-50"
                title="Filtrar para ver una sola categoría"
              >
                <option value="all">Todas las categorías</option>
                {sectionOptions.map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.title}</option>
                ))}
              </select>
              <select
                value={newProductSectionId || sections[0]?.id || ''}
                onChange={(e) => setNewProductSectionId(e.target.value)}
                disabled={sections.length === 0}
                className="flex-1 lg:flex-none lg:w-64 text-sm px-3 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 bg-gray-50/30 disabled:opacity-50"
              >
                {sectionOptions.map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.title}</option>
                ))}
              </select>
              <input
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
                placeholder="Nombre del producto"
                disabled={sections.length === 0}
                className="flex-[2] text-sm px-3 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 bg-gray-50/30 disabled:opacity-50"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addProduct();
                }}
              />
              <input
                value={newProductPrice}
                onChange={(e) => setNewProductPrice(e.target.value)}
                placeholder="Precio"
                disabled={sections.length === 0}
                className="w-24 text-sm px-3 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 bg-gray-50/30 disabled:opacity-50"
                inputMode="decimal"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addProduct();
                }}
              />
              <button
                onClick={addProduct}
                disabled={sections.length === 0}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 active:scale-95 transition-all flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
              >
                <PiPlus className="w-4 h-4" />
                Agregar
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Imagen</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Producto</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Categoría</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Precio</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Variantes</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sections.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-20 text-center text-gray-400 font-bold uppercase text-xs tracking-[0.2em]">
                    No hay productos para mostrar.
                  </td>
                </tr>
              ) : visibleProductSections.map(block =>
                block.data.items.map((item: ItemData, idx: number) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="w-12 h-12 rounded-xl bg-gray-50 overflow-hidden border border-gray-100 relative group/img">
                        {item.image ? (
                          <img src={item.image} className="w-full h-full object-cover transition-transform group-hover/img:scale-110" alt="" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <PiImage className="w-6 h-6" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 min-w-[260px]">
                      <input
                        className="w-full bg-transparent font-black text-sm outline-none focus:text-indigo-600 transition-colors uppercase tracking-tight"
                        value={item.name}
                        onChange={(e) => updateItem(block.id, idx, { name: e.target.value })}
                      />
                      <input
                        className="w-full bg-transparent text-[10px] text-gray-400 outline-none block mt-1 font-medium italic"
                        value={item.description}
                        onChange={(e) => updateItem(block.id, idx, { description: e.target.value })}
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap min-w-[200px]">
                      <select
                        value={block.id}
                        onChange={(e) => moveItemToSection(block.id, idx, e.target.value)}
                        className="w-full text-[10px] font-black bg-gray-100/80 text-gray-600 px-3 py-2 rounded-xl uppercase tracking-widest outline-none border border-gray-200 focus:border-gray-900"
                      >
                        {sectionOptions.map(opt => (
                          <option key={opt.id} value={opt.id}>{opt.title}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 font-mono text-sm font-black text-emerald-600 bg-emerald-50/50 px-3 py-2 rounded-xl border border-emerald-100/50 w-fit">
                        <span className="opacity-30">$</span>
                        <input
                          className="w-20 bg-transparent outline-none"
                          type="number"
                          step="0.01"
                          value={item.price}
                          onChange={(e) => {
                            const nextPrice = Number.parseFloat(e.target.value);
                            updateItem(block.id, idx, { price: Number.isFinite(nextPrice) ? nextPrice : 0 });
                          }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {item.options && item.options.length > 0 ? (
                        <span
                          className="text-[10px] font-black text-indigo-700 bg-indigo-50/70 px-3 py-1.5 rounded-xl uppercase tracking-widest border border-indigo-100"
                          title={getItemVariantsSummary(item)}
                        >
                          {item.options.length}
                        </span>
                      ) : (
                        <span className="text-[10px] font-black text-gray-400 bg-gray-50 px-3 py-1.5 rounded-xl uppercase tracking-widest border border-gray-100">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        <button
                          onClick={() => updateItem(block.id, idx, { available: !(item.available ?? true) })}
                          className={`group relative flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 ${(item.available ?? true)
                            ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white shadow-sm hover:shadow-emerald-200'
                            : 'bg-stone-100 text-stone-400 hover:bg-stone-800 hover:text-white'
                            }`}
                        >
                          {(item.available ?? true) ? (
                            <><PiEye className="w-4 h-4" /> Activo</>
                          ) : (
                            <><PiEyeSlash className="w-4 h-4" /> Apagado</>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
