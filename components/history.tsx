'use client';

import React, { useState, useMemo } from 'react';
import { useStore, Order, Client } from '@/lib/store';
import { Calendar, Layers } from 'lucide-react';
import { FilterBar } from '@/components/filter-bar';
import { useOrderFilters } from '@/hooks/use-order-filters';
import { OSViewModal } from '@/components/os-view-modal';
import { formatMotorModelAndCylinders } from '@/lib/utils';
import { Pagination } from '@/components/pagination';
import { ErrorBoundary } from './error-boundary';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';

interface HistoryOrderRowProps {
  order: Order;
  client: any;
  mechanic: any;
  groupedPayment?: any;
  onView: (order: Order) => void;
}

const HistoryOrderRow = React.memo(({ order, client, mechanic, groupedPayment, onView }: HistoryOrderRowProps) => {
  const distinctMethods = useMemo(() => {
    if (!groupedPayment) return '';
    const items = groupedPayment.entradas || groupedPayment.entries;
    if (!items || !Array.isArray(items) || items.length === 0) return '';
    const methodsSet = new Set<string>(
      items
        .map((e: any) => e.formaPagamento ? e.formaPagamento.trim().toUpperCase() : '')
        .filter(Boolean)
    );
    return Array.from(methodsSet).join(' + ');
  }, [groupedPayment]);

  return (
    <div 
      className="grid grid-cols-[80px_1.4fr_1fr_1.2fr_120px_115px_120px] gap-x-2 md:gap-x-4 items-center border-b border-border last:border-b-0 hover:bg-secondary/20 transition-all cursor-pointer px-3 md:px-4 py-3.5 min-w-[850px]"
      onClick={() => onView(order)}
    >
      <div className="font-mono font-bold text-foreground text-xs">#{order.osNumber || order.id}</div>
      <div className="min-w-0 pr-2 flex flex-col justify-center gap-0.5">
        {client?.nickname && (
          <span className="font-semibold text-[13px] text-blue-500 dark:text-blue-400 uppercase tracking-wide truncate">
            {client.nickname.toUpperCase()}
          </span>
        )}
        <div className="font-bold text-foreground text-xs truncate flex items-center gap-1.5 flex-wrap">
          <span className="truncate">{client?.name || 'Cliente Removido'}</span>
          {client?.clientType === 'mechanic' && (
            <span className="inline-flex items-center px-1 py-0.2 text-[8px] font-black tracking-widest uppercase rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
              Mecânico
            </span>
          )}
        </div>
        <div className="text-[10px] text-muted-foreground truncate">{client?.document}</div>
      </div>
      
      {/* Mecânico Responsável */}
      <div className="min-w-0 pr-4 flex items-center">
        {mechanic?.nickname ? (
          <span className="font-normal text-foreground/80 text-xs uppercase tracking-wide truncate block">
            {mechanic.nickname.toUpperCase()}
          </span>
        ) : mechanic?.name ? (
          <span className="text-xs text-foreground/80 truncate font-normal block">
            {mechanic.name}
          </span>
        ) : order.mechanicNickname ? (
          <span className="font-normal text-foreground/80 text-xs uppercase tracking-wide truncate block">
            {order.mechanicNickname.toUpperCase()}
          </span>
        ) : order.mechanicName ? (
          <span className="text-xs text-foreground/80 truncate font-normal block">
            {order.mechanicName}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground/30 font-mono">—</span>
        )}
      </div>

      <div className="min-w-0 pr-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-foreground/80 truncate">
          <span className="truncate">{formatMotorModelAndCylinders(order.motorModel)}</span>
          {order.displacement && order.displacement.trim() && (
            <span className="inline-flex items-center justify-center font-mono text-[10px] font-bold px-1 py-0.5 rounded border border-border text-muted-foreground bg-secondary/30 flex-shrink-0">
              {order.displacement}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground font-mono">
        <Calendar className="w-3.5 h-3.5 stroke-[1.5]" />
        {new Date(order.finishedAt || order.updatedAt || order.createdAt).toLocaleDateString('pt-BR')}
      </div>
      <div className="text-right font-mono font-bold text-foreground/80 text-xs pr-4 flex flex-col items-end justify-center">
        <span>{order.netValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
      </div>
      <div className="flex items-center justify-center">
        {groupedPayment ? (
          groupedPayment.status === 'pagamento_parcial' ? (
            <div className="relative group/tooltip inline-block" onClick={(e) => e.stopPropagation()}>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 cursor-help">
                <Layers className="w-3 h-3 stroke-[2]" />
                AGRUPADO (PARCIAL)
              </span>
              {distinctMethods && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/tooltip:block z-50 px-2.5 py-1 text-[10px] font-bold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded shadow-md whitespace-nowrap pointer-events-none">
                  {distinctMethods}
                </div>
              )}
            </div>
          ) : (
            <div className="relative group/tooltip inline-block" onClick={(e) => e.stopPropagation()}>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 cursor-help">
                <Layers className="w-3 h-3 stroke-[2]" />
                AGRUPADO
              </span>
              {distinctMethods && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/tooltip:block z-50 px-2.5 py-1 text-[10px] font-bold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded shadow-md whitespace-nowrap pointer-events-none">
                  {distinctMethods}
                </div>
              )}
            </div>
          )
        ) : (() => {
          let totalPago = 0;
          if (Array.isArray(order.paymentEntries) && order.paymentEntries.length > 0) {
            totalPago = order.paymentEntries.reduce((acc: number, curr: any) => acc + (parseFloat(curr.amount || curr.valor || 0) || 0), 0);
          } else if (order.entryValue && Number(order.entryValue) > 0) {
            totalPago = Number(order.entryValue);
          }
          const netVal = Number(order.netValue) || 0;
          const isFullyPaid = order.paymentStatus === 'Pago' || (netVal > 0 && totalPago >= netVal);

          if (isFullyPaid) {
            return (
              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#34C759]/10 text-[#34C759] border border-[#34C759]/20">
                {order.paymentMethod ? order.paymentMethod.toUpperCase() : 'PAGO'}
              </span>
            );
          }

          const isPartial = order.paymentStatus === 'Entrada' || (totalPago > 0 && totalPago < netVal);

          if (isPartial) {
            return (
              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                PAGO PARCIAL
              </span>
            );
          }

          return (
            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#34C759]/10 text-[#34C759] border border-[#34C759]/20">
              {order.paymentMethod ? order.paymentMethod.toUpperCase() : 'PAGO'}
            </span>
          );
        })()}
      </div>
    </div>
  );
});
HistoryOrderRow.displayName = 'HistoryOrderRow';

export function History() {
  const { orders, clients, deleteOrder, getGroupedPaymentForOrder } = useStore();
  const { confirm } = useConfirmDialog();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const finishedOrders = useMemo(() => orders.filter(o => o && o.finished && !!o.finishedAt && String(o.finishedAt).trim() !== ''), [orders]);

  const handleDelete = async (id: number) => {
    const group = getGroupedPaymentForOrder(id);
    if (group) {
      const ok = await confirm({
        title: `Excluir O.S. #${id} (Pagamento Agrupado)?`,
        description: `Esta O.S. pertence a um Pagamento Agrupado (${group.osIds.length} O.S.). A exclusão recalculará o saldo do grupo.`,
        confirmLabel: "Confirmar Exclusão",
      });
      if (ok) deleteOrder(id);
    } else {
      const ok = await confirm({
        title: `Excluir O.S. #${id}?`,
        description: "Esta ação não pode ser desfeita.",
      });
      if (ok) deleteOrder(id);
    }
  };

  const {
    filters, setFilters, clearFilters,
    sort, setSort,
    page, setPage,
    pageSize, setPageSize,
    filteredOrders,
    totalFilteredCount, totalCount,
    allMotors, allDisplacements,
    allPaymentMethods, allPaymentStatuses, allServiceStatuses,
    allServiceTypes,
    clientOptions,
    allPartsLeft,
  } = useOrderFilters({
    storageKey: 'history',
    orders: finishedOrders,
    clients,
    defaultSort: { field: 'date', direction: 'desc' },
  });

  const handleOpenViewModal = (order: Order) => {
    setSelectedOrder(order);
    setIsViewModalOpen(true);
  };

  return (
    <div className="space-y-4 md:space-y-6 relative z-10">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Histórico de O.S. Finalizadas</h2>
        <p className="text-muted-foreground mt-0.5 text-xs font-medium">Consulta e auditoria de serviços concluídos.</p>
      </div>

      <div>
        <ErrorBoundary>
          <FilterBar
            filters={filters}
            onFilterChange={setFilters}
            onClear={clearFilters}
            resultCount={totalFilteredCount}
            totalCount={totalCount}
            clients={clientOptions}
            motors={allMotors}
            displacements={allDisplacements}
            paymentMethods={allPaymentMethods}
            paymentStatuses={allPaymentStatuses}
            serviceStatuses={allServiceStatuses}
            serviceTypes={allServiceTypes}
            partsLeft={allPartsLeft}
            sort={sort}
            onSortChange={setSort}
            showServiceType={true}
            showValues={true}
            showSearch={true}
          />
        </ErrorBoundary>
      </div>

      <div className="rounded-lg border bg-card border-border transition-colors duration-200 overflow-x-auto shadow-sm">
        <div className="min-w-[850px] w-full">
          {/* Header */}
          <div className="grid grid-cols-[80px_1.4fr_1fr_1.2fr_120px_115px_120px] gap-x-2 md:gap-x-4 items-center border-b border-border bg-muted/20 py-3 px-3 md:px-4 font-bold text-[9px] font-mono uppercase tracking-wider text-muted-foreground/80">
            <div>Nº O.S.</div>
            <div>Cliente</div>
            <div className="pr-4">Mec. Responsável</div>
            <div>Motor</div>
            <div>Finalizado em</div>
            <div className="text-right pr-4">Valor Final</div>
            <div className="text-center">Pagamento</div>
          </div>

          {/* Body */}
          <div>
            {filteredOrders.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground/60 font-medium text-xs">
                Nenhum registro no histórico.
              </div>
            ) : (
              filteredOrders.map((order) => {
                const client = clients.find(c => order.clientId != null && String(c.id) === String(order.clientId));
                const mechanic = clients.find(c => order.mechanicId != null && String(c.id) === String(order.mechanicId));
                const groupedPayment = getGroupedPaymentForOrder ? getGroupedPaymentForOrder(order.id) : undefined;
                return (
                  <HistoryOrderRow
                    key={order.id}
                    order={order}
                    client={client}
                    mechanic={mechanic}
                    groupedPayment={groupedPayment}
                    onView={handleOpenViewModal}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>

      <Pagination
        currentPage={page}
        totalPages={Math.ceil(totalFilteredCount / pageSize)}
        pageSize={pageSize}
        totalItems={totalFilteredCount}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      {isViewModalOpen && (
        <OSViewModal 
          isOpen={isViewModalOpen}
          order={selectedOrder}
          onClose={() => setIsViewModalOpen(false)}
          onDelete={(id) => {
            handleDelete(id);
          }}
        />
      )}
    </div>
  );
}
