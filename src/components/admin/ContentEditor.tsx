/**
 * ESTRUCTURA DEL CONTENT JSONB:
 * {
 *   blocks: Block[],
 *   view_settings: { layout: 'grid' | 'list', show_prices: boolean }
 * }
 * 
 * TIPOS DE BLOQUES:
 * - section: { title, description?, image?, items: ItemData[] }
 * - gallery: { images: Array<{ src, alt?, title? }> }
 * - image: { src, alt?, caption? }
 * 
 * ITEM (platillo/habitación):
 * - name: string
 * - price: number
 * - description: string
 * - image: string
 * - features?: string[] // ["Jacuzzi", "Clima", "Smart TV"] para moteles
 */
import { useState, useRef } from 'react';
import { ManualUploader } from '../ManualUploader';

type BlockType = 'section' | 'gallery' | 'image';

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
  features?: string[];
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
  const [showBlockMenu, setShowBlockMenu] = useState<string | boolean>(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiInputMode, setAiInputMode] = useState<'image' | 'text'>('image');
  const [textInput, setTextInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      case 'image':
        return { src: '', alt: '', caption: '' };
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

  const normalizeTitle = (title: string) => {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  };

  const findSimilarSection = (title: string) => {
    const normalized = normalizeTitle(title);
    return blocks.findIndex(
      block => block.type === 'section' && normalizeTitle(block.data.title) === normalized
    );
  };

  const isItemDuplicate = (sectionItems: ItemData[], newItem: any) => {
    const normalizedName = normalizeTitle(newItem.name);
    return sectionItems.some(item => normalizeTitle(item.name) === normalizedName);
  };

  const analyzeMenuImage = async (file: File) => {
    setAiProcessing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);

      await new Promise((resolve) => {
        reader.onloadend = resolve;
      });

      const base64Image = (reader.result as string).split(',')[1];

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${import.meta.env.PUBLIC_GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                {
                  text: `Analiza esta imagen de menu de restaurante y extrae TODA la informacion en formato JSON con esta estructura exacta:
{
  "sections": [
    {
      "title": "NOMBRE DE LA SECCION",
      "description": "descripcion opcional",
      "items": [
        {
          "name": "nombre del platillo",
          "price": 150.00,
          "description": "descripcion del platillo"
        }
      ]
    }
  ]
}

IMPORTANTE: 
- Extrae TODOS los platillos y precios que veas
- Si no hay precio, usa 0
- Agrupa por secciones logicas
- Responde SOLO con el JSON, sin texto adicional`
                },
                {
                  inline_data: {
                    mime_type: file.type,
                    data: base64Image
                  }
                }
              ]
            }]
          })
        }
      );

      const result = await response.json();
      processAIResponse(result);

    } catch (err) {
      console.error('Error al analizar imagen:', err);
      alert('Error al procesar la imagen con IA');
    } finally {
      setAiProcessing(false);
    }
  };

  const analyzeMenuText = async (text: string) => {
    setAiProcessing(true);
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${import.meta.env.PUBLIC_GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Analiza este texto de menu de restaurante y extrae TODA la informacion en formato JSON con esta estructura exacta:
{
  "sections": [
    {
      "title": "NOMBRE DE LA SECCION",
      "description": "descripcion opcional",
      "items": [
        {
          "name": "nombre del platillo",
          "price": 150.00,
          "description": "descripcion del platillo"
        }
      ]
    }
  ]
}

IMPORTANTE: 
- Extrae TODOS los platillos y precios que veas
- Si no hay precio, usa 0
- Agrupa por secciones logicas
- Responde SOLO con el JSON, sin texto adicional

TEXTO DEL MENU:
${text}`
              }]
            }]
          })
        }
      );

      const result = await response.json();
      processAIResponse(result);
      setTextInput('');

    } catch (err) {
      console.error('Error al analizar texto:', err);
      alert('Error al procesar el texto con IA');
    } finally {
      setAiProcessing(false);
    }
  };

  const processAIResponse = (result: any) => {
    try {
      const textContent = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No se encontro JSON en la respuesta');

      const parsed = JSON.parse(jsonMatch[0]);

      const updatedBlocks = [...blocks];
      let sectionsAdded = 0;
      let itemsAdded = 0;
      let itemsSkipped = 0;

      parsed.sections.forEach((section: any) => {
        const existingSectionIndex = findSimilarSection(section.title);

        if (existingSectionIndex !== -1) {
          const existingSection = updatedBlocks[existingSectionIndex];
          const newItems = section.items
            .filter((item: any) => !isItemDuplicate(existingSection.data.items, item))
            .map((item: any) => ({
              id: `item-${Date.now()}-${Math.random()}`,
              name: item.name,
              price: item.price || 0,
              description: item.description || '',
              image: ''
            }));

          itemsSkipped += section.items.length - newItems.length;
          itemsAdded += newItems.length;

          updatedBlocks[existingSectionIndex] = {
            ...existingSection,
            data: {
              ...existingSection.data,
              items: [...existingSection.data.items, ...newItems]
            }
          };
        } else {
          sectionsAdded++;
          itemsAdded += section.items.length;

          updatedBlocks.push({
            id: `block-${Date.now()}-${Math.random()}`,
            type: 'section',
            data: {
              title: section.title,
              description: section.description || '',
              image: '',
              items: section.items.map((item: any) => ({
                id: `item-${Date.now()}-${Math.random()}`,
                name: item.name,
                price: item.price || 0,
                description: item.description || '',
                image: ''
              }))
            }
          });
        }
      });

      setBlocks(updatedBlocks);
      setShowAIChat(false);

      const message = [
        sectionsAdded > 0 && `${sectionsAdded} secciones nuevas`,
        itemsAdded > 0 && `${itemsAdded} platillos agregados`,
        itemsSkipped > 0 && `${itemsSkipped} platillos omitidos (ya existían)`
      ].filter(Boolean).join(', ');

      alert(`✓ ${message || 'No se encontraron cambios'}`);

    } catch (err) {
      console.error('Error en processAIResponse:', err);
      throw err;
    }
  };

  const handleAIImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      analyzeMenuImage(file);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sticky top-0 bg-white/90 backdrop-blur-md z-10 py-4 px-4 sm:px-0 border-b border-gray-100">
        <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tighter">Editor de Contenido</h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowAIChat(!showAIChat)}
            className="flex-1 sm:flex-none bg-purple-600 text-white px-6 py-3 sm:py-2 rounded-full font-bold hover:bg-purple-700 transition-all"
          >
            IA
          </button>
          <button
            onClick={saveChanges}
            disabled={isSaving}
            className="flex-1 sm:flex-none bg-black text-white px-6 py-3 sm:py-2 rounded-full font-bold hover:bg-gray-800 disabled:opacity-50 transition-all"
          >
            {isSaving ? 'Guardando...' : 'Publicar'}
          </button>
        </div>
      </header>

      {showAIChat && (
        <div className="mx-4 sm:mx-0 p-6 bg-gradient-to-br from-purple-100 to-blue-100 rounded-xl border-2 border-purple-300 shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-lg font-black uppercase mb-1">Asistente IA</h2>
              <p className="text-sm text-gray-600">Detecta automaticamente secciones existentes y agrega solo lo que falta</p>
            </div>
            <button
              onClick={() => setShowAIChat(false)}
              className="text-gray-500 hover:text-gray-700"
            >✕</button>
          </div>

          {/* Toggle entre Imagen y Texto */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setAiInputMode('image')}
              className={`flex-1 py-2 px-4 rounded-lg font-bold transition-colors ${
                aiInputMode === 'image'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-purple-600 border border-purple-300'
              }`}
            >
              📸 Imagen
            </button>
            <button
              onClick={() => setAiInputMode('text')}
              className={`flex-1 py-2 px-4 rounded-lg font-bold transition-colors ${
                aiInputMode === 'text'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-purple-600 border border-purple-300'
              }`}
            >
              📝 Texto
            </button>
          </div>

          {/* Input de Imagen */}
          {aiInputMode === 'image' && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAIImageUpload}
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={aiProcessing}
                className="w-full bg-white border-2 border-dashed border-purple-400 rounded-lg p-8 hover:bg-purple-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {aiProcessing ? (
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-2"></div>
                    <p className="font-bold text-purple-700">Analizando imagen...</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <span className="text-4xl block mb-2">📸</span>
                    <p className="font-bold text-purple-700">Click para subir imagen del menu</p>
                    <p className="text-xs text-gray-500 mt-1">JPG, PNG o WEBP</p>
                  </div>
                )}
              </button>
            </>
          )}

          {/* Input de Texto */}
          {aiInputMode === 'text' && (
            <div className="space-y-3">
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Pega aqui el contenido del menu completo&#10;&#10;Ejemplo:&#10;ENTRADAS&#10;Guacamole - $120&#10;Queso fundido con chorizo - $150&#10;&#10;PLATOS FUERTES&#10;Tacos al pastor (3 piezas) - $90&#10;..."
                rows={12}
                disabled={aiProcessing}
                className="w-full p-4 rounded-lg border-2 border-purple-300 outline-none focus:border-purple-600 disabled:opacity-50 disabled:cursor-not-allowed resize-none"
              />
              <button
                onClick={() => textInput.trim() && analyzeMenuText(textInput)}
                disabled={aiProcessing || !textInput.trim()}
                className="w-full bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {aiProcessing ? (
                  <span className="flex items-center justify-center">
                    <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Analizando texto...
                  </span>
                ) : (
                  '🤖 Analizar con IA'
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* LISTADO DE BLOQUES */}
      <div className="space-y-4 lg:px-4 sm:px-0">
        {blocks.map((block, index) => (
          <div key={block.id} className="relative">
            {/* Botón para agregar antes del primer bloque */}
            {index === 0 && (
              <>
                <div className="flex justify-center my-4">
                  <button
                    onClick={() => setShowBlockMenu(`before-${index}`)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2 rounded-full text-sm font-bold transition-colors"
                  >
                    + Agregar Bloque
                  </button>
                </div>

                {showBlockMenu === `before-${index}` && (
                  <div className="mb-3 p-4 bg-white border rounded-xl shadow-lg">
                    <p className="text-xs font-bold text-gray-500 mb-3">¿QUÉ QUIERES AGREGAR?</p>
                    <div className="grid grid-cols-3 gap-2">
                      <BlockTypeButton icon="📋" label="Sección" onClick={() => addBlock('section', index - 1)} />
                      <BlockTypeButton icon="🖼️" label="Imagen" onClick={() => addBlock('image', index - 1)} />
                      <BlockTypeButton icon="🎨" label="Galería" onClick={() => addBlock('gallery', index - 1)} />
                    </div>
                    <button
                      onClick={() => setShowBlockMenu(false)}
                      className="mt-3 text-xs text-gray-500 hover:text-gray-700 w-full text-center"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </>
            )}

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

            {/* Botón para agregar después de cada bloque */}
            <div className="flex justify-center my-4">
              <button
                onClick={() => setShowBlockMenu(`after-${index}`)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2 rounded-full text-sm font-bold transition-colors"
              >
                + Agregar Bloque
              </button>
            </div>

            {showBlockMenu === `after-${index}` && (
              <div className="mt-3 p-4 bg-white border rounded-xl shadow-lg">
                <p className="text-xs font-bold text-gray-500 mb-3">¿QUÉ QUIERES AGREGAR?</p>
                <div className="grid grid-cols-3 gap-2">
                  <BlockTypeButton icon="📋" label="Sección" onClick={() => addBlock('section', index)} />
                  <BlockTypeButton icon="🖼️" label="Imagen" onClick={() => addBlock('image', index)} />
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
                <div className="grid grid-cols-3 gap-3">
                  <BlockTypeButton icon="📋" label="Sección" onClick={() => addBlock('section')} />
                  <BlockTypeButton icon="🖼️" label="Imagen" onClick={() => addBlock('image')} />
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
      case 'image':
        return <ImageBlock data={block.data} onChange={(data) => updateBlock(index, data)} />;
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
      image: '',
      features: []
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
            onFilesUploaded={(url) => onChange({ ...data, image: url[0] })}
            onUploadStart={() => console.log('Subiendo imagen de sección...')}
            onUploadError={() => console.error('Error al subir imagen')}
          />
        </div>

        {/* ITEMS DENTRO DE LA SECCIÓN */}
        <div className="mt-6 space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-bold text-purple-700 uppercase">Items de esta sección:</h4>
            <button
              onClick={addItem}
              className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-lg text-xs font-bold transition-colors"
            >
              + Item
            </button>
          </div>

          {data.items.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-4">No hay items. Agrega uno.</p>
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

                <div className="grid grid-cols-4 gap-2">
                  <input
                    value={item.name}
                    onChange={(e) => updateItem(itemIndex, { name: e.target.value })}
                    placeholder="Nombre del platillo"
                    className="col-span-3 text-sm sm:text-base font-bold bg-gray-50 border border-gray-200 rounded px-3 py-2 outline-none focus:border-purple-600"
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

                <div>
                  <label className="text-xs font-bold text-gray-600 mb-2 block">CARACTERÍSTICAS (ej: Jacuzzi, Clima):</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {item.features?.map((feature, fIdx) => (
                      <span key={fIdx} className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                        {feature}
                        <button
                          onClick={() => {
                            const newFeatures = item.features?.filter((_, i) => i !== fIdx);
                            updateItem(itemIndex, { features: newFeatures });
                          }}
                          className="hover:text-red-600"
                        >×</button>
                      </span>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Agregar característica (Enter para añadir)"
                    className="w-full text-sm p-2 rounded bg-gray-50 border border-gray-200 outline-none focus:border-purple-600"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                        const newFeature = e.currentTarget.value.trim();
                        const currentFeatures = item.features || [];
                        updateItem(itemIndex, { features: [...currentFeatures, newFeature] });
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                </div>
              </div>
              <div className="w-full">
                <ManualUploader
                  currentImage={item.image}
                  onFilesUploaded={(url) => updateItem(itemIndex, { image: url[0] })}
                  onUploadStart={() => console.log('Subiendo imagen del item...')}
                  onUploadError={() => console.error('Error al subir imagen')}
                />
              </div>
              <button
                onClick={addItem}
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-lg text-xs font-bold transition-colors"
              >
                + Item
              </button>
            </div>

          ))}

        </div>
      </div>
    </div>
  );
}

function GalleryBlock({ data, onChange }: { data: GalleryData; onChange: (data: GalleryData) => void }) {
  const addImageToGallery = (urls: string[]) => {
    const newImages = urls.map(url => ({ src: url, alt: '', title: '' }));
    onChange({
      ...data,
      images: [...(data.images || []), ...newImages]
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
            onFilesUploaded={addImageToGallery}
            multiple
            onUploadError={() => console.error('Error al subir imagen')}
          />
        </div>
      </div>
    </div>
  );
}

interface ImageData {
  src: string;
  alt?: string;
  caption?: string;
}

function ImageBlock({ data, onChange }: { data: ImageData; onChange: (data: ImageData) => void }) {
  return (
    <div className="bg-blue-50 p-4 sm:p-6 rounded-xl border-2 border-blue-200">
      <div className="space-y-4">
        {data.src ? (
          <div className="relative">
            <img
              src={data.src}
              alt={data.alt || ''}
              className="w-full rounded-lg shadow-lg"
            />
          </div>
        ) : (
          <div className="bg-white/50 rounded-lg p-8 text-center text-gray-400">
            Sube una imagen
          </div>
        )}

        <ManualUploader
          currentImage={data.src}
          onFilesUploaded={(url) => onChange({ ...data, src: url[0] })}
          onUploadStart={() => console.log('Subiendo imagen...')}
          onUploadError={() => console.error('Error al subir imagen')}
        />

        <input
          value={data.alt || ''}
          onChange={(e) => onChange({ ...data, alt: e.target.value })}
          placeholder="Texto alternativo (opcional)"
          className="w-full text-sm bg-white/50 p-3 rounded-lg border border-blue-200 outline-none focus:border-blue-600"
        />

        <textarea
          value={data.caption || ''}
          onChange={(e) => onChange({ ...data, caption: e.target.value })}
          placeholder="Pie de imagen (opcional)"
          rows={2}
          className="w-full text-sm bg-white/50 p-3 rounded-lg border border-blue-200 outline-none focus:border-blue-600 resize-none"
        />
      </div>
    </div>
  );
}