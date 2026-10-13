import React from 'react';
import { ChevronDown, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ServiceStatus } from '@/lib/store';
import type { PaymentSituation } from '@/lib/payment';

// Selos padronizados: mesmas cores e textos em todas as telas
// (fundo claro + borda + texto forte, como na referência visual do Dashboard).
const pill = "inline-flex items-center gap-1.5 px-3 py-[3px] rounded-full border text-[10.5px] font-bold uppercase tracking-wider whitespace-nowrap";

export const SERVICE_STATUS_STYLE: Record<string, { label: string; className: string; dot: string }> = {
  'Na Fila': { label: 'Na fila', className: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-white/5 dark:text-gray-300 dark:border-white/10', dot: 'bg-gray-500' },
  'Em Andamento': { label: 'Em andamento', className: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30', dot: 'bg-blue-500' },
  'Aguardando Peça': { label: 'Aguardando peça', className: 'bg-yellow-100 text-amber-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/30', dot: 'bg-amber-600' },
  'Pronto': { label: 'Pronto', className: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/30', dot: 'bg-green-600' },
  'Levou': { label: 'Levou', className: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30', dot: 'bg-red-600' },
  'Finalizada': { label: 'Finalizada', className: 'bg-transparent border-border text-muted-foreground dark:text-foreground/80', dot: 'bg-muted-foreground/50' },
};

export function ServiceStatusBadge({ status, finished, withMenu, neutral, className }: { status: ServiceStatus | string; finished?: boolean; withMenu?: boolean; /** sem cores (cinza) */ neutral?: boolean; className?: string }) {
  const style = SERVICE_STATUS_STYLE[finished ? 'Finalizada' : status] || SERVICE_STATUS_STYLE['Na Fila'];
  return (
    <span className={cn(pill, neutral ? 'bg-muted text-foreground/70 border-border' : style.className, withMenu && 'cursor-pointer hover:brightness-110', className)}>
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', neutral ? 'bg-muted-foreground/60' : style.dot)} />
      {style.label}
      {withMenu && <ChevronDown className="w-3.5 h-3.5 -mr-0.5 opacity-70" />}
    </span>
  );
}

const PAYMENT_STYLE: Record<PaymentSituation, { label: string; className: string }> = {
  nao_pago: { label: 'Não pago', className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30' },
  entrada: { label: 'Entrada', className: 'bg-yellow-50 text-amber-700 border-yellow-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30' },
  pago: { label: 'Pago', className: 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30' },
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
