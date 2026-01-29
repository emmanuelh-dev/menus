/**
 * ESTRUCTURA DEL CONTENT JSONB:
 * {
 *   semantic_data?: {
 *     areas?: string[],
 *     address?: string,
 *     price_range?: string,
 *     ambiance?: string,
 *     hours?: string,
 *     website?: string,
 *     payment_options?: string[],
 *     dress_code?: string,
 *     phone?: string,
 *     whatsapp?: string,
 *     enable_cart?: boolean,
 *     cuisine_type?: string,
 *     zone?: string,
 *     cross_street?: string,
 *     parking?: string,
 *     variety?: string,
 *     additional_features?: string[]
 *   },
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
import { useState, useRef, useEffect } from 'react';
import { ManualUploader } from '../ManualUploader';
import type { SemanticData } from '../../types/app';
import MotelPageRenderer from '../MotelPageRenderer';
import {
  PiPlus,
  PiTrash,
  PiDotsSixVertical,
  PiCaretUp,
  PiCaretDown,
  PiCopy,
  PiEye,
  PiLayout,
  PiFloppyDisk,
  PiUpload,
  PiImage,
  PiFileText,
  PiPaperPlaneTilt,
  PiX,
  PiPaperclip,
  PiArrowCounterClockwise,
  PiSparkle,
  PiMagnifyingGlass,
  PiCheckCircle,
  PiWarningCircle
} from 'react-icons/pi';

type BlockType = 'section' | 'gallery' | 'image' | 'carrusel';

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
  gallery?: { src: string; alt?: string; title?: string }[];
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


export default function ContentEditor({ placeId, initialContent, placeType = 'restaurant', placeData }: { placeId: number; initialContent: any; placeType?: 'restaurant' | 'motel'; placeData?: any }) {
  const [blocks, setBlocks] = useState<Block[]>(() => {
    if (initialContent?.blocks) {
      const hasOldStructure = initialContent.blocks.some((block: any) => block.type === 'item');

      if (hasOldStructure) {
        return migrateFlatToNested(initialContent);
      }

      return initialContent.blocks;
    }

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

  const [semanticData, setSemanticData] = useState<SemanticData>(initialContent?.semantic_data || {});
  const [showSemanticData, setShowSemanticData] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showBlockMenu, setShowBlockMenu] = useState<string | boolean>(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [pendingAiContent, setPendingAiContent] = useState<any>(null);
  const [aiStats, setAiStats] = useState<any>(null);
  const [textInput, setTextInput] = useState('');
  const [aiFiles, setAiFiles] = useState<{ name: string; data: string; type: string }[]>([]);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [forceCollapse, setForceCollapse] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBlock = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setShowMobileNav(false);
    }
  };

  const getAllExistingImages = (): string[] => {
    const images = new Set<string>();

    blocks.forEach(block => {
      if (block.type === 'section') {
        if (block.data.image) images.add(block.data.image);
        block.data.items?.forEach((item: ItemData) => {
          if (item.image) images.add(item.image);
          item.gallery?.forEach(img => images.add(img.src));
        });
      } else if (block.type === 'gallery') {
        block.data.images?.forEach((img: any) => images.add(img.src));
      } else if (block.type === 'image') {
        if (block.data.src) images.add(block.data.src);
      }
    });

    return Array.from(images).filter(Boolean);
  };

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
      case 'carrusel':
        return { items: [] };
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
            semantic_data: semanticData,
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

  const analyzeMenuWithAI = async () => {
    if (!textInput.trim() && aiFiles.length === 0) {
      alert('Por favor agrega texto o imágenes para analizar');
      return;
    }

    setAiProcessing(true);
    try {
      const response = await fetch('/api/ai/update-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeId,
          images: aiFiles.length > 0 ? aiFiles.map(f => f.data) : undefined,
          instruction: textInput.trim() || undefined,
          currentContent: { blocks, semantic_data: semanticData },
          preview: true
        })
      });

      const result = await response.json();

      if (result.success && result.preview) {
        setPendingAiContent(result.content);
        setAiStats(result.stats);
      } else if (result.success) {
        setBlocks(result.content.blocks);
        setSemanticData(result.content.semantic_data);
        setShowAIChat(false);
        setAiFiles([]);
        setTextInput('');
        alert('✓ Contenido actualizado con IA');
      } else {
        throw new Error(result.error || 'Error al procesar con IA');
      }
    } catch (err: any) {
      console.error('Error IA:', err);
      alert(err.message || 'Error al procesar con IA');
    } finally {
      setAiProcessing(false);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const base64 = event.target?.result as string;
            setAiFiles(prev => [...prev, {
              name: `pasted-image-${Date.now()}.png`,
              data: base64,
              type: file.type
            }]);
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  const handleAIImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      const reader = new FileReader();
      const promise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
      });
      reader.readAsDataURL(file);
      const data = await promise;

      setAiFiles(prev => [...prev, {
        name: file.name,
        data: data,
        type: file.type
      }]);
    }
  };

  const removeAiFile = (index: number) => {
    setAiFiles(prev => prev.filter((_, i) => i !== index));
  };

  const confirmAiChanges = async () => {
    if (!pendingAiContent) return;

    setAiProcessing(true);
    try {
      const response = await fetch('/api/ai/update-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeId,
          saveOnly: true,
          currentContent: pendingAiContent
        })
      });

      const result = await response.json();
      if (result.success) {
        setBlocks(result.content.blocks);
        setSemanticData(result.content.semantic_data);
        setPendingAiContent(null);
        setAiStats(null);
        setShowAIChat(false);
        setAiFiles([]);
        setTextInput('');
        alert('✓ Cambios aplicados correctamente');
      } else {
        throw new Error(result.error || 'Error al guardar cambios');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setAiProcessing(false);
    }
  };

  function renderBlock(block: Block, index: number, forceCollapse: boolean) {
    const existingImages = getAllExistingImages();
    switch (block.type) {
      case 'section':
        return <SectionBlock data={block.data} onChange={(data) => updateBlock(index, data)} placeType={placeType} forceCollapse={forceCollapse} existingImages={existingImages} />;
      case 'gallery':
        return <GalleryBlock data={block.data} onChange={(data) => updateBlock(index, data)} existingImages={existingImages} />;
      case 'carrusel':
        return <CarruselBlock data={block.data} onChange={(data) => updateBlock(index, data)} existingImages={existingImages} />;
      default:
        return null;
    }
  }

  return (
    <div className="space-y-8 pb-32 xl:px-4 px-0">
      <header className="flex flex-col gap-2 sticky top-2 bg-white/90 backdrop-blur-xl z-[60] py-2 px-3 sm:px-4 rounded-xl border border-gray-200 shadow-lg mx-2 sm:mx-0">
        <div className="flex items-center justify-between gap-2 w-full">
          <div className="flex bg-gray-100/50 p-1 rounded-xl items-center gap-0.5">
            <button
              onClick={() => setActiveTab('editor')}
              className={`px-3 sm:px-4 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-semibold uppercase tracking-wide ${activeTab === 'editor' ? 'bg-gray-800 text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Diseño
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3 sm:px-4 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-semibold uppercase tracking-wide ${activeTab === 'preview' ? 'bg-gray-800 text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Previa
            </button>
          </div>

          <button
            onClick={() => setForceCollapse(!forceCollapse)}
            className="hidden sm:flex px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wide text-gray-600 hover:bg-gray-100 items-center gap-1.5"
            title={forceCollapse ? 'Expandir Todo' : 'Colapsar Todo'}
          >
            {forceCollapse ? <PiPlus className="w-3 h-3" /> : <PiX className="w-3 h-3" />}
            <span className="hidden md:inline">{forceCollapse ? 'Abrir' : 'Cerrar'}</span>
          </button>
        </div>

        <div className="flex gap-2 w-full">
          <button
            onClick={() => setShowAIChat(!showAIChat)}
            className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-3 py-1.5 rounded-lg font-semibold uppercase tracking-wide text-[9px] sm:text-[10px] shadow-md flex items-center justify-center gap-1.5"
          >
            <PiSparkle className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Asistente</span> IA
          </button>
          <button
            onClick={saveChanges}
            disabled={isSaving}
            className="flex-1 bg-gray-800 text-white px-3 py-1.5 rounded-lg font-semibold uppercase tracking-wide text-[9px] sm:text-[10px] shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {isSaving ? <PiArrowCounterClockwise className="w-3.5 h-3.5 animate-spin" /> : <PiFloppyDisk className="w-3.5 h-3.5" />}
            {isSaving ? 'Guardando...' : 'Publicar'}
          </button>
        </div>
      </header>

      {/* Floating Quick Nav for Mobile */}
      <div className="fixed bottom-6 right-6 z-40 sm:hidden">
        <button
          onClick={() => setShowMobileNav(!showMobileNav)}
          className="w-14 h-14 bg-black text-white rounded-full shadow-xl flex items-center justify-center text-xl"
        >
          {showMobileNav ? '✕' : '☰'}
        </button>

        {showMobileNav && (
          <div className="absolute bottom-16 right-0 w-64 max-h-[70vh] bg-white rounded-2xl shadow-xl border border-gray-100 overflow-y-auto p-4">
            <h3 className="text-xs font-bold uppercase text-gray-400 mb-3 px-2">Saltar a sección:</h3>
            <div className="space-y-1">
              <button
                onClick={() => { setShowSemanticData(true); setShowMobileNav(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="w-full text-left p-3 hover:bg-gray-50 rounded-xl text-sm font-bold flex items-center gap-2"
              >
                <span>🏢</span> Datos del Lugar
              </button>
              {blocks.map((block, idx) => (
                <button
                  key={block.id}
                  onClick={() => scrollToBlock(block.id)}
                  className="w-full text-left p-3 hover:bg-gray-50 rounded-xl text-sm font-bold flex items-center gap-2"
                >
                  <span>{block.type === 'section' ? '📋' : block.type === 'gallery' ? '🎨' : '🖼️'}</span>
                  <span className="truncate">{block.data.title || block.data.caption || `${block.type} ${idx + 1}`}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {activeTab === 'editor' ? (
        <>
          <div className="mx-4 sm:mx-0">
            <button
              onClick={() => setShowSemanticData(!showSemanticData)}
              className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-200 hover:border-gray-300 transition-all shadow-sm group"
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 bg-white rounded-2xl shadow-sm text-gray-700 group transition-transform ${showSemanticData ? 'shadow-inner' : ''}`}>
                  <PiPlus className={`w-5 h-5 transition-transform duration-300 ${showSemanticData ? 'rotate-45 text-red-500' : ''}`} />
                </div>
                <div className="text-left">
                  <span className="font-bold uppercase text-[10px] tracking-[0.2em] text-gray-800 block mb-1">Información General</span>
                  <p className="text-xs text-gray-600 font-medium">Dirección, horarios, contacto y redes sociales</p>
                </div>
              </div>
            </button>

            {showSemanticData && (
              <div className="mt-4 p-6 bg-white rounded-2xl border border-gray-200 shadow-xl space-y-6">
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-2 block">DESCRIPCIÓN DEL LUGAR:</label>
                  <textarea
                    value={semanticData.description || ''}
                    onChange={(e) => setSemanticData({ ...semanticData, description: e.target.value })}
                    placeholder="Breve descripción del restaurante, su especialidad y ambiente..."
                    rows={3}
                    className="w-full text-sm p-3 rounded-lg border border-gray-200 outline-none focus:border-blue-600 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-2 block">DIRECCIÓN:</label>
                    <input
                      value={semanticData.address || ''}
                      onChange={(e) => setSemanticData({ ...semanticData, address: e.target.value })}
                      placeholder="Av. Principal #123, Colonia, Ciudad"
                      className="w-full text-sm p-3 rounded-lg border border-gray-200 outline-none focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-2 block">TELÉFONO:</label>
                    <input
                      value={semanticData.phone || ''}
                      onChange={(e) => setSemanticData({ ...semanticData, phone: e.target.value })}
                      placeholder="81 1234 5678"
                      className="w-full text-sm p-3 rounded-lg border border-gray-200 outline-none focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-2 block">WHATSAPP:</label>
                    <input
                      value={semanticData.whatsapp || ''}
                      onChange={(e) => setSemanticData({ ...semanticData, whatsapp: e.target.value.replace(/\D/g, '') })}
                      placeholder="528112345678"
                      className="w-full text-sm p-3 rounded-lg border border-gray-200 outline-none focus:border-blue-600"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Código de país + número sin espacios ni símbolos (ej: 528112345678)
                    </p>
                    {semanticData.whatsapp && !/^\d{10,15}$/.test(semanticData.whatsapp) && (
                      <p className="text-xs text-red-500 mt-1 font-bold">
                        ⚠️ Formato incorrecto. Usa solo números (10-15 dígitos)
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                  <input
                    type="checkbox"
                    id="enable_cart"
                    checked={semanticData.enable_cart || false}
                    onChange={(e) => setSemanticData({ ...semanticData, enable_cart: e.target.checked })}
                    className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                  />
                  <label htmlFor="enable_cart" className="text-sm font-bold text-gray-700 cursor-pointer">
                    Activar carrito de compras y pedidos por WhatsApp
                  </label>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-600 mb-2 block">URL DE RESERVACIÓN:</label>
                  <input
                    value={semanticData.reservation_url || ''}
                    onChange={(e) => setSemanticData({ ...semanticData, reservation_url: e.target.value })}
                    placeholder="https://reservaciones.com/..."
                    className="w-full text-sm p-3 rounded-lg border border-gray-200 outline-none focus:border-blue-600"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-2 block">RANGO DE PRECIOS:</label>
                    <input
                      value={semanticData.price_range || ''}
                      onChange={(e) => setSemanticData({ ...semanticData, price_range: e.target.value })}
                      placeholder="más de MXN500"
                      className="w-full text-sm p-3 rounded-lg border border-gray-200 outline-none focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-2 block">TIPO DE COCINA:</label>
                    <input
                      value={semanticData.cuisine_type || ''}
                      onChange={(e) => setSemanticData({ ...semanticData, cuisine_type: e.target.value })}
                      placeholder="Mexicana contemporánea"
                      className="w-full text-sm p-3 rounded-lg border border-gray-200 outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-2 block">AMBIENTE:</label>
                    <input
                      value={semanticData.ambiance || ''}
                      onChange={(e) => setSemanticData({ ...semanticData, ambiance: e.target.value })}
                      placeholder="Casual elegante"
                      className="w-full text-sm p-3 rounded-lg border border-gray-200 outline-none focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-2 block">CÓDIGO DE VESTIMENTA:</label>
                    <input
                      value={semanticData.dress_code || ''}
                      onChange={(e) => setSemanticData({ ...semanticData, dress_code: e.target.value })}
                      placeholder="Ropa formal"
                      className="w-full text-sm p-3 rounded-lg border border-gray-200 outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-2 block">ZONA:</label>
                    <input
                      value={semanticData.zone || ''}
                      onChange={(e) => setSemanticData({ ...semanticData, zone: e.target.value })}
                      placeholder="San Pedro Garza García"
                      className="w-full text-sm p-3 rounded-lg border border-gray-200 outline-none focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-2 block">INTERSECCIÓN:</label>
                    <input
                      value={semanticData.cross_street || ''}
                      onChange={(e) => setSemanticData({ ...semanticData, cross_street: e.target.value })}
                      placeholder="Jose Vasconcelos"
                      className="w-full text-sm p-3 rounded-lg border border-gray-200 outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-600 mb-2 block">SITIO WEB:</label>
                  <input
                    value={semanticData.website || ''}
                    onChange={(e) => setSemanticData({ ...semanticData, website: e.target.value })}
                    placeholder="https://www.ejemplo.com"
                    className="w-full text-sm p-3 rounded-lg border border-gray-200 outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-600 mb-2 block">HORARIOS:</label>
                  <textarea
                    value={semanticData.hours || ''}
                    onChange={(e) => setSemanticData({ ...semanticData, hours: e.target.value })}
                    placeholder="Lun-Vie 13:00-23:00, Sáb-Dom 12:00-00:00"
                    rows={3}
                    className="w-full text-sm p-3 rounded-lg border border-gray-200 outline-none focus:border-blue-600 resize-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-600 mb-2 block">ESTACIONAMIENTO:</label>
                  <input
                    value={semanticData.parking || ''}
                    onChange={(e) => setSemanticData({ ...semanticData, parking: e.target.value })}
                    placeholder="Servicio de estacionamiento"
                    className="w-full text-sm p-3 rounded-lg border border-gray-200 outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-600 mb-2 block">VARIEDAD:</label>
                  <input
                    value={semanticData.variety || ''}
                    onChange={(e) => setSemanticData({ ...semanticData, variety: e.target.value })}
                    placeholder="Pantalla HD de 9 x 4 mts"
                    className="w-full text-sm p-3 rounded-lg border border-gray-200 outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-600 mb-2 block">ÁREAS DEL RESTAURANTE:</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {semanticData.areas?.map((area, idx) => (
                      <span key={idx} className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2">
                        {area}
                        <button
                          onClick={() => setSemanticData({ ...semanticData, areas: semanticData.areas?.filter((_, i) => i !== idx) })}
                          className="hover:text-red-600"
                        >×</button>
                      </span>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Agregar área (Enter para añadir)"
                    className="w-full text-sm p-3 rounded-lg border border-gray-200 outline-none focus:border-blue-600"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                        const newArea = e.currentTarget.value.trim();
                        setSemanticData({ ...semanticData, areas: [...(semanticData.areas || []), newArea] });
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-600 mb-2 block">OPCIONES DE PAGO:</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {['Efectivo', 'Tarjetas de crédito', 'AMEX', 'Visa', 'Mastercard', 'Transferencia', 'Vales'].map((option) => {
                      const isSelected = semanticData.payment_options?.includes(option);
                      return (
                        <button
                          key={option}
                          onClick={() => {
                            if (isSelected) {
                              setSemanticData({ ...semanticData, payment_options: semanticData.payment_options?.filter(o => o !== option) });
                            } else {
                              setSemanticData({ ...semanticData, payment_options: [...(semanticData.payment_options || []), option] });
                            }
                          }}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${isSelected
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                          {isSelected && '✓ '}{option}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {semanticData.payment_options?.filter(o => !['Efectivo', 'Tarjetas de crédito', 'AMEX', 'Visa', 'Mastercard', 'Transferencia', 'Vales'].includes(o)).map((option, idx) => (
                      <span key={idx} className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2">
                        {option}
                        <button
                          onClick={() => setSemanticData({ ...semanticData, payment_options: semanticData.payment_options?.filter(o => o !== option) })}
                          className="hover:text-red-600"
                        >×</button>
                      </span>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Agregar método personalizado (Enter)"
                    className="w-full text-sm p-3 rounded-lg border border-gray-200 outline-none focus:border-blue-600"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                        const newOption = e.currentTarget.value.trim();
                        setSemanticData({ ...semanticData, payment_options: [...(semanticData.payment_options || []), newOption] });
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-600 mb-2 block">CARACTERÍSTICAS ADICIONALES:</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {[
                      'WiFi', 'Terraza', 'Bar', 'Estacionamiento valet', 'Música en vivo',
                      'Pet friendly', 'Reservaciones', 'Delivery', 'Para llevar',
                      'Aire acondicionado', 'Smart TV', 'Acceso para silla de ruedas',
                      'Jacuzzi', 'Alberca', 'Cochera techada', 'Sillón Tantra', 'Tubo de pole dance', 'Cama King Size', 'Sauna', 'Vapor'
                    ].map((feature) => {
                      const isSelected = semanticData.additional_features?.includes(feature);
                      return (
                        <button
                          key={feature}
                          onClick={() => {
                            if (isSelected) {
                              setSemanticData({ ...semanticData, additional_features: semanticData.additional_features?.filter(f => f !== feature) });
                            } else {
                              setSemanticData({ ...semanticData, additional_features: [...(semanticData.additional_features || []), feature] });
                            }
                          }}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${isSelected
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                          {isSelected && '✓ '}{feature}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {semanticData.additional_features?.filter(f => !['WiFi', 'Terraza', 'Bar', 'Estacionamiento valet', 'Música en vivo', 'Pet friendly', 'Reservaciones', 'Delivery', 'Para llevar', 'Aire acondicionado', 'TV', 'Acceso para silla de ruedas'].includes(f)).map((feature, idx) => (
                      <span key={idx} className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2">
                        {feature}
                        <button
                          onClick={() => setSemanticData({ ...semanticData, additional_features: semanticData.additional_features?.filter(f => f !== feature) })}
                          className="hover:text-red-600"
                        >×</button>
                      </span>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Agregar característica personalizada (Enter)"
                    className="w-full text-sm p-3 rounded-lg border border-gray-200 outline-none focus:border-blue-600"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                        const newFeature = e.currentTarget.value.trim();
                        setSemanticData({ ...semanticData, additional_features: [...(semanticData.additional_features || []), newFeature] });
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {showAIChat && (
            <div className="mx-4 sm:mx-0 p-6 bg-gray-50 rounded-2xl border-2 border-purple-200 shadow-xl overflow-hidden">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                    <PiSparkle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold uppercase tracking-tight leading-none">Asistente IA</h2>
                    <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">Sube fotos, pega texto o arrastra archivos</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAIChat(false)}
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <PiX className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {!pendingAiContent ? (
                <div className="bg-white rounded-xl border-2 border-gray-100 shadow-sm overflow-hidden focus-within:border-purple-400 transition-all">
                  {/* Archivos adjuntos */}
                  {aiFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-3 bg-gray-50 border-b border-gray-100">
                      {aiFiles.map((file, idx) => (
                        <div key={idx} className="group relative">
                          <img
                            src={file.data}
                            alt={file.name}
                            className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                          />
                          <button
                            onClick={() => removeAiFile(idx)}
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10"
                          >
                            <PiX className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <textarea
                    className="w-full p-4 text-sm resize-none outline-none min-h-[140px] focus:ring-0"
                    placeholder="Escribe instrucciones (ej: 'agrega estos platillos'), pega una imagen del menú directamente aquí, o arrastra archivos..."
                    onPaste={handlePaste}
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    disabled={aiProcessing}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        analyzeMenuWithAI();
                      }
                    }}
                  />

                  <div className="flex items-center justify-between p-3 bg-gray-50 border-t border-gray-100">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={aiProcessing}
                        className="p-2 hover:bg-white text-gray-600 rounded-lg transition-colors flex items-center gap-1.5 border border-transparent hover:border-gray-200"
                      >
                        <PiPaperclip className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase">Adjuntar</span>
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={handleAIImagesUpload}
                        accept="image/*,application/pdf"
                      />
                    </div>

                    <button
                      onClick={analyzeMenuWithAI}
                      disabled={aiProcessing || (!textInput.trim() && aiFiles.length === 0)}
                      className="bg-purple-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-100 active:scale-95"
                    >
                      {aiProcessing ? (
                        <>
                          <PiArrowCounterClockwise className="w-4 h-4 animate-spin" />
                          Analizando...
                        </>
                      ) : (
                        <>
                          <PiPaperPlaneTilt className="w-4 h-4" />
                          Analizar con IA
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-white rounded-2xl border-2 border-green-500 shadow-xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <PiCheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold uppercase text-green-900 leading-none">Análisis Completado</h3>
                      <p className="text-xs text-green-600 font-bold uppercase mt-1">Revisa los cambios detectados</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                      <p className="text-[10px] text-green-600 uppercase font-bold mb-1">Secciones</p>
                      <p className="text-3xl font-bold text-green-900">{aiStats?.sections || 0}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                      <p className="text-[10px] text-green-600 uppercase font-bold mb-1">Productos</p>
                      <p className="text-3xl font-bold text-green-900">{aiStats?.items || 0}</p>
                    </div>
                    {aiStats?.newImages > 0 && (
                      <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 col-span-2 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-blue-600 uppercase font-bold">Galería</p>
                          <p className="text-lg font-bold text-blue-900">+{aiStats.newImages} fotos detectadas</p>
                        </div>
                        <PiImage className="w-8 h-8 text-blue-200" />
                      </div>
                    )}
                    {(aiStats?.hasAddress || aiStats?.hasPhone) && (
                      <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 col-span-2">
                        <p className="text-[10px] text-amber-600 uppercase font-bold mb-1">Contacto Renovado</p>
                        <div className="flex gap-2">
                          {aiStats.hasAddress && <span className="bg-white px-2 py-1 rounded text-[10px] font-bold border border-amber-200 uppercase">📍 Dirección</span>}
                          {aiStats.hasPhone && <span className="bg-white px-2 py-1 rounded text-[10px] font-bold border border-amber-200 uppercase">📞 Teléfono</span>}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setPendingAiContent(null);
                        setAiStats(null);
                      }}
                      className="flex-1 py-2 px-4 bg-gray-100 text-gray-500 rounded-xl font-semibold hover:bg-gray-200 uppercase text-xs"
                    >
                      Descartar
                    </button>
                    <button
                      onClick={confirmAiChanges}
                      disabled={aiProcessing}
                      className="flex-[2] py-2 px-4 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 shadow-lg flex items-center justify-center gap-2 uppercase text-xs tracking-wide"
                    >
                      {aiProcessing ? (
                        <>
                          <PiArrowCounterClockwise className="w-4 h-4 animate-spin" />
                          Aplicando...
                        </>
                      ) : (
                        <>Aplicar Cambios </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-400 font-bold uppercase tracking-wider px-1">
                <span className="flex items-center gap-1"><PiCheckCircle className="w-3 h-3" /> Pega imágenes (Ctrl+V)</span>
                <span className="flex items-center gap-1"><PiCheckCircle className="w-3 h-3" /> CMD + Enter para enviar</span>
                <span className="flex items-center gap-1"><PiCheckCircle className="w-3 h-3" /> Arrastra fotos o archivos</span>
              </div>
            </div>
          )}

          <div className="space-y-4 lg:px-4 sm:px-0">
            {blocks.map((block, index) => (
              <div key={block.id} id={block.id} className="relative scroll-mt-24">
                {index === 0 && (
                  <>
                    <div className="flex justify-center -my-2 relative z-10">
                      <button
                        onClick={() => setShowBlockMenu(`before-${index}`)}
                        className="bg-white hover:bg-emerald-50 text-emerald-600 border border-emerald-100 px-5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm hover:shadow-md hover:scale-105 flex items-center gap-2"
                      >
                        <PiPlus className="w-3 h-3" /> Insertar Bloque
                      </button>
                    </div>

                    {showBlockMenu === `before-${index}` && (
                      <div className="mb-3 p-4 bg-white border rounded-xl shadow-lg">
                        <p className="text-xs font-bold text-gray-500 mb-3">¿QUÉ QUIERES AGREGAR?</p>
                        <div className="grid grid-cols-2 gap-2">
                          <BlockTypeButton icon={<PiLayout className="w-8 h-8" />} label="Sección" onClick={() => addBlock('section', index - 1)} />
                          <BlockTypeButton icon={<PiImage className="w-8 h-8" />} label="Imagen" onClick={() => addBlock('image', index - 1)} />
                          <BlockTypeButton icon={<PiSparkle className="w-8 h-8" />} label="Galería" onClick={() => addBlock('gallery', index - 1)} />
                          <BlockTypeButton icon={<PiPaperPlaneTilt className="w-8 h-8" />} label="Promociones" onClick={() => addBlock('carrusel', index - 1)} />
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

                <div className="flex justify-end gap-2 mb-3 ">
                  <button
                    onClick={() => moveBlock(index, 'up')}
                    disabled={index === 0}
                    className="w-10 h-10 bg-white shadow-sm border border-gray-100 rounded-xl hover:bg-emerald-50 hover:border-emerald-200 disabled:opacity-30 flex items-center justify-center transition-all group"
                    title="Subir"
                  >
                    <PiCaretUp className="w-4 h-4 text-gray-400 group-hover:text-emerald-600" />
                  </button>
                  <button
                    onClick={() => moveBlock(index, 'down')}
                    disabled={index === blocks.length - 1}
                    className="w-10 h-10 bg-white shadow-sm border border-gray-100 rounded-xl hover:bg-emerald-50 hover:border-emerald-200 disabled:opacity-30 flex items-center justify-center transition-all group"
                    title="Bajar"
                  >
                    <PiCaretDown className="w-4 h-4 text-gray-400 group-hover:text-emerald-600" />
                  </button>
                  <button
                    onClick={() => duplicateBlock(index)}
                    className="w-10 h-10 bg-white shadow-sm border border-gray-100 rounded-xl hover:bg-blue-50 hover:border-blue-200 flex items-center justify-center transition-all group"
                    title="Duplicar"
                  >
                    <PiCopy className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                  </button>
                  <button
                    onClick={() => removeBlock(index)}
                    className="w-10 h-10 bg-white shadow-sm border border-gray-100 rounded-xl hover:bg-red-50 hover:border-red-200 flex items-center justify-center transition-all group"
                    title="Eliminar"
                  >
                    <PiTrash className="w-4 h-4 text-gray-400 group-hover:text-red-600" />
                  </button>
                </div>

                {renderBlock(block, index, forceCollapse)}

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
                    <div className="grid grid-cols-2 gap-2">
                      <BlockTypeButton icon={<PiLayout className="w-8 h-8" />} label="Sección" onClick={() => addBlock('section', index)} />
                      <BlockTypeButton icon={<PiImage className="w-8 h-8" />} label="Imagen" onClick={() => addBlock('image', index)} />
                      <BlockTypeButton icon={<PiSparkle className="w-8 h-8" />} label="Galería" onClick={() => addBlock('gallery', index)} />
                      <BlockTypeButton icon={<PiPaperPlaneTilt className="w-8 h-8" />} label="Promociones" onClick={() => addBlock('carrusel', index)} />
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

            {blocks.length === 0 && (
              <div className="text-center py-24 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 mx-4">
                <div className="mb-4 text-4xl">📭</div>
                <p className="text-gray-500 font-bold uppercase text-xs mb-6">El menú está vacío. Comienza agregando contenido.</p>
                <button
                  onClick={() => setShowBlockMenu(true)}
                  className="bg-black text-white px-10 py-4 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-gray-800 shadow-xl transition-all"
                >
                  + Agregar Primer Bloque
                </button>

                {showBlockMenu === true && (
                  <div className="mt-8 max-w-md mx-auto p-6 bg-white border rounded-2xl shadow-xl">
                    <p className="text-xs font-bold text-gray-400 mb-4 uppercase">Selecciona el tipo de bloque:</p>
                    <div className="grid grid-cols-2 gap-3">
                      <BlockTypeButton icon={<PiLayout className="w-8 h-8" />} label="Sección" onClick={() => addBlock('section')} />
                      <BlockTypeButton icon={<PiImage className="w-8 h-8" />} label="Imagen" onClick={() => addBlock('image')} />
                      <BlockTypeButton icon={<PiSparkle className="w-8 h-8" />} label="Galería" onClick={() => addBlock('gallery')} />
                      <BlockTypeButton icon={<PiPaperPlaneTilt className="w-8 h-8" />} label="Promociones" onClick={() => addBlock('carrusel')} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="mx-4 sm:mx-0 overflow-hidden rounded-2xl border shadow-xl bg-[#0A0A0A]">
          <div className="bg-gray-800 p-2 flex items-center justify-between px-6 border-b border-white/10">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <div className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Vista Previa en Vivo</div>
            <div className="w-12" />
          </div>
          {placeType === 'motel' ? (
            <MotelPageRenderer
              place={{
                ...placeData,
                content: { blocks, semantic_data: semanticData, view_settings: { layout: 'grid', show_prices: true } }
              }}
              isPreview={true}
            />
          ) : (
            <div className="p-20 text-center bg-gray-50">
              <div className="text-6xl mb-6">👁️</div>
              <h2 className="text-2xl font-bold uppercase mb-4">Vista Previa</h2>
              <p className="text-gray-500 text-sm">Próximamente disponible para Restaurantes. Use el editor para realizar cambios.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BlockTypeButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
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

function ImageSelector({ existingImages, onSelect, onClose }: { existingImages: string[]; onSelect: (url: string) => void; onClose: () => void }) {
  if (existingImages.length === 0) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white rounded-2xl shadow-2xl p-8 text-center max-w-md">
          <div className="text-6xl mb-4">📭</div>
          <p className="text-sm text-gray-500 mb-4">No hay imágenes disponibles todavía</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl max-h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center z-10">
          <h3 className="text-sm font-bold uppercase text-gray-800 tracking-wide">Selecciona una imagen existente</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600"
          >
            <PiX className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)]">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {existingImages.map((url, idx) => (
              <button
                key={idx}
                onClick={() => {
                  onSelect(url);
                  onClose();
                }}
                className="relative aspect-square rounded-xl overflow-hidden border-2 border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all group"
              >
                <img src={url} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 text-white text-3xl font-bold">✓</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


function SectionBlock({ data, onChange, placeType = 'restaurant', forceCollapse, existingImages }: { data: SectionData; onChange: (data: SectionData) => void; placeType?: 'restaurant' | 'motel'; forceCollapse?: boolean; existingImages?: string[] }) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [showImageSelector, setShowImageSelector] = useState(false);
  const [showItemImageSelector, setShowItemImageSelector] = useState<{ [key: number]: boolean }>({});
  const [showItemGallerySelector, setShowItemGallerySelector] = useState<{ [key: number]: boolean }>({});

  useEffect(() => {
    if (forceCollapse !== undefined) {
      setIsCollapsed(forceCollapse);
    }
  }, [forceCollapse]);

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
    setIsCollapsed(false);
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
    <div className={`bg-white rounded-2xl border-2 transition-all duration-500 overflow-hidden ${isCollapsed ? 'border-gray-100 shadow-sm' : 'border-gray-200 shadow-xl'}`}>
      <div className={`${isCollapsed ? 'bg-white' : 'bg-gray-50'} p-4 transition-all uppercase tracking-wide`}>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl shadow-sm font-bold transition-all ${isCollapsed ? 'bg-gray-100 text-gray-400 hover:bg-gray-200' : 'bg-gray-700 text-white shadow-gray-200'}`}
          >
            <PiPlus className={`w-5 h-5 transition-transform duration-300 ${isCollapsed ? '' : 'rotate-45'}`} />
          </button>

          <div className="flex-1">
            <input
              value={data.title}
              onChange={(e) => onChange({ ...data, title: e.target.value })}
              placeholder="Ej: PLATILLOS FUERTES"
              className={`w-full font-bold uppercase bg-transparent outline-none transition-all tracking-wider ${isCollapsed ? 'text-xs text-gray-500' : 'text-xl sm:text-2xl text-gray-800 px-1 border-b-2 border-gray-300'
                }`}
            />
            {isCollapsed && (
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1 ml-1 leading-none">
                Sección Dinámica • {data.items.length} Elementos
              </p>
            )}
          </div>

          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-block text-[10px] font-bold bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full">
                {data.items.length} PLATILLOS
              </span>
            </div>
          )}
        </div>

        {!isCollapsed && (
          <div className="mt-4 space-y-4">
            <div className="bg-white/50 p-4 rounded-xl border border-emerald-100/50">
              <label className="text-[10px] font-bold text-emerald-800/40 uppercase mb-2 block tracking-widest px-1">Concepto de la Sección:</label>
              <textarea
                value={data.description || ''}
                onChange={(e) => onChange({ ...data, description: e.target.value })}
                placeholder="Breve historia o descripción de esta categoría..."
                rows={2}
                className="w-full text-sm bg-white p-3 rounded-xl border border-emerald-100 outline-none focus:border-emerald-600 shadow-sm"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 mb-2 block uppercase tracking-wider">Imagen de fondo:</label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <ManualUploader
                    currentImage={data.image}
                    onFilesUploaded={(url) => onChange({ ...data, image: url[0] })}
                    onImageRemove={() => onChange({ ...data, image: '' })}
                    onUploadStart={() => console.log('Subiendo imagen de sección...')}
                    onUploadError={() => console.error('Error al subir imagen')}
                  />
                </div>
                {existingImages && existingImages.length > 0 && (
                  <button
                    onClick={() => setShowImageSelector(!showImageSelector)}
                    className="px-4 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors text-sm font-bold whitespace-nowrap"
                  >
                    📚 Existentes
                  </button>
                )}
              </div>
              {showImageSelector && existingImages && (
                <ImageSelector
                  existingImages={existingImages}
                  onSelect={(url) => onChange({ ...data, image: url })}
                  onClose={() => setShowImageSelector(false)}
                />
              )}
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex justify-between items-center border-t border-purple-100 pt-4">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Contenido de la sección</h4>
                <button
                  onClick={addItem}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-purple-100 flex items-center gap-2"
                >
                  <PiPlus className="w-3 h-3" /> Agregar Ítem
                </button>
              </div>

              {data.items.length === 0 && (
                <div className="text-center py-10 bg-white/30 rounded-xl border-2 border-dashed border-purple-200">
                  <p className="text-purple-400 text-xs font-bold uppercase">No hay items en esta sección</p>
                </div>
              )}

              {data.items.map((item, itemIndex) => (
                <div key={item.id} className="bg-white p-4 rounded-xl border border-purple-100 shadow-sm">
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
                        className="col-span-3 text-sm font-bold bg-white border border-gray-100 rounded-xl px-3 py-2 outline-none focus:border-purple-600 shadow-sm"
                      />
                      <input
                        type="number"
                        value={item.price}
                        onChange={(e) => updateItem(itemIndex, { price: parseFloat(e.target.value) })}
                        placeholder="0.00"
                        className="text-left sm:text-right text-sm sm:text-base font-bold text-red-600 bg-gray-50 border border-gray-200 rounded px-3 py-2 outline-none focus:border-purple-600"
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
                      <label className="text-xs font-bold text-gray-600 mb-2 block">{placeType === 'motel' ? 'CARACTERÍSTICAS DE LA HABITACIÓN (ej: Jacuzzi, Smart TV, Tina):' : 'CARACTERÍSTICAS DEL PLATILLO (ej: Picante, Vegetariano):'}</label>
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
                        placeholder={placeType === 'motel' ? 'Agregar característica de habitación (Enter)' : 'Agregar característica del platillo (Enter)'}
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

                    <div className="w-full">
                      <label className="text-xs font-bold text-gray-600 mb-2 block">IMAGEN PRINCIPAL:</label>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <ManualUploader
                            currentImage={item.image}
                            onFilesUploaded={(url) => updateItem(itemIndex, { image: url[0] })}
                            onImageRemove={() => updateItem(itemIndex, { image: '' })}
                            onUploadStart={() => console.log('Subiendo imagen del item...')}
                            onUploadError={() => console.error('Error al subir imagen')}
                          />
                        </div>
                        {existingImages && existingImages.length > 0 && (
                          <button
                            onClick={() => setShowItemImageSelector({ ...showItemImageSelector, [itemIndex]: !showItemImageSelector[itemIndex] })}
                            className="px-3 py-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition-colors text-xs font-bold whitespace-nowrap"
                          >
                            📚 Existentes
                          </button>
                        )}
                      </div>
                      {showItemImageSelector[itemIndex] && existingImages && (
                        <ImageSelector
                          existingImages={existingImages}
                          onSelect={(url) => updateItem(itemIndex, { image: url })}
                          onClose={() => setShowItemImageSelector({ ...showItemImageSelector, [itemIndex]: false })}
                        />
                      )}
                    </div>

                    <div className="w-full">
                      <label className="text-xs font-bold text-gray-600 mb-2 block">GALERÍA DEL ITEM (opcional):</label>
                      <div className="space-y-2">
                        <ManualUploader
                          currentImage=""
                          multiple={true}
                          onFilesUploaded={(urls) => {
                            const newGalleryItems = urls.map(url => ({ src: url, alt: item.name, title: '' }));
                            const currentGallery = item.gallery || [];
                            updateItem(itemIndex, { gallery: [...currentGallery, ...newGalleryItems] });
                          }}
                          onUploadStart={() => console.log('Subiendo galería...')}
                          onUploadError={() => console.error('Error al subir galería')}
                        />

                        {existingImages && existingImages.length > 0 && (
                          <div>
                            <button
                              onClick={() => setShowItemGallerySelector({ ...showItemGallerySelector, [itemIndex]: !showItemGallerySelector[itemIndex] })}
                              className="w-full px-3 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors text-xs font-bold border border-purple-200"
                            >
                              📚 Agregar desde existentes
                            </button>
                            {showItemGallerySelector[itemIndex] && (
                              <ImageSelector
                                existingImages={existingImages}
                                onSelect={(url) => {
                                  const newGalleryItem = { src: url, alt: item.name, title: '' };
                                  const currentGallery = item.gallery || [];
                                  updateItem(itemIndex, { gallery: [...currentGallery, newGalleryItem] });
                                }}
                                onClose={() => setShowItemGallerySelector({ ...showItemGallerySelector, [itemIndex]: false })}
                              />
                            )}
                          </div>
                        )}
                      </div>

                      {item.gallery && item.gallery.length > 0 && (
                        <div className="mt-3 grid grid-cols-4 gap-2">
                          {item.gallery.map((img, gIdx) => (
                            <div key={gIdx} className="relative group">
                              <img src={img.src} alt={img.alt || ''} className="w-full h-20 object-cover rounded" />
                              <button
                                type="button"
                                onClick={() => {
                                  const newGallery = item.gallery?.filter((_, i) => i !== gIdx);
                                  updateItem(itemIndex, { gallery: newGallery });
                                }}
                                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function GalleryBlock({ data, onChange, existingImages }: { data: GalleryData; onChange: (data: GalleryData) => void; existingImages?: string[] }) {
  const [showImageSelector, setShowImageSelector] = useState(false);

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
    <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-xl overflow-hidden">
      <div className="bg-gray-50 p-2 border-b-2 border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-700 rounded-xl text-white shadow-lg">
            <PiSparkle className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-gray-800 uppercase tracking-wider text-sm">Galería de Imágenes</h3>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {data.images?.map((img, gIdx) => (
            <div key={gIdx} className="relative aspect-square group overflow-hidden rounded-2xl border border-gray-100 shadow-sm">
              <img src={img.src} alt={img.alt || ''} className="w-full h-full object-cover" />
              <button
                onClick={() => removeImageFromGallery(gIdx)}
                className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-700"
              >
                <PiX className="w-3 h-3" />
              </button>
            </div>
          ))}

          <button
            onClick={() => setShowImageSelector(true)}
            className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 text-gray-600"
          >
            <PiPlus className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-semibold uppercase tracking-wide px-2 text-center">Agregar</span>
          </button>
        </div>

        {showImageSelector && existingImages && (
          <ImageSelector
            existingImages={existingImages}
            onSelect={(url) => addImageToGallery([url])}
            onClose={() => setShowImageSelector(false)}
          />
        )}
      </div>
    </div>
  );
}

interface ImageData {
  src: string;
  alt?: string;
  caption?: string;
}

function ImageBlock({ data, onChange, existingImages }: { data: ImageData; onChange: (data: ImageData) => void; existingImages?: string[] }) {
  const [showImageSelector, setShowImageSelector] = useState(false);

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-xl overflow-hidden">
      <div className="bg-gray-50 p-4 border-b-2 border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-700 rounded-xl text-white shadow-lg">
            <PiImage className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-gray-800 uppercase tracking-wider text-sm">Bloque de Imagen</h3>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-1/3 space-y-4">
            <div className="relative group rounded-2xl overflow-hidden border border-emerald-100 bg-emerald-50 aspect-square">
              {data.src ? (
                <>
                  <img src={data.src} alt={data.alt || ''} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button onClick={() => onChange({ ...data, src: '' })} className="bg-red-600 text-white p-2 rounded-xl">
                      <PiTrash className="w-5 h-5" />
                    </button>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-emerald-200">
                  <PiImage className="w-16 h-16" />
                </div>
              )}
            </div>

            <button
              onClick={() => setShowImageSelector(true)}
              className="w-full py-2 bg-emerald-50 text-emerald-700 rounded-xl font-semibold uppercase text-[10px] tracking-wide border border-emerald-100 hover:bg-emerald-100"
            >
              Seleccionar Foto
            </button>
          </div>

          <div className="flex-1 space-y-4">
            <div>
              <label className="text-[10px] font-bold text-emerald-800/40 uppercase mb-2 block tracking-widest px-1">Texto Alternativo:</label>
              <input
                value={data.alt || ''}
                onChange={(e) => onChange({ ...data, alt: e.target.value })}
                placeholder="Describe la imagen para accesibilidad..."
                className="w-full text-sm bg-white p-3 rounded-xl border border-emerald-100 outline-none focus:border-emerald-600 shadow-sm"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-emerald-800/40 uppercase mb-2 block tracking-widest px-1">Pie de Foto:</label>
              <textarea
                value={data.caption || ''}
                onChange={(e) => onChange({ ...data, caption: e.target.value })}
                placeholder="Texto que aparecerá debajo de la imagen..."
                rows={3}
                className="w-full text-sm bg-white p-3 rounded-xl border border-emerald-100 outline-none focus:border-emerald-600 shadow-sm resize-none"
              />
            </div>
          </div>
        </div>

        {showImageSelector && existingImages && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowImageSelector(false)} />
            <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden bg-white rounded-2xl shadow-xl">
              <div className="p-6 border-b flex items-center justify-between">
                <h3 className="font-bold uppercase tracking-widest">Seleccionar Imagen</h3>
                <button onClick={() => setShowImageSelector(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <PiX className="w-6 h-6" />
                </button>
              </div>
              <div className="overflow-y-auto p-6 max-h-[calc(90vh-140px)]">
                <div className="space-y-8">
                  <section>
                    <ManualUploader
                      currentImage={data.src}
                      onFilesUploaded={(url) => {
                        onChange({ ...data, src: url[0] });
                        setShowImageSelector(false);
                      }}
                      onImageRemove={() => onChange({ ...data, src: '' })}
                    />
                  </section>

                  {existingImages.length > 0 && (
                    <section>
                      <h4 className="text-xs font-bold text-gray-400 uppercase mb-4 tracking-widest">Imágenes Existentes:</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {existingImages.map((url, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              onChange({ ...data, src: url });
                              setShowImageSelector(false);
                            }}
                            className="aspect-square rounded-xl overflow-hidden border-2 border-transparent hover:border-emerald-500 transition-all"
                          >
                            <img src={url} className="w-full h-full object-cover" alt="" />
                          </button>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface CarruselItem {
  src: string;
  alt?: string;
  link?: string;
  caption?: string;
}

interface CarruselData {
  items: CarruselItem[];
}

function CarruselBlock({ data, onChange, existingImages }: { data: CarruselData; onChange: (data: CarruselData) => void; existingImages?: string[] }) {
  const [showImageSelector, setShowImageSelector] = useState(false);

  const addItem = (urls: string[]) => {
    const newItems = urls.map(url => ({ src: url, alt: '', link: '', caption: '' }));
    onChange({ ...data, items: [...(data.items || []), ...newItems] });
  };

  const removeItem = (index: number) => {
    const newItems = [...data.items];
    newItems.splice(index, 1);
    onChange({ ...data, items: newItems });
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= data.items.length) return;
    const newItems = [...data.items];
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    onChange({ ...data, items: newItems });
  };

  const updateItem = (index: number, itemData: Partial<CarruselItem>) => {
    const newItems = [...data.items];
    newItems[index] = { ...newItems[index], ...itemData };
    onChange({ ...data, items: newItems });
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-xl overflow-hidden">
      <div className="bg-gray-50 p-4 border-b-2 border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-700 rounded-xl text-white shadow-lg">
            <PiLayout className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-gray-800 uppercase tracking-wider text-sm">Carrusel de Promociones</h3>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.items?.map((item, idx) => (
            <div key={idx} className="group relative bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all">
              <div className="aspect-video relative overflow-hidden bg-gray-200">
                {item.src ? (
                  <img src={item.src} className="w-full h-full object-cover" alt={item.alt} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <PiImage className="w-10 h-10 opacity-20" />
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => moveItem(idx, 'up')} className="p-1.5 bg-white/90 backdrop-blur shadow-sm rounded-lg hover:bg-white text-gray-700">↑</button>
                  <button onClick={() => moveItem(idx, 'down')} className="p-1.5 bg-white/90 backdrop-blur shadow-sm rounded-lg hover:bg-white text-gray-700">↓</button>
                  <button onClick={() => removeItem(idx)} className="p-1.5 bg-white/90 backdrop-blur shadow-sm rounded-lg hover:bg-red-50 text-red-500">✕</button>
                </div>
              </div>

              <div className="p-3 space-y-2">
                <input
                  value={item.caption || ''}
                  onChange={(e) => updateItem(idx, { caption: e.target.value })}
                  placeholder="Título / Promo"
                  className="w-full text-xs font-bold bg-white p-2 rounded-lg border border-gray-200 outline-none focus:border-emerald-500"
                />
                <input
                  value={item.link || ''}
                  onChange={(e) => updateItem(idx, { link: e.target.value })}
                  placeholder="Enlace (opcional)"
                  className="w-full text-[10px] bg-white p-2 rounded-lg border border-gray-200 outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          ))}

          <button
            onClick={() => setShowImageSelector(true)}
            className="aspect-video flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-2xl hover:bg-gray-50 hover:border-gray-400 transition-all text-gray-600 group"
          >
            <PiPlus className="w-8 h-8 mb-2 group transition-transform" />
            <span className="text-xs font-bold uppercase tracking-widest">Agregar Foto</span>
          </button>
        </div>

        {showImageSelector && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowImageSelector(false)} />
            <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden bg-white rounded-2xl shadow-xl">
              <div className="p-6 border-b flex items-center justify-between">
                <h3 className="font-bold uppercase tracking-widest">Seleccionar Imágenes</h3>
                <button onClick={() => setShowImageSelector(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <PiX className="w-6 h-6" />
                </button>
              </div>
              <div className="overflow-y-auto p-6 max-h-[calc(90vh-140px)]">
                <div className="space-y-8">
                  <section>
                    <h4 className="text-xs font-bold text-emerald-600 uppercase mb-4 tracking-widest">Subir Nueva:</h4>
                    <ManualUploader
                      onFilesUploaded={(urls) => {
                        addItem(urls);
                        setShowImageSelector(false);
                      }}
                      multiple={true}
                    />
                  </section>

                  {existingImages && existingImages.length > 0 && (
                    <section>
                      <h4 className="text-xs font-bold text-gray-400 uppercase mb-4 tracking-widest">Imágenes Existentes:</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {existingImages.map((url, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              addItem([url]);
                              setShowImageSelector(false);
                            }}
                            className="aspect-square rounded-xl overflow-hidden border-2 border-transparent hover:border-emerald-500 transition-all group relative"
                          >
                            <img src={url} className="w-full h-full object-cover" alt="" />
                            <div className="absolute inset-0 bg-emerald-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
