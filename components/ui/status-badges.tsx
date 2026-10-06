import React from 'react';
import { ChevronDown, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ServiceStatus } from '@/lib/store';
import type { PaymentSituation } from '@/lib/payment';

// Selos padronizados: mesmas cores e textos em todas as telas.
const pill = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide whitespace-nowrap";

export const SERVICE_STATUS_STYLE: Record<string, { label: string; className: string; dot: string }> = {
  'Na Fila': { label: 'Na fila', className: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-300', dot: 'bg-zinc-400' },
  'Em Andamento': { label: 'Em andamento', className: 'bg-blue-500/10 text-blue-700 dark:text-blue-300', dot: 'bg-blue-500' },
  'Aguardando Peça': { label: 'Aguardando peça', className: 'bg-yellow-500/15 text-yellow-800 dark:text-yellow-300', dot: 'bg-yellow-500' },
  'Pronto': { label: 'Pronto', className: 'bg-green-500/10 text-green-700 dark:text-green-400', dot: 'bg-green-500' },
  'Levou': { label: 'Levou', className: 'bg-violet-500/10 text-violet-700 dark:text-violet-300', dot: 'bg-violet-500' },
  'Finalizada': { label: 'Finalizada', className: 'border border-zinc-400/50 text-zinc-600 dark:text-zinc-300', dot: 'bg-zinc-400' },
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
  nao_pago: { label: 'Não pago', className: 'bg-red-500/10 text-red-700 dark:text-red-400' },
  entrada: { label: 'Entrada', className: 'bg-yellow-500/15 text-yellow-800 dark:text-yellow-300' },
  pago: { label: 'Pago', className: 'bg-green-500/10 text-green-700 dark:text-green-400' },
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
