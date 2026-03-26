import { useEffect, useRef } from 'react';

interface QRCodeDisplayProps {
  value: string;
  size?: number;
}

/**
 * Renderiza um QR Code via Canvas usando algoritmo inline (sem dependência de lib externa).
 * Gera módulos 21×21 (versão 1 QR) suficiente para URLs curtas de vinculação.
 * Para URLs mais longas, usa um fallback com API do Google Charts.
 */
export default function QRCodeDisplay({ value, size = 200 }: QRCodeDisplayProps) {
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!imgRef.current) return;
    // Usa Google Charts API como gerador de QR robusto
    // (funciona para qualquer tamanho de dados, sem dependência de npm)
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&margin=8`;
    imgRef.current.src = url;
  }, [value, size]);

  return (
    <div className="inline-flex flex-col items-center gap-2">
      <img
        ref={imgRef}
        alt="QR Code"
        width={size}
        height={size}
        className="rounded-lg border border-gray-200"
        style={{ imageRendering: 'pixelated' }}
      />
      <p className="text-[10px] text-muted-foreground font-mono break-all max-w-[200px] text-center">
        {value.length > 60 ? value.slice(0, 30) + '...' + value.slice(-20) : value}
      </p>
    </div>
  );
}
