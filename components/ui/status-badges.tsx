import React from 'react';
import { ChevronDown, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ServiceStatus } from '@/lib/store';
import type { PaymentSituation } from '@/lib/payment';

// Selos padronizados: mesmas cores e textos em todas as telas.
const pill = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide whitespace-nowrap";

export const SERVICE_STATUS_STYLE: Record<string, { label: string; className: string; dot: string }> = {
  'Na Fila': { label: 'Na fila', className: 'bg-muted-foreground/10 text-muted-foreground dark:text-foreground/80', dot: 'bg-muted-foreground/50' },
  'Em Andamento': { label: 'Em andamento', className: 'bg-info/10 text-info', dot: 'bg-info' },
  'Aguardando Peça': { label: 'Aguardando peça', className: 'bg-warning/15 text-warning', dot: 'bg-warning' },
  'Pronto': { label: 'Pronto', className: 'bg-success/10 text-success', dot: 'bg-success' },
  'Levou': { label: 'Levou', className: 'bg-levou/10 text-levou', dot: 'bg-levou' },
  'Finalizada': { label: 'Finalizada', className: 'border border-border/50 text-muted-foreground dark:text-foreground/80', dot: 'bg-muted-foreground/50' },
};

export function ServiceStatusBadge({ status, finished, withMenu, className }: { status: ServiceStatus | string; finished?: boolean; withMenu?: boolean; className?: string }) {
  const style = SERVICE_STATUS_STYLE[finished ? 'Finalizada' : status] || SERVICE_STATUS_STYLE['Na Fila'];
  return (
    <span className={cn(pill, style.className, withMenu && 'cursor-pointer hover:brightness-110', className)}>
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', style.dot)} />
      {style.label}
      {withMenu && <ChevronDown className="w-3.5 h-3.5 -mr-0.5 opacity-70" />}
    </span>
  );
}

const PAYMENT_STYLE: Record<PaymentSituation, { label: string; className: string }> = {
  nao_pago: { label: 'Não pago', className: 'bg-danger/10 text-danger' },
  entrada: { label: 'Entrada', className: 'bg-warning/15 text-warning' },
  pago: { label: 'Pago', className: 'bg-success/10 text-success' },
};

export function PaymentBadge({ situation, grouped, className }: { situation: PaymentSituation; grouped?: boolean; className?: string }) {
  const style = PAYMENT_STYLE[situation];
  return (
    <span className={cn(pill, style.className, className)} title={grouped ? 'Faz parte de um pagamento agrupado' : undefined}>
      {grouped && <Layers className="w-3.5 h-3.5" />}
      {style.label}
    </span>
  );
}
