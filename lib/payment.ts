import type { Order, PagamentoAgrupado } from './store';
import { getOrderNetValue } from './utils';

export type PaymentSituation = 'nao_pago' | 'entrada' | 'pago';

export interface OrderPaymentSummary {
  situation: PaymentSituation;
  label: 'Não pago' | 'Entrada' | 'Pago';
  total: number;
  paid: number;
  balance: number;
  /** Pagamento agrupado ao qual a O.S. pertence (saldo é do grupo, não da O.S.) */
  group?: PagamentoAgrupado;
}

/** Soma do que já foi pago numa O.S. (lançamentos ou, nos registros antigos, entry_value). */
export function getOrderPaidAmount(order: Order): number {
  if (order.paymentStatus === 'Não Pago') return 0;
  if (Array.isArray(order.paymentEntries) && order.paymentEntries.length > 0) {
    return order.paymentEntries.reduce((acc: number, e: any) => acc + (parseFloat(e.amount ?? e.valor ?? 0) || 0), 0);
  }
  return Number(order.entryValue) || 0;
}

/** Situação de pagamento de uma O.S., com a mesma regra em todas as telas. */
export function getOrderPaymentSummary(order: Order, group?: PagamentoAgrupado): OrderPaymentSummary {
  const total = getOrderNetValue(order);

  if (group) {
    const situation: PaymentSituation =
      group.status === 'pago' ? 'pago' : group.status === 'pagamento_parcial' ? 'entrada' : 'nao_pago';
    return {
      situation,
      label: situation === 'pago' ? 'Pago' : situation === 'entrada' ? 'Entrada' : 'Não pago',
      total,
      paid: group.valorPago,
      balance: Math.max(0, group.valorTotal - group.valorPago),
      group,
    };
  }

  const paid = getOrderPaidAmount(order);
  let situation: PaymentSituation;
  if (order.paymentStatus === 'Pago' || (total > 0 && paid >= total)) situation = 'pago';
  else if (order.paymentStatus === 'Entrada' || paid > 0) situation = 'entrada';
  else situation = 'nao_pago';

  return {
    situation,
    label: situation === 'pago' ? 'Pago' : situation === 'entrada' ? 'Entrada' : 'Não pago',
    total,
    paid: situation === 'pago' ? total : paid,
    balance: situation === 'pago' ? 0 : Math.max(0, total - paid),
  };
}

export function formatBRL(value: number): string {
  return (Number(value) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** "hoje", "há 1 dia", "há 12 dias" a partir de uma data YYYY-MM-DD ou ISO. */
export function daysAgoLabel(date?: string): { label: string; days: number } | null {
  if (!date) return null;
  const d = new Date(date.length === 10 ? `${date}T12:00:00` : date);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  d.setHours(12, 0, 0, 0);
  const days = Math.max(0, Math.round((today.getTime() - d.getTime()) / 86400000));
  return { days, label: days === 0 ? 'hoje' : days === 1 ? 'há 1 dia' : `há ${days} dias` };
}
