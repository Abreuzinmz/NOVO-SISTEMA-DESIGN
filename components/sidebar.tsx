'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';
import { useStore } from '@/lib/store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Users, 
  History, 
  FilePlus2,
  Wrench,
  Settings,
  Type,
  RotateCcw,
  HardDrive,
  DollarSign,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export type View = 'dashboard' | 'clients' | 'history' | 'new-os' | 'prices';

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
}

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { fontSize, setFontSize } = useStore();

  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('sidebarExpanded');
    if (saved !== null) {
      setIsExpanded(JSON.parse(saved));
    } else {
      setIsExpanded(false); // default collapsed (56px rail)
    }
  }, []);

  const toggleSidebar = () => {
    setIsExpanded(prev => {
      const next = !prev;
      localStorage.setItem('sidebarExpanded', JSON.stringify(next));
      return next;
    });
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'new-os', label: 'Nova O.S.', icon: FilePlus2 },
    { id: 'clients', label: 'Clientes', icon: Users },
    { id: 'history', label: 'Histórico', icon: History },
    { id: 'prices', label: 'Tabela de Preços', icon: DollarSign },
  ] as const;

  return (
    <>
      <aside 
        className={cn(
          "flex flex-col h-screen sticky top-0 z-50 select-none bg-card border-r border-border shrink-0 py-4 justify-between transition-all duration-300",
          isExpanded ? "items-stretch" : "items-center"
        )}
        style={{
          width: isExpanded ? '260px' : '56px',
          transition: 'width 0.25s ease',
        }}
      >
        {/* ═══ BRAND (LOGO) ═══ */}
        <div 
          onClick={toggleSidebar}
          className={cn(
            "flex items-center gap-3 w-full border-b border-border/60 cursor-pointer hover:bg-secondary/20 transition-all duration-200",
            isExpanded ? "pb-4 justify-start px-4" : "pb-4 justify-center px-2"
          )}
        >
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-foreground text-background shrink-0 shadow-sm">
            <Wrench className="w-4 h-4 stroke-[1.5]" />
          </div>
          {isExpanded && (
            <div className="whitespace-nowrap transition-opacity duration-200">
              <h1 className="font-extrabold text-[15px] leading-none tracking-tight text-foreground">Retifica</h1>
              <p className="text-xs text-muted-foreground/60 font-bold uppercase tracking-[0.15em] mt-1">Mendonça</p>
            </div>
          )}
        </div>

        {/* ═══ NAVIGATION ═══ */}
        <nav className={cn(
          "flex-1 w-full py-4 flex flex-col gap-2",
          isExpanded ? "px-3" : "items-center"
        )}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            
            return (
              <div key={item.id} className="relative group flex justify-center w-full">
                <button
                  onClick={() => onViewChange(item.id)}
                  className={cn(
                    "flex items-center rounded-xl transition-all duration-150 cursor-pointer w-full",
                    isExpanded 
                      ? "gap-3 px-3.5 py-2.5 text-xs font-semibold" 
                      : "w-9 h-9 justify-center",
                    isActive 
                      ? "bg-secondary text-foreground shadow-sm" 
                      : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                  )}
                  type="button"
                >
                  <Icon className="w-4 h-4 stroke-[1.5] shrink-0" />
                  {isExpanded && <span className="whitespace-nowrap">{item.label}</span>}
                </button>
                
                {/* Tooltip */}
                {!isExpanded && (
                  <div className="absolute left-14 top-1/2 -translate-y-1/2 ml-1 opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 bg-neutral-900 dark:bg-zinc-800 text-white text-xs font-bold py-1 px-2.5 rounded-full whitespace-nowrap z-[9999] transition-all duration-150 shadow-md border border-white/5 flex items-center justify-center">
                    {item.label}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* ═══ BOTTOM ═══ */}
        <div className={cn(
          "w-full flex flex-col gap-3 pt-4 border-t border-border/60 mt-auto",
          isExpanded ? "px-3" : "items-center"
        )}>
          {/* Theme Toggle */}
          <div className="relative group flex justify-center w-full">
            <ThemeToggle iconOnly={!isExpanded} className={isExpanded ? "w-full" : undefined} />
            {!isExpanded && (
              <div className="absolute left-14 top-1/2 -translate-y-1/2 ml-1 opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 bg-neutral-900 dark:bg-zinc-800 text-white text-xs font-bold py-1 px-2.5 rounded-full whitespace-nowrap z-[9999] transition-all duration-150 shadow-md border border-white/5 flex items-center justify-center">
                Alternar Tema
              </div>
            )}
          </div>

          {/* Configurações */}
          <div className="relative group flex justify-center w-full">
            <button 
              onClick={() => setIsSettingsOpen(true)} 
              className={cn(
                "flex items-center rounded-xl transition-all duration-150 cursor-pointer text-muted-foreground hover:bg-secondary/40 hover:text-foreground w-full",
                isExpanded 
                  ? "gap-3 px-3.5 py-2.5 text-xs font-semibold" 
                  : "w-9 h-9 justify-center"
              )}
              type="button"
            >
              <Settings className="w-4 h-4 stroke-[1.5] shrink-0" />
              {isExpanded && <span>Configurações</span>}
            </button>
            {!isExpanded && (
              <div className="absolute left-14 top-1/2 -translate-y-1/2 ml-1 opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 bg-neutral-900 dark:bg-zinc-800 text-white text-xs font-bold py-1 px-2.5 rounded-full whitespace-nowrap z-[9999] transition-all duration-150 shadow-md border border-white/5 flex items-center justify-center">
                Configurações
              </div>
            )}
          </div>

          {/* Separator line */}
          <div className={cn("h-[1px] bg-border/60 my-0.5", isExpanded ? "w-full" : "w-8")} />

          {/* Local Mode Badge */}
          <div className="relative group flex justify-center w-full">
            {isExpanded ? (
              <div className="w-full flex items-center justify-center gap-1.5 p-3 rounded-xl border bg-amber-500/10 border-amber-500/30">
                <HardDrive className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-xs font-black text-amber-500 uppercase tracking-wider">Local (Testes)</span>
              </div>
            ) : (
              <>
                <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <HardDrive className="w-4 h-4 text-amber-500" />
                </div>
                <div className="absolute left-14 top-1/2 -translate-y-1/2 ml-1 opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 bg-neutral-900 dark:bg-zinc-800 text-amber-500 text-xs font-black py-1 px-2.5 rounded-full whitespace-nowrap z-[9999] transition-all duration-150 shadow-md border border-white/5 flex items-center justify-center">
                  LOCAL (TESTES) · dados só neste computador
                </div>
              </>
            )}
          </div>

          {/* Collapse/Expand Toggle Button */}
          <div className="relative group flex justify-center w-full pt-2">
            <button
              onClick={toggleSidebar}
              className={cn(
                "flex items-center rounded-xl transition-all duration-150 cursor-pointer text-muted-foreground hover:bg-secondary/40 hover:text-foreground w-full justify-center",
                isExpanded ? "py-2.5 px-3.5 gap-3" : "w-9 h-9"
              )}
              type="button"
            >
              {isExpanded ? (
                <>
                  <ChevronLeft className="w-4 h-4 stroke-[2] shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wider ml-1 w-full text-left">Recolher</span>
                </>
              ) : (
                <ChevronRight className="w-4 h-4 stroke-[2] shrink-0" />
              )}
            </button>
            {!isExpanded && (
              <div className="absolute left-14 top-1/2 -translate-y-1/2 ml-1 opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 bg-neutral-900 dark:bg-zinc-800 text-white text-xs font-bold py-1 px-2.5 rounded-full whitespace-nowrap z-[9999] transition-all duration-150 shadow-md border border-white/5 flex items-center justify-center">
                Expandir
              </div>
            )}
          </div>
        </div>
    </aside>

    {/* ═══ SETTINGS DIALOG ═══ */}
    <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
      <DialogContent className="max-w-md bg-card border border-border p-6 rounded-xl shadow-2xl">
        <DialogHeader className="gap-1.5">
          <DialogTitle className="text-base font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Settings className="w-4 h-4 text-muted-foreground" />
            Configurações do Sistema
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Ajuste a aparência e preferências de exibição do sistema.
          </DialogDescription>
        </DialogHeader>

        {/* Section: Typography */}
        <div className="py-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-medium text-foreground">
              <Type className="w-4 h-4 text-muted-foreground" />
              <span>Tamanho da Fonte</span>
            </div>
            <span className="text-xs font-bold text-muted-foreground bg-secondary/80 px-2 py-0.5 rounded">
              {fontSize}px
            </span>
          </div>

          <div className="space-y-2">
            <input
              type="range"
              min="12"
              max="20"
              step="1"
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="premium-slider"
            />
            <div className="flex justify-between text-xs text-muted-foreground/60 font-semibold uppercase tracking-wider">
              <span>12px (Mínimo)</span>
              <span>16px (Padrão)</span>
              <span>20px (Máximo)</span>
            </div>
          </div>

          {/* Dynamic Preview Box */}
          <div className="p-3 bg-secondary/30 rounded-lg border border-border/40 space-y-1.5">
            <span className="text-xs uppercase font-bold text-muted-foreground/50 tracking-wider">Pré-visualização</span>
            <p className="text-xs font-medium text-foreground leading-relaxed">
              O tamanho da tipografia do sistema e espaçamentos associados (rem) serão ajustados de forma proporcional em tempo real.
            </p>
          </div>
        </div>

        <DialogFooter className="mt-2 flex items-center justify-between gap-2 border-t border-border/60 pt-4 bg-transparent -mx-6 -mb-6 px-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFontSize(16)}
            className="text-xs flex items-center gap-1.5 border-border hover:bg-secondary/60"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restaurar Padrão
          </Button>
          <Button
            size="sm"
            onClick={() => setIsSettingsOpen(false)}
            className="text-xs px-4 bg-foreground text-background hover:bg-foreground/90"
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
);
}
