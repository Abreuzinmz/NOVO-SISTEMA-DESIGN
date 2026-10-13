'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Package, Search, Plus, Check, X, Trash2 } from 'lucide-react';
import { getPartImage } from '@/lib/part-images';

// ═══ Itens cadastrados de cada grupo ═══

export type PartsKind = 'material' | 'peca';

const CONFIG: Record<PartsKind, { storageKey: string; builtIn: string[]; title: string; description: string; newPlaceholder: string; empty: string }> = {
  material: {
    storageKey: 'retifica_catalogo_materiais',
    builtIn: ['BIELAS', 'MOTOR COMPLETO', 'CARCAÇA', 'BOMBA INJETORA'],
    title: 'Mais materiais',
    description: 'Selecione materiais cadastrados ou cadastre um novo',
    newPlaceholder: 'Nome do material',
    empty: 'Nenhum material cadastrado ainda.',
  },
  peca: {
    storageKey: 'retifica_catalogo_pecas',
    builtIn: ['SENSOR'],
    title: 'Mais peças',
    description: 'Selecione peças cadastradas ou cadastre uma nova',
    newPlaceholder: 'Nome da peça',
    empty: 'Nenhuma peça cadastrada ainda.',
  },
};

// Cadastrados por você ficam guardados neste computador
function loadCatalog(kind: PartsKind): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(CONFIG[kind].storageKey) || '[]');
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string' && v.trim()) : [];
  } catch {
    return [];
  }
}

function saveCatalog(kind: PartsKind, list: string[]) {
  try { localStorage.setItem(CONFIG[kind].storageKey, JSON.stringify(list)); } catch { /* ignore */ }
}

const normalize = (v: string) => v.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

// ═══ Componente ═══

interface PartsPickerModalProps {
  kind: PartsKind;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Itens que já aparecem no cartão da O.S. */
  inList: string[];
  onConfirm: (names: string[]) => void;
}

export function PartsPickerModal({ kind, open, onOpenChange, inList, onConfirm }: PartsPickerModalProps) {
  const cfg = CONFIG[kind];
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [custom, setCustom] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const newInputRef = useRef<HTMLInputElement>(null);

  // Ao abrir: limpa a seleção e recarrega os cadastrados
  useEffect(() => {
    if (!open) return;
    setQuery('');
    setPicked([]);
    setAdding(false);
    setNewName('');
    setCustom(loadCatalog(kind));
  }, [open, kind]);

  useEffect(() => {
    if (adding) setTimeout(() => newInputRef.current?.focus(), 0);
  }, [adding]);

  const inListSet = useMemo(() => new Set(inList.map((n) => n.toUpperCase())), [inList]);
  const items = useMemo(() => {
    const all = Array.from(new Set([...cfg.builtIn, ...custom]));
    const q = normalize(query);
    return q ? all.filter((n) => normalize(n).includes(q)) : all;
  }, [cfg.builtIn, custom, query]);

  const togglePick = (name: string) => {
    setPicked((p) => (p.includes(name) ? p.filter((n) => n !== name) : [...p, name]));
  };

  const startAdding = () => {
    setAdding(true);
    setNewName(query.trim().toUpperCase());
  };

  const submitNew = () => {
    const name = newName.trim().toUpperCase();
    if (!name) return;
    if (!cfg.builtIn.includes(name) && !custom.includes(name)) {
      const next = [...custom, name];
      setCustom(next);
      saveCatalog(kind, next);
    }
    if (!inListSet.has(name)) setPicked((p) => (p.includes(name) ? p : [...p, name]));
    setAdding(false);
    setNewName('');
    setQuery('');
  };

  const removeCustom = (name: string) => {
    const next = custom.filter((n) => n !== name);
    setCustom(next);
    saveCatalog(kind, next);
    setPicked((p) => p.filter((n) => n !== name));
  };

  const confirm = () => {
    if (!picked.length) return;
    onConfirm(picked);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-[620px] w-[calc(100vw-32px)] max-h-[calc(100vh-48px)] z-[1100] rounded-2xl p-0 gap-0 overflow-hidden"
        overlayClassName="z-[1099]"
      >
        {/* Cabeçalho */}
        <div className="flex items-start gap-4 px-6 pt-6 pb-4">
          <div className="w-11 h-11 rounded-xl bg-muted border border-border flex items-center justify-center shadow-2xs shrink-0">
            <Package className="w-5 h-5 text-foreground/80" />
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <DialogTitle className="text-base font-extrabold uppercase tracking-[0.16em] text-foreground">{cfg.title}</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-0.5">{cfg.description}</DialogDescription>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            title="Fechar"
            className="w-9 h-9 -mr-2 -mt-1 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Busca */}
        <div className="px-6 pb-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar..."
              className="h-11 pl-11 pr-4 rounded-xl text-sm bg-card"
            />
          </div>
        </div>

        {/* Itens */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {items.map((name) => {
              const already = inListSet.has(name.toUpperCase());
              const isPicked = picked.includes(name);
              const image = getPartImage(name);
              return (
                <div
                  key={name}
                  role="checkbox"
                  aria-checked={isPicked || already}
                  aria-disabled={already}
                  tabIndex={already ? -1 : 0}
                  onClick={() => !already && togglePick(name)}
                  onKeyDown={(e) => { if (!already && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); togglePick(name); } }}
                  className={cn(
                    'group relative flex items-center gap-3 min-h-[64px] px-4 py-2 rounded-xl border transition-all select-none outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
                    already
                      ? 'bg-muted/40 border-border opacity-60 cursor-not-allowed'
                      : isPicked
                        ? 'bg-foreground/[0.04] border-foreground/30 shadow-2xs cursor-pointer'
                        : 'bg-card border-border hover:border-foreground/20 hover:bg-muted/50 cursor-pointer'
                  )}
                >
                  <span
                    className={cn(
                      'w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center shrink-0 transition-colors',
                      isPicked || already ? 'bg-primary border-primary text-primary-foreground' : 'border-border bg-card group-hover:border-foreground/40'
                    )}
                  >
                    {(isPicked || already) && <Check className="w-3 h-3 stroke-[3]" />}
                  </span>
                  {image && (
                    <div className="w-12 h-10 shrink-0 flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image} alt="" draggable={false} className="max-w-full max-h-full object-contain drop-shadow-sm" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className={cn('text-sm font-bold uppercase tracking-tight leading-snug', isPicked ? 'text-foreground' : 'text-muted-foreground')}>{name}</div>
                    {already && <div className="text-[11px] font-semibold text-muted-foreground">Já está na O.S.</div>}
                  </div>
                  {custom.includes(name) && !already && (
                    <button
                      type="button"
                      title="Excluir do cadastro"
                      onClick={(e) => { e.stopPropagation(); removeCustom(name); }}
                      className="text-muted-foreground hover:text-danger p-1 rounded-lg hover:bg-danger/10 transition-all shrink-0 opacity-0 group-hover:opacity-100 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}

            {/* Cadastrar novo */}
            {adding ? (
              <div className="flex items-center gap-2 min-h-[64px] px-2 py-1.5 rounded-xl border-2 border-dashed border-foreground/30 bg-muted/30">
                <Input
                  ref={newInputRef}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); submitNew(); }
                    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setAdding(false); }
                  }}
                  placeholder={cfg.newPlaceholder}
                  className="h-9 flex-1 rounded-lg text-sm uppercase placeholder:normal-case bg-card"
                />
                <Button type="button" onClick={submitNew} disabled={!newName.trim()} className="solid-btn h-9 px-3 rounded-lg text-xs font-bold disabled:opacity-40">
                  Salvar
                </Button>
                <button type="button" title="Cancelar" onClick={() => setAdding(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={startAdding}
                className="flex items-center justify-center gap-2 min-h-[64px] px-4 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 hover:bg-muted/30 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-[0.1em]">Cadastrar novo</span>
              </button>
            )}
          </div>
          {items.length === 0 && !adding && (
            <p className="text-xs text-muted-foreground mt-3">
              {query.trim() ? 'Nada encontrado. Use “Cadastrar novo” para adicionar.' : cfg.empty}
            </p>
          )}
        </div>

        {/* Rodapé */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-11 px-6 rounded-xl text-sm font-bold border-border">
            Cancelar
          </Button>
          <Button type="button" onClick={confirm} disabled={!picked.length} className="solid-btn h-11 px-6 rounded-xl text-sm font-bold disabled:opacity-50">
            Adicionar{picked.length ? ` (${picked.length})` : ''}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
