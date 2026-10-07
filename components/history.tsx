'use client';

import React, { useState, useMemo } from 'react';
import { useStore, Order, Client } from '@/lib/store';
import { Calendar } from 'lucide-react';
import { PaymentBadge } from '@/components/ui/status-badges';
import { getOrderPaymentSummary, formatBRL } from '@/lib/payment';
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
      className="grid grid-cols-[80px_1.4fr_1fr_1.2fr_120px_115px_160px] gap-x-2 md:gap-x-4 items-center border-b border-border last:border-b-0 hover:bg-secondary/20 transition-all cursor-pointer px-3 md:px-4 py-3.5 min-w-[850px]"
      onClick={() => onView(order)}
    >
      <div className="font-mono font-bold text-foreground text-xs">#{order.osNumber || order.id}</div>
      <div className="min-w-0 pr-2 flex flex-col justify-center gap-0.5">
        {client?.nickname && (
          <span className="font-semibold text-[13px] text-info uppercase tracking-wide truncate">
            {client.nickname.toUpperCase()}
          </span>
        )}
        <div className="font-bold text-foreground text-xs truncate flex items-center gap-1.5 flex-wrap">
          <span className="truncate">{client?.name || 'Cliente Removido'}</span>
          {client?.clientType === 'mechanic' && (
            <span className="inline-flex items-center px-1 py-0.2 text-xs font-bold tracking-wider uppercase rounded bg-info/10 text-info border border-info/20 shrink-0">
              Mecânico
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground truncate">{client?.document}</div>
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
            <span className="inline-flex items-center justify-center font-mono text-xs font-bold px-1 py-0.5 rounded border border-border text-muted-foreground bg-secondary/30 flex-shrink-0">
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
      <div className="flex flex-col items-center justify-center gap-0.5">
        {(() => {
          const summary = getOrderPaymentSummary(order, groupedPayment);
          const methods = groupedPayment ? distinctMethods : (order.paymentMethod || '');
          return (
            <>
              <PaymentBadge situation={summary.situation} grouped={!!groupedPayment} />
              {summary.situation === 'pago' ? (
                methods && <span className="text-xs text-muted-foreground">{methods}</span>
              ) : (
                <span className="text-xs font-semibold text-danger">
                  falta {formatBRL(summary.balance)}{groupedPayment ? ' (grupo)' : ''}
                </span>
              )}
            </>
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
    statusCounts,
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
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            statusCounts={statusCounts}
          />
        </ErrorBoundary>
      </div>

      <div className="rounded-lg border bg-card border-border transition-colors duration-200 overflow-x-auto shadow-sm">
        <div className="min-w-[850px] w-full">
          {/* Header */}
          <div className="grid grid-cols-[80px_1.4fr_1fr_1.2fr_120px_115px_160px] gap-x-2 md:gap-x-4 items-center border-b border-border bg-muted/20 py-3 px-3 md:px-4 font-bold text-xs font-mono uppercase tracking-wider text-muted-foreground/80">
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
