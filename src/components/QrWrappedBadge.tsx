import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QrWrappedBadgeProps {
  projectName: string;
  url: string;
  size?: number;
  accentColor?: string;
}

/**
 * Renders a scannable QR Code with the project name clearly wrapped around all 4 sides of the QR frame
 * while preserving 100% intact Arabic ligatures and RTL legibility.
 */
export function QrWrappedBadge({
  projectName,
  url,
  size = 224,
  accentColor = '#10B981',
}: QrWrappedBadgeProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(url, {
      width: 220,
      margin: 1,
      color: {
        dark: '#0B0F17',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M',
    })
      .then((uri) => {
        if (active) setQrDataUrl(uri);
      })
      .catch(() => {
        if (active) setQrDataUrl('');
      });
    return () => {
      active = false;
    };
  }, [url]);

  const cleanLabel = projectName.trim() || 'كود ترجم';

  return (
    <div
      role="img"
      aria-label={`باركود مشروع ${cleanLabel}`}
      className="relative inline-flex items-center justify-center rounded-2xl bg-[#0B111E] border-2 select-none shrink-0"
      style={{
        width: size,
        height: size,
        borderColor: accentColor,
        padding: Math.round(size * 0.145),
      }}
    >
      {/* Top Wrapped Edge */}
      <div
        dir="rtl"
        className="absolute top-1 left-6 right-6 text-center text-[11px] font-extrabold text-slate-100 truncate leading-none"
      >
        {cleanLabel}
      </div>

      {/* Bottom Wrapped Edge */}
      <div
        dir="rtl"
        className="absolute bottom-1 left-6 right-6 text-center text-[11px] font-extrabold text-slate-100 truncate leading-none"
      >
        {cleanLabel}
      </div>

      {/* Right Wrapped Edge */}
      <div
        aria-hidden="true"
        className="absolute right-0 top-6 bottom-6 w-5 flex items-center justify-center overflow-hidden"
      >
        <span
          dir="rtl"
          className="text-[10px] font-bold whitespace-nowrap -rotate-90"
          style={{ color: accentColor }}
        >
          {cleanLabel}
        </span>
      </div>

      {/* Left Wrapped Edge */}
      <div
        aria-hidden="true"
        className="absolute left-0 top-6 bottom-6 w-5 flex items-center justify-center overflow-hidden"
      >
        <span
          dir="rtl"
          className="text-[10px] font-bold whitespace-nowrap rotate-90"
          style={{ color: accentColor }}
        >
          {cleanLabel}
        </span>
      </div>

      {/* Inner Scannable QR Surface */}
      <div className="w-full h-full rounded-xl bg-white p-1.5 flex items-center justify-center shadow-inner">
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt={`رمز QR لمشروع ${cleanLabel}`}
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full rounded-lg bg-slate-200 animate-pulse" />
        )}
      </div>
    </div>
  );
}
