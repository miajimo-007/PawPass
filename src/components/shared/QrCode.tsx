import * as React from 'react';
import QRCode from 'qrcode';

/** Renders a QR code as inline SVG (generated locally, works offline). */
export function QrCode({ value, size, className, label }: { value: string; size: number; className?: string; label: string }) {
  const [svg, setSvg] = React.useState<string>('');
  React.useEffect(() => {
    let alive = true;
    QRCode.toString(value, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#000000', light: '#ffffff' } })
      .then((s) => alive && setSvg(s))
      .catch(() => alive && setSvg(''));
    return () => {
      alive = false;
    };
  }, [value]);
  return (
    <div
      role="img"
      aria-label={label}
      className={className}
      style={{ width: size, height: size }}
      // The SVG markup is produced locally by the qrcode library from our own URL.
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
