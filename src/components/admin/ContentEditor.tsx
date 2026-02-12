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
import { useState, useRef, useEffect, lazy, Suspense, useMemo } from 'react';
import { ManualUploader } from '../ManualUploader';
import type { SemanticData } from '../../types/app';
import AdminPageHeader from './AdminPageHeader';
import type { Block, BlockType, ItemData, ItemOption } from './blocks/types';
const MotelPageRenderer = lazy(() => import('../MotelPageRenderer'));
const RestaurantPreview = lazy(() => import('./RestaurantPreview'));
const AIChat = lazy(() => import('./AIChat'));

const SectionBlock = lazy(() => import('./blocks/SectionBlock').then(m => ({ default: m.SectionBlock })));
const GalleryBlock = lazy(() => import('./blocks/GalleryBlock').then(m => ({ default: m.GalleryBlock })));
const ImageBlock = lazy(() => import('./blocks/ImageBlock').then(m => ({ default: m.ImageBlock })));
const CarruselBlock = lazy(() => import('./blocks/CarruselBlock').then(m => ({ default: m.CarruselBlock })));
const MarkdownBlock = lazy(() => import('./blocks/MarkdownBlockEditor').then(m => ({ default: m.MarkdownBlockEditor })));
const TableView = lazy(() => import('./blocks/TableView').then(m => ({ default: m.TableView })));
const BlockTypeButton = lazy(() => import('./blocks/BlockTypeButton').then(m => ({ default: m.BlockTypeButton })));
const ImageSelector = lazy(() => import('./blocks/ImageSelector').then(m => ({ default: m.ImageSelector })));
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
  PiFolderSimple,
  PiEyeSlash,
  PiTable
} from 'react-icons/pi';

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
  const [activeTab, setActiveTab] = useState<'info' | 'editor' | 'preview' | 'media'>('editor');
  const [editorMode, setEditorMode] = useState<'simple' | 'advanced' | 'table'>('simple');
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [showMobileNav, setShowMobileNav] = useState(false);
  const [forceCollapse, setForceCollapse] = useState(true);
  const [showExtraBlocks, setShowExtraBlocks] = useState(false);
  const [viewSettings, setViewSettings] = useState(() => {
    const vs = initialContent?.view_settings || { layout: 'grid', show_prices: true };

    const normalize = (value: unknown) => {
      if (typeof value !== 'string') return '';
      return value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    };

    const isCafe = (() => {
      if (placeType !== 'restaurant') return false;
      const cuisine = normalize(initialContent?.semantic_data?.cuisine_type);
      const name = normalize(placeData?.name || initialContent?.name);
      const category = normalize(placeData?.category);
      const description = normalize(initialContent?.semantic_data?.description);
      const haystack = `${cuisine} ${name} ${category} ${description}`;
      return haystack.includes('cafe') || haystack.includes('coffee');
    })();

    return {
      layout: vs.layout || 'grid',
      show_prices: vs.show_prices ?? true,
      template: vs.template || (isCafe ? 'elegant' : 'default')
    };
  });
  const [showViewSettings, setShowViewSettings] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isInitialLoad = useRef(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isLibraryPasting, setIsLibraryPasting] = useState(false);
  const [simpleVariantsOpen, setSimpleVariantsOpen] = useState<{ blockId: string; itemId: string } | null>(null);
  const [simpleImagePicker, setSimpleImagePicker] = useState<{ blockIndex: number; itemIndex: number } | null>(null);

  const cloudName = import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME || 'dvdq078aa'
  const uploadPreset = import.meta.env.PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default'

  const optimizeImageUrlForLibrary = (url: string) => {
    const params = 'f_auto,q_auto,w_1000'
    return url.includes('/upload/') ? url.replace('/upload/', `/upload/${params}/`) : url
  }

  const compressImageForLibrary = (file: File): Promise<Blob | File> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const maxDimension = 1080;
        const fileSizeThreshold = 200 * 1024;
        if (img.width <= maxDimension && img.height <= maxDimension && file.size <= fileSizeThreshold) {
          resolve(file);
          return;
        }
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(file); return; }
        ctx.drawImage(img, 0, 0, width, height);
        const isPng = file.type === 'image/png';
        const type = isPng ? 'image/png' : 'image/jpeg';
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name || 'pasted-library.jpg', {
              type: type,
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        }, type, isPng ? undefined : 0.9);
      };
      img.onerror = () => resolve(file);
    });
  };

  const handleLibraryPaste = async (e: React.ClipboardEvent) => {
    if (activeTab !== 'media') return;
    const items = e.clipboardData?.items;
    if (!items) return;

    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }

    if (files.length === 0) return;

    setIsLibraryPasting(true);
    try {
      const uploadPromises = files.map(async (file) => {
        const processedFile = await compressImageForLibrary(file);
        const formData = new FormData();
        formData.append('file', processedFile);
        formData.append('upload_preset', uploadPreset);

        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) throw new Error('Upload failed');
        const data = await response.json();
        return optimizeImageUrlForLibrary(data.secure_url);
      });

      const urls = await Promise.all(uploadPromises);
      setMediaLibrary(prev => [...new Set([...urls, ...prev])]);
    } catch (error) {
      console.error('Error pasting to library:', error);
      alert('Error al pegar en biblioteca');
    } finally {
      setIsLibraryPasting(false);
    }
  };

  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }

    const timer = setTimeout(() => {
      saveChanges(true);
    }, 3000); // 3 segundos de debounce para auto-guardado

    return () => clearTimeout(timer);
  }, [blocks, semanticData, viewSettings, mediaLibrary]);

  useEffect(() => {
    if (activeTab !== 'editor') return;

    const observerOptions = {
      root: null,
      rootMargin: '-10% 0px -70% 0px', // Detectar cuando está cerca de la parte superior
      threshold: 0
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setActiveSectionId(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    // Esperar un momento a que los elementos estén en el DOM
    const timer = setTimeout(() => {
      blocks.forEach(block => {
        const element = document.getElementById(block.id);
        if (element) observer.observe(element);
      });
    }, 500);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [activeTab, blocks]);

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

    // Combine and reverse to show newest first
    const combined = [...Array.from(images)];
    return combined.reverse();
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
      case 'markdown':
      case 'text':
        return { content: '' };
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

  const saveChanges = async (isSilent = false) => {
    const silent = typeof isSilent === 'boolean' ? isSilent : false;
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
        setLastSaved(new Date());
        if (!silent) alert('Contenido actualizado correctamente.');
      } else {
        const error = await response.json();
        console.error('Error al guardar:', error);
        if (!silent) alert('Error al guardar el contenido.');
      }
    } catch (err) {
      console.error(err);
      if (!silent) alert('Error al guardar el contenido.');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteFromMediaLibrary = async (urlToDelete: string) => {
    if (!confirm('¿Seguro que quieres eliminar esta imagen? Se eliminará de la biblioteca y de todo el contenido donde aparezca.')) {
      return;
    }

    // Remover de mediaLibrary
    const updatedLibrary = mediaLibrary.filter(u => u !== urlToDelete);
    setMediaLibrary(updatedLibrary);

    // Remover de todos los bloques
    const updatedBlocks = blocks.map(block => {
      if (!block.data) return block;

      if (block.type === 'section') {
        return {
          ...block,
          data: {
            ...block.data,
            image: block.data.image === urlToDelete ? '' : block.data.image,
            items: block.data.items?.map((item: ItemData) => ({
              ...item,
              image: item.image === urlToDelete ? '' : item.image,
              gallery: item.gallery?.filter(img => img.src !== urlToDelete)
            }))
          }
        };
      } else if (block.type === 'gallery') {
        return {
          ...block,
          data: {
            ...block.data,
            images: block.data.images?.filter((img: any) => img.src !== urlToDelete)
          }
        };
      } else if (block.type === 'image') {
        return {
          ...block,
          data: {
            ...block.data,
            src: block.data.src === urlToDelete ? '' : block.data.src
          }
        };
      } else if (block.type === 'carrusel') {
        return {
          ...block,
          data: {
            ...block.data,
            items: block.data.items?.filter((item: any) => item.src !== urlToDelete)
          }
        };
      }
      return block;
    });

    setBlocks(updatedBlocks);

    // Guardar inmediatamente
    try {
      const response = await fetch(`/api/restaurants/${placeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: {
            semantic_data: semanticData,
            blocks: updatedBlocks,
            view_settings: viewSettings,
            media_library: updatedLibrary
          }
        })
      });

      if (!response.ok) {
        console.error('Error al eliminar imagen');
        // Restaurar si falló
        setMediaLibrary(mediaLibrary);
        setBlocks(blocks);
        alert('Error al eliminar la imagen');
      }
    } catch (err) {
      console.error(err);
      setMediaLibrary(mediaLibrary);
      setBlocks(blocks);
      alert('Error al eliminar la imagen');
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

  const templateConfig = useMemo(() => {
    const template = viewSettings.template || 'default';
    const templateConfigs: Record<string, any> = {
      default: {
        itemTitleClass: 'text-lg font-medium tracking-tight',
        priceClass: 'text-stone-500 font-bold',
      },
      modern: {
        itemTitleClass: 'text-xl font-bold tracking-tight',
        priceClass: 'text-blue-600 font-bold',
      },
      elegant: {
        itemTitleClass: 'text-lg font-semibold tracking-wide',
        priceClass: 'text-amber-700 font-bold',
      },
      vibrant: {},
      uber: {},
      didi: {},
      mariscos: {},
      tienda: {},
    };
    return templateConfigs[template] || templateConfigs.default;
  }, [viewSettings.template]);

  const createDefaultItem = (): ItemData => {
    return {
      id: `item-${Date.now()}-${Math.random()}`,
      name: 'NUEVO PRODUCTO',
      price: 0,
      description: '',
      image: '',
      available: true,
      options: [],
    };
  };

  const addSectionSimple = () => {
    addBlock('section');
  };

  const addItemToSection = (blockIndex: number) => {
    const block = blocks[blockIndex];
    if (!block || block.type !== 'section') return;
    const newItem = createDefaultItem();

    const newBlocks = [...blocks];
    const nextItems = [...(block.data.items || []), newItem];
    newBlocks[blockIndex] = { ...block, data: { ...block.data, items: nextItems } };
    setBlocks(newBlocks);
    setSimpleVariantsOpen(null);
  };

  const updateItemInSection = (blockIndex: number, itemIndex: number, patch: Partial<ItemData>) => {
    const block = blocks[blockIndex];
    if (!block || block.type !== 'section') return;
    const items = [...(block.data.items || [])];
    const current = items[itemIndex];
    if (!current) return;
    items[itemIndex] = { ...current, ...patch };
    const newBlocks = [...blocks];
    newBlocks[blockIndex] = { ...block, data: { ...block.data, items } };
    setBlocks(newBlocks);
  };

  const removeItemFromSection = (blockIndex: number, itemIndex: number) => {
    const block = blocks[blockIndex];
    if (!block || block.type !== 'section') return;
    const items = [...(block.data.items || [])];
    items.splice(itemIndex, 1);
    const newBlocks = [...blocks];
    newBlocks[blockIndex] = { ...block, data: { ...block.data, items } };
    setBlocks(newBlocks);
  };

  const removeSectionSimple = (blockIndex: number) => {
    const block = blocks[blockIndex];
    if (!block || block.type !== 'section') return;
    if (!confirm('¿Seguro que quieres eliminar esta categoría y todos sus productos?')) return;
    removeBlock(blockIndex);
  };

  const moveSectionAmongSections = (blockIndex: number, direction: 'up' | 'down') => {
    const currentBlock = blocks[blockIndex];
    if (!currentBlock || currentBlock.type !== 'section') return;

    if (direction === 'up') {
      for (let i = blockIndex - 1; i >= 0; i--) {
        if (blocks[i]?.type === 'section') {
          const newBlocks = [...blocks];
          [newBlocks[i], newBlocks[blockIndex]] = [newBlocks[blockIndex], newBlocks[i]];
          setBlocks(newBlocks);
          return;
        }
      }
      return;
    }

    for (let i = blockIndex + 1; i < blocks.length; i++) {
      if (blocks[i]?.type === 'section') {
        const newBlocks = [...blocks];
        [newBlocks[i], newBlocks[blockIndex]] = [newBlocks[blockIndex], newBlocks[i]];
        setBlocks(newBlocks);
        return;
      }
    }
  };

  const moveItemWithinSection = (blockIndex: number, itemIndex: number, direction: 'up' | 'down') => {
    const block = blocks[blockIndex];
    if (!block || block.type !== 'section') return;
    const items = [...(block.data.items || [])];

    const targetIndex = direction === 'up' ? itemIndex - 1 : itemIndex + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    [items[itemIndex], items[targetIndex]] = [items[targetIndex], items[itemIndex]];
    const newBlocks = [...blocks];
    newBlocks[blockIndex] = { ...block, data: { ...block.data, items } };
    setBlocks(newBlocks);
  };

  const updateSectionTitle = (blockIndex: number, title: string) => {
    const block = blocks[blockIndex];
    if (!block || block.type !== 'section') return;
    updateBlock(blockIndex, { title });
  };

  const updateItemOptionsInSection = (blockIndex: number, itemIndex: number, nextOptions: ItemOption[]) => {
    updateItemInSection(blockIndex, itemIndex, { options: nextOptions });
  };

  const addVariantGroup = (blockIndex: number, itemIndex: number) => {
    const block = blocks[blockIndex];
    if (!block || block.type !== 'section') return;
    const item = block.data.items?.[itemIndex];
    if (!item) return;
    const nextOptions = [...(item.options || [])];
    nextOptions.push({ name: 'VARIANTE', values: [], prices: {} });
    updateItemOptionsInSection(blockIndex, itemIndex, nextOptions);
  };

  const removeVariantGroup = (blockIndex: number, itemIndex: number, optionIndex: number) => {
    const block = blocks[blockIndex];
    if (!block || block.type !== 'section') return;
    const item = block.data.items?.[itemIndex];
    if (!item) return;
    const nextOptions = [...(item.options || [])];
    nextOptions.splice(optionIndex, 1);
    updateItemOptionsInSection(blockIndex, itemIndex, nextOptions);
  };

  const updateVariantGroupName = (blockIndex: number, itemIndex: number, optionIndex: number, name: string) => {
    const block = blocks[blockIndex];
    if (!block || block.type !== 'section') return;
    const item = block.data.items?.[itemIndex];
    if (!item) return;
    const nextOptions = [...(item.options || [])];
    const opt = nextOptions[optionIndex];
    if (!opt) return;
    nextOptions[optionIndex] = { ...opt, name };
    updateItemOptionsInSection(blockIndex, itemIndex, nextOptions);
  };

  const addVariantValue = (blockIndex: number, itemIndex: number, optionIndex: number) => {
    const block = blocks[blockIndex];
    if (!block || block.type !== 'section') return;
    const item = block.data.items?.[itemIndex];
    if (!item) return;
    const nextOptions = [...(item.options || [])];
    const opt = nextOptions[optionIndex];
    if (!opt) return;
    const nextValues = [...(opt.values || [])];
    const base = 'OPCIÓN';
    let candidate = base;
    let n = 2;
    while (nextValues.includes(candidate)) {
      candidate = `${base} ${n}`;
      n++;
    }
    nextValues.push(candidate);
    const nextPrices = { ...(opt.prices || {}) };
    nextPrices[candidate] = Number.isFinite(nextPrices[candidate]) ? nextPrices[candidate] : 0;
    nextOptions[optionIndex] = { ...opt, values: nextValues, prices: nextPrices };
    updateItemOptionsInSection(blockIndex, itemIndex, nextOptions);
  };

  const removeVariantValue = (blockIndex: number, itemIndex: number, optionIndex: number, valueIndex: number) => {
    const block = blocks[blockIndex];
    if (!block || block.type !== 'section') return;
    const item = block.data.items?.[itemIndex];
    if (!item) return;
    const nextOptions = [...(item.options || [])];
    const opt = nextOptions[optionIndex];
    if (!opt) return;
    const nextValues = [...(opt.values || [])];
    const removed = nextValues[valueIndex];
    nextValues.splice(valueIndex, 1);
    const nextPrices = { ...(opt.prices || {}) };
    if (removed) delete nextPrices[removed];
    nextOptions[optionIndex] = { ...opt, values: nextValues, prices: nextPrices };
    updateItemOptionsInSection(blockIndex, itemIndex, nextOptions);
  };

  const renameVariantValue = (blockIndex: number, itemIndex: number, optionIndex: number, valueIndex: number, nextValue: string) => {
    const block = blocks[blockIndex];
    if (!block || block.type !== 'section') return;
    const item = block.data.items?.[itemIndex];
    if (!item) return;
    const nextOptions = [...(item.options || [])];
    const opt = nextOptions[optionIndex];
    if (!opt) return;
    const values = [...(opt.values || [])];
    const prevValue = values[valueIndex];
    const trimmed = nextValue.trim();
    if (!trimmed) return;
    values[valueIndex] = trimmed;

    const nextPrices = { ...(opt.prices || {}) };
    if (prevValue && prevValue !== trimmed) {
      const prevPrice = nextPrices[prevValue];
      delete nextPrices[prevValue];
      if (prevPrice !== undefined) nextPrices[trimmed] = prevPrice;
    }

    nextOptions[optionIndex] = { ...opt, values, prices: nextPrices };
    updateItemOptionsInSection(blockIndex, itemIndex, nextOptions);
  };

  const setVariantValuePrice = (blockIndex: number, itemIndex: number, optionIndex: number, value: string, price: number) => {
    const block = blocks[blockIndex];
    if (!block || block.type !== 'section') return;
    const item = block.data.items?.[itemIndex];
    if (!item) return;
    const nextOptions = [...(item.options || [])];
    const opt = nextOptions[optionIndex];
    if (!opt) return;
    const nextPrices = { ...(opt.prices || {}) };
    nextPrices[value] = Number.isFinite(price) ? price : 0;
    nextOptions[optionIndex] = { ...opt, prices: nextPrices };
    updateItemOptionsInSection(blockIndex, itemIndex, nextOptions);
  };

  const findSimpleItemLocation = (blockId: string, itemId: string) => {
    const blockIndex = blocks.findIndex(b => b.id === blockId && b.type === 'section');
    if (blockIndex < 0) return null;
    const block = blocks[blockIndex];
    const items = block.type === 'section' ? (block.data.items || []) : [];
    const itemIndex = items.findIndex((it: ItemData) => it.id === itemId);
    if (itemIndex < 0) return null;
    return { blockIndex, itemIndex, item: items[itemIndex] as ItemData };
  };

  const placeSummary = {
    category: placeType,
    location: placeData?.states?.name as string | undefined,
    address: (semanticData.address || placeData?.address) as string | undefined,
    rating: placeData?.rating as number | string | undefined,
  };


  function renderBlock(block: Block, index: number, forceCollapse: boolean) {
    const existingImages = getAllExistingImages();
    const onUploadToLibrary = (urls: string[]) => {
      setMediaLibrary(prev => [...new Set([...urls, ...prev])]);
    };

    switch (block.type) {
      case 'section':
        return (
          <SectionBlock
            data={block.data}
            onChange={(data) => updateBlock(index, data)}
            placeType={placeType}
            forceCollapse={forceCollapse}
            existingImages={existingImages}
            onUploadToLibrary={onUploadToLibrary}
          />
        );
      case 'gallery':
        return <GalleryBlock data={block.data} onChange={(data) => updateBlock(index, data)} existingImages={existingImages} onUploadToLibrary={onUploadToLibrary} />;
      case 'image':
        return <ImageBlock data={block.data} onChange={(data) => updateBlock(index, data)} existingImages={existingImages} />;
      case 'carrusel':
        return <CarruselBlock data={block.data} onChange={(data) => updateBlock(index, data)} existingImages={existingImages} onUploadToLibrary={onUploadToLibrary} />;
      case 'markdown':
      case 'text':
        return <MarkdownBlock data={block.data} onChange={(data) => updateBlock(index, data)} />;
      default:
        return null;
    }

  }

  const sectionEntries = blocks
    .map((block, index) => ({ block, index }))
    .filter(entry => entry.block.type === 'section');

  const extraEntries = blocks
    .map((block, index) => ({ block, index }))
    .filter(entry => entry.block.type !== 'section');

  return (
    <div className=" pb-32">
      <AdminPageHeader
        sticky={activeTab !== 'editor'}
        leftContent={
          <div className="flex items-center gap-3 w-full">
            <div className="flex bg-white/50 rounded-xl gap-0.5 border border-gray-200 shadow-sm w-full items-center justify-center">
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

            <div className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white/60 shadow-sm whitespace-nowrap">
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">{placeSummary.category}</span>
              {placeSummary.location && (
                <span className="text-[10px] font-bold text-gray-600">{placeSummary.location}</span>
              )}
              {placeSummary.address && (
                <span className="text-[10px] font-bold text-gray-500 max-w-[260px] truncate" title={placeSummary.address}>
                  {placeSummary.address}
                </span>
              )}
              {placeSummary.rating !== undefined && placeSummary.rating !== null && placeSummary.rating !== '' && (
                <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                  ★ {placeSummary.rating}
                </span>
              )}
            </div>
          </div>
        }
        rightContent={
          <>
            <button
              onClick={() => setForceCollapse(!forceCollapse)}
              className="flex-1 flex items-center px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 justify-center gap-2 transition-all shadow-sm"
              title={forceCollapse ? 'Expandir Todo' : 'Colapsar Todo'}
            >
              {forceCollapse ? <PiPlus className="w-3.5 h-3.5" /> : <PiX className="w-3.5 h-3.5" />}
              <span>{forceCollapse ? 'Abrir' : 'Cerrar'}</span>
            </button>

            <div className="hidden lg:flex flex-col items-end px-4">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Estado</p>
              {isSaving ? (
                <p className="text-[10px] font-bold text-blue-600 animate-pulse uppercase">Guardando...</p>
              ) : lastSaved ? (
                <p className="text-[10px] font-bold text-emerald-600 uppercase">Guardado {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              ) : (
                <p className="text-[10px] font-bold text-gray-400 uppercase">Pendiente</p>
              )}
            </div>

            <button
              onClick={() => saveChanges()}
              disabled={isSaving}
              className="flex-[2] sm:flex-none bg-gray-900 text-white px-6 py-2 rounded-xl font-black uppercase tracking-[0.15em] text-[10px] sm:text-xs  shadow-gray-200 flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:bg-black active:scale-95 whitespace-nowrap"
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
                  {block.type === 'section' ? <PiListBullets className="w-4 h-4 text-blue-600 pointer-events-none" /> : block.type === 'gallery' ? <PiImages className="w-4 h-4 text-purple-600 pointer-events-none" /> : <PiImage className="w-4 h-4 text-orange-600 pointer-events-none" />}
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
                  <label className="text-xs font-bold text-gray-600 mb-2 block uppercase tracking-wider px-4">Descripción del Lugar:</label>
                  <textarea
                    value={semanticData.description || ''}
                    onChange={(e) => setSemanticData({ ...semanticData, description: e.target.value })}
                    placeholder="Breve descripción del restaurante, su especialidad y ambiente..."
                    rows={3}
                    className="w-full text-sm p-4 rounded-xl border border-gray-200 outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 resize-none bg-gray-50/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-2 block uppercase tracking-wider px-4">Dirección:</label>
                  <input
                    value={semanticData.address || ''}
                    onChange={(e) => setSemanticData({ ...semanticData, address: e.target.value })}
                    placeholder="Av. Principal #123, Colonia, Ciudad"
                    className="w-full text-sm p-4 rounded-xl border border-gray-200 outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 bg-gray-50/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-2 block uppercase tracking-wider px-4">Sitio Web:</label>
                  <input
                    value={semanticData.website || ''}
                    onChange={(e) => setSemanticData({ ...semanticData, website: e.target.value })}
                    placeholder="https://www.ejemplo.com"
                    className="w-full text-sm p-4 rounded-xl border border-gray-200 outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 bg-gray-50/30"
                  />
                </div>
                <div className="md:col-span-2 flex flex-col sm:flex-row gap-4 mt-2">
                  <div className="flex-1 flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <input
                      type="checkbox"
                      id="show_prices_gen"
                      checked={viewSettings.show_prices}
                      onChange={(e) => setViewSettings({ ...viewSettings, show_prices: e.target.checked })}
                      className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <label htmlFor="show_prices_gen" className="text-sm font-bold text-gray-700 cursor-pointer">
                      Mostrar precios al público
                    </label>
                  </div>

                  <div className="flex-1 flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <input
                      type="checkbox"
                      id="has_admin_gen"
                      checked={semanticData.has_admin || false}
                      onChange={(e) => setSemanticData({ ...semanticData, has_admin: e.target.checked })}
                      className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <label htmlFor="has_admin_gen" className="text-sm font-bold text-gray-700 cursor-pointer">
                      Este negocio tiene administrador
                    </label>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 border-b pb-2">Contacto y Pedidos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-2 block uppercase tracking-wider px-4">Teléfono:</label>
                  <input
                    value={semanticData.phone || ''}
                    onChange={(e) => setSemanticData({ ...semanticData, phone: e.target.value })}
                    placeholder="81 1234 5678"
                    className="w-full text-sm p-4 rounded-xl border border-gray-200 outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 bg-gray-50/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-2 block uppercase tracking-wider px-4">WhatsApp para pedidos:</label>
                  <input
                    value={semanticData.whatsapp || ''}
                    onChange={(e) => setSemanticData({ ...semanticData, whatsapp: e.target.value.replace(/\D/g, '') })}
                    placeholder="528112345678"
                    className="w-full text-sm p-4 rounded-xl border border-gray-200 outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 bg-gray-50/30"
                  />
                  <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-tight">Código país + número (ej: 52 81 1234 5678)</p>
                </div>
                <label htmlFor="enable_cart_tab" className="md:col-span-2 flex items-center gap-4 p-5 bg-emerald-50 rounded-2xl border border-emerald-100 cursor-pointer hover:bg-emerald-100 transition-all group">
                  <div className="relative inline-flex items-center">
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
                    <span className="text-sm font-bold text-emerald-900 block">Activar Carrito de Compras</span>
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-0.5">Pedidos por WhatsApp</p>
                  </div>
                </label>
              </div>
            </section>

            <section className="space-y-6">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 border-b pb-2">Horarios y Disponibilidad</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-gray-600 mb-2 block uppercase tracking-wider px-4">Horario de Servicio:</label>
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
                  <label className="text-xs font-bold text-gray-600 mb-2 block uppercase tracking-wider px-4">Rango de Precios:</label>
                  <input
                    value={semanticData.price_range || ''}
                    onChange={(e) => setSemanticData({ ...semanticData, price_range: e.target.value })}
                    placeholder="más de MXN500"
                    className="w-full text-sm p-4 rounded-xl border border-gray-200 outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 bg-gray-50/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-2 block uppercase tracking-wider px-4">Tipo de Cocina:</label>
                  <input
                    value={semanticData.cuisine_type || ''}
                    onChange={(e) => setSemanticData({ ...semanticData, cuisine_type: e.target.value })}
                    placeholder="Mexicana contemporánea"
                    className="w-full text-sm p-4 rounded-xl border border-gray-200 outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 bg-gray-50/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-2 block uppercase tracking-wider px-4">Ambiente:</label>
                  <input
                    value={semanticData.ambiance || ''}
                    onChange={(e) => setSemanticData({ ...semanticData, ambiance: e.target.value })}
                    placeholder="Casual elegante"
                    className="w-full text-sm p-4 rounded-xl border border-gray-200 outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 bg-gray-50/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-2 block uppercase tracking-wider px-4">Código de Vestimenta:</label>
                  <input
                    value={semanticData.dress_code || ''}
                    onChange={(e) => setSemanticData({ ...semanticData, dress_code: e.target.value })}
                    placeholder="Ropa formal"
                    className="w-full text-sm p-4 rounded-xl border border-gray-200 outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 bg-gray-50/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-2 block uppercase tracking-wider px-4">Zona:</label>
                  <input
                    value={semanticData.zone || ''}
                    onChange={(e) => setSemanticData({ ...semanticData, zone: e.target.value })}
                    placeholder="San Pedro Garza García"
                    className="w-full text-sm p-4 rounded-xl border border-gray-200 outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 bg-gray-50/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-2 block uppercase tracking-wider px-4">Intersección:</label>
                  <input
                    value={semanticData.cross_street || ''}
                    onChange={(e) => setSemanticData({ ...semanticData, cross_street: e.target.value })}
                    placeholder="Jose Vasconcelos"
                    className="w-full text-sm p-4 rounded-xl border border-gray-200 outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 bg-gray-50/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-2 block uppercase tracking-wider px-4">Estacionamiento:</label>
                  <input
                    value={semanticData.parking || ''}
                    onChange={(e) => setSemanticData({ ...semanticData, parking: e.target.value })}
                    placeholder="Servicio de estacionamiento"
                    className="w-full text-sm p-4 rounded-xl border border-gray-200 outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 bg-gray-50/30"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-gray-600 mb-2 block uppercase tracking-wider px-4">Reservación Online (URL):</label>
                  <input
                    value={semanticData.reservation_url || ''}
                    onChange={(e) => setSemanticData({ ...semanticData, reservation_url: e.target.value })}
                    placeholder="https://reservaciones.com/..."
                    className="w-full text-sm p-4 rounded-xl border border-gray-200 outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 bg-gray-50/30"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-gray-600 mb-2 block uppercase tracking-wider px-4">Variedad / Amenidades:</label>
                  <input
                    value={semanticData.variety || ''}
                    onChange={(e) => setSemanticData({ ...semanticData, variety: e.target.value })}
                    placeholder="Pantalla HD de 9 x 4 mts, etc."
                    className="w-full text-sm p-4 rounded-xl border border-gray-200 outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 bg-gray-50/30"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-gray-600 mb-2 block uppercase tracking-wider px-4">CLABE / Datos de transferencia:</label>
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
                    >
                      <PiX size={10} className="pointer-events-none" />
                    </button>
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
                        ? 'bg-gray-900 border-gray-900 text-white '
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
                        ? 'bg-indigo-600 border-indigo-600 text-white '
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
            <div className="flex bg-gray-100 p-1 rounded-2xl mb-6">
              <button
                onClick={() => setEditorMode('simple')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${editorMode === 'simple' ? 'bg-white text-gray-900 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <PiLayout className="w-4 h-4" /> Simple
              </button>
              <button
                onClick={() => setEditorMode('advanced')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${editorMode === 'advanced' ? 'bg-white text-gray-900 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <PiDotsSixVertical className="w-4 h-4" /> Avanzado
              </button>
              <button
                onClick={() => {
                  setEditorMode('table');
                  setShowViewSettings(false);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${editorMode === 'table' ? 'bg-white text-gray-900 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <PiTable className="w-4 h-4" /> Vista Tablas
              </button>
            </div>

            {editorMode !== 'table' && (
              <>
                <button
                  onClick={() => setShowViewSettings(!showViewSettings)}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-200 hover:border-gray-300 transition-all shadow-sm group"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 bg-white rounded-2xl shadow-sm text-gray-700 group transition-transform ${showViewSettings ? 'shadow-inner' : ''}`}>
                      <PiLayout className={`w-5 h-5 transition-transform duration-300 ${showViewSettings ? 'rotate-12 text-indigo-500' : ''} pointer-events-none`} />
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
                  <label className="text-xs font-bold text-gray-600 mb-4 block uppercase tracking-wider">Plantilla del {placeType === 'motel' ? 'Motel' : 'Menú'}:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {(
                      placeType === 'motel'
                        ? [
                          { id: 'default', name: 'Urbano App', desc: 'Oscuro y moderno' },
                          { id: 'classic', name: 'Clásico VIP', desc: 'Dorado y elegante' },
                          { id: 'night', name: 'Neon Night', desc: 'Vibrante y atrevido' },
                        ]
                        : [
                          { id: 'default', name: 'Tradicional', desc: 'Limpio y elegante' },
                          { id: 'modern', name: 'Moderno', desc: 'Aire de revista' },
                          { id: 'elegant', name: 'Gourmet', desc: 'Estilo Premium' },
                          { id: 'vibrant', name: 'Vibrant (Lalo\'s)', desc: 'Tarjetas y color' },
                          { id: 'mariscos', name: 'Mariscos Coastal', desc: 'Azul, naranja y playa' },
                          { id: 'uber', name: 'Uber (Dark)', desc: 'Elegante oscuro' },
                          { id: 'didi', name: 'DiDi (Light)', desc: 'Limpio y naranja' },
                          { id: 'tienda', name: 'Tienda', desc: 'Categorías visuales' },
                        ]
                    ).map((tpl) => (
                      <button
                        key={tpl.id}
                        onClick={() => setViewSettings({ ...viewSettings, template: tpl.id })}
                        className={`p-3 rounded-xl border text-left transition-all ${viewSettings.template === tpl.id
                          ? 'border-indigo-600 bg-indigo-50/50'
                          : 'border-gray-200 hover:border-indigo-200 bg-gray-50/30'}`}
                      >
                        <div className={`font-bold text-sm ${viewSettings.template === tpl.id ? 'text-indigo-900' : 'text-gray-700'}`}>{tpl.name}</div>
                        <div className="text-[10px] text-gray-500 uppercase font-bold tracking-tight">{tpl.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-2 block uppercase tracking-wider px-4">Distribución:</label>
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

                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <input
                      type="checkbox"
                      id="has_admin"
                      checked={semanticData.has_admin || false}
                      onChange={(e) => setSemanticData({ ...semanticData, has_admin: e.target.checked })}
                      className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <label htmlFor="has_admin" className="text-sm font-bold text-gray-700 cursor-pointer">
                      Este negocio tiene administrador
                    </label>
                  </div>
                </div>
                  </div>
                )}
              </>
            )}
          </div>

          {showAIChat && (
            <Suspense fallback={null}>
              <AIChat
                placeId={placeId}
                currentBlocks={blocks}
                currentSemanticData={semanticData}
                onContentUpdate={(newBlocks, newSemanticData) => {
                  setBlocks(newBlocks);
                  setSemanticData(newSemanticData);
                }}
                isOpen={showAIChat}
                onClose={() => setShowAIChat(false)}
              />
            </Suspense>
          )}

          {editorMode === 'simple' ? (
            <div className="space-y-6 lg:px-4 sm:px-0">
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Categorías</p>
                    <p className="text-xs font-bold text-gray-700">Agrega categorías y productos con vista tipo plantilla.</p>
                  </div>
                  <button
                    type="button"
                    onClick={addSectionSimple}
                    className="px-4 py-2.5 rounded-xl bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-black active:scale-95 transition-all flex items-center gap-2 whitespace-nowrap"
                  >
                    <PiPlus className="w-4 h-4" /> Agregar categoría
                  </button>
                </div>

                {sectionEntries.length === 0 ? (
                  <div className="p-10 text-center text-gray-400 font-bold uppercase text-xs tracking-[0.2em]">
                    Crea una categoría para empezar.
                  </div>
                ) : (
                  <div className="space-y-10">
                    {sectionEntries.map(({ block, index }, sectionPos) => (
                      <div key={block.id} className="space-y-4">
                        <div className="flex items-center justify-between gap-3 flex-wrap px-4">
                          <input
                            value={block.data.title || ''}
                            onChange={(e) => updateSectionTitle(index, e.target.value)}
                            className="flex-1 min-w-[220px] bg-transparent font-black text-lg outline-none uppercase tracking-tight focus:text-indigo-600"
                            placeholder="Nombre de la categoría"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => moveSectionAmongSections(index, 'up')}
                              disabled={sectionPos === 0}
                              className="w-10 h-10 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 flex items-center justify-center transition-all"
                              title="Subir categoría"
                            >
                              <PiCaretUp className="w-4 h-4 text-gray-600" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveSectionAmongSections(index, 'down')}
                              disabled={sectionPos === sectionEntries.length - 1}
                              className="w-10 h-10 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 flex items-center justify-center transition-all"
                              title="Bajar categoría"
                            >
                              <PiCaretDown className="w-4 h-4 text-gray-600" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeSectionSimple(index)}
                              className="px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-red-600 text-[10px] font-black uppercase tracking-widest hover:bg-red-50 active:scale-95 transition-all flex items-center gap-2 whitespace-nowrap"
                            >
                              <PiTrash className="w-4 h-4" /> Eliminar
                            </button>
                          </div>
                        </div>

                        <div>
                

                          <div>
                            <div className="max-w-2xl mx-auto">
                              {(block.data.items || []).length === 0 ? (
                                <div className="p-10 text-center text-gray-400 font-bold uppercase text-xs tracking-[0.2em] bg-white rounded-2xl border border-gray-100">
                                  Agrega un producto para esta categoría.
                                </div>
                              ) : (
                                <div>
                                  <div className="flex justify-end">
                                    <button
                                      type="button"
                                      onClick={() => addItemToSection(index)}
                                      className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 active:scale-95 transition-all flex items-center gap-2 whitespace-nowrap"
                                    >
                                      <PiPlus className="w-4 h-4" /> Agregar producto
                                    </button>
                                  </div>
                                  {(block.data.items || []).map((item: ItemData, itemIdx: number) => {
                                    const optionCount = (item.options || []).length;
                                    const isAvailable = item.available ?? true;
                                    return (
                                      <div key={item.id} className={`bg-white border border-gray-100 overflow-hidden ${isAvailable ? '' : 'opacity-60'}`}>
                                        <div className="p-4">
                                          <div className="flex gap-4 items-start">
                                            <div className="flex-1 min-w-0">
                                              <input
                                                value={item.name || ''}
                                                onChange={(e) => updateItemInSection(index, itemIdx, { name: e.target.value })}
                                                className="w-full bg-transparent font-black text-lg outline-none uppercase tracking-tight focus:text-indigo-600"
                                                placeholder="Nombre del producto"
                                              />
                                              <textarea
                                                value={item.description || ''}
                                                onChange={(e) => updateItemInSection(index, itemIdx, { description: e.target.value })}
                                                className="w-full bg-transparent text-sm text-gray-500 outline-none mt-1 resize-none leading-relaxed"
                                                placeholder="Descripción"
                                                rows={2}
                                              />
                                              <div className="mt-3 inline-flex items-center gap-2 bg-emerald-50/50 border border-emerald-100/50 rounded-xl px-3 py-2">
                                                <span className="text-emerald-600 font-black opacity-40">$</span>
                                                <input
                                                  value={String(item.price ?? 0)}
                                                  onChange={(e) => {
                                                    const next = Number.parseFloat(e.target.value);
                                                    updateItemInSection(index, itemIdx, { price: Number.isFinite(next) ? next : 0 });
                                                  }}
                                                  inputMode="decimal"
                                                  className="w-24 bg-transparent outline-none font-mono font-black text-emerald-700"
                                                />
                                              </div>
                                            </div>

                                            <button
                                              type="button"
                                              onClick={() => setSimpleImagePicker({ blockIndex: index, itemIndex: itemIdx })}
                                              className="group relative w-28 h-28 rounded-2xl overflow-hidden border border-gray-100 bg-gray-50 shrink-0"
                                              title="Cambiar imagen"
                                            >
                                              {item.image ? (
                                                <img src={item.image} className="w-full h-full object-cover" alt="" />
                                              ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                  <PiImage className="w-7 h-7" />
                                                </div>
                                              )}

                                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                              <div className="absolute bottom-2 right-2">
                                                <span className="px-3 py-1.5 rounded-xl bg-white/90 border border-gray-200 text-gray-800 text-[10px] font-black uppercase tracking-widest shadow-sm">
                                                  Cambiar
                                                </span>
                                              </div>
                                            </button>
                                          </div>

                                          <div className="mt-3 flex justify-end gap-2 flex-wrap">
                                            <button
                                              type="button"
                                              onClick={() => updateItemInSection(index, itemIdx, { available: !isAvailable })}
                                              className={`w-10 h-10 border rounded-xl hover:bg-gray-50 flex items-center justify-center transition-all ${isAvailable ? 'bg-white border-gray-200 text-gray-700' : 'bg-stone-100 border-stone-200 text-stone-500'}`}
                                              title={isAvailable ? 'Ocultar producto' : 'Mostrar producto'}
                                            >
                                              {isAvailable ? <PiEye className="w-4 h-4" /> : <PiEyeSlash className="w-4 h-4" />}
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => moveItemWithinSection(index, itemIdx, 'up')}
                                              disabled={itemIdx === 0}
                                              className="w-10 h-10 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 flex items-center justify-center transition-all"
                                              title="Subir producto"
                                            >
                                              <PiCaretUp className="w-4 h-4 text-gray-600" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => moveItemWithinSection(index, itemIdx, 'down')}
                                              disabled={itemIdx === (block.data.items || []).length - 1}
                                              className="w-10 h-10 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 flex items-center justify-center transition-all"
                                              title="Bajar producto"
                                            >
                                              <PiCaretDown className="w-4 h-4 text-gray-600" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setSimpleVariantsOpen({ blockId: block.id, itemId: item.id });
                                              }}
                                              className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 active:scale-95 transition-all"
                                            >
                                              Variantes {optionCount > 0 ? `(${optionCount})` : ''}
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                if (!confirm('¿Eliminar este producto?')) return;
                                                removeItemFromSection(index, itemIdx);
                                                if (simpleVariantsOpen?.blockId === block.id && simpleVariantsOpen?.itemId === item.id) {
                                                  setSimpleVariantsOpen(null);
                                                }
                                              }}
                                              className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-red-600 text-[10px] font-black uppercase tracking-widest hover:bg-red-50 active:scale-95 transition-all"
                                            >
                                              Eliminar
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}

                                  <div className="flex justify-end">
                                    <button
                                      type="button"
                                      onClick={() => addItemToSection(index)}
                                      className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 active:scale-95 transition-all flex items-center gap-2 whitespace-nowrap"
                                    >
                                      <PiPlus className="w-4 h-4" /> Agregar producto
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : editorMode === 'advanced' ? (
            <>
              {/* <SectionNav
                blocks={blocks}
                activeSectionId={activeSectionId}
                onScrollTo={scrollToBlock}
              /> */}
              <Suspense fallback={<div className="bg-white rounded-2xl border border-gray-200 p-6 lg:mx-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Cargando editor...</div>}>
                <div className="space-y-4 lg:px-4 sm:px-0">
                  {sectionEntries.map(({ block, index }) => (
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
                      <div className="mt-3 p-4 bg-white border rounded-xl ">
                        <p className="text-xs font-bold text-gray-500 mb-3">¿QUÉ QUIERES AGREGAR?</p>
                        <div className="grid grid-cols-2 gap-2">
                          <BlockTypeButton icon={<PiLayout className="w-8 h-8" />} label="Sección" onClick={() => addBlock('section', index)} />
                          <BlockTypeButton icon={<PiImage className="w-8 h-8" />} label="Imagen" onClick={() => addBlock('image', index)} />
                          <BlockTypeButton icon={<PiSparkle className="w-8 h-8" />} label="Galería" onClick={() => addBlock('gallery', index)} />
                          <BlockTypeButton icon={<PiPaperPlaneTilt className="w-8 h-8" />} label="Promociones" onClick={() => addBlock('carrusel', index)} />
                          <BlockTypeButton icon={<PiFileText className="w-8 h-8" />} label="Texto/Markdown" onClick={() => addBlock('markdown', index)} />
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

                  {extraEntries.length > 0 && (
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setShowExtraBlocks(v => !v)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <div className="text-left">
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Extras</p>
                          <p className="text-xs font-bold text-gray-700">Imágenes, galerías, promociones y texto</p>
                        </div>
                        <span className="text-[10px] font-black text-gray-600 bg-white border border-gray-200 px-3 py-1.5 rounded-xl uppercase tracking-widest">
                          {extraEntries.length}
                        </span>
                      </button>

                      {showExtraBlocks && (
                        <div className="p-4 space-y-4">
                          {extraEntries.map(({ block, index }) => (
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
                                <div className="mt-3 p-4 bg-white border rounded-xl ">
                                  <p className="text-xs font-bold text-gray-500 mb-3">¿QUÉ QUIERES AGREGAR?</p>
                                  <div className="grid grid-cols-2 gap-2">
                                    <BlockTypeButton icon={<PiLayout className="w-8 h-8" />} label="Sección" onClick={() => addBlock('section', index)} />
                                    <BlockTypeButton icon={<PiImage className="w-8 h-8" />} label="Imagen" onClick={() => addBlock('image', index)} />
                                    <BlockTypeButton icon={<PiSparkle className="w-8 h-8" />} label="Galería" onClick={() => addBlock('gallery', index)} />
                                    <BlockTypeButton icon={<PiPaperPlaneTilt className="w-8 h-8" />} label="Promociones" onClick={() => addBlock('carrusel', index)} />
                                    <BlockTypeButton icon={<PiFileText className="w-8 h-8" />} label="Texto/Markdown" onClick={() => addBlock('markdown', index)} />
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
                        </div>
                      )}
                    </div>
                  )}

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
                            <BlockTypeButton icon={<PiFileText className="w-8 h-8" />} label="Texto/Markdown" onClick={() => addBlock('markdown')} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Suspense>
            </>
          ) : (
            <Suspense fallback={<div className="bg-white rounded-2xl border border-gray-200 p-6 lg:mx-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Cargando tablas...</div>}>
              <TableView blocks={blocks} onChange={setBlocks} />
            </Suspense>
          )}

          {editorMode === 'simple' && simpleImagePicker && (
            <Suspense fallback={null}>
              <ImageSelector
                existingImages={getAllExistingImages()}
                onUpload={(urls) => {
                  setMediaLibrary(prev => [...new Set([...urls, ...prev])]);
                }}
                onSelect={(url) => {
                  updateItemInSection(simpleImagePicker.blockIndex, simpleImagePicker.itemIndex, { image: url });
                }}
                onClose={() => setSimpleImagePicker(null)}
              />
            </Suspense>
          )}

          {editorMode === 'simple' && simpleVariantsOpen && (() => {
            const loc = findSimpleItemLocation(simpleVariantsOpen.blockId, simpleVariantsOpen.itemId);
            if (!loc) return null;
            const { blockIndex, itemIndex, item } = loc;

            return (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSimpleVariantsOpen(null)} />
                <div className="relative w-full max-w-4xl max-h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden">
                  <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center z-10">
                    <div>
                      <h3 className="text-sm font-bold uppercase text-gray-800 tracking-wide">Variantes</h3>
                      <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                        Producto: <span className="font-bold text-gray-700">{item.name || 'Sin nombre'}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => setSimpleVariantsOpen(null)}
                      className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600"
                      title="Cerrar"
                    >
                      <PiX className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)] space-y-6">
                    <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Cómo usar variantes</p>
                      <p className="text-sm text-gray-700 font-medium">
                        Puedes agregar 1 o varias variantes. Ejemplos: <span className="font-bold">Base</span> (harina, maíz), <span className="font-bold">Sabor</span> (picadillo, chicharrón), <span className="font-bold">Guiso</span>, <span className="font-bold">Tamaño</span>.
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        En cada opción puedes poner un precio. Si no aplica, déjalo en 0.
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Grupos de variantes</p>
                        <p className="text-xs font-bold text-gray-700">Nombre de la variante + opciones con precio.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => addVariantGroup(blockIndex, itemIndex)}
                        className="px-4 py-2.5 rounded-xl bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-black active:scale-95 transition-all flex items-center gap-2 whitespace-nowrap"
                      >
                        <PiPlus className="w-4 h-4" /> Agregar variante
                      </button>
                    </div>

                    {(item.options || []).length === 0 ? (
                      <div className="p-10 text-center text-gray-400 font-bold uppercase text-xs tracking-[0.2em] bg-white rounded-2xl border border-gray-100">
                        Sin variantes.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {(item.options || []).map((opt, optIdx) => (
                          <div key={optIdx} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                            <div className="p-4 border-b border-gray-100">
                              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Nombre de la variante</label>
                              <div className="flex items-center gap-2">
                                <input
                                  value={opt.name || ''}
                                  onChange={(e) => updateVariantGroupName(blockIndex, itemIndex, optIdx, e.target.value)}
                                  className="flex-1 min-w-0 text-sm px-3 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 bg-white font-black uppercase tracking-tight"
                                  placeholder="Ej. Base, Sabor, Guiso"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeVariantGroup(blockIndex, itemIndex, optIdx)}
                                  className="w-10 h-10 bg-white border border-gray-200 rounded-xl hover:bg-red-50 text-red-600 flex items-center justify-center transition-all"
                                  title="Eliminar variante"
                                >
                                  <PiTrash className="w-4 h-4" />
                                </button>
                              </div>
                              <p className="text-xs text-gray-500 mt-2">
                                Ejemplos: Base (harina, maíz), Sabor (picadillo, chicharrón), Tamaño (chico, grande).
                              </p>
                            </div>

                            <div className="p-4 space-y-3">
                              {(opt.values || []).length === 0 ? (
                                <div className="p-6 text-center text-gray-400 font-bold uppercase text-xs tracking-[0.2em] bg-gray-50 rounded-2xl border border-gray-100">
                                  Agrega opciones.
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {(opt.values || []).map((val, valIdx) => (
                                    <div key={valIdx} className="flex items-center gap-2">
                                      <input
                                        value={val}
                                        onChange={(e) => renameVariantValue(blockIndex, itemIndex, optIdx, valIdx, e.target.value)}
                                        className="flex-1 min-w-0 text-sm px-3 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 bg-white"
                                        placeholder="Opción (ej. Picadillo)"
                                      />
                                      <div className="w-36 flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 bg-white">
                                        <span className="text-gray-300 font-black">$</span>
                                        <input
                                          value={String(opt.prices?.[val] ?? 0)}
                                          onChange={(e) => {
                                            const next = Number.parseFloat(e.target.value);
                                            setVariantValuePrice(blockIndex, itemIndex, optIdx, val, Number.isFinite(next) ? next : 0);
                                          }}
                                          inputMode="decimal"
                                          className="w-full bg-transparent outline-none font-mono font-black text-gray-700"
                                          placeholder="0"
                                        />
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => removeVariantValue(blockIndex, itemIndex, optIdx, valIdx)}
                                        className="w-10 h-10 bg-white border border-gray-200 rounded-xl hover:bg-red-50 text-red-600 flex items-center justify-center transition-all"
                                        title="Eliminar opción"
                                      >
                                        <PiTrash className="w-4 h-4" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}

                              <div className="flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => addVariantValue(blockIndex, itemIndex, optIdx)}
                                  className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 active:scale-95 transition-all flex items-center gap-2 whitespace-nowrap"
                                >
                                  <PiPlus className="w-4 h-4" /> Agregar opción
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </>
      ) : activeTab === 'media' ? (
        <div
          className="bg-white md:rounded-2xl border-y md:border shadow-xl p-6 sm:p-12 focus:outline-none transition-all"
          onPaste={handleLibraryPaste}
          tabIndex={0}
        >
          <div className="max-w-4xl mx-auto space-y-12">
            <header className="text-center relative">
              <h2 className="text-3xl font-black uppercase tracking-tight text-gray-900 mb-2">Biblioteca de Medios</h2>
              <p className="text-gray-500 text-sm font-medium">Gestiona todas las imágenes de tu establecimiento en un solo lugar.</p>
              {isLibraryPasting && (
                <div className="absolute top-0 right-0 animate-pulse flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-full border border-blue-100">
                  <PiSparkle className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">¡PEGANDO!</span>
                </div>
              )}
            </header>

            <section className={`bg-gray-50 p-8 rounded-[2.5rem] border-2 border-dashed transition-all ${isLibraryPasting ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
              <div className="text-center mb-6">
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">
                  {isLibraryPasting ? 'Procesando imágenes pegadas...' : 'Subir nuevas imágenes o Ctrl+V para pegar:'}
                </h3>
              </div>
              <ManualUploader
                onFilesUploaded={(urls) => setMediaLibrary(prev => [...new Set([...urls, ...prev])])}
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
                        className="p-2.5 bg-white rounded-xl text-gray-800 hover:bg-gray-100  active:scale-95 transition-all"
                        title="Copiar Link"
                      >
                        <PiCopy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteFromMediaLibrary(url)}
                        className="p-2.5 bg-red-600 rounded-xl text-white hover:bg-red-700  active:scale-95 transition-all"
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
          <Suspense fallback={<div className="p-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Cargando vista previa...</div>}>
            {placeType === 'motel' ? (
              <MotelPageRenderer
                place={{
                  ...placeData,
                  content: { blocks, semantic_data: semanticData, view_settings: viewSettings }
                }}
                isPreview={true}
              />
            ) : (
              <div className="py-10 bg-gray-50/50 min-h-screen">
                <RestaurantPreview
                  place={{ name: initialContent?.name, content: { blocks, semantic_data: semanticData }, image: initialContent?.image }}
                  template={viewSettings.template}
                />
              </div>
            )}
          </Suspense>
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
    </div>
  );
}
