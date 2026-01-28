
import React, { useState, useRef } from 'react';
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
  const [pendingContent, setPendingContent] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (files?: File[]) => {
    const filesToUpload = files || images;
    if (filesToUpload.length === 0) {
      alert('Por favor selecciona al menos una foto.');
      return;
    }

    setIsProcessing(true);
    try {
      const base64Images: string[] = [];

      for (const file of filesToUpload) {
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
          instruction: text || 'Analiza estas fotos de precios o habitaciones y actualiza la información correspondiente. Si es una foto de una habitación específica, asígnala como su imagen principal.',
          preview: true
        })
      });

      const result = await response.json();

      if (result.success && result.preview) {
        setPendingContent(result.content);
        setStats(result.stats);
        if (isInline && !isOpen) setIsOpen(true);
      } else {
        throw new Error(result.error || 'Error al procesar');
      }
    } catch (err) {
      console.error(err);
      alert('Hubo un error al procesar las imágenes con IA.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = async () => {
    if (!pendingContent) return;
    setIsProcessing(true);
    try {
      const response = await fetch('/api/ai/update-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeId,
          saveOnly: true,
          currentContent: pendingContent
        })
      });

      const result = await response.json();
      if (result.success) {
        setIsOpen(false);
        setPendingContent(null);
        alert('✓ ¡Gracias! Tu aporte ayuda a toda la comunidad. La información ha sido actualizada.');
        window.location.reload();
      }
    } catch (err) {
      alert('Error al guardar los cambios.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      setImages(selectedFiles);
      if (isInline) {
        handleSubmit(selectedFiles);
      }
    }
  };

  if (isInline) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 md:p-10 mb-20 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
          <Sparkles size={120} />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-800 rounded-full text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4">
              <Info size={12} className="text-zinc-500" />
              Keep it fresh
            </div>
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-white mb-4 italic serif">
              Ayúdanos a mantener <br />esta información actualizada
            </h2>
            <p className="text-zinc-400 font-medium text-sm max-w-md leading-relaxed">
              ¿Ves precios diferentes o nuevas habitaciones? Escríbenos o sube una foto y nuestra IA se encargará del resto.
            </p>
          </div>

          <div className="w-full md:w-80 space-y-3">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="¿Qué cambió? (opcional)"
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
            <button
              onClick={() => {
                if (images.length > 0 || text.trim() !== '') {
                  handleSubmit();
                } else {
                  fileInputRef.current?.click();
                }
              }}
              disabled={isProcessing}
              className="w-full bg-white text-black px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-all shadow-xl shadow-white/5 flex items-center justify-center gap-3 active:scale-95"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  {images.length > 0 ? <CheckCircle2 size={16} /> : <Camera size={16} />}
                  {images.length > 0 ? `${images.length} Fotos - Actualizar` : text.trim() !== '' ? 'Actualizar con texto' : 'Subir Foto / Actualizar'}
                </>
              )}
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

        {/* Preview Modal for Inline */}
        {isOpen && pendingContent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="p-8 md:p-10">
                <div className="flex items-center gap-4 mb-6 text-emerald-500">
                  <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <h3 className="font-black uppercase tracking-tight text-xl text-white">¡Detección Exitosa!</h3>
                    <p className="text-emerald-500/80 text-xs font-bold uppercase tracking-wider">La IA ha procesado tus fotos</p>
                  </div>
                </div>

                <div className="bg-black/50 border border-zinc-800 rounded-2xl p-6 mb-8">
                  <p className="text-zinc-400 text-sm font-medium leading-relaxed mb-4">
                    Hemos detectado cambios en <span className="text-white font-bold">{stats?.items || 0} elementos</span> y <span className="text-white font-bold">{stats?.sections || 0} secciones</span>.
                  </p>
                  <div className="flex gap-2">
                    {stats?.hasAddress && <span className="px-2 py-1 bg-zinc-800 rounded-lg text-[10px] font-bold text-zinc-300">📍 UBICACIÓN</span>}
                    {stats?.hasPhone && <span className="px-2 py-1 bg-zinc-800 rounded-lg text-[10px] font-bold text-zinc-300">📞 TELÉFONO</span>}
                    {stats?.newImages > 0 && <span className="px-2 py-1 bg-zinc-800 rounded-lg text-[10px] font-bold text-zinc-300">🖼️ {stats.newImages} FOTOS</span>}
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleConfirm}
                    disabled={isProcessing}
                    className="w-full bg-white text-black py-4 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-zinc-200 transition-all flex items-center justify-center gap-2"
                  >
                    {isProcessing ? 'Guardando...' : 'Confirmar y Actualizar ✨'}
                  </button>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      setPendingContent(null);
                      setText('');
                      setImages([]);
                    }}
                    className="w-full py-2 text-zinc-500 font-bold uppercase text-[10px] tracking-tight hover:text-zinc-300 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Floating Button Version (Optional, keep it for other views if needed)
  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-[100] bg-white text-black p-4 rounded-full shadow-2xl hover:scale-110 transition-transform flex items-center gap-2 group border border-zinc-200"
        title="Mejorar info con IA"
      >
        <Sparkles size={20} className="text-zinc-800" />
        <span className="hidden sm:inline font-black uppercase text-[10px] tracking-widest">Alimentar IA</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm px-6">
          {/* ... Same modal as before or similar ... */}
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md p-8 rounded-[32px] shadow-2xl text-zinc-300 relative">
            <button
              onClick={() => {
                setIsOpen(false);
                setPendingContent(null);
                setText('');
                setImages([]);
              }}
              className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>

            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-6">
              <Camera size={24} className="text-white" />
            </div>

            <h2 className="text-2xl font-black uppercase tracking-tighter text-white mb-2">Mejorar información</h2>
            <p className="text-zinc-500 text-sm font-medium mb-8">
              Sube fotos del menú o habitaciones, o simplemente indícanos qué cambió.
            </p>

            {pendingContent ? (
              <div className="space-y-6">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6">
                  <p className="text-emerald-500 text-xs font-black uppercase tracking-widest mb-2">¡Análisis listo!</p>
                  <p className="text-zinc-300 text-sm leading-relaxed font-medium">Hemos encontrado actualizaciones para {stats?.items || 0} elementos.</p>
                </div>
                <button
                  onClick={handleConfirm}
                  disabled={isProcessing}
                  className="w-full bg-white text-black py-4 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-zinc-100 transition-all"
                >
                  {isProcessing ? 'Guardando...' : 'Aplicar Cambios ✨'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Describe los cambios aquí..."
                  className="w-full bg-black/40 border border-zinc-800 rounded-2xl p-4 text-white text-sm focus:outline-none focus:ring-1 focus:ring-white/20 transition-all min-h-[100px] resize-none"
                />
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  multiple
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-zinc-800 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-all group"
                >
                  <Upload size={24} className="text-zinc-700 group-hover:text-zinc-500 mb-2" />
                  <span className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">
                    {images.length > 0 ? `${images.length} archivos` : 'Añadir Fotos'}
                  </span>
                </div>
                <button
                  onClick={() => handleSubmit()}
                  disabled={isProcessing || (images.length === 0 && text.trim() === '')}
                  className="w-full bg-white text-black py-4 rounded-xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isProcessing ? 'Procesando...' : 'Analizar ahora'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
