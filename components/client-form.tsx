'use client';

import React from 'react';
import { User, Wrench, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Peças do formulário de cliente (usadas em Clientes e no cadastro rápido da O.S.)

export const iconInputClass = 'premium-input h-9 pl-9 pr-3 text-sm rounded-lg';

export function FormSection({ icon: Icon, title, hint, description, children }: {
  icon: React.ElementType; title: string; hint?: string; description?: string; children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-muted/30 px-4 py-3 space-y-2.5">
      <div>
        <div className="flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Icon className="w-4 h-4 stroke-[1.75]" /> {title}
          </h3>
          {hint && <span className="text-xs text-muted-foreground text-right">{hint}</span>}
        </div>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export function FieldLabel({ htmlFor, children, required, optional }: { htmlFor?: string; children: React.ReactNode; required?: boolean; optional?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="flex items-center gap-1.5 text-xs font-medium text-foreground">
      {children}
      {required && <span className="text-danger">*</span>}
      {optional && <span className="px-1.5 py-px rounded-full bg-muted text-[11px] font-normal text-muted-foreground">Opcional</span>}
    </label>
  );
}

export function IconField({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
      {children}
    </div>
  );
}

export function ClientTypeToggle({ value, onChange }: { value: 'regular' | 'mechanic'; onChange: (v: 'regular' | 'mechanic') => void }) {
  const options = [
    { value: 'regular' as const, label: 'Cliente', icon: User },
    { value: 'mechanic' as const, label: 'Mecânico', icon: Wrench },
  ];
  return (
    <div className="grid grid-cols-2 rounded-lg border border-border bg-card p-1 gap-1" role="radiogroup" aria-label="Tipo de cliente">
      {options.map(opt => {
        const active = value === opt.value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'h-9 rounded-md flex items-center justify-center gap-2 text-sm font-semibold transition-colors cursor-pointer',
              active ? 'bg-muted text-foreground shadow-sm ring-1 ring-border' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            )}
          >
            <Icon className={cn('w-4 h-4', active && opt.value === 'regular' && 'fill-current')} />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/** Cabeçalho: ícone, título, subtítulo e botão de fechar */
export function ClientDialogHeader({ title, subtitle, onClose }: { title: string; subtitle: string; onClose: () => void }) {
  return (
    <>
      <button
        type="button"
        onClick={onClose}
        title="Fechar"
        className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer z-10"
      >
        <X className="w-4 h-4" />
      </button>
      <DialogHeader className="flex-row items-center gap-3 px-6 pt-4 pb-3 space-y-0 text-left">
        <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center shrink-0">
          <User className="w-5 h-5 stroke-[1.75] text-foreground" />
        </div>
        <div className="min-w-0">
          <DialogTitle className="text-xl font-bold tracking-tight text-foreground">{title}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">{subtitle}</DialogDescription>
        </div>
      </DialogHeader>
    </>
  );
}

/** Rodapé: Cancelar + Salvar. Sem onSave, o botão salvar envia o <form>. */
export function ClientDialogFooter({ onCancel, onSave, saveDisabled, saveLabel = 'Salvar Cliente' }: {
  onCancel: () => void; onSave?: () => void; saveDisabled?: boolean; saveLabel?: string;
}) {
  return (
    <DialogFooter className="mx-0 mb-0 px-6 py-3 border-t border-border bg-popover flex-row justify-end gap-2 rounded-none">
      <Button type="button" variant="outline" onClick={onCancel} className="h-10 px-5 rounded-lg border-border text-muted-foreground hover:bg-muted text-sm font-semibold">
        Cancelar
      </Button>
      <Button type={onSave ? 'button' : 'submit'} onClick={onSave} disabled={saveDisabled} className="solid-btn h-10 px-5 rounded-lg text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed">
        {saveLabel}
      </Button>
    </DialogFooter>
  );
}

/** Classes do DialogContent do formulário de cliente */
export const clientDialogClass = 'relative sm:max-w-[640px] max-h-[94vh] p-0 gap-0 rounded-2xl bg-popover border-border overflow-hidden flex flex-col';
