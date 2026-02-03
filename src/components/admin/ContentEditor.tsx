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
import AdminPageHeader from './AdminPageHeader';
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
  PiWarningCircle,
  PiPaintBrushBroad,
  PiImages,
  PiHouse,
  PiListBullets,
  PiSlideshow,
  PiTray,
  PiMonitor,
  PiFolderSimple
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

interface ItemOption {
  name: string;
  values: string[];
  required?: boolean;
}

interface ItemData {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string;
  features?: string[];
  gallery?: { src: string; alt?: string; title?: string }[];
  options?: ItemOption[];
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
  const [mediaLibrary, setMediaLibrary] = useState<string[]>(initialContent?.media_library || []);
  const [showSemanticData, setShowSemanticData] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showBlockMenu, setShowBlockMenu] = useState<string | boolean>(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [pendingAiContent, setPendingAiContent] = useState<any>(null);
  const [aiStats, setAiStats] = useState<any>(null);
  const [textInput, setTextInput] = useState('');
  const [aiFiles, setAiFiles] = useState<{ name: string; data: string; type: string }[]>([]);
  const [activeTab, setActiveTab] = useState<'info' | 'editor' | 'preview' | 'media'>('editor');
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant', content: string, stats?: any }[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  useEffect(() => {
    if (showAIChat && chatMessages.length === 0) {
      setChatMessages([
        {
          role: 'assistant',
          content: '¡Hola! Soy tu asistente de BysMax. ✨ ¿En qué puedo ayudarte hoy? Puedo analizar fotos de tu menú, actualizar precios o responder dudas sobre la plataforma.'
        }
      ]);
    }
  }, [showAIChat]);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [forceCollapse, setForceCollapse] = useState(true);
  const [viewSettings, setViewSettings] = useState(() => {
    const vs = initialContent?.view_settings || { layout: 'grid', show_prices: true };
    return {
      layout: vs.layout || 'grid',
      show_prices: vs.show_prices ?? true,
      template: vs.template || 'default'
    };
  });
  const [showViewSettings, setShowViewSettings] = useState(false);
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
      if (!block.data) return;

      if (block.type === 'section') {
        if (block.data.image) images.add(block.data.image);
        block.data.items?.forEach((item: ItemData) => {
          if (item?.image) images.add(item.image);
          item?.gallery?.forEach(img => {
            if (img?.src) images.add(img.src);
          });
        });
      } else if (block.type === 'gallery') {
        block.data.images?.forEach((img: any) => {
          if (img?.src) images.add(img.src);
        });
      } else if (block.type === 'image') {
        if (block.data.src) images.add(block.data.src);
      } else if (block.type === 'carrusel') {
        block.data.items?.forEach((item: any) => {
          if (item?.src) images.add(item.src);
        });
      }
    });

    // Add images from media library
    mediaLibrary.forEach(url => {
      if (url) images.add(url);
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
            semantic_data: semanticData,
            blocks,
            view_settings: viewSettings,
            media_library: mediaLibrary
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

      const userMsg = textInput.trim();
      setChatMessages(prev => [...prev, { role: 'user', content: userMsg || (aiFiles.length > 0 ? "Analizando imagen..." : "") }]);

      const result = await response.json();

      if (result.success) {
        if (result.preview) {
          setPendingAiContent(result.content);
          setAiStats(result.stats);

          setChatMessages(prev => [...prev, {
            role: 'assistant',
            content: result.conversational_response || result.stats?.summary || 'He analizado tu solicitud y preparado los cambios.',
            stats: result.stats
          }]);
        } else {
          // Si no hay preview de cambios, es porque es puramente conversacional o ya se aplicaron
          setChatMessages(prev => [...prev, {
            role: 'assistant',
            content: result.conversational_response || '✓ Operación completada.'
          }]);

          // Solo actualizamos el estado si no veníamos de un preview (caso raro aquí, pero por seguridad)
          if (result.content && JSON.stringify(result.content.blocks) !== JSON.stringify(blocks)) {
            setBlocks(result.content.blocks);
            setSemanticData(result.content.semantic_data);
          }
        }
      } else {
        throw new Error(result.error || 'Error al procesar con IA');
      }
    } catch (err: any) {
      console.error('Error IA:', err);
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: `Lo siento, hubo un error al procesar tu solicitud: ${err.message}`
      }]);
    } finally {
      setAiProcessing(false);
      setTextInput('');
      setAiFiles([]);
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
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: '✓ ¡Excelente! Los cambios han sido aplicados y publicados en tu menú. ¿Hay algo más en lo que pueda ayudarte?'
        }]);
      } else {
        throw new Error(result.error || 'Error al guardar cambios');
      }
    } catch (err: any) {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: `Lo siento, hubo un problema al guardar los cambios: ${err.message}`
      }]);
    } finally {
      setAiProcessing(false);
    }
  };

  function renderBlock(block: Block, index: number, forceCollapse: boolean) {
    const existingImages = getAllExistingImages();
    const onUploadToLibrary = (urls: string[]) => {
      setMediaLibrary(prev => [...new Set([...prev, ...urls])]);
    };

    switch (block.type) {
      case 'section':
        return <SectionBlock data={block.data} onChange={(data) => updateBlock(index, data)} placeType={placeType} forceCollapse={forceCollapse} existingImages={existingImages} onUploadToLibrary={onUploadToLibrary} />;
      case 'gallery':
        return <GalleryBlock data={block.data} onChange={(data) => updateBlock(index, data)} existingImages={existingImages} onUploadToLibrary={onUploadToLibrary} />;
      case 'carrusel':
        return <CarruselBlock data={block.data} onChange={(data) => updateBlock(index, data)} existingImages={existingImages} onUploadToLibrary={onUploadToLibrary} />;
      default:
        return null;
    }
  }

  return (
    <div className="space-y-6 pb-32">
      <AdminPageHeader
        leftContent={
          <div className="flex bg-white/50 p-1 rounded-xl items-center gap-0.5 border border-gray-200 shadow-sm shrink-0">
            <button
              onClick={() => setActiveTab('info')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-[10px] sm:text-[11px] font-bold uppercase tracking-wide transition-all whitespace-nowrap ${activeTab === 'info' ? 'bg-gray-800 text-white shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-white'}`}
            >
              <PiHouse className="w-3.5 h-3.5" />
              <span>General</span>
            </button>
            <button
              onClick={() => setActiveTab('editor')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-[10px] sm:text-[11px] font-bold uppercase tracking-wide transition-all whitespace-nowrap ${activeTab === 'editor' ? 'bg-gray-800 text-white shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-white'}`}
            >
              <PiPaintBrushBroad className="w-3.5 h-3.5" />
              <span>Diseño</span>
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-[10px] sm:text-[11px] font-bold uppercase tracking-wide transition-all whitespace-nowrap ${activeTab === 'preview' ? 'bg-gray-800 text-white shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-white'}`}
            >
              <PiMonitor className="w-3.5 h-3.5" />
              <span>Previa</span>
            </button>
            <button
              onClick={() => setActiveTab('media')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-[10px] sm:text-[11px] font-bold uppercase tracking-wide transition-all whitespace-nowrap ${activeTab === 'media' ? 'bg-gray-800 text-white shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-white'}`}
            >
              <PiImages className="w-3.5 h-3.5" />
              <span>Galería</span>
            </button>
          </div>
        }
        rightContent={
          <>
            <button
              onClick={() => setForceCollapse(!forceCollapse)}
              className="flex-1 flex items-center px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 items-center justify-center gap-2 transition-all shadow-sm"
              title={forceCollapse ? 'Expandir Todo' : 'Colapsar Todo'}
            >
              {forceCollapse ? <PiPlus className="w-3.5 h-3.5" /> : <PiX className="w-3.5 h-3.5" />}
              <span>{forceCollapse ? 'Abrir' : 'Cerrar'}</span>
            </button>

            <button
              onClick={saveChanges}
              disabled={isSaving}
              className="flex-[2] sm:flex-none bg-gray-900 text-white px-6 py-2 rounded-xl font-black uppercase tracking-[0.15em] text-[10px] sm:text-xs shadow-lg shadow-gray-200 flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:bg-black active:scale-95 whitespace-nowrap"
            >
              {isSaving ? <PiArrowCounterClockwise className="w-4 h-4 animate-spin" /> : <PiFloppyDisk className="w-4 h-4" />}
              {isSaving ? 'Guardando...' : 'Guardar'}
            </button>
          </>
        }
      />

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
                onClick={() => { setActiveTab('info'); setShowMobileNav(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="w-full text-left p-3 hover:bg-gray-50 rounded-xl text-xs font-bold flex items-center gap-2 text-gray-700"
              >
                <PiHouse className="w-4 h-4 text-emerald-600" /> Datos del Lugar
              </button>
              {blocks.map((block, idx) => (
                <button
                  key={block.id}
                  onClick={() => scrollToBlock(block.id)}
                  className="w-full text-left p-3 hover:bg-gray-50 rounded-xl text-xs font-bold flex items-center gap-2 text-gray-700"
                >
                  {block.type === 'section' ? <PiListBullets className="w-4 h-4 text-blue-600" /> : block.type === 'gallery' ? <PiImages className="w-4 h-4 text-purple-600" /> : <PiImage className="w-4 h-4 text-orange-600" />}
                  <span className="truncate">{block.data.title || block.data.caption || `${block.type} ${idx + 1}`}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {activeTab === 'info' ? (
        <div className="bg-white md:rounded-3xl border-y md:border shadow-xl p-6 sm:p-12">
          <header className="mb-12">
            <h2 className="text-3xl font-black uppercase tracking-tight text-gray-900 mb-2">Información General</h2>
            <p className="text-gray-500 text-sm font-medium">Configura los datos básicos, horarios y contacto de tu establecimiento.</p>
          </header>

          <div className="space-y-10">
            <section className="space-y-6">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 border-b pb-2">Datos Básicos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-gray-600 mb-2 block uppercase tracking-wider">Descripción del Lugar:</label>
                  <textarea
                    value={semanticData.description || ''}
                    onChange={(e) => setSemanticData({ ...semanticData, description: e.target.value })}
                    placeholder="Breve descripción del restaurante, su especialidad y ambiente..."
                    rows={3}
                    className="w-full text-sm p-4 rounded-xl border border-gray-200 outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 resize-none bg-gray-50/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-2 block uppercase tracking-wider">Dirección:</label>
                  <input
                    value={semanticData.address || ''}
                    onChange={(e) => setSemanticData({ ...semanticData, address: e.target.value })}
                    placeholder="Av. Principal #123, Colonia, Ciudad"
                    className="w-full text-sm p-4 rounded-xl border border-gray-200 outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 bg-gray-50/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-2 block uppercase tracking-wider">Sitio Web:</label>
                  <input
                    value={semanticData.website || ''}
                    onChange={(e) => setSemanticData({ ...semanticData, website: e.target.value })}
                    placeholder="https://www.ejemplo.com"
                    className="w-full text-sm p-4 rounded-xl border border-gray-200 outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 bg-gray-50/30"
                  />
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 border-b pb-2">Contacto y Pedidos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-2 block uppercase tracking-wider">Teléfono:</label>
                  <input
                    value={semanticData.phone || ''}
                    onChange={(e) => setSemanticData({ ...semanticData, phone: e.target.value })}
                    placeholder="81 1234 5678"
                    className="w-full text-sm p-4 rounded-xl border border-gray-200 outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 bg-gray-50/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-2 block uppercase tracking-wider">WhatsApp para pedidos:</label>
                  <input
                    value={semanticData.whatsapp || ''}
                    onChange={(e) => setSemanticData({ ...semanticData, whatsapp: e.target.value.replace(/\D/g, '') })}
                    placeholder="528112345678"
                    className="w-full text-sm p-4 rounded-xl border border-gray-200 outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 bg-gray-50/30"
                  />
                  <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-tight">Código país + número (ej: 52 81 1234 5678)</p>
                </div>
                <div className="md:col-span-2 flex items-center gap-4 p-5 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <div className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      id="enable_cart_tab"
                      checked={semanticData.enable_cart || false}
                      onChange={(e) => setSemanticData({ ...semanticData, enable_cart: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-emerald-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                  </div>
                  <div>
                    <label htmlFor="enable_cart_tab" className="text-sm font-bold text-emerald-900 cursor-pointer block">Activar Carrito de Compras</label>
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-0.5">Pedidos por WhatsApp</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 border-b pb-2">Horarios y Disponibilidad</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-gray-600 mb-2 block uppercase tracking-wider">Horario de Servicio:</label>
                  <textarea
                    value={semanticData.hours || ''}
                    onChange={(e) => setSemanticData({ ...semanticData, hours: e.target.value })}
                    placeholder="Lun-Vie 13:00-23:00, Sáb-Dom 12:00-00:00"
                    rows={3}
                    className="w-full text-sm p-4 rounded-xl border border-gray-200 outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 resize-none bg-gray-50/30"
                  />
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 border-b pb-2">Detalles Adicionales</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-2 block uppercase tracking-wider">Rango de Precios:</label>
                  <input
                    value={semanticData.price_range || ''}
                    onChange={(e) => setSemanticData({ ...semanticData, price_range: e.target.value })}
                    placeholder="más de MXN500"
                    className="w-full text-sm p-4 rounded-xl border border-gray-200 outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 bg-gray-50/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-2 block uppercase tracking-wider">Tipo de Cocina:</label>
                  <input
                    value={semanticData.cuisine_type || ''}
                    onChange={(e) => setSemanticData({ ...semanticData, cuisine_type: e.target.value })}
                    placeholder="Mexicana contemporánea"
                    className="w-full text-sm p-4 rounded-xl border border-gray-200 outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 bg-gray-50/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-2 block uppercase tracking-wider">Ambiente:</label>
                  <input
                    value={semanticData.ambiance || ''}
                    onChange={(e) => setSemanticData({ ...semanticData, ambiance: e.target.value })}
                    placeholder="Casual elegante"
                    className="w-full text-sm p-4 rounded-xl border border-gray-200 outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 bg-gray-50/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-2 block uppercase tracking-wider">Código de Vestimenta:</label>
                  <input
                    value={semanticData.dress_code || ''}
                    onChange={(e) => setSemanticData({ ...semanticData, dress_code: e.target.value })}
                    placeholder="Ropa formal"
                    className="w-full text-sm p-4 rounded-xl border border-gray-200 outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 bg-gray-50/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-2 block uppercase tracking-wider">Zona:</label>
                  <input
                    value={semanticData.zone || ''}
                    onChange={(e) => setSemanticData({ ...semanticData, zone: e.target.value })}
                    placeholder="San Pedro Garza García"
                    className="w-full text-sm p-4 rounded-xl border border-gray-200 outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 bg-gray-50/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-2 block uppercase tracking-wider">Intersección:</label>
                  <input
                    value={semanticData.cross_street || ''}
                    onChange={(e) => setSemanticData({ ...semanticData, cross_street: e.target.value })}
                    placeholder="Jose Vasconcelos"
                    className="w-full text-sm p-4 rounded-xl border border-gray-200 outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 bg-gray-50/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-2 block uppercase tracking-wider">Estacionamiento:</label>
                  <input
                    value={semanticData.parking || ''}
                    onChange={(e) => setSemanticData({ ...semanticData, parking: e.target.value })}
                    placeholder="Servicio de estacionamiento"
                    className="w-full text-sm p-4 rounded-xl border border-gray-200 outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 bg-gray-50/30"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-gray-600 mb-2 block uppercase tracking-wider">Reservación Online (URL):</label>
                  <input
                    value={semanticData.reservation_url || ''}
                    onChange={(e) => setSemanticData({ ...semanticData, reservation_url: e.target.value })}
                    placeholder="https://reservaciones.com/..."
                    className="w-full text-sm p-4 rounded-xl border border-gray-200 outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 bg-gray-50/30"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-gray-600 mb-2 block uppercase tracking-wider">Variedad / Amenidades:</label>
                  <input
                    value={semanticData.variety || ''}
                    onChange={(e) => setSemanticData({ ...semanticData, variety: e.target.value })}
                    placeholder="Pantalla HD de 9 x 4 mts, etc."
                    className="w-full text-sm p-4 rounded-xl border border-gray-200 outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 bg-gray-50/30"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-gray-600 mb-2 block uppercase tracking-wider">CLABE / Datos de transferencia:</label>
                  <input
                    value={semanticData.clabe || ''}
                    onChange={(e) => setSemanticData({ ...semanticData, clabe: e.target.value })}
                    placeholder="Ej: 012 345 678..."
                    className="w-full text-sm p-4 rounded-xl border border-gray-200 outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 bg-gray-50/30"
                  />
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 border-b pb-2">Áreas del Establecimiento</h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {semanticData.areas?.map((area, idx) => (
                  <span key={idx} className="bg-blue-50 text-blue-700 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border border-blue-100">
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
                className="w-full text-sm p-4 rounded-xl border border-gray-200 outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 bg-gray-50/30"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    const newArea = e.currentTarget.value.trim();
                    setSemanticData({ ...semanticData, areas: [...(semanticData.areas || []), newArea] });
                    e.currentTarget.value = '';
                  }
                }}
              />
            </section>

            <section className="space-y-6">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 border-b pb-2">Opciones de Pago</h3>
              <div className="flex flex-wrap gap-2">
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
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border-2 ${isSelected
                        ? 'bg-gray-900 border-gray-900 text-white shadow-lg'
                        : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200 hover:text-gray-700'
                        }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="space-y-6">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 border-b pb-2">Características Destacadas</h3>
              <div className="flex flex-wrap gap-2">
                {[
                  'WiFi', 'Terraza', 'Bar', 'Estacionamiento valet', 'Música en vivo',
                  'Pet friendly', 'Reservaciones', 'Delivery', 'Para llevar',
                  'Aire acondicionado', 'Smart TV', 'Acceso para silla de ruedas',
                  'Jacuzzi', 'Alberca', 'Cochera techada', 'Sillón Tantra'
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
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border-2 ${isSelected
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg'
                        : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200 hover:text-gray-700'
                        }`}
                    >
                      {feature}
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      ) : activeTab === 'editor' ? (
        <>
          <div className="flex flex-col gap-6">

          </div>

          <div className="">
            <button
              onClick={() => setShowViewSettings(!showViewSettings)}
              className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-200 hover:border-gray-300 transition-all shadow-sm group"
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 bg-white rounded-2xl shadow-sm text-gray-700 group transition-transform ${showViewSettings ? 'shadow-inner' : ''}`}>
                  <PiLayout className={`w-5 h-5 transition-transform duration-300 ${showViewSettings ? 'rotate-12 text-indigo-500' : ''}`} />
                </div>
                <div className="text-left">
                  <span className="font-bold uppercase text-[10px] tracking-[0.2em] text-gray-800 block mb-1">Diseño de Página</span>
                  <p className="text-xs text-gray-600 font-medium">Plantilla, distribución y visualización</p>
                </div>
              </div>
            </button>

            {showViewSettings && (
              <div className="mt-4 p-6 bg-white rounded-2xl border border-gray-200 shadow-xl space-y-6">
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-4 block uppercase tracking-wider">Plantilla del {placeType === 'restaurant' ? 'Menú' : 'Motel'}:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {(placeType === 'restaurant'
                      ? [
                        { id: 'default', name: 'Tradicional', desc: 'Limpio y elegante', icon: '📖' },
                        { id: 'modern', name: 'Moderno', desc: 'Aire de revista', icon: '✨' },
                        { id: 'elegant', name: 'Gourmet', desc: 'Estilo Premium', icon: '🍷' },
                      ]
                      : [
                        { id: 'default', name: 'Urbano App', desc: 'Oscuro y moderno', icon: '📱' },
                        { id: 'classic', name: 'Clásico VIP', desc: 'Dorado y elegante', icon: '🏛️' },
                        { id: 'night', name: 'Neon Night', desc: 'Vibrante y atrevido', icon: '🌃' },
                      ]
                    ).map((tpl) => (
                      <button
                        key={tpl.id}
                        onClick={() => setViewSettings({ ...viewSettings, template: tpl.id })}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${viewSettings.template === tpl.id
                          ? 'border-indigo-600 bg-indigo-50/50'
                          : 'border-gray-100 hover:border-indigo-200 bg-gray-50/30'}`}
                      >
                        <div className="text-2xl mb-2">{tpl.icon}</div>
                        <div className={`font-bold text-sm ${viewSettings.template === tpl.id ? 'text-indigo-900' : 'text-gray-700'}`}>{tpl.name}</div>
                        <div className="text-[10px] text-gray-500 uppercase font-bold tracking-tight">{tpl.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-2 block uppercase tracking-wider">Distribución:</label>
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                      <button
                        onClick={() => setViewSettings({ ...viewSettings, layout: 'grid' })}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all ${viewSettings.layout === 'grid' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                        Cuadrícula (Grid)
                      </button>
                      <button
                        onClick={() => setViewSettings({ ...viewSettings, layout: 'list' })}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all ${viewSettings.layout === 'list' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                        Lista
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <input
                      type="checkbox"
                      id="show_prices"
                      checked={viewSettings.show_prices}
                      onChange={(e) => setViewSettings({ ...viewSettings, show_prices: e.target.checked })}
                      className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <label htmlFor="show_prices" className="text-sm font-bold text-gray-700 cursor-pointer">
                      Mostrar precios al público
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {showAIChat && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 lg:p-12 animate-in fade-in duration-300">
              <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setShowAIChat(false)} />

              <div className="relative w-full max-w-4xl h-[85vh] bg-white rounded-[2rem] shadow-2xl flex flex-col overflow-hidden border border-white/20">
                {/* Header */}
                <div className="p-5 border-b flex items-center justify-between bg-white shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-200">
                      <PiSparkle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-base font-black uppercase tracking-tight leading-none text-gray-900">Asistente BysMax <span className="text-purple-600">IA</span></h2>
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">En línea • Especialista en {placeType === 'motel' ? 'Moteles' : 'Restaurantes'}</p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAIChat(false)}
                    className="p-2.5 hover:bg-gray-100 rounded-full transition-all active:scale-90"
                  >
                    <PiX className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                {/* Chat History */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50">
                  {chatMessages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                      <div className={`max-w-[85%] sm:max-w-[70%] ${msg.role === 'user' ? 'order-1' : 'order-2'}`}>
                        <div className={`p-4 rounded-2xl shadow-sm border ${msg.role === 'user'
                          ? 'bg-slate-900 text-white border-slate-800 rounded-tr-none'
                          : 'bg-white text-gray-800 border-gray-100 rounded-tl-none'
                          }`}>
                          <p className={`text-sm leading-relaxed ${msg.role === 'user' ? 'font-medium' : 'font-normal'}`}>
                            {msg.content}
                          </p>

                          {/* AI Stats / Pending Changes Card */}
                          {msg.role === 'assistant' && msg.stats && (
                            <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                              <div className="grid grid-cols-2 gap-2">
                                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                  <p className="text-[9px] text-gray-400 uppercase font-bold mb-1">Secciones</p>
                                  <p className="text-lg font-black text-gray-900">{msg.stats.sections}</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                  <p className="text-[9px] text-gray-400 uppercase font-bold mb-1">Productos</p>
                                  <p className="text-lg font-black text-gray-900">{msg.stats.items}</p>
                                </div>
                              </div>

                              <button
                                onClick={confirmAiChanges}
                                className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-purple-700 transition-all shadow-lg shadow-purple-100 flex items-center justify-center gap-2"
                              >
                                {aiProcessing ? <PiArrowCounterClockwise className="w-4 h-4 animate-spin" /> : <PiCheckCircle className="w-4 h-4" />}
                                Aplicar estos cambios
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-5 bg-white border-t shrink-0">
                  {aiFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                      {aiFiles.map((file, idx) => (
                        <div key={idx} className="group relative transition-all hover:scale-105">
                          <img
                            src={file.data}
                            alt={file.name}
                            className="w-14 h-14 object-cover rounded-xl border border-gray-200 shadow-sm"
                          />
                          <button
                            onClick={() => removeAiFile(idx)}
                            className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-1 shadow-md z-10 hover:bg-red-600"
                          >
                            <PiX size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="relative group transition-all">
                    <textarea
                      className="w-full p-4 pr-16 text-sm bg-gray-50 rounded-2xl border-2 border-transparent focus:border-purple-500 focus:bg-white outline-none resize-none transition-all placeholder:text-gray-400 font-medium min-h-[50px] max-h-[150px]"
                      placeholder="Escribe algo... o pega una imagen del menú"
                      rows={1}
                      onPaste={handlePaste}
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      disabled={aiProcessing}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          analyzeMenuWithAI();
                        }
                      }}
                    />

                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all"
                        title="Adjuntar imagen"
                      >
                        <PiPaperclip className="w-5 h-5" />
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          className="hidden"
                          onChange={handleAIImagesUpload}
                          accept="image/*"
                        />
                      </button>
                      <button
                        onClick={analyzeMenuWithAI}
                        disabled={aiProcessing || (!textInput.trim() && aiFiles.length === 0)}
                        className={`p-2.5 rounded-xl transition-all ${aiProcessing || (!textInput.trim() && aiFiles.length === 0)
                          ? 'text-gray-200'
                          : 'bg-purple-600 text-white shadow-lg shadow-purple-200 hover:bg-purple-700 active:scale-90'
                          }`}
                      >
                        {aiProcessing ? <PiArrowCounterClockwise className="w-5 h-5" /> : <PiPaperPlaneTilt className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  <p className="text-center text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-3">
                    Presiona Enter para enviar • Shift + Enter para salto de línea
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="hidden xl:block mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-400 font-bold uppercase tracking-wider px-1">
            <span className="flex items-center gap-1"><PiCheckCircle className="w-3 h-3" /> Pega imágenes (Ctrl+V)</span>
            <span className="flex items-center gap-1"><PiCheckCircle className="w-3 h-3" /> CMD + Enter para enviar</span>
            <span className="flex items-center gap-1"><PiCheckCircle className="w-3 h-3" /> Arrastra fotos o archivos</span>
          </div>

          <div className="space-y-4 lg:px-4 sm:px-0">
            {blocks.map((block, index) => (
              <div key={block.id} id={block.id} className="relative scroll-mt-24">

                <div className="flex justify-end gap-2 mb-3 ">
                  <button
                    onClick={() => moveBlock(index, 'up')}
                    disabled={index === 0}
                    className="w-10 h-10 bg-white shadow-sm border border-gray-100 rounded-xl hover:bg-emerald-50 hover:border-emerald-200 disabled:opacity-30 flex items-center justify-center transition-all group"
                    title="Subir"
                  >
                    <PiCaretUp className="w-4 h-4 text-gray-500 group-hover:text-emerald-600" />
                  </button>
                  <button
                    onClick={() => moveBlock(index, 'down')}
                    disabled={index === blocks.length - 1}
                    className="w-10 h-10 bg-white shadow-sm border border-gray-100 rounded-xl hover:bg-emerald-50 hover:border-emerald-200 disabled:opacity-30 flex items-center justify-center transition-all group"
                    title="Bajar"
                  >
                    <PiCaretDown className="w-4 h-4 text-gray-500 group-hover:text-emerald-600" />
                  </button>
                  <button
                    onClick={() => duplicateBlock(index)}
                    className="w-10 h-10 bg-white shadow-sm border border-gray-100 rounded-xl hover:bg-blue-50 hover:border-blue-200 flex items-center justify-center transition-all group"
                    title="Duplicar"
                  >
                    <PiCopy className="w-4 h-4 text-gray-600 group-hover:text-blue-600" />
                  </button>
                  <button
                    onClick={() => removeBlock(index)}
                    className="w-10 h-10 bg-white shadow-sm border border-gray-100 rounded-xl hover:bg-red-50 hover:border-red-200 flex items-center justify-center transition-all group"
                    title="Eliminar"
                  >
                    <PiTrash className="w-4 h-4 text-gray-600 group-hover:text-red-600" />
                  </button>
                </div>

                {renderBlock(block, index, forceCollapse)}

                <div className="flex justify-center my-4">
                  <button
                    onClick={() => setShowBlockMenu(`after-${index}`)}
                    className="bg-white hover:bg-emerald-50 text-emerald-600 border border-emerald-100 px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm hover:shadow-md hover:scale-105 flex items-center gap-2"
                  >
                    <PiPlus className="w-3 h-3" /> Agregar nuevo bloque
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
                <div className="mb-4 flex justify-center">
                  <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-gray-300">
                    <PiTray className="w-8 h-8" />
                  </div>
                </div>
                <p className="text-gray-500 font-bold uppercase text-xs mb-6 tracking-widest">El menú está vacío. Comienza agregando contenido.</p>
                <button
                  onClick={() => setShowBlockMenu(true)}
                  className="bg-gray-900 text-white px-10 py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-black shadow-xl transition-all flex items-center gap-2 mx-auto"
                >
                  <PiPlus className="w-4 h-4" /> Agregar Primer Bloque
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
      ) : activeTab === 'media' ? (
        <div className="bg-white md:rounded-2xl border-y md:border shadow-xl p-6 sm:p-12">
          <div className="max-w-4xl mx-auto space-y-12">
            <header className="text-center">
              <h2 className="text-3xl font-black uppercase tracking-tight text-gray-900 mb-2">Biblioteca de Medios</h2>
              <p className="text-gray-500 text-sm font-medium">Gestiona todas las imágenes de tu establecimiento en un solo lugar.</p>
            </header>

            <section className="bg-gray-50 p-8 rounded-[2.5rem] border-2 border-dashed border-gray-200">
              <div className="text-center mb-6">
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Subir nuevas imágenes a la biblioteca:</h3>
              </div>
              <ManualUploader
                onFilesUploaded={(urls) => setMediaLibrary(prev => [...new Set([...prev, ...urls])])}
                multiple={true}
              />
            </section>

            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-800">Tus Imágenes ({getAllExistingImages().length})</h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {getAllExistingImages().map((url, idx) => (
                  <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border-2 border-gray-100 shadow-sm group">
                    <img src={url} className="w-full h-full object-cover" alt="" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        onClick={() => { navigator.clipboard.writeText(url); alert('URL copiada'); }}
                        className="p-2.5 bg-white rounded-xl text-gray-800 hover:bg-gray-100 shadow-lg active:scale-95 transition-all"
                        title="Copiar Link"
                      >
                        <PiCopy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('¿Seguro que quieres eliminar esta imagen de la biblioteca? Dejará de aparecer en los selectores.')) {
                            setMediaLibrary(prev => prev.filter(u => u !== url));
                          }
                        }}
                        className="p-2.5 bg-red-600 rounded-xl text-white hover:bg-red-700 shadow-lg active:scale-95 transition-all"
                        title="Eliminar de la biblioteca"
                      >
                        <PiTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {getAllExistingImages().length === 0 && (
                <div className="text-center py-24 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-100">
                  <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center text-gray-200 mx-auto mb-6">
                    <PiFolderSimple className="w-10 h-10" />
                  </div>
                  <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">Aún no hay imágenes en la biblioteca.</p>
                </div>
              )}
            </section>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden md:rounded-2xl md:border shadow-xl bg-[#0A0A0A]">
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
                content: { blocks, semantic_data: semanticData, view_settings: viewSettings }
              }}
              isPreview={true}
            />
          ) : (
            <div className="p-20 text-center bg-gray-50">
              <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center text-gray-200 mx-auto mb-6">
                <PiEye className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold uppercase mb-4">Vista Previa</h2>
              <p className="text-gray-500 text-sm">Próximamente disponible para Restaurantes. Use el editor para realizar cambios.</p>
            </div>
          )}
        </div>
      )}

      {/* Botón Flotante de IA */}
      <div className="fixed bottom-6 right-6 z-[70] hidden sm:block">
        <button
          onClick={() => setShowAIChat(!showAIChat)}
          className="group relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-2xl transition-all hover:scale-110 active:scale-95"
          title="Asistente IA ✨"
        >
          <div className="absolute inset-0 bg-white/20 opacity-0 transition-opacity group-hover:opacity-100" />
          <PiSparkle className={`h-8 w-8 transition-transform duration-500 ${showAIChat ? 'rotate-180' : 'group-hover:rotate-12'}`} />
          <div className="absolute -bottom-1 h-1 w-1 rounded-full bg-white opacity-40 blur-sm group-hover:scale-[20]" />
        </button>
      </div>

      {/* Botón Flotante de IA para Mobile */}
      <div className="fixed bottom-24 right-6 z-40 sm:hidden">
        <button
          onClick={() => setShowAIChat(!showAIChat)}
          className="w-14 h-14 bg-gradient-to-tr from-purple-600 to-indigo-600 text-white rounded-full shadow-xl flex items-center justify-center text-xl active:scale-95 transition-all"
        >
          <PiSparkle className="w-6 h-6" />
        </button>
      </div>
    </div >
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

function ImageSelector({ existingImages, onSelect, onClose, onUpload, multiple = false, onSelectMultiple }: { existingImages: string[]; onSelect?: (url: string) => void; onClose: () => void; onUpload?: (urls: string[]) => void; multiple?: boolean; onSelectMultiple?: (urls: string[]) => void }) {
  const [selectedUrls, setSelectedUrls] = useState<string[]>([]);

  const handleToggleSelect = (url: string) => {
    if (!multiple) {
      onSelect?.(url);
      onClose();
      return;
    }

    if (selectedUrls.includes(url)) {
      setSelectedUrls(prev => prev.filter(u => u !== url));
    } else {
      setSelectedUrls(prev => [...prev, url]);
    }
  };

  const handleConfirm = () => {
    if (multiple && onSelectMultiple) {
      onSelectMultiple(selectedUrls);
    }
    onClose();
  };

  if (existingImages.length === 0 && !onUpload) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white rounded-2xl shadow-2xl p-8 text-center max-w-md w-full animate-in zoom-in duration-300">
          <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center text-gray-300 mx-auto mb-6">
            <PiImages className="w-10 h-10" />
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">Biblioteca vacía</h3>
          <p className="text-sm text-gray-500 mb-6">Usa los botones de "Subir" en cada bloque para agregar contenido nuevo.</p>
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-gray-900 text-white rounded-xl text-sm font-bold uppercase tracking-widest hover:bg-black transition-all"
          >
            Entendido
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
          <h3 className="text-sm font-bold uppercase text-gray-800 tracking-wide">Biblioteca de Medios</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600"
          >
            <PiX className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)] space-y-8">
          {onUpload && (
            <section className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Subir nuevas imágenes a la biblioteca:</h4>
              <ManualUploader
                onFilesUploaded={(urls) => {
                  onUpload(urls);
                }}
                multiple={true}
              />
            </section>
          )}

          <section>
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Seleccionar de la biblioteca:</h4>
            {existingImages.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-2">📸</div>
                <p className="text-sm text-gray-400">No hay imágenes en la biblioteca. ¡Sube algunas arriba!</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {existingImages.map((url, idx) => {
                  const isSelected = selectedUrls.includes(url);
                  return (
                    <button
                      key={idx}
                      onClick={() => handleToggleSelect(url)}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all group ${isSelected
                        ? 'border-blue-600 shadow-md ring-2 ring-blue-100'
                        : 'border-gray-200 hover:border-blue-400'
                        }`}
                    >
                      <img src={url} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-110" />

                      {/* Selection Overlay (Only shown if selected) */}
                      {isSelected && (
                        <div className="absolute inset-0 bg-blue-600/20 flex items-center justify-center animate-in fade-in zoom-in duration-200">
                          <div className="bg-blue-600 text-white p-1.5 rounded-full shadow-lg transform scale-110">
                            <PiCheckCircle className="w-6 h-6" />
                          </div>
                        </div>
                      )}

                      {/* Hover Indicator (Only for non-selected items) */}
                      {!isSelected && (
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                          <div className="bg-white/90 text-gray-900 p-2 rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-200">
                            <PiPlus className="w-5 h-5" />
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {multiple && (
          <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex justify-between items-center shadow-[0_-10px_20px_-5px_rgba(0,0,0,0.05)]">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest leading-none">
              {selectedUrls.length} seleccionadas
            </p>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                disabled={selectedUrls.length === 0}
                onClick={handleConfirm}
                className="px-8 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all disabled:opacity-50 disabled:grayscale disabled:scale-95"
              >
                Insertar Imágenes
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


function SectionBlock({ data, onChange, placeType = 'restaurant', forceCollapse, existingImages, onUploadToLibrary }: { data: SectionData; onChange: (data: SectionData) => void; placeType?: 'restaurant' | 'motel'; forceCollapse?: boolean; existingImages?: string[]; onUploadToLibrary?: (urls: string[]) => void }) {
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
      features: [],
      options: []
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
    <div className={`xl:bg-white rounded-2xl  duration-500 overflow-hidden ${isCollapsed ? 'border-gray-50 shadow-sm' : 'border-gray-200 shadow-xl'}`}>
      <div className={`${isCollapsed ? 'bg-white' : 'xl:bg-gray-50'} xl:p-4 transition-all uppercase tracking-wide`}>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl shadow-sm font-bold transition-all ${isCollapsed ? 'bg-gray-100 text-gray-500 hover:bg-gray-200' : 'bg-gray-700 text-white shadow-gray-200'}`}
          >
            <PiPlus className={`w-5 h-5 transition-transform duration-300 ${isCollapsed ? '' : 'rotate-45'}`} />
          </button>

          <div className="flex-1">
            <input
              value={data.title}
              onChange={(e) => onChange({ ...data, title: e.target.value })}
              placeholder="Ej: PLATILLOS FUERTES"
              className={`w-full font-bold uppercase bg-transparent outline-none transition-all tracking-wider ${isCollapsed ? 'text-xs text-gray-800' : 'text-xl sm:text-2xl text-gray-800 px-1 border-b-2 border-gray-300'
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
                    onFilesUploaded={(url) => {
                      onChange({ ...data, image: url[0] });
                      onUploadToLibrary?.(url);
                    }}
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
                    Existentes
                  </button>
                )}
              </div>
              {showImageSelector && existingImages && (
                <ImageSelector
                  existingImages={existingImages}
                  onSelect={(url) => onChange({ ...data, image: url })}
                  onClose={() => setShowImageSelector(false)}
                  onUpload={onUploadToLibrary}
                />
              )}
            </div>

            <div className="mt-8">
              <div className="flex justify-between items-center border-t border-purple-50 pt-4 px-1">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Listado de Productos</h4>
                <button
                  onClick={addItem}
                  className="bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg flex items-center gap-2"
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
                <div key={item.id} className="group relative bg-white rounded-[2rem] border border-gray-100 hover:border-gray-200 transition-all duration-300 overflow-hidden shadow-sm hover:shadow-md my-4">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gray-100" />

                  <div className="p-4 sm:p-6">
                    <div className="flex items-center justify-between gap-4 mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-900 text-white rounded-2xl flex items-center justify-center text-xs font-black shadow-lg">{itemIndex + 1}</div>
                        <div>
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block leading-none mb-1">Producto</span>
                          <span className="text-[9px] font-mono text-gray-300 uppercase leading-none">{item.id.split('-').pop()}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => moveItem(itemIndex, 'up')}
                          disabled={itemIndex === 0}
                          className="w-10 h-10 bg-gray-50 text-gray-400 rounded-xl hover:bg-gray-900 hover:text-white disabled:opacity-30 flex items-center justify-center transition-all"
                        >
                          <PiCaretUp className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => moveItem(itemIndex, 'down')}
                          disabled={itemIndex === data.items.length - 1}
                          className="w-10 h-10 bg-gray-50 text-gray-400 rounded-xl hover:bg-gray-900 hover:text-white disabled:opacity-30 flex items-center justify-center transition-all"
                        >
                          <PiCaretDown className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => { if (confirm('¿Eliminar este producto?')) removeItem(itemIndex); }}
                          className="w-10 h-10 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white flex items-center justify-center transition-all"
                        >
                          <PiTrash className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1 block">Nombre del Producto</label>
                          <input
                            value={item.name}
                            onChange={(e) => updateItem(itemIndex, { name: e.target.value })}
                            placeholder="Ej: Gordita de Chicharrón"
                            className="w-full text-sm font-bold bg-white border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-purple-600 shadow-sm transition-all"
                          />
                        </div>
                        <div className="w-full sm:w-32">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1 block">Precio ($)</label>
                          <input
                            type="number"
                            value={item.price}
                            onChange={(e) => updateItem(itemIndex, { price: parseFloat(e.target.value) })}
                            placeholder="0.00"
                            className="w-full text-left sm:text-right text-sm sm:text-base font-bold text-emerald-600 bg-white border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-purple-600 shadow-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1 block">Descripción</label>
                        <textarea
                          value={item.description}
                          onChange={(e) => updateItem(itemIndex, { description: e.target.value })}
                          placeholder="Describe los ingredientes, tamaño o lo que incluye..."
                          rows={2}
                          className="w-full text-sm text-gray-700 p-3 rounded-xl bg-white border border-gray-200 outline-none focus:border-purple-600 resize-none shadow-sm transition-all"
                        />
                      </div>

                      <div className="space-y-6 pt-2">
                        <div className="space-y-4">
                          <label className="text-[10px] font-black text-gray-900 uppercase tracking-widest flex items-center gap-2 px-1">
                            <PiSparkle className="w-4 h-4 text-emerald-500" />
                            Variantes (Sabores o Tamaños)
                          </label>

                          <div className="space-y-4">
                            {item.options?.map((option, optIdx) => (
                              <div key={optIdx} className="space-y-3 p-4 bg-slate-50/50 rounded-2xl border border-slate-100 relative group/opt">
                                <button
                                  onClick={() => {
                                    const newOptions = item.options?.filter((_, i) => i !== optIdx);
                                    updateItem(itemIndex, { options: newOptions });
                                  }}
                                  className="absolute -top-2 -right-2 w-8 h-8 bg-white text-slate-400 hover:text-red-500 rounded-full shadow-sm border border-slate-100 flex items-center justify-center transition-all opacity-0 group-hover/opt:opacity-100"
                                >
                                  <PiTrash className="w-4 h-4" />
                                </button>

                                <div className="flex flex-col gap-2">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Nombre del grupo (ej: Sabor, Tamaño):</label>
                                  <input
                                    value={option.name}
                                    onChange={(e) => {
                                      const newOptions = [...(item.options || [])];
                                      newOptions[optIdx].name = e.target.value;
                                      updateItem(itemIndex, { options: newOptions });
                                    }}
                                    placeholder="Ej: Sabor de la masa..."
                                    className="w-full text-sm font-bold bg-white border border-slate-200 rounded-xl px-4 py-2 outline-none focus:border-emerald-500 transition-all"
                                  />
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  {option.values.map((val, vIdx) => (
                                    <span key={vIdx} className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-2 group border border-emerald-100">
                                      {val}
                                      <button
                                        onClick={() => {
                                          const newOptions = [...(item.options || [])];
                                          newOptions[optIdx].values = newOptions[optIdx].values.filter((_, i) => i !== vIdx);
                                          updateItem(itemIndex, { options: newOptions });
                                        }}
                                        className="text-emerald-300 hover:text-red-500"
                                      >×</button>
                                    </span>
                                  ))}
                                  <input
                                    placeholder="Escribe sabores separados por comas..."
                                    className="text-xs bg-white px-4 py-2 rounded-xl outline-none flex-1 min-w-[200px] border border-slate-200 focus:border-emerald-500"
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val.includes(',')) {
                                        const parts = val.split(',').map(p => p.trim()).filter(p => p);
                                        const newOptions = [...(item.options || [])];
                                        newOptions[optIdx].values = [...newOptions[optIdx].values, ...parts];
                                        updateItem(itemIndex, { options: newOptions });
                                        e.target.value = '';
                                      }
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        if (e.currentTarget.value.trim()) {
                                          const newOptions = [...(item.options || [])];
                                          newOptions[optIdx].values.push(e.currentTarget.value.trim());
                                          updateItem(itemIndex, { options: newOptions });
                                          e.currentTarget.value = '';
                                        }
                                      }
                                    }}
                                  />
                                </div>
                              </div>
                            ))}

                            <button onClick={() => {
                              const newOptions = [...(item.options || []), { name: '', values: [], required: true }];
                              updateItem(itemIndex, { options: newOptions });
                            }} className="w-full py-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-emerald-500 hover:text-emerald-600 transition-all flex items-center justify-center gap-2">
                              <PiPlus className="w-4 h-4" /> Añadir Nueva Variante
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block px-1">Etiquetas (Picante, Veggie, etc)</label>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {item.features?.map((feature, fIdx) => (
                              <span key={fIdx} className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-2 border border-gray-200">
                                {feature}
                                <button
                                  onClick={() => {
                                    const newFeatures = item.features?.filter((_, i) => i !== fIdx);
                                    updateItem(itemIndex, { features: newFeatures });
                                  }}
                                  className="text-gray-400 hover:text-red-600"
                                >×</button>
                              </span>
                            ))}
                          </div>
                          <input
                            type="text"
                            placeholder="Escribe etiquetas separadas por comas..."
                            className="w-full text-xs p-4 rounded-xl bg-gray-50 border border-transparent focus:border-gray-200 outline-none transition-all"
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val.includes(',')) {
                                const parts = val.split(',').map(p => p.trim()).filter(p => p);
                                const currentFeatures = item.features || [];
                                updateItem(itemIndex, { features: [...currentFeatures, ...parts] });
                                e.target.value = '';
                              }
                            }}
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

                      <div className="space-y-4 pt-4 border-t border-gray-50">
                        <label className="text-[10px] font-black text-gray-900 uppercase tracking-widest flex items-center gap-2 px-1">
                          <PiImage className="w-4 h-4 text-emerald-500" />
                          Fotos del Producto
                        </label>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Main Image Selector */}
                          <div className="bg-gray-50 p-4 rounded-2xl space-y-4">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Imagen Principal</p>

                            {item.image ? (
                              <div className="space-y-3">
                                <div className="relative aspect-video rounded-xl overflow-hidden shadow-sm border border-gray-200">
                                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => setShowItemImageSelector({ ...showItemImageSelector, [itemIndex]: true })}
                                    className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm"
                                  >
                                    <PiArrowCounterClockwise size={14} className="text-blue-500" /> Cambiar
                                  </button>
                                  <button
                                    onClick={() => updateItem(itemIndex, { image: '' })}
                                    className="px-4 py-2.5 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-100 active:scale-95 transition-all flex items-center justify-center shadow-sm"
                                  >
                                    <PiTrash size={14} />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => setShowItemImageSelector({ ...showItemImageSelector, [itemIndex]: true })}
                                className="w-full aspect-video border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-emerald-500 hover:text-emerald-500 transition-all group bg-white"
                              >
                                <PiImage size={24} className="group-hover:scale-110 transition-transform" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Añadir Foto</span>
                              </button>
                            )}

                            {showItemImageSelector[itemIndex] && (
                              <ImageSelector
                                existingImages={existingImages || []}
                                onSelect={(url) => {
                                  updateItem(itemIndex, { image: url });
                                  setShowItemImageSelector({ ...showItemImageSelector, [itemIndex]: false });
                                }}
                                onClose={() => setShowItemImageSelector({ ...showItemImageSelector, [itemIndex]: false })}
                                onUpload={onUploadToLibrary}
                              />
                            )}
                          </div>

                          {/* Gallery Selector */}
                          <div className="bg-gray-50 p-4 rounded-2xl space-y-4">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Galería de Fotos</p>

                            <button
                              onClick={() => setShowItemGallerySelector({ ...showItemGallerySelector, [itemIndex]: true })}
                              className="w-full aspect-video border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-emerald-500 hover:text-emerald-500 transition-all group bg-white"
                            >
                              <PiPlus className="w-6 h-6 group-hover:scale-110 transition-transform" />
                              <span className="text-[10px] font-black uppercase tracking-widest text-center px-4">Subir o Elegir<br />de la Galería</span>
                            </button>

                            {showItemGallerySelector[itemIndex] && (
                              <ImageSelector
                                existingImages={existingImages || []}
                                multiple={true}
                                onSelectMultiple={(urls) => {
                                  const newGalleryItems = urls.map(url => ({ src: url, alt: item.name, title: '' }));
                                  const currentGallery = item.gallery || [];
                                  updateItem(itemIndex, { gallery: [...currentGallery, ...newGalleryItems] });
                                  setShowItemGallerySelector({ ...showItemGallerySelector, [itemIndex]: false });
                                }}
                                onClose={() => setShowItemGallerySelector({ ...showItemGallerySelector, [itemIndex]: false })}
                                onUpload={onUploadToLibrary}
                              />
                            )}
                          </div>
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
                                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs shadow-md opacity-100 transition-opacity"
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
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function GalleryBlock({ data, onChange, existingImages, onUploadToLibrary }: { data: GalleryData; onChange: (data: GalleryData) => void; existingImages?: string[]; onUploadToLibrary?: (urls: string[]) => void }) {
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
                className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center bg-red-600/80 text-white rounded-lg opacity-100 sm:opacity-0 group-hover:opacity-100 hover:bg-red-700 transition-opacity"
              >
                <PiX className="w-3 h-3" />
              </button>
            </div>
          ))}

          <div className="col-span-2 md:col-span-2 space-y-2">
            <ManualUploader
              onFilesUploaded={addImageToGallery}
              multiple={true}
            />
            <button
              onClick={() => setShowImageSelector(true)}
              className="w-full py-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 border border-blue-100"
            >
              <PiImage className="w-3 h-3" />  Biblioteca Existente
            </button>
          </div>
        </div>

        {showImageSelector && existingImages && (
          <ImageSelector
            existingImages={existingImages}
            multiple={true}
            onSelectMultiple={(urls) => addImageToGallery(urls)}
            onClose={() => setShowImageSelector(false)}
            onUpload={onUploadToLibrary}
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
                  <div className="absolute inset-0 bg-black/20 opacity-100 group-hover:opacity-100 transition-opacity flex items-center justify-center">
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

function CarruselBlock({ data, onChange, existingImages, onUploadToLibrary }: { data: CarruselData; onChange: (data: CarruselData) => void; existingImages?: string[]; onUploadToLibrary?: (urls: string[]) => void }) {
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
                <div className="absolute top-2 right-2 flex gap-1 opacity-100 transition-opacity">
                  <button onClick={() => moveItem(idx, 'up')} className="p-1.5 bg-white shadow-md rounded-lg hover:bg-gray-50 text-gray-700 border border-gray-100">↑</button>
                  <button onClick={() => moveItem(idx, 'down')} className="p-1.5 bg-white shadow-md rounded-lg hover:bg-gray-50 text-gray-700 border border-gray-100">↓</button>
                  <button onClick={() => removeItem(idx)} className="p-1.5 bg-white shadow-md rounded-lg hover:bg-red-50 text-red-600 border border-red-100">✕</button>
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
          <ImageSelector
            existingImages={existingImages || []}
            multiple={true}
            onSelectMultiple={(urls) => addItem(urls)}
            onClose={() => setShowImageSelector(false)}
            onUpload={onUploadToLibrary}
          />
        )}
      </div>
    </div>
  );
}
