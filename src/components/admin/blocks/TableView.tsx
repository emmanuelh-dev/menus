import { PiImage, PiEye, PiEyeSlash } from 'react-icons/pi';
import type { Block, ItemData } from './types';

interface TableViewProps {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
}

export function TableView({ blocks, onChange }: TableViewProps) {
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

  const sections = blocks.filter(b => b.type === 'section');

  return (
    <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm lg:mx-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Imagen</th>
              <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Producto</th>
              <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Sección</th>
              <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Precio</th>
              <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sections.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-20 text-center text-gray-400 font-bold uppercase text-xs tracking-[0.2em]">
                  No hay productos para mostrar.
                </td>
              </tr>
            ) : sections.map(block =>
              block.data.items.map((item: ItemData, idx: number) => (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="p-5">
                    <div className="w-14 h-14 rounded-2xl bg-gray-50 overflow-hidden border border-gray-100 shadow-sm relative group/img">
                      {item.image ? (
                        <img src={item.image} className="w-full h-full object-cover transition-transform group-hover/img:scale-110" alt="" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <PiImage className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-5 min-w-[280px]">
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
                  <td className="p-5 whitespace-nowrap">
                    <span className="text-[9px] font-black bg-gray-100/80 text-gray-500 px-3 py-1.5 rounded-xl uppercase tracking-widest">
                      {block.data.title || 'General'}
                    </span>
                  </td>
                  <td className="p-5">
                    <div className="flex items-center gap-1 font-mono text-base font-black text-emerald-600 bg-emerald-50/50 px-4 py-2 rounded-2xl border border-emerald-100/50 w-fit">
                      <span className="opacity-30">$</span>
                      <input
                        className="w-20 bg-transparent outline-none"
                        type="number"
                        step="0.01"
                        value={item.price}
                        onChange={(e) => updateItem(block.id, idx, { price: parseFloat(e.target.value) })}
                      />
                    </div>
                  </td>
                  <td className="p-5">
                    <div className="flex justify-center">
                      <button
                        onClick={() => updateItem(block.id, idx, { available: !(item.available ?? true) })}
                        className={`group relative flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 ${(item.available ?? true)
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
  );
}
