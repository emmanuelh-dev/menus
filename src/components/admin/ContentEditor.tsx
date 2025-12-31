import { useState } from 'react';
import { ManualUploader } from '../ManualUploader';

type BlockType = 'section' | 'gallery';

interface Block {
  id: string;
  type: BlockType;
  data: any;
}

const migrateFlatToNested = (content: any): Block[] => {
  if (!content?.blocks) return [];

  const nestedBlocks: Block[] = [];
  let currentSection: Block | null = null;

  content.blocks.forEach((block: any) => {
    if (block.type === 'section') {
      currentSection = {
        ...block,
        data: {
          ...block.data,
          items: []
        }
      };
      nestedBlocks.push(currentSection as any);
    } else if (block.type === 'item') {
      if (currentSection) {
        currentSection.data.items.push({
          id: block.id,
          ...block.data
        });
      }
    } else if (block.type === 'gallery') {
      nestedBlocks.push(block);
      currentSection = null;
    }
  });

  return nestedBlocks;
};

interface ItemData {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string;
}

interface SectionData {
  title: string;
  description?: string;
  image?: string;
  items: ItemData[];
}

interface GalleryData {
  images: { src: string; alt?: string; title?: string }[];
}

export default function ContentEditor({ placeId, initialContent }: { placeId: number; initialContent: any }) {
  const [blocks, setBlocks] = useState<Block[]>(() => {
    if (initialContent?.blocks) {
      const hasOldStructure = initialContent.blocks.some((block: any) => block.type === 'item');
      
      if (hasOldStructure) {
        return migrateFlatToNested(initialContent);
      }
      
      return initialContent.blocks;
    }
    
    // Migrar estructura antigua a bloques con items dentro de secciones
    const migratedBlocks: Block[] = [];
    if (initialContent?.sections) {
      initialContent.sections.forEach((section: any) => {
        migratedBlocks.push({
          id: `block-${Date.now()}-${Math.random()}`,
          type: 'section',
          data: {
            title: section.title,
            description: section.description,
            image: section.image,
            items: section.items?.map((item: any) => ({
              id: `item-${Date.now()}-${Math.random()}`,
              ...item
            })) || []
          }
        });
      });
    }
    
    if (initialContent?.gallery?.length > 0) {
      migratedBlocks.push({
        id: `block-${Date.now()}-${Math.random()}`,
        type: 'gallery',
        data: { images: initialContent.gallery }
      });
    }
    
    return migratedBlocks;
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [showBlockMenu, setShowBlockMenu] = useState<number | boolean>(false);

  const addBlock = (type: BlockType, afterIndex?: number) => {
    const newBlock: Block = {
      id: `block-${Date.now()}-${Math.random()}`,
      type,
      data: getDefaultDataForBlockType(type)
    };
    
    const newBlocks = [...blocks];
    if (afterIndex !== undefined) {
      newBlocks.splice(afterIndex + 1, 0, newBlock);
    } else {
      newBlocks.push(newBlock);
    }
    
    setBlocks(newBlocks);
    setShowBlockMenu(false);
  };

  const getDefaultDataForBlockType = (type: BlockType) => {
    switch (type) {
      case 'section':
        return { title: 'NUEVA SECCIÓN', description: '', image: '', items: [] };
      case 'gallery':
        return { images: [] };
      default:
        return {};
    }
  };

  const updateBlock = (index: number, data: any) => {
    const newBlocks = [...blocks];
    newBlocks[index].data = { ...newBlocks[index].data, ...data };
    setBlocks(newBlocks);
  };

  const removeBlock = (index: number) => {
    setBlocks(blocks.filter((_, i) => i !== index));
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= blocks.length) return;
    
    const newBlocks = [...blocks];
    [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
    setBlocks(newBlocks);
  };

  const duplicateBlock = (index: number) => {
    const newBlock = {
      ...blocks[index],
      id: `block-${Date.now()}-${Math.random()}`
    };
    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, newBlock);
    setBlocks(newBlocks);
  };

  const saveChanges = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/restaurants/${placeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: { 
            blocks,
            view_settings: { layout: 'grid', show_prices: true }
          } 
        })
      });
      if (response.ok) {
        alert('Contenido actualizado correctamente.');
      } else {
        const error = await response.json();
        console.error('Error al guardar:', error);
        alert('Error al guardar el contenido.');
      }
    } catch (err) {
      console.error(err);
      alert('Error al guardar el contenido.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sticky top-0 bg-white/90 backdrop-blur-md z-10 py-4 px-4 sm:px-0 border-b border-gray-100">
        <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tighter">Editor de Contenido</h1>
        <button 
          onClick={saveChanges} 
          disabled={isSaving}
          className="w-full sm:w-auto bg-black text-white px-6 sm:px-8 py-3 sm:py-2 rounded-full font-bold hover:bg-gray-800 disabled:opacity-50 transition-all"
        >
          {isSaving ? 'Guardando...' : 'Publicar'}
        </button>
      </header>

      {/* LISTADO DE BLOQUES */}
      <div className="space-y-4 px-4 sm:px-0">
        {blocks.map((block, index) => (
          <div key={block.id} className="relative">
            {/* Controles del bloque - Mobile friendly */}
            <div className="flex justify-end gap-2 mb-2 sm:absolute sm:-left-12 sm:top-4 sm:flex-col">
              <button 
                onClick={() => moveBlock(index, 'up')} 
                disabled={index === 0}
                className="w-8 h-8 bg-white border shadow-sm rounded-lg hover:bg-gray-50 disabled:opacity-30 flex items-center justify-center text-xs"
              >↑</button>
              <button 
                onClick={() => moveBlock(index, 'down')} 
                disabled={index === blocks.length - 1}
                className="w-8 h-8 bg-white border shadow-sm rounded-lg hover:bg-gray-50 disabled:opacity-30 flex items-center justify-center text-xs"
              >↓</button>
              <button 
                onClick={() => duplicateBlock(index)}
                className="w-8 h-8 bg-white border shadow-sm rounded-lg hover:bg-blue-50 flex items-center justify-center text-xs"
                title="Duplicar"
              >⧉</button>
              <button 
                onClick={() => removeBlock(index)}
                className="w-8 h-8 bg-white border shadow-sm rounded-lg hover:bg-red-50 text-red-500 flex items-center justify-center text-xs"
              >✕</button>
            </div>

            {/* Renderizar bloque según tipo */}
            {renderBlock(block, index)}

            {/* Botón para agregar bloque después */}
            <div className="flex justify-center mt-3">
              <button
                onClick={() => setShowBlockMenu(index)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2 rounded-full text-sm font-bold transition-colors"
              >
                + Agregar Bloque
              </button>
            </div>

            {/* Menú de selección de tipo de bloque */}
            {showBlockMenu === index && (
              <div className="mt-3 p-4 bg-white border rounded-xl shadow-lg">
                <p className="text-xs font-bold text-gray-500 mb-3">¿QUÉ QUIERES AGREGAR?</p>
                <div className="grid grid-cols-2 gap-2">
                  <BlockTypeButton icon="📋" label="Sección" onClick={() => addBlock('section', index)} />
                  <BlockTypeButton icon="🎨" label="Galería" onClick={() => addBlock('gallery', index)} />
                </div>
                <button
                  onClick={() => setShowBlockMenu(false)}
                  className="mt-3 text-xs text-gray-500 hover:text-gray-700 w-full text-center"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Botón inicial si no hay bloques */}
        {blocks.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-400 mb-4">No hay bloques. Comienza agregando uno.</p>
            <button
              onClick={() => setShowBlockMenu(true)}
              className="bg-black text-white px-6 py-3 rounded-full font-bold hover:bg-gray-800"
            >
              + Agregar Primer Bloque
            </button>
            
            {showBlockMenu === true && (
              <div className="mt-6 max-w-md mx-auto p-6 bg-white border rounded-xl shadow-lg">
                <p className="text-xs font-bold text-gray-500 mb-4">¿QUÉ QUIERES AGREGAR?</p>
                <div className="grid grid-cols-2 gap-3">
                  <BlockTypeButton icon="📋" label="Sección" onClick={() => addBlock('section')} />
                  <BlockTypeButton icon="🎨" label="Galería" onClick={() => addBlock('gallery')} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  function renderBlock(block: Block, index: number) {
    switch (block.type) {
      case 'section':
        return <SectionBlock data={block.data} onChange={(data) => updateBlock(index, data)} />;
      case 'gallery':
        return <GalleryBlock data={block.data} onChange={(data) => updateBlock(index, data)} />;
      default:
        return null;
    }
  }
}

function BlockTypeButton({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-xs font-bold text-gray-700">{label}</span>
    </button>
  );
}

function SectionBlock({ data, onChange }: { data: SectionData; onChange: (data: SectionData) => void }) {
  const addItem = () => {
    const newItem: ItemData = {
      id: `item-${Date.now()}-${Math.random()}`,
      name: '',
      price: 0,
      description: '',
      image: ''
    };
    onChange({ ...data, items: [...data.items, newItem] });
  };

  const updateItem = (itemIndex: number, itemData: Partial<ItemData>) => {
    const newItems = [...data.items];
    newItems[itemIndex] = { ...newItems[itemIndex], ...itemData };
    onChange({ ...data, items: newItems });
  };

  const removeItem = (itemIndex: number) => {
    onChange({ ...data, items: data.items.filter((_, i) => i !== itemIndex) });
  };

  const moveItem = (itemIndex: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? itemIndex - 1 : itemIndex + 1;
    if (targetIndex < 0 || targetIndex >= data.items.length) return;
    
    const newItems = [...data.items];
    [newItems[itemIndex], newItems[targetIndex]] = [newItems[targetIndex], newItems[itemIndex]];
    onChange({ ...data, items: newItems });
  };

  return (
    <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 sm:p-6 rounded-xl border-2 border-purple-200">
      <div className="space-y-4">
        <input
          value={data.title}
          onChange={(e) => onChange({ ...data, title: e.target.value })}
          placeholder="Título de la Sección"
          className="w-full text-xl sm:text-2xl font-black uppercase bg-transparent border-b-2 border-purple-300 pb-2 outline-none focus:border-purple-600"
        />
        
        <textarea
          value={data.description || ''}
          onChange={(e) => onChange({ ...data, description: e.target.value })}
          placeholder="Descripción (opcional)"
          rows={2}
          className="w-full text-sm bg-white/50 p-3 rounded-lg border border-purple-200 outline-none focus:border-purple-600"
        />
        
        <div>
          <label className="text-xs font-bold text-gray-600 mb-2 block">IMAGEN DE FONDO (opcional):</label>
          <ManualUploader
            currentImage={data.image}
            onFileUploaded={(url) => onChange({ ...data, image: url })}
            onUploadStart={() => console.log('Subiendo imagen de sección...')}
            onUploadError={() => console.error('Error al subir imagen')}
          />
        </div>

        {/* ITEMS DENTRO DE LA SECCIÓN */}
        <div className="mt-6 space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-bold text-purple-700 uppercase">Platillos de esta sección:</h4>
            <button
              onClick={addItem}
              className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-lg text-xs font-bold transition-colors"
            >
              + Platillo
            </button>
          </div>

          {data.items.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-4">No hay platillos. Agrega uno.</p>
          )}

          {data.items.map((item, itemIndex) => (
            <div key={item.id} className="bg-white p-4 rounded-lg border border-purple-100">
              <div className="flex justify-end gap-2 mb-3">
                <button
                  onClick={() => moveItem(itemIndex, 'up')}
                  disabled={itemIndex === 0}
                  className="w-6 h-6 bg-gray-100 border rounded hover:bg-gray-200 disabled:opacity-30 flex items-center justify-center text-xs"
                >↑</button>
                <button
                  onClick={() => moveItem(itemIndex, 'down')}
                  disabled={itemIndex === data.items.length - 1}
                  className="w-6 h-6 bg-gray-100 border rounded hover:bg-gray-200 disabled:opacity-30 flex items-center justify-center text-xs"
                >↓</button>
                <button
                  onClick={() => removeItem(itemIndex)}
                  className="w-6 h-6 bg-red-50 border border-red-200 rounded hover:bg-red-100 text-red-500 flex items-center justify-center text-xs"
                >✕</button>
              </div>

              <div className="space-y-3">
                <div className="w-full">
                  <ManualUploader
                    currentImage={item.image}
                    onFileUploaded={(url) => updateItem(itemIndex, { image: url })}
                    onUploadStart={() => console.log('Subiendo imagen del item...')}
                    onUploadError={() => console.error('Error al subir imagen')}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <input
                    value={item.name}
                    onChange={(e) => updateItem(itemIndex, { name: e.target.value })}
                    placeholder="Nombre del platillo"
                    className="sm:col-span-3 text-sm sm:text-base font-bold bg-gray-50 border border-gray-200 rounded px-3 py-2 outline-none focus:border-purple-600"
                  />
                  <input
                    type="number"
                    value={item.price}
                    onChange={(e) => updateItem(itemIndex, { price: parseFloat(e.target.value) })}
                    placeholder="0.00"
                    className="text-left sm:text-right text-sm sm:text-base font-black text-red-600 bg-gray-50 border border-gray-200 rounded px-3 py-2 outline-none focus:border-purple-600"
                  />
                </div>

                <textarea
                  value={item.description}
                  onChange={(e) => updateItem(itemIndex, { description: e.target.value })}
                  placeholder="Descripción del platillo..."
                  rows={2}
                  className="w-full text-sm text-gray-700 p-2 rounded bg-gray-50 border border-gray-200 outline-none focus:border-purple-600 resize-none"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function GalleryBlock({ data, onChange }: { data: GalleryData; onChange: (data: GalleryData) => void }) {
  const addImageToGallery = (url: string) => {
    onChange({
      ...data,
      images: [...(data.images || []), { src: url, alt: '', title: '' }]
    });
  };

  const removeImageFromGallery = (index: number) => {
    onChange({
      ...data,
      images: data.images.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="bg-gray-900 text-white p-4 sm:p-6 rounded-xl border-2 border-gray-700">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl sm:text-2xl">🎨</span>
        <span className="text-xs font-bold text-gray-300 uppercase">Galería</span>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {data.images?.map((img, gIdx) => (
          <div key={gIdx} className="relative aspect-square group overflow-hidden rounded-xl">
            <img src={img.src} alt={img.alt || ''} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
            <button
              onClick={() => removeImageFromGallery(gIdx)}
              className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center bg-red-600 text-white rounded-full sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-red-700"
            >✕</button>
          </div>
        ))}
        
        <div className="aspect-square flex items-center justify-center border-2 border-dashed border-gray-700 rounded-xl bg-gray-800/50 hover:bg-gray-800 transition-colors">
          <ManualUploader
            onFileUploaded={addImageToGallery}
            onUploadStart={() => console.log('Subiendo imagen a galería...')}
            onUploadError={() => console.error('Error al subir imagen')}
          />
        </div>
      </div>
    </div>
  );
}