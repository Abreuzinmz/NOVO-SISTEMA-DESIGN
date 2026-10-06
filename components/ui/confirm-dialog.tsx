'use client';

import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

interface ConfirmDialogContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmDialogContext = createContext<ConfirmDialogContextValue | null>(null);

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({ title: '' });
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setOptions(opts);
      resolveRef.current = resolve;
      setIsOpen(true);
    });
  }, []);

  const settle = useCallback((result: boolean) => {
    setIsOpen(false);
    resolveRef.current?.(result);
    resolveRef.current = null;
  }, []);

  return (
    <ConfirmDialogContext.Provider value={{ confirm }}>
      {children}
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) settle(false); }}>
        <DialogContent
          showCloseButton={false}
          className="w-[min(400px,calc(100vw-48px))] p-0 border border-neutral-300 dark:border-neutral-800 bg-card rounded-2xl overflow-hidden shadow-[0_12px_24px_-4px_rgba(0,0,0,0.08),_0_4px_12px_-2px_rgba(0,0,0,0.04)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.4)] outline-none"
        >
          <div className="p-6 flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#FF5A5F]/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 text-[#FF5A5F] stroke-[2.5]" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-sm font-black uppercase tracking-wide text-foreground">
                {options.title}
              </h2>
              {options.description && (
                <p className="text-xs font-semibold text-muted-foreground leading-relaxed">
                  {options.description}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 p-4 border-t border-neutral-300 dark:border-neutral-800 bg-secondary/20">
            <Button
              variant="outline"
              onClick={() => settle(false)}
              className="flex-1 h-10 rounded-xl border-neutral-300 dark:border-neutral-800 bg-background hover:bg-secondary text-foreground font-black text-xs uppercase tracking-wider"
            >
              {options.cancelLabel || 'Cancelar'}
            </Button>
            <Button
              onClick={() => settle(true)}
              className="flex-1 h-10 rounded-xl bg-[#FF5A5F] hover:bg-[#FF5A5F]/90 text-white font-black text-xs uppercase tracking-wider gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {options.confirmLabel || 'Excluir'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirmDialog() {
  const ctx = useContext(ConfirmDialogContext);
  if (!ctx) {
    throw new Error('useConfirmDialog must be used within a ConfirmDialogProvider');
  }
  return ctx;
}
