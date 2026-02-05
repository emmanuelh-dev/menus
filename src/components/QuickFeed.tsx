
import React, { useState, useRef } from 'react';
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { Sparkles, Upload, CheckCircle2, X, Camera, Info } from 'lucide-react';

interface QuickFeedProps {
  placeId: number;
  isInline?: boolean;
}

export default function QuickFeed({ placeId, isInline = false }: QuickFeedProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [text, setText] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);

  const SITE_KEY = import.meta.env.PUBLIC_TURNSTILE_SITE_KEY;

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const newFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) newFiles.push(file);
      }
    }

    if (newFiles.length > 0) {
      setImages(prev => [...prev, ...newFiles]);
    }
  };

  const handleSubmit = async (files?: File[]) => {
    const filesToUpload = files || images;
    if (filesToUpload.length === 0 && text.trim() === '') {
      alert('Por favor selecciona al menos una foto o escribe qué cambió.');
      return;
    }

    if (!token) {
      alert('Por favor completa el CAPTCHA.');
      return;
    }

    setIsProcessing(true);
    try {
      const resizedImages: string[] = [];

      for (const file of filesToUpload) {
        const resized = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              let width = img.width;
              let height = img.height;
              const max = 1200;
              if (width > height) {
                if (width > max) {
                  height *= max / width;
                  width = max;
                }
              } else {
                if (height > max) {
                  width *= max / height;
                  height = max;
                }
              }
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx?.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.src = e.target?.result as string;
          };
          reader.readAsDataURL(file);
        });
        resizedImages.push(resized);
      }

      const response = await fetch('/api/ai/update-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeId,
          images: resizedImages,
          instruction: text || 'Actualizar precios y platillos según las fotos.',
          preview: false,
          token
        })
      });

      const result = await response.json();

      if (result.success) {
        setImages([]);
        setText('');
        setToken(null);
        turnstileRef.current?.reset();
        alert('✓ ¡Gracias! Tu aporte ha sido recibido y se está procesando.');
        window.location.reload();
      } else {
        throw new Error(result.error || 'Error al procesar');
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Hubo un problema al procesar la solicitud. Intenta de nuevo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      setImages(selectedFiles);
    }
  };

  if (isInline) {
    return (
      <div
        onPaste={handlePaste}
        className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 md:p-10 mb-20 relative overflow-hidden group"
      >
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
          <Upload size={120} />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-800 rounded-full text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4">
              <Info size={12} className="text-zinc-500" />
              Actualización rápida
            </div>
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-white mb-4 italic serif">
              Sube el Menú <br />Actualizado
            </h2>
            <p className="text-zinc-400 font-medium text-sm max-w-md leading-relaxed">
              ¿Ves precios diferentes? Sube una foto del menú y nuestra IA lo actualizará al instante para toda la comunidad.
            </p>
          </div>

          <div className="w-full md:w-80 space-y-3">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onPaste={handlePaste}
              placeholder="¿Qué platillo o precio cambió? (Puedes pegar imágenes aquí)"
              className="w-full bg-black/40 border border-zinc-800 rounded-2xl p-4 text-white text-xs focus:outline-none focus:ring-1 focus:ring-white/20 transition-all min-h-[80px] resize-none"
            />
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="image/*"
              multiple
            />

            <div className="flex justify-center my-2 transform scale-75 origin-center">
              <Turnstile
                ref={turnstileRef}
                siteKey={SITE_KEY}
                onSuccess={(token) => setToken(token)}
                onExpire={() => setToken(null)}
                onError={() => setToken(null)}
                options={{ theme: 'dark' }}
              />
            </div>

            <button
              onClick={() => {
                if (images.length > 0 || text.trim() !== '') {
                  handleSubmit();
                } else {
                  fileInputRef.current?.click();
                }
              }}
              disabled={isProcessing || !token}
              className="w-full bg-emerald-500 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-all shadow-xl shadow-emerald-500/10 flex items-center justify-center gap-3 active:scale-95 border-b-4 border-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center justify-center gap-2">
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>Subiendo...</span>
                  </>
                ) : (
                  <>
                    {images.length > 0 ? <CheckCircle2 size={16} /> : <Camera size={16} />}
                    <span>{images.length > 0 ? `Subir ${images.length} Fotos` : text.trim() !== '' ? 'Enviar solo texto' : 'Subir o Pegar Menú'}</span>
                  </>
                )}
              </div>
            </button>
            {images.length > 0 && (
              <button
                onClick={() => setImages([])}
                className="w-full py-1 text-[9px] font-black uppercase tracking-tighter text-zinc-600 hover:text-red-500 transition-colors"
              >
                Limpiar fotos
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-[100] bg-white text-black p-4 rounded-full shadow-2xl hover:scale-110 transition-transform flex items-center gap-2 group border border-zinc-200"
        title="Actualizar Menú"
      >
        <Upload size={20} className="text-zinc-800" />
        <span className="hidden sm:inline font-black uppercase text-[10px] tracking-widest">Subir Menú</span>
      </button>

      {isOpen && (
        <div
          onPaste={handlePaste}
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm px-6"
        >
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md p-8 rounded-[32px] shadow-2xl text-zinc-300 relative">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>

            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-6">
              <Upload size={24} className="text-white" />
            </div>

            <h2 className="text-2xl font-black uppercase tracking-tighter text-white mb-2">Subir Menú</h2>
            <p className="text-zinc-500 text-sm font-medium mb-8">
              Sube fotos del menú o habitaciones para actualizar la información. También puedes pegar imágenes directamente.
            </p>

            <div className="space-y-4">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onPaste={handlePaste}
                placeholder="Describe los cambios aquí... (Puedes pegar imágenes)"
                className="w-full bg-black/40 border border-zinc-800 rounded-2xl p-4 text-white text-sm focus:outline-none focus:ring-1 focus:ring-white/20 transition-all min-h-[100px] resize-none"
              />
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                multiple
                accept="image/*"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-zinc-800 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-all group"
              >
                <span className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">
                  {images.length > 0 ? `${images.length} archivos añadidos` : 'Añadir o Pegar Fotos'}
                </span>
              </div>

              <div className="flex justify-center my-2 transform scale-90 origin-center">
                <Turnstile
                  siteKey={SITE_KEY}
                  onSuccess={(token) => setToken(token)}
                  onExpire={() => setToken(null)}
                  onError={() => setToken(null)}
                  options={{ theme: 'dark' }}
                />
              </div>

              <button
                onClick={() => handleSubmit()}
                disabled={isProcessing || !token || (images.length === 0 && text.trim() === '')}
                className="w-full bg-white text-black py-4 rounded-xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Subiendo...' : images.length > 0 ? `Enviar ${images.length} fotos` : 'Enviar actualización de texto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
