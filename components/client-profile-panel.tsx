'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { User, Wrench, Phone, MessageCircle, FileText, MapPin, Pencil, X, ChevronRight, ClipboardList } from 'lucide-react';
import { useStore, Order } from '@/lib/store';
import { cn } from '@/lib/utils';
import { getOrderPaymentSummary, formatBRL } from '@/lib/payment';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PaymentBadge, ServiceStatusBadge } from '@/components/ui/status-badges';
import { ClientEditDialog } from '@/components/client-edit-dialog';

/**
 * Perfil rápido do cliente, aberto por cima do modal da O.S.:
 * dados e contatos, editar, resumo (O.S., total gasto, a receber) e histórico de O.S.
 */
export function ClientProfilePanel({ clientId, currentOrderId, open, onOpenChange, onOpenOrder }: {
  clientId: string;
  /** O.S. que está aberta no modal (fica marcada na lista) */
  currentOrderId?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Clique numa O.S. do histórico */
  onOpenOrder: (order: Order) => void;
}) {
  const { clients, orders, getGroupedPaymentForOrder } = useStore();
  const client = clients.find(c => c.id === clientId);
  const isMechanic = client?.clientType === 'mechanic';
  const [tab, setTab] = useState<'client' | 'mechanic'>('client');
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => { if (open) setTab('client'); }, [open, clientId]);

  const byDateDesc = (a: Order, b: Order) =>
    (b.arrivalDate || b.createdAt.slice(0, 10)).localeCompare(a.arrivalDate || a.createdAt.slice(0, 10))
    || (Number(b.osNumber || b.id) || 0) - (Number(a.osNumber || a.id) || 0);

  // Como cliente (dono da O.S.) e, se for mecânico, as O.S. em que ele foi o responsável
  const asClient = useMemo(() => orders.filter(o => o.clientId === clientId).sort(byDateDesc), [orders, clientId]);
  const asMechanic = useMemo(
    () => (isMechanic ? orders.filter(o => o.mechanicId === clientId && o.clientId !== clientId).sort(byDateDesc) : []),
    [orders, clientId, isMechanic]
  );
  const all = useMemo(() => [...asClient, ...asMechanic], [asClient, asMechanic]);

  const stats = useMemo(() => {
    let spent = 0, pending = 0, pendingCount = 0, openCount = 0;
    for (const o of all) {
      spent += o.netValue || 0;
      if (!o.finished) openCount += 1;
      const p = getOrderPaymentSummary(o, getGroupedPaymentForOrder(o.id));
      if (p.situation !== 'pago' && p.balance > 0) { pending += p.balance; pendingCount += 1; }
    }
    return { spent, pending, pendingCount, openCount };
  }, [all, getGroupedPaymentForOrder]);

  if (!client) return null;

  const list = tab === 'mechanic' ? asMechanic : asClient;
  const contacts = [
    client.phone ? { icon: Phone, label: 'TEL.', value: client.phone } : null,
    client.phone2 ? { icon: Phone, label: 'TEL. 2', value: client.phone2 } : null,
    client.whatsapp ? { icon: MessageCircle, label: 'WHATS', value: client.whatsapp } : null,
    client.document?.trim() ? { icon: FileText, label: client.document.replace(/\D/g, '').length > 11 ? 'CNPJ' : 'CPF', value: client.document } : null,
    client.city?.trim() ? { icon: MapPin, label: 'CID.', value: client.city } : null,
  ].filter(Boolean) as { icon: React.ElementType; label: string; value: string }[];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="ml-auto self-stretch w-[min(480px,100%)] z-[1200] rounded-2xl bg-popover border border-border ring-1 ring-foreground/15 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.45)] p-0 gap-0 overflow-hidden flex flex-col data-open:slide-in-from-right-8"
          overlayClassName="z-[1199] bg-black/40 supports-backdrop-filter:backdrop-blur-[1px]"
          forceOverlay
        >
          {/* Cabeçalho: ícone, apelido, nome, tipo, contatos e ações */}
          <div className="shrink-0 p-5 pb-4 border-b border-border bg-blue-50/60 dark:bg-blue-500/5">
            <div className="flex items-start gap-3">
              <span className={cn(
                "rounded-xl flex items-center justify-center shrink-0 shadow-sm text-white bg-slate-500 dark:bg-slate-600",
                client.nickname ? "w-11 h-11" : "w-9 h-9"
              )}>
                {isMechanic ? <Wrench className="w-5 h-5 stroke-[1.75]" /> : <User className="w-5 h-5 stroke-[1.75]" />}
              </span>
              <div className="flex-1 min-w-0">
                {client.nickname && (
                  <div className="text-xs font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400 leading-tight truncate">{client.nickname}</div>
                )}
                <DialogTitle className="text-lg font-extrabold uppercase tracking-tight text-foreground leading-snug break-words">{client.name}</DialogTitle>
                <span className={cn(
                  "inline-block mt-1 text-[11px] font-extrabold tracking-wider uppercase rounded-full border px-2.5 py-0.5",
                  isMechanic ? "bg-info/10 text-info border-info/20" : "bg-card text-secondary-foreground border-border"
                )}>
                  {isMechanic ? 'Mecânico' : 'Cliente'}
                </span>
              </div>
              <Button variant="ghost" size="icon" title="Fechar" onClick={() => onOpenChange(false)} className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground shrink-0">
                <X className="w-4 h-4" />
              </Button>
            </div>

            {contacts.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
                {contacts.map((r) => (
                  <div key={r.label} className="flex items-center gap-2 min-w-0">
                    <r.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground shrink-0">{r.label}</span>
                    <span className="min-w-0 text-[13px] font-semibold text-foreground truncate" title={r.value}>{r.value}</span>
                  </div>
                ))}
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={() => setEditOpen(true)}
              className="mt-4 w-full h-9 rounded-lg border-border bg-card hover:bg-muted text-xs font-bold uppercase tracking-wide gap-1.5"
            >
              <Pencil className="w-3.5 h-3.5" /> Editar cliente
            </Button>
          </div>

          {/* Resumo */}
          <div className="shrink-0 grid grid-cols-3 gap-2 px-5 py-4 border-b border-border">
            <div className="rounded-xl border border-border bg-card px-3 py-2">
              <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">O.S.</div>
              <div className="text-lg font-extrabold text-foreground tabular-nums leading-tight">{all.length}</div>
              <div className="text-[11px] text-muted-foreground">{stats.openCount} em aberto</div>
            </div>
            <div className="rounded-xl border border-border bg-card px-3 py-2 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Total gasto</div>
              <div className="text-base font-extrabold text-foreground tabular-nums leading-tight truncate" title={formatBRL(stats.spent)}>{formatBRL(stats.spent)}</div>
            </div>
            <div className={cn(
              "rounded-xl border px-3 py-2 min-w-0",
              stats.pending > 0 ? "border-warning/30 bg-warning/5" : "border-border bg-card"
            )}>
              <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">A receber</div>
              {stats.pending > 0 ? (
                <>
                  <div className="text-base font-extrabold text-warning tabular-nums leading-tight truncate" title={formatBRL(stats.pending)}>{formatBRL(stats.pending)}</div>
                  <div className="text-[11px] text-muted-foreground">{stats.pendingCount} {stats.pendingCount === 1 ? 'O.S.' : 'O.S.'}</div>
                </>
              ) : (
                <div className="text-sm font-bold text-success leading-tight mt-0.5">Nada pendente</div>
              )}
            </div>
          </div>

          {/* Histórico */}
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="shrink-0 px-5 pt-4 pb-2 flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-foreground">
                <ClipboardList className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Histórico de O.S.
              </span>
              {isMechanic && (
                <div className="flex rounded-lg border border-border bg-muted/40 p-0.5">
                  {([['client', `Como cliente (${asClient.length})`], ['mechanic', `Como mecânico (${asMechanic.length})`]] as const).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTab(key)}
                      className={cn(
                        "h-7 px-2.5 rounded-md text-[11px] font-bold cursor-pointer transition-colors",
                        tab === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-5 space-y-1.5">
              {list.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">Nenhuma O.S. encontrada.</div>
              ) : list.map((o) => {
                const isCurrent = o.id === currentOrderId;
                const pay = getOrderPaymentSummary(o, getGroupedPaymentForOrder(o.id));
                const date = new Date((o.arrivalDate || o.createdAt.slice(0, 10)) + 'T12:00:00').toLocaleDateString('pt-BR');
                const motor = (o.motorModel || '').split(',')[0].trim();
                const owner = tab === 'mechanic' ? clients.find(c => c.id === o.clientId) : undefined;
                return (
                  <button
                    key={o.id}
                    type="button"
                    disabled={isCurrent}
                    onClick={() => onOpenOrder(o)}
                    className={cn(
                      "w-full text-left rounded-xl border px-3 py-2.5 flex items-center gap-3 transition-colors",
                      isCurrent
                        ? "border-blue-300 bg-blue-50/70 dark:border-blue-500/40 dark:bg-blue-500/10 cursor-default"
                        : "border-border bg-card hover:bg-muted/60 cursor-pointer"
                    )}
                  >
                    <div className="w-[68px] shrink-0">
                      <div className="text-sm font-extrabold text-blue-600 dark:text-blue-400 tabular-nums leading-tight">#{String(o.osNumber || o.id).padStart(4, '0')}</div>
                      <div className="text-[11px] text-muted-foreground tabular-nums">{date}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-bold uppercase text-foreground truncate" title={o.motorModel}>{motor || 'Motor não informado'}</div>
                      {owner ? (
                        <div className="text-[11px] font-semibold uppercase text-muted-foreground truncate">{owner.nickname || owner.name}</div>
                      ) : isCurrent ? (
                        <div className="text-[11px] font-bold uppercase text-blue-600 dark:text-blue-400">Esta O.S.</div>
                      ) : (
                        <ServiceStatusBadge status={o.serviceStatus} finished={o.finished} className="mt-0.5 px-2 py-0 text-[9.5px]" />
                      )}
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <span className="text-[13px] font-extrabold text-foreground tabular-nums">{formatBRL(o.netValue || 0)}</span>
                      <PaymentBadge situation={pay.situation} grouped={!!getGroupedPaymentForOrder(o.id)} className="px-2 py-0 text-[9.5px]" />
                    </div>
                    {!isCurrent && <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ClientEditDialog client={client} open={editOpen} onOpenChange={setEditOpen} nested />
    </>
  );
}
