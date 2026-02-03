import React, { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, QrCode } from 'lucide-react';

interface QRDownloadButtonProps {
  url: string;
  restaurantName: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'outline' | 'solid';
}

export default function QRDownloadButton({
  url,
  restaurantName,
  size = 'md',
  variant = 'outline'
}: QRDownloadButtonProps) {
  const qrRef = useRef<HTMLDivElement>(null);

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
          value={url}
          size={1024}
          level="H"
          includeMargin={true}
        />
      </div>

      <button
        onClick={downloadQR}
        className={`flex items-center justify-center font-bold rounded-lg transition-all active:scale-95 ${sizeClasses[size]} ${variantClasses[variant]}`}
        title="Descargar código QR"
      >
        <QrCode size={size === 'sm' ? 12 : 14} />
        <span>QR</span>
        <Download size={size === 'sm' ? 10 : 12} className="opacity-50" />
      </button>
    </div>
  );
}
