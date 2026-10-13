'use client';

import React from 'react';
import { User, Wrench, X, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Peças do formulário de cliente (usadas em Clientes e no cadastro rápido da O.S.)

export const iconInputClass = 'premium-input h-10 pl-10 pr-3 text-sm rounded-lg';

/** Cor do ícone de cada seção */
const SECTION_TONES = {
  info: 'bg-info/10 text-info',
  success: 'bg-success/10 text-success',
  levou: 'bg-levou/10 text-levou',
  warning: 'bg-warning/10 text-warning',
} as const;

export type SectionTone = keyof typeof SECTION_TONES;

export function FormSection({ icon: Icon, title, hint, description, tone = 'info', children }: {
  icon: React.ElementType; title: string; hint?: string; description?: string; tone?: SectionTone; children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-muted/20 px-4 py-3.5 space-y-3">
      <div className="flex items-center gap-3">
        <span className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', SECTION_TONES[tone])}>
          <Icon className="w-[18px] h-[18px] stroke-[1.75]" />
        </span>
        <div className="min-w-0">
          <h3 className="text-[15px] font-bold leading-tight text-foreground">{title}</h3>
          {(hint || description) && <p className="text-xs text-muted-foreground mt-0.5">{hint || description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

export function FieldLabel({ htmlFor, children, required }: { htmlFor?: string; children: React.ReactNode; required?: boolean; optional?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="flex items-center gap-1 text-[13px] font-semibold text-foreground">
      {children}
      {required && <span className="text-danger">*</span>}
    </label>
  );
}

export function IconField({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
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
    <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Tipo de cliente">
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
              'h-10 rounded-lg border flex items-center justify-center gap-2 text-sm font-semibold transition-colors cursor-pointer',
              !active
                ? 'bg-card border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                : opt.value === 'mechanic'
                  ? 'bg-info/10 border-info/60 text-info ring-1 ring-info/30'
                  : 'bg-muted border-foreground/30 text-foreground ring-1 ring-foreground/10'
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
export function ClientDialogHeader({ title, subtitle, onClose, icon: Icon = User }: { title: string; subtitle: string; onClose: () => void; icon?: React.ElementType }) {
  return (
    <>
      <button
        type="button"
        onClick={onClose}
        title="Fechar"
        className="absolute top-5 right-5 w-9 h-9 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer z-10"
      >
        <X className="w-4 h-4" />
      </button>
      <DialogHeader className="flex-row items-center gap-4 px-6 pt-5 pb-4 pr-16 space-y-0 text-left">
        <div className="w-12 h-12 rounded-xl bg-info/10 text-info flex items-center justify-center shrink-0">
          <Icon className="w-6 h-6 stroke-[1.75]" />
        </div>
        <div className="min-w-0">
          <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">{title}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">{subtitle}</DialogDescription>
        </div>
      </DialogHeader>
    </>
  );
}

/** Rodapé: [Excluir] ... Cancelar + Salvar. Sem onSave, o botão salvar envia o <form>. */
export function ClientDialogFooter({ onCancel, onSave, saveDisabled, saveLabel = 'Salvar Cliente', onDelete, deleteLabel = 'Excluir Cliente' }: {
  onCancel: () => void; onSave?: () => void; saveDisabled?: boolean; saveLabel?: string; onDelete?: () => void; deleteLabel?: string;
}) {
  return (
    <DialogFooter className="mx-0 mb-0 px-6 py-3 border-t border-border bg-popover flex-row justify-end items-center gap-2 rounded-none">
      {onDelete && (
        <Button type="button" variant="ghost" onClick={onDelete} className="mr-auto h-10 px-3 rounded-lg text-danger hover:text-danger hover:bg-danger/10 text-sm font-semibold gap-1.5">
          <Trash2 className="w-4 h-4" /> {deleteLabel}
        </Button>
      )}
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
export const clientDialogClass = 'relative sm:max-w-[720px] max-h-[94vh] p-0 gap-0 rounded-2xl bg-popover border-border overflow-hidden flex flex-col';
