import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/**
 * A QR code for `text`, drawn on this device — the link never leaves it to be
 * rendered somewhere else. Black on white whatever the theme: a phone camera
 * reads a dark-mode inverted code badly, and a printed card is white anyway.
 */
export function QrCode({ text, size = 200, className = '' }: { text: string; size?: number; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(text, { margin: 1, width: size * 2, errorCorrectionLevel: 'M' })
      .then((url) => alive && setSrc(url))
      .catch(() => alive && setSrc(null));
    return () => { alive = false; };
  }, [text, size]);
  return (
    <div className={`bg-white p-2 rounded-lg inline-block ${className}`} style={{ width: size + 16, height: size + 16 }}>
      {src && <img src={src} width={size} height={size} alt={text} className="block [image-rendering:pixelated]" />}
    </div>
  );
}
