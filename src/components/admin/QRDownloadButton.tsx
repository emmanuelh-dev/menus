import React, { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, QrCode } from 'lucide-react';

interface QRDownloadButtonProps {
  url: string;
  restaurantName: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'outline' | 'solid';
  slug?: string;
  userId?: string;
}

export default function QRDownloadButton({
  url,
  restaurantName,
  size = 'md',
  variant = 'outline',
  slug,
  userId
}: QRDownloadButtonProps) {
  const qrRef = useRef<HTMLDivElement>(null);

  // Si tenemos slug, usamos el endpoint de tracking
  const finalUrl = slug ? `${typeof window !== 'undefined' ? window.location.origin : ''}/qr/${slug}${userId ? `?u=${userId}` : ''}` : url;

  const downloadQR = () => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;

    const pngUrl = canvas
      .toDataURL("image/png")
      .replace("image/png", "image/octet-stream");

    const downloadLink = document.createElement("a");
    downloadLink.href = pngUrl;
    downloadLink.download = `QR-${restaurantName.replace(/\s+/g, '-').toLowerCase()}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-[10px] gap-1',
    md: 'px-3 py-1.5 text-xs gap-2',
    lg: 'px-4 py-2 text-sm gap-2'
  };

  const variantClasses = {
    outline: 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50',
    solid: 'bg-slate-900 text-white hover:bg-slate-800'
  };

  return (
    <div className="relative inline-block">
      {/* Hidden QR for generation */}
      <div ref={qrRef} className="hidden">
        <QRCodeCanvas
          value={finalUrl}
          size={1024}
          level="H"
          includeMargin={true}
        />
      </div>

      <button
        onClick={downloadQR}
        className={`flex items-center justify-center font-bold rounded-lg transition-all active:scale-95 ${sizeClasses[size]} ${variantClasses[variant]}`}
        title={slug ? "Descargar QR con seguimiento" : "Descargar QR directo"}
      >
        <QrCode size={size === 'sm' ? 12 : 14} />
        <span>QR</span>
        <Download size={size === 'sm' ? 10 : 12} className={`opacity-50 ${slug ? 'text-emerald-500' : ''}`} />
      </button>
    </div>
  );
}
