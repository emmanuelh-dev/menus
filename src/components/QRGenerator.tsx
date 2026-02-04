import React, { useState, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, RefreshCw, Link, Type, Palette } from 'lucide-react';

export default function QRGenerator() {
  const [url, setUrl] = useState('https://menus.bysmax.com');
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [size, setSize] = useState(300);
  const qrRef = useRef<HTMLDivElement>(null);

  const downloadQR = () => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (canvas) {
      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = 'mi-codigo-qr-bysmax.png';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-2">
        {/* Controls */}
        <div className="p-8 bg-slate-50 border-r border-slate-100">
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
            <SettingsIcon className="w-5 h-5 mr-2 text-slate-500" />
            Personalizar QR
          </h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center">
                <Link className="w-4 h-4 mr-2" />
                URL o Texto
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                placeholder="https://tu-restaurante.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center">
                <Palette className="w-4 h-4 mr-2" />
                Colores
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-slate-500 mb-1 block">Color QR</span>
                  <div className="flex items-center bg-white border border-slate-200 rounded-lg p-2">
                    <input
                      type="color"
                      value={fgColor}
                      onChange={(e) => setFgColor(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border-none p-0 bg-transparent"
                    />
                    <span className="ml-2 text-xs font-mono">{fgColor}</span>
                  </div>
                </div>
                <div>
                  <span className="text-xs text-slate-500 mb-1 block">Fondo</span>
                  <div className="flex items-center bg-white border border-slate-200 rounded-lg p-2">
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border-none p-0 bg-transparent"
                    />
                    <span className="ml-2 text-xs font-mono">{bgColor}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="p-8 flex flex-col items-center justify-center bg-white relative">
          <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-30"></div>

          <div className="relative z-10 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-8">
            <div ref={qrRef}>
              <QRCodeCanvas
                value={url}
                size={size}
                bgColor={bgColor}
                fgColor={fgColor}
                level={"H"}
                includeMargin={true}
              />
            </div>
          </div>

          <button
            onClick={downloadQR}
            className="flex items-center px-8 py-3 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition-all  hover:shadow-xl active:scale-95"
          >
            <Download className="w-5 h-5 mr-2" />
            Descargar PNG
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
  )
}
