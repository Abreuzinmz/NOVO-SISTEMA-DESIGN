'use client';

import { useEffect, useState } from 'react';

/** Lê o tamanho de fonte do sistema (variável --system-font-size, 12px a 20px) */
function readFontSize(): number {
  if (typeof window === 'undefined') return 16;
  const root = document.documentElement;
  const v = parseFloat(root.style.getPropertyValue('--system-font-size') || getComputedStyle(root).getPropertyValue('--system-font-size'));
  return Number.isFinite(v) && v > 0 ? v : 16;
}

/**
 * Escala da fonte do sistema em relação a 16px (0,75 a 1,25).
 * Use para medidas feitas em px no JavaScript (altura de linha de listas virtuais etc.),
 * para que acompanhem a configuração de tamanho de fonte como o resto do layout (em rem).
 */
export function useFontScale(): number {
  const [scale, setScale] = useState(() => readFontSize() / 16);

  useEffect(() => {
    const update = () => setScale(readFontSize() / 16);
    update();
    // a configuração muda a variável no style do <html>
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
    return () => observer.disconnect();
  }, []);

  return scale;
}
