
import React, { useState, useRef } from 'react';

interface QuickFeedProps {
  placeId: number;
}

export default function QuickFeed({ placeId }: QuickFeedProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [text, setText] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if (!text && images.length === 0) {
      alert('Por favor agrega al menos una foto o una instrucción.');
      return;
    }

    setIsProcessing(true);
    try {
      const base64Images: string[] = [];
      
      for (const file of images) {
        const reader = new FileReader();
        const promise = new Promise<string>((resolve) => {
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
        });
        reader.readAsDataURL(file);
        const result = await promise;
        base64Images.push(result);
      }

      const response = await fetch('/api/ai/update-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeId,
          images: base64Images,
          instruction: text || (base64Images.length > 0 ? 'Analiza estas imágenes y actualiza el contenido.' : undefined)
        })
      });

      const result = await response.json();
      
      if (result.success) {
        alert('✓ ¡Gracias! Hemos procesado la información con IA.');
        setIsOpen(false);
        setText('');
        setImages([]);
        window.location.reload();
      } else {
        throw new Error(result.error || 'Error al procesar');
      }
    } catch (err) {
      console.error(err);
      alert('Hubo un error al procesar tu solicitud.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImages(Array.from(e.target.files));
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 z-[1000] bg-[#1A1A1A] text-white p-4 rounded-full shadow-2xl border border-white/10 hover:scale-110 transition-transform flex items-center gap-2 group ring-1 ring-white/5"
        title="Mejorar esta página con IA"
      >
        <div className="relative">
          <svg xmlns="http://www.w3.org/2000/svg" className="size-6 text-red-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.143L11 21l-2.286-6.857L1 12l7.714-2.143L11 3z" />
          </svg>
        </div>
        <span className="hidden sm:inline font-medium text-sm tracking-tight">Alimentar IA</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm px-6">
          <div className="bg-[#1A1A1A] border border-white/10 w-full max-w-md p-6 rounded-2xl shadow-2xl text-stone-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-light serif italic text-white">Mejorar información</h2>
              <button onClick={() => setIsOpen(false)} className="text-stone-500 hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-sm text-stone-400 mb-6">
              Sube fotos del menú, lugar o archivos PDF. Nuestra IA analizará todo para actualizar la página.
            </p>

            <div className="space-y-4">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors ${images.length > 0 ? 'border-green-500 bg-green-500/5' : 'border-white/10 hover:border-white/20 hover:bg-white/5'}`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange}
                  className="hidden" 
                  accept="image/*,application/pdf"
                  multiple
                />
                <svg xmlns="http://www.w3.org/2000/svg" className={`size-10 mb-2 ${images.length > 0 ? 'text-green-500' : 'text-stone-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm text-stone-500 text-center">
                  {images.length > 0 ? `${images.length} archivos seleccionados` : 'Subir fotos o PDFs (pueden ser varios)'}
                </span>
                {images.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1 justify-center">
                    {images.slice(0, 3).map((f, i) => (
                      <span key={i} className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-stone-400 max-w-[100px] truncate">{f.name}</span>
                    ))}
                    {images.length > 3 && <span className="text-[10px] text-stone-500">+ {images.length - 3} más</span>}
                  </div>
                )}
              </div>

              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Ej: 'Simplifica las descripciones' o 'Agrega cochera a la habitación normal'..."
                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-800 transition-all min-h-[100px]"
              />

              <button
                onClick={handleSubmit}
                disabled={isProcessing}
                className="w-full bg-red-800 hover:bg-red-700 disabled:bg-stone-800 disabled:opacity-50 text-white font-semibold py-4 rounded-xl transition-all shadow-xl shadow-red-950/20"
              >
                {isProcessing ? 'Procesando con IA...' : 'Actualizar ahora'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
