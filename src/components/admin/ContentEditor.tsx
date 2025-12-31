import { useState } from 'react';
import { ManualUploader } from '../ManualUploader';

interface Item {
  name: string;
  price: number;
  description: string;
  image: string;
  variants?: { label: string; price: number }[];
}

interface Section {
  title: string;
  items: Item[];
}

export default function ContentEditor({ placeId, initialContent }: { placeId: number; initialContent: any }) {
  const [content, setContent] = useState(initialContent || { 
    sections: [], 
    gallery: [], 
    view_settings: { layout: 'grid', show_prices: true } 
  });
  const [isSaving, setIsSaving] = useState(false);

  // --- LÓGICA DE SECCIONES ---
  const addSection = () => {
    setContent({
      ...content,
      sections: [...content.sections, { title: 'NUEVA SECCIÓN', items: [] }]
    });
  };

  const updateSectionTitle = (sIdx: number, title: string) => {
    const newSections = [...content.sections];
    newSections[sIdx].title = title;
    setContent({ ...content, sections: newSections });
  };

  // --- LÓGICA DE ITEMS ---
  const addItem = (sIdx: number) => {
    const newSections = [...content.sections];
    newSections[sIdx].items.push({ name: '', price: 0, description: '', image: '' });
    setContent({ ...content, sections: newSections });
  };

  const updateItem = (sIdx: number, iIdx: number, field: keyof Item, value: any) => {
    const newSections = [...content.sections];
    newSections[sIdx].items[iIdx][field] = value;
    setContent({ ...content, sections: newSections });
  };

  const removeItem = (sIdx: number, iIdx: number) => {
    const newSections = [...content.sections];
    newSections[sIdx].items.splice(iIdx, 1);
    setContent({ ...content, sections: newSections });
  };

  // --- ORDENAMIENTO (EL LUJO) ---
  const moveItem = (list: any[], index: number, direction: 'up' | 'down', key: string) => {
    const newList = [...list];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newList.length) return;
    [newList[index], newList[targetIndex]] = [newList[targetIndex], newList[index]];
    setContent({ ...content, [key]: newList });
  };

  // --- PERSISTENCIA ---
  const saveChanges = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/restaurants/${placeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }) 
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
    <div className="space-y-10 pb-20">
      <header className="flex justify-between items-center sticky top-0 bg-white/80 backdrop-blur-md z-10 py-4 border-b border-gray-100">
        <h1 className="text-2xl font-black uppercase tracking-tighter">Editor de Contenido</h1>
        <button 
          onClick={saveChanges} 
          disabled={isSaving}
          className="bg-black text-white px-8 py-2 rounded-full font-bold hover:bg-gray-800 disabled:opacity-50 transition-all"
        >
          {isSaving ? 'Guardando...' : 'Publicar Cambios'}
        </button>
      </header>

      {/* SECCIÓN DE MENÚ */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold uppercase italic">Estructura del Menú</h2>
          <button onClick={addSection} className="text-xs bg-gray-100 px-4 py-2 rounded-lg font-bold hover:bg-gray-200">+ Nueva Sección</button>
        </div>

        {content.sections.map((section: Section, sIdx: number) => (
          <div key={sIdx} className="bg-white border-2 border-gray-100 rounded-3xl p-6 relative">
            {/* Controles de orden de sección */}
            <div className="absolute -right-2 top-1/2 -translate-y-1/2 flex flex-col gap-2">
              <button onClick={() => moveItem(content.sections, sIdx, 'up', 'sections')} className="bg-white border shadow-sm p-1 rounded-full">↑</button>
              <button onClick={() => moveItem(content.sections, sIdx, 'down', 'sections')} className="bg-white border shadow-sm p-1 rounded-full">↓</button>
            </div>

            <div className="flex justify-between items-start mb-6">
              <input 
                value={section.title}
                onChange={(e) => updateSectionTitle(sIdx, e.target.value)}
                className="text-2xl font-black uppercase outline-none focus:text-red-600 w-2/3"
                placeholder="Título de la Sección"
              />
              <button onClick={() => addItem(sIdx)} className="text-[10px] bg-black text-white px-3 py-1 rounded-full font-bold uppercase tracking-widest">
                Añadir Item
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {section.items.map((item, iIdx) => (
                <div key={iIdx} className="flex gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 group">
                  <div className="w-24 shrink-0">
                    <ManualUploader 
                      currentImage={item.image} 
                      onFileUploaded={(url) => updateItem(sIdx, iIdx, 'image', url)}
                      onUploadStart={() => console.log('Subiendo imagen del item...')}
                      onUploadError={() => console.error('Error al subir imagen del item')}
                    />
                  </div>
                  <div className="flex-1 grid grid-cols-4 gap-3">
                    <input 
                      value={item.name} 
                      onChange={(e) => updateItem(sIdx, iIdx, 'name', e.target.value)}
                      placeholder="Nombre" 
                      className="col-span-3 font-bold bg-transparent border-b border-gray-200 outline-none focus:border-black"
                    />
                    <input 
                      type="number" 
                      value={item.price} 
                      onChange={(e) => updateItem(sIdx, iIdx, 'price', parseFloat(e.target.value))}
                      placeholder="Precio" 
                      className="text-right font-black text-red-600 bg-transparent border-b border-gray-200 outline-none focus:border-black"
                    />
                    <textarea 
                      value={item.description} 
                      onChange={(e) => updateItem(sIdx, iIdx, 'description', e.target.value)}
                      placeholder="Descripción detallada..." 
                      className="col-span-4 text-xs p-2 rounded-lg bg-white border border-gray-100 outline-none resize-none"
                    />
                  </div>
                  <button onClick={() => removeItem(sIdx, iIdx)} className="text-gray-300 hover:text-red-500 self-center">✕</button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* SECCIÓN DE GALERÍA */}
      <div className="bg-gray-900 text-white p-8 rounded-[3rem]">
        <h2 className="text-xl font-bold uppercase mb-6 tracking-tighter italic">Galería del Lugar</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {content.gallery?.map((img: any, gIdx: number) => (
            <div key={gIdx} className="relative aspect-square group overflow-hidden rounded-2xl">
              <img src={img.src} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
              <button 
                onClick={() => {
                  const newGal = content.gallery.filter((_: any, i: number) => i !== gIdx);
                  setContent({...content, gallery: newGal});
                }}
                className="absolute top-2 right-2 bg-red-600 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >✕</button>
            </div>
          ))}
          <div className="aspect-square flex items-center justify-center border-2 border-dashed border-gray-700 rounded-2xl">
            <ManualUploader 
              onFileUploaded={(url) => setContent({...content, gallery: [...(content.gallery || []), { src: url, alt: '', title: '' }]})}
              onUploadStart={() => console.log('Subiendo imagen a galería...')}
              onUploadError={() => console.error('Error al subir imagen a galería')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}