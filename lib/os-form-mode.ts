'use client';

import { useEffect, useState } from 'react';

// Modo da tela Nova O.S. (escolhido em Configurações, salvo neste computador)
export type OsFormMode = 'etapas' | 'continua';

const STORAGE_KEY = 'retifica_os_form_mode';
const EVENT = 'retifica-os-form-mode';

export function getOsFormMode(): OsFormMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'continua' ? 'continua' : 'etapas';
  } catch {
    return 'etapas';
  }
}

export function setOsFormMode(mode: OsFormMode) {
  try { localStorage.setItem(STORAGE_KEY, mode); } catch { /* sem localStorage */ }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: mode }));
}

export function useOsFormMode(): [OsFormMode, (mode: OsFormMode) => void] {
  const [mode, setMode] = useState<OsFormMode>('etapas');
  useEffect(() => {
    setMode(getOsFormMode());
    const onChange = () => setMode(getOsFormMode());
    window.addEventListener(EVENT, onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);
  return [mode, setOsFormMode];
}
