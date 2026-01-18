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
  Plus, 
  Trash2, 
  GripVertical, 
  ChevronUp, 
  ChevronDown, 
  Copy, 
  Eye, 
  Layout, 
  Save, 
  Upload, 
  Image as ImageIcon, 
  FileText, 
  Send,
  X,
  Paperclip,
  RotateCcw,
  Sparkles,
  Search,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

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
    switch (block.type) {
      case 'section':
        return <SectionBlock data={block.data} onChange={(data) => updateBlock(index, data)} placeType={placeType} forceCollapse={forceCollapse} />;
      case 'gallery':
        return <GalleryBlock data={block.data} onChange={(data) => updateBlock(index, data)} />;
      case 'image':
        return <ImageBlock data={block.data} onChange={(data) => updateBlock(index, data)} />;
      default:
        return null;
    }
  }

  return (
    <div className="space-y-6 pb-32">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sticky top-0 bg-white/90 backdrop-blur-md z-30 py-4 px-4 sm:px-0 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 p-1 rounded-full items-center gap-1">
            <button 
              onClick={() => setActiveTab('editor')}
              className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase transition-all ${activeTab === 'editor' ? 'bg-black text-white shadow-sm' : 'text-gray-500'}`}
            >
              Diseño
            </button>
            <button 
              onClick={() => setActiveTab('preview')}
              className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase transition-all ${activeTab === 'preview' ? 'bg-black text-white shadow-sm' : 'text-gray-500'}`}
            >
              Previa
            </button>
            <div className="w-px h-4 bg-gray-300 mx-1" />
            <button 
              onClick={() => setForceCollapse(!forceCollapse)}
              className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase text-gray-600 hover:bg-white/50 transition-all"
              title={forceCollapse ? 'Expandir Todo' : 'Colapsar Todo'}
            >
              {forceCollapse ? '📂 Abrir' : '📁 Cerrar'}
            </button>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowAIChat(!showAIChat)}
            className="flex-1 sm:flex-none bg-purple-600 text-white px-6 py-3 sm:py-2 rounded-full font-bold hover:bg-purple-700 transition-all text-sm"
          >
            IA ✨
          </button>
          <button
            onClick={saveChanges}
            disabled={isSaving}
            className="flex-1 sm:flex-none bg-black text-white px-6 py-3 sm:py-2 rounded-full font-bold hover:bg-gray-800 disabled:opacity-50 transition-all text-sm"
          >
            {isSaving ? '...' : 'Publicar'}
          </button>
        </div>
      </header>

      {/* Floating Quick Nav for Mobile */}
      <div className="fixed bottom-6 right-6 z-40 sm:hidden">
        <button
          onClick={() => setShowMobileNav(!showMobileNav)}
          className="w-14 h-14 bg-black text-white rounded-full shadow-2xl flex items-center justify-center text-xl"
        >
          {showMobileNav ? '✕' : '☰'}
        </button>
        
        {showMobileNav && (
          <div className="absolute bottom-16 right-0 w-64 max-h-[70vh] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-y-auto p-4 animate-in slide-in-from-bottom-5">
            <h3 className="text-xs font-black uppercase text-gray-400 mb-3 px-2">Saltar a sección:</h3>
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
          className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-200 hover:border-blue-300 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="font-black uppercase text-sm">Datos del Lugar</span>
          </div>
          <span className="text-2xl">{showSemanticData ? '−' : '+'}</span>
        </button>

        {showSemanticData && (
          <div className="mt-3 p-6 bg-white rounded-xl border-2 border-blue-100 space-y-4">
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
                  onChange={(e) => setSemanticData({ ...semanticData, whatsapp: e.target.value })}
                  placeholder="528112345678"
                  className="w-full text-sm p-3 rounded-lg border border-gray-200 outline-none focus:border-blue-600"
                />
              </div>
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
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                        isSelected
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
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                        isSelected
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
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-black uppercase tracking-tight leading-none">Asistente IA</h2>
                <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">Sube fotos, pega texto o arrastra archivos</p>
              </div>
            </div>
            <button
              onClick={() => setShowAIChat(false)}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
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
                        <X className="w-3 h-3" />
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
                    <Paperclip className="w-4 h-4" />
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
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      Analizando...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Analizar con IA
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 bg-white rounded-2xl border-2 border-green-500 shadow-2xl animate-in fade-in zoom-in duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase text-green-900 leading-none">Análisis Completado</h3>
                  <p className="text-xs text-green-600 font-bold uppercase mt-1">Revisa los cambios detectados</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                  <p className="text-[10px] text-green-600 uppercase font-black mb-1">Secciones</p>
                  <p className="text-3xl font-black text-green-900">{aiStats?.sections || 0}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                  <p className="text-[10px] text-green-600 uppercase font-black mb-1">Productos</p>
                  <p className="text-3xl font-black text-green-900">{aiStats?.items || 0}</p>
                </div>
                {aiStats?.newImages > 0 && (
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 col-span-2 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-blue-600 uppercase font-black">Galería</p>
                      <p className="text-lg font-black text-blue-900">+{aiStats.newImages} fotos detectadas</p>
                    </div>
                    <ImageIcon className="w-8 h-8 text-blue-200" />
                  </div>
                )}
                {(aiStats?.hasAddress || aiStats?.hasPhone) && (
                  <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 col-span-2">
                    <p className="text-[10px] text-amber-600 uppercase font-black mb-1">Contacto Renovado</p>
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
                  className="flex-1 py-3 px-4 bg-gray-100 text-gray-500 rounded-xl font-bold hover:bg-gray-200 transition-colors uppercase text-xs"
                >
                  Descartar
                </button>
                <button
                  onClick={confirmAiChanges}
                  disabled={aiProcessing}
                  className="flex-[2] py-3 px-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors shadow-lg shadow-green-200 flex items-center justify-center gap-2 uppercase text-xs tracking-wider"
                >
                  {aiProcessing ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      Aplicando...
                    </>
                  ) : (
                    <>Aplicar Cambios ✨</>
                  )}
                </button>
              </div>
            </div>
          )}
          
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-400 font-bold uppercase tracking-wider px-1">
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Pega imágenes (Ctrl+V)</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> CMD + Enter para enviar</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Arrastra fotos o archivos</span>
          </div>
        </div>
      )}

      <div className="space-y-4 lg:px-4 sm:px-0">
        {blocks.map((block, index) => (
          <div key={block.id} id={block.id} className="relative scroll-mt-24">
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

        {blocks.length === 0 && (
          <div className="text-center py-24 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 mx-4">
            <div className="mb-4 text-4xl">📭</div>
            <p className="text-gray-500 font-bold uppercase text-xs mb-6">El menú está vacío. Comienza agregando contenido.</p>
            <button
              onClick={() => setShowBlockMenu(true)}
              className="bg-black text-white px-10 py-4 rounded-full font-black uppercase tracking-widest text-xs hover:bg-gray-800 shadow-xl transition-all"
            >
              + Agregar Primer Bloque
            </button>

            {showBlockMenu === true && (
              <div className="mt-8 max-w-md mx-auto p-6 bg-white border rounded-2xl shadow-2xl animate-in zoom-in-95">
                <p className="text-xs font-black text-gray-400 mb-4 uppercase">Selecciona el tipo de bloque:</p>
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
    </>
  ) : (
    <div className="mx-4 sm:mx-0 overflow-hidden rounded-3xl border shadow-2xl bg-[#0A0A0A]">
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
          <h2 className="text-2xl font-black uppercase mb-4">Vista Previa</h2>
          <p className="text-gray-500 text-sm">Próximamente disponible para Restaurantes. Use el editor para realizar cambios.</p>
        </div>
      )}
    </div>
  )}
</div>
);
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

function SectionBlock({ data, onChange, placeType = 'restaurant', forceCollapse }: { data: SectionData; onChange: (data: SectionData) => void; placeType?: 'restaurant' | 'motel'; forceCollapse?: boolean }) {
  const [isCollapsed, setIsCollapsed] = useState(true);

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
    <div className={`bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200 transition-all ${isCollapsed ? 'p-3' : 'p-4 sm:p-6'}`}>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-purple-600 font-bold border border-purple-100 hover:bg-purple-50 transition-colors"
          >
            {isCollapsed ? '+' : '−'}
          </button>
          
          <input
            value={data.title}
            onChange={(e) => onChange({ ...data, title: e.target.value })}
            placeholder="Título de la Sección"
            className={`w-full font-black uppercase bg-transparent outline-none focus:border-purple-600 transition-all ${
              isCollapsed ? 'text-sm' : 'text-xl sm:text-2xl border-b-2 border-purple-300 pb-2'
            }`}
          />

          {isCollapsed && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black bg-purple-200 text-purple-700 px-2 py-1 rounded-full whitespace-nowrap">
                {data.items.length} ITEMS
              </span>
              {data.image && <span className="text-xs">🖼️</span>}
            </div>
          )}
        </div>

        {!isCollapsed && (
          <div className="animate-in fade-in slide-in-from-top-1 duration-200 space-y-4">
            <textarea
              value={data.description || ''}
              onChange={(e) => onChange({ ...data, description: e.target.value })}
              placeholder="Descripción (opcional)"
              rows={2}
              className="w-full text-sm bg-white/50 p-3 rounded-lg border border-purple-200 outline-none focus:border-purple-600"
            />

            <div>
              <label className="text-xs font-bold text-gray-600 mb-2 block uppercase tracking-wider">Imagen de fondo:</label>
              <ManualUploader
                currentImage={data.image}
                onFilesUploaded={(url) => onChange({ ...data, image: url[0] })}
                onImageRemove={() => onChange({ ...data, image: '' })}
                onUploadStart={() => console.log('Subiendo imagen de sección...')}
                onUploadError={() => console.error('Error al subir imagen')}
              />
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex justify-between items-center border-t border-purple-100 pt-4">
                <h4 className="text-xs font-black text-purple-800 uppercase tracking-widest">Contenido de la sección</h4>
                <button
                  onClick={addItem}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-1.5 rounded-full text-xs font-black transition-all shadow-sm hover:shadow-md"
                >
                  + AGREGAR ITEM
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
                  <ManualUploader
                    currentImage={item.image}
                    onFilesUploaded={(url) => updateItem(itemIndex, { image: url[0] })}
                    onImageRemove={() => updateItem(itemIndex, { image: '' })}
                    onUploadStart={() => console.log('Subiendo imagen del item...')}
                    onUploadError={() => console.error('Error al subir imagen')}
                  />
                </div>

                <div className="w-full">
                  <label className="text-xs font-bold text-gray-600 mb-2 block">GALERÍA DEL ITEM (opcional):</label>
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
