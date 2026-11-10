'use client';

import React from 'react';
import { User, Wrench, X, Trash2, Plus, AlertTriangle } from 'lucide-react';
import type { Client } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Peças do formulário de cliente (usadas em Clientes e no cadastro rápido da O.S.)

// texto digitado em destaque; o exemplo (placeholder) fica mais claro
export const iconInputClass = 'premium-input client-input h-11 pl-10 pr-3 text-sm font-semibold text-foreground placeholder:font-normal placeholder:text-muted-foreground/70 rounded-xl';

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

export interface ExtraContact {
  key: string;
  label: string;
  /** sempre visível, sem "Remover" */
  fixed?: boolean;
  hasValue: boolean;
  onRemove: () => void;
  field: React.ReactNode;
}

/**
 * Telefone principal + contatos extras (Telefone 2, WhatsApp).
 * Extras com fixed ficam sempre à vista; os outros ficam atrás de "Adicionar contato" até serem escolhidos (ou se já tiverem valor).
 */
export function ContactFields({ primary, extras }: { primary: React.ReactNode; extras: ExtraContact[] }) {
  const [opened, setOpened] = React.useState<string[]>(() => extras.filter(e => e.fixed || e.hasValue).map(e => e.key));
  const [focusKey, setFocusKey] = React.useState<string | null>(null);
  const refs = React.useRef<Record<string, HTMLDivElement | null>>({});
  const filledKeys = extras.filter(e => e.hasValue).map(e => e.key).join(',');
  React.useEffect(() => {
    if (!filledKeys) return;
    setOpened(o => [...o, ...filledKeys.split(',').filter(k => !o.includes(k))]);
  }, [filledKeys]);
  React.useEffect(() => {
    if (!focusKey) return;
    refs.current[focusKey]?.querySelector('input')?.focus();
    setFocusKey(null);
  }, [focusKey, opened]);
  const closed = extras.filter(e => !opened.includes(e.key));
  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {primary}
        {extras.filter(e => opened.includes(e.key)).map(e => (
          <div key={e.key} ref={el => { refs.current[e.key] = el; }} className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="flex items-center justify-between gap-2">
              <FieldLabel>{e.label}</FieldLabel>
              {!e.fixed && <button
                type="button"
                onClick={() => { e.onRemove(); setOpened(o => o.filter(k => k !== e.key)); }}
                className="text-xs font-semibold text-muted-foreground hover:text-danger cursor-pointer"
              >
                Remover
              </button>}
            </div>
            {e.field}
          </div>
        ))}
      </div>
      {closed.length > 0 && (
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Adicionar contato:</span>
          {closed.map(e => (
            <button
              key={e.key}
              type="button"
              onClick={() => { setOpened(o => [...o, e.key]); setFocusKey(e.key); }}
              className="h-7 px-2.5 rounded-lg border border-dashed border-info/40 text-info text-xs font-semibold inline-flex items-center gap-1 hover:bg-info/10 hover:border-info/60 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> {e.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export type ClientConflictField = 'name' | 'phone' | 'document';
export interface ClientConflict { client: Client; fields: ClientConflictField[] }

const normName = (v = '') => String(v).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
const onlyDigits = (v = '') => String(v).replace(/\D/g, '');

/**
 * Clientes já cadastrados com o mesmo nome, telefone (qualquer um: telefone, telefone 2 ou WhatsApp) ou CPF/CNPJ.
 * excludeId = o próprio cliente, na edição.
 */
export function findClientConflicts(
  clients: Client[],
  data: { name?: string; phones?: string[]; document?: string },
  excludeId?: string,
): ClientConflict[] {
  const name = normName(data.name);
  const phones = (data.phones || []).map(onlyDigits).filter(p => p.length >= 10);
  const doc = onlyDigits(data.document);
  const out: ClientConflict[] = [];
  for (const c of clients || []) {
    if (!c || c.id === excludeId) continue;
    const fields: ClientConflictField[] = [];
    if (name && normName(c.name) === name) fields.push('name');
    if (phones.length && [c.phone, c.phone2, c.whatsapp].some(p => p && phones.includes(onlyDigits(p)))) fields.push('phone');
    if (doc && c.document && onlyDigits(c.document) === doc) fields.push('document');
    if (fields.length) out.push({ client: c, fields });
  }
  return out;
}

const CONFLICT_LABEL: Record<ClientConflictField, string> = { name: 'Nome', phone: 'Telefone', document: 'CPF/CNPJ' };

/** Aviso "Cliente já cadastrado", com quem já usa o nome, telefone ou CPF/CNPJ */
export function ClientConflictWarning({ conflicts, onOpenClient }: { conflicts: ClientConflict[]; onOpenClient?: (client: Client) => void }) {
  if (!conflicts.length) return null;
  return (
    <div role="alert" className="rounded-xl border border-warning/30 bg-warning/10 px-3.5 py-3 animate-in fade-in slide-in-from-top-1 duration-200">
      <div className="flex items-center gap-1.5 text-sm font-bold text-warning">
        <AlertTriangle className="w-4 h-4 shrink-0" /> Cliente já cadastrado
      </div>
      <p className="text-xs text-muted-foreground mt-1 leading-snug">
        Não é permitido cadastrar outro cliente com o mesmo nome, telefone ou CPF/CNPJ.
        {onOpenClient ? ' Abra o cliente existente abaixo.' : ''}
      </p>
      <div className="mt-2 space-y-1">
        {conflicts.map(({ client, fields }) => {
          const label = fields.map(f => CONFLICT_LABEL[f]).join(', ');
          const contact = [client.phone, client.document].filter(Boolean).join(' · ');
          return (
            <div key={client.id} className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs">
              <span className="font-bold text-warning">{label} já usado por:</span>
              {onOpenClient ? (
                <button
                  type="button"
                  onClick={() => onOpenClient(client)}
                  className="font-extrabold text-warning underline decoration-dotted underline-offset-2 hover:opacity-80 cursor-pointer"
                >
                  {client.name}
                </button>
              ) : (
                <span className="font-extrabold text-foreground">{client.name}</span>
              )}
              {contact && <span className="text-muted-foreground">— {contact}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function IconField({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="relative client-field">
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
    <div className="grid grid-cols-2 gap-1 h-11 p-1 rounded-xl border border-border bg-muted/40" role="radiogroup" aria-label="Tipo de cliente">
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
              'rounded-lg border flex items-center justify-center gap-2 text-sm font-semibold transition-colors cursor-pointer',
              !active
                ? 'border-transparent text-muted-foreground/70 font-medium hover:text-foreground hover:bg-card/60'
                : opt.value === 'mechanic'
                  ? 'bg-info border-info text-white font-bold shadow-sm'
                  : 'bg-foreground border-foreground text-background font-bold shadow-sm'
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
        className="absolute top-6 right-6 w-10 h-10 rounded-xl border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer z-10"
      >
        <X className="w-4 h-4" />
      </button>
      <DialogHeader className="flex-row items-center gap-4 px-6 pt-6 pb-5 pr-16 space-y-0 text-left">
        <div className="w-12 h-12 rounded-xl bg-info/10 text-info flex items-center justify-center shrink-0">
          <Icon className="w-6 h-6 stroke-[1.75]" />
        </div>
        <div className="min-w-0">
          <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">{title}</DialogTitle>
          <DialogDescription className="sr-only">{subtitle}</DialogDescription>
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
    <DialogFooter className="mx-0 mb-0 px-6 py-4 border-t border-border bg-popover flex-row justify-end items-center gap-2 rounded-none">
      {onDelete && (
        <Button type="button" variant="ghost" onClick={onDelete} className="mr-auto h-10 px-3 rounded-lg text-danger hover:text-danger hover:bg-danger/10 text-sm font-semibold gap-1.5">
          <Trash2 className="w-4 h-4" /> {deleteLabel}
        </Button>
      )}
      <Button type="button" variant="outline" onClick={onCancel} className="h-11 px-6 rounded-xl border-border text-muted-foreground hover:bg-muted text-sm font-semibold">
        Cancelar
      </Button>
      <Button type={onSave ? 'button' : 'submit'} onClick={onSave} disabled={saveDisabled} className="solid-btn h-11 px-6 rounded-xl text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed">
        {saveLabel}
      </Button>
    </DialogFooter>
  );
}

/** Classes do DialogContent do formulário de cliente */
export const clientDialogClass = 'relative sm:max-w-[680px] max-h-[94vh] p-0 gap-0 rounded-2xl bg-popover border-border overflow-hidden flex flex-col';
