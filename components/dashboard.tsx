'use client';

import React, { useMemo, useState } from 'react';
import { useStore, Order, ServiceStatus, PagamentoAgrupado } from '@/lib/store';
import { ServiceStatusBadge, PaymentBadge } from '@/components/ui/status-badges';
import { getOrderPaymentSummary, formatBRL, daysAgoLabel } from '@/lib/payment';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  MoreHorizontal,
  Eye,
  CheckCircle2,
  Pencil,
  Trash2,
  Plus,
  Search,
  X,
  Calendar
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup
} from '@/components/ui/dropdown-menu';
import { cn, formatMotorDisplay, formatMotorModelAndCylinders } from '@/lib/utils';
import { toast } from 'sonner';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { FilterBar } from '@/components/filter-bar';
import { Pagination } from '@/components/pagination';
import { useOrderFilters } from '@/hooks/use-order-filters';
import { OSViewModal } from '@/components/os-view-modal';
import { OSForm } from '@/components/os-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger
} from '@/components/ui/select';

interface DashboardOrderRowProps {
  order: Order;
  client: any;
  mechanic: any;
  groupedPayment?: PagamentoAgrupado;
  onEdit?: (order: Order) => void;
  onView: (order: Order) => void;
  onStatusChange: (orderId: number, newVal: string | null) => void;
  onFinish: (order: Order) => void;
  onDelete: (id: number) => void;
}

const DashboardOrderRow = React.memo(({
  order,
  client,
  mechanic,
  groupedPayment,
  onEdit,
  onView,
  onStatusChange,
  onFinish,
  onDelete
}: DashboardOrderRowProps) => {
  const parsedMotors = useMemo(() => {
    if (!order.motorModel) return [];
    const models = order.motorModel.split(', ');
    const displacements = order.displacement ? order.displacement.split(', ') : [];

    return models.map((m, idx) => {
      const cylindersMatch = m.match(/\((\d+)\s*(?:CIL|cil|Cil|Cilindros|cilindros)?\)/i);
      const cylinders = cylindersMatch ? `${cylindersMatch[1]} CIL` : '';
      const model = m.replace(/\s*\(.*\)/, '').trim().toUpperCase();
      const disp = displacements[idx]?.trim() || '';
      return { model, cylinders, disp };
    });
  }, [order.motorModel, order.displacement]);

  const motorTitle = useMemo(() => {
    return parsedMotors.map(pm => [pm.model, pm.disp, pm.cylinders].filter(Boolean).join(' ')).join(' + ');
  }, [parsedMotors]);

  const payment = getOrderPaymentSummary(order, groupedPayment);
  const arrival = daysAgoLabel(order.arrivalDate || order.createdAt);
  const mechanicLabel = mechanic ? (mechanic.nickname || mechanic.name) : '';

  return (
    <div
      id={`order-row-${order.id}`}
      onClick={() => onView(order)}
      className={cn(
        "relative group rounded-lg border transition-colors duration-150 cursor-pointer",
        "grid grid-cols-[72px_minmax(0,1.5fr)_minmax(0,1fr)_172px_124px_32px] xl:grid-cols-[88px_minmax(0,1.6fr)_minmax(0,1.3fr)_104px_176px_150px_40px] gap-x-3 items-center px-4 py-2.5 min-h-[56px]",
        "dark:bg-card dark:border-border/40 dark:hover:bg-muted",
        "bg-card border-border/70 hover:bg-muted/70"
      )}
    >
      {/* Nº O.S. */}
      <div className="min-w-0">
        <div className="font-mono font-bold text-base text-foreground tabular-nums">
          #{order.osNumber || order.id}
        </div>
        {arrival && (
          <div className={cn("xl:hidden text-xs font-semibold", arrival.days >= 15 ? "text-danger" : arrival.days >= 7 ? "text-warning" : "text-muted-foreground")}>
            {arrival.label}
          </div>
        )}
      </div>

      {/* Cliente (+ mecânico como linha de apoio) */}
      <div className="min-w-0" title={client?.nickname ? `${client.nickname} (${client.name || ''})` : client?.name}>
        <div className="font-bold text-foreground text-sm uppercase leading-tight line-clamp-2 break-words">
          {client?.nickname || client?.name || 'Cliente removido'}
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {[client?.nickname ? client.name : '', client?.phone].filter(Boolean).join(' · ')}
        </div>
        {mechanicLabel && (
          <div className="text-xs text-foreground/75 truncate">Mecânico: {mechanicLabel}</div>
        )}
      </div>

      {/* Motor */}
      <div className="min-w-0" title={motorTitle || 'Motor não especificado'}>
        {parsedMotors.length > 0 ? (
          parsedMotors.map((pm, idx) => (
            <div key={idx} className="text-sm leading-tight">
              <span className="font-bold text-foreground uppercase">{pm.model}</span>
              {(pm.disp || pm.cylinders) && (
                <span className="text-xs text-muted-foreground"> {[pm.disp, pm.cylinders].filter(Boolean).join(' · ')}</span>
              )}
            </div>
          ))
        ) : (
          <div className="text-sm text-muted-foreground">Motor não especificado</div>
        )}
      </div>

      {/* Chegada */}
      <div className="hidden xl:block text-sm leading-tight">
        {arrival ? (
          <>
            <div className={cn("font-semibold", arrival.days >= 15 ? "text-danger" : arrival.days >= 7 ? "text-warning" : "text-foreground")}>
              {arrival.label}
            </div>
            <div className="text-xs text-muted-foreground tabular-nums">
              {(order.arrivalDate || order.createdAt.slice(0, 10)).split('-').reverse().join('/')}
            </div>
          </>
        ) : <span className="text-muted-foreground">—</span>}
      </div>

      {/* Status (clicável: troca rápida) */}
      <div className="flex flex-col items-start gap-1 min-w-0" onClick={(e) => e.stopPropagation()}>
        <Select
          value={order.finished ? 'Finalizado / Entregue' : order.serviceStatus}
          onValueChange={(val) => onStatusChange(order.id, val)}
        >
          <SelectTrigger
            title="Clique para alterar o status"
            className="border-none bg-transparent hover:bg-transparent shadow-none p-0 h-auto focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 w-auto flex cursor-pointer [&>svg:last-child]:hidden"
          >
            <ServiceStatusBadge status={order.serviceStatus} withMenu />
          </SelectTrigger>
          <SelectContent className="z-[9999] bg-card dark:bg-background border border-border/50 dark:border-border rounded-lg shadow-2xl min-w-[180px] w-auto p-1.5">
            {(['Na Fila', 'Em Andamento', 'Aguardando Peça', 'Pronto', 'Levou'] as ServiceStatus[]).map((s) => (
              <SelectItem key={s} value={s} className="rounded-md py-2 px-2 focus:bg-primary/5 dark:focus:bg-foreground/[0.06] cursor-pointer">
                <ServiceStatusBadge status={s} />
              </SelectItem>
            ))}
            <SelectItem value="Finalizado / Entregue" className="rounded-md py-2 px-2 focus:bg-primary/5 dark:focus:bg-foreground/[0.06] cursor-pointer">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-foreground">
                <CheckCircle2 className="w-3.5 h-3.5" /> Finalizar O.S.
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
        {order.serviceStatus === 'Levou' && order.deliveryDate && (
          <span className="text-xs text-muted-foreground tabular-nums">levou em {order.deliveryDate.split('-').reverse().join('/')}</span>
        )}
        {order.statusObservation && (
          <span className="text-xs text-muted-foreground leading-tight line-clamp-2 break-words">
            {order.statusObservation}
          </span>
        )}
      </div>

      {/* Pagamento + saldo */}
      <div className="flex flex-col items-start gap-0.5">
        <PaymentBadge situation={payment.situation} grouped={!!groupedPayment} />
        <span
          className={cn("text-xs tabular-nums whitespace-nowrap", payment.situation === 'pago' ? "text-muted-foreground" : "font-semibold text-danger")}
          title={groupedPayment ? 'Saldo do pagamento agrupado' : undefined}
        >
          {payment.situation === 'pago' ? formatBRL(payment.total) : `falta ${formatBRL(payment.balance)}`}
        </span>
      </div>

      {/* Ações raras */}
      <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" title="Mais ações" className="hover:bg-secondary/40 rounded-md w-8 h-8 transition-colors" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="min-w-[170px] bg-card border-border rounded-lg shadow-lg">
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(order); }} className="hover:bg-secondary cursor-pointer rounded mx-1 text-sm">
                <Eye className="w-4 h-4 mr-2 stroke-[1.5]" /> Abrir O.S.
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(order); }} className="hover:bg-secondary cursor-pointer rounded mx-1 text-sm">
                <Pencil className="w-4 h-4 mr-2 stroke-[1.5]" /> Editar O.S.
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer rounded mx-1 text-sm"
                onClick={() => onFinish(order)}
              >
                <CheckCircle2 className="w-4 h-4 mr-2 stroke-[1.5]" /> Finalizar O.S.
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                className="text-danger hover:bg-danger/10 cursor-pointer rounded mx-1 text-sm"
                onClick={() => onDelete(order.id)}
              >
                <Trash2 className="w-4 h-4 mr-2 stroke-[1.5]" /> Excluir O.S.
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});
DashboardOrderRow.displayName = 'DashboardOrderRow';

export function Dashboard({
  onEdit,
  onView
}: {
  onEdit?: (order: Order) => void,
  onView?: (order: Order) => void
}) {
  const { orders, clients, updateOrder, deleteOrder, getGroupedPaymentForOrder } = useStore();
  const { confirm } = useConfirmDialog();

  const [activeTab, setActiveTab] = useState<'gerenciamento' | 'visao-ampla'>('gerenciamento');
  const [visaoAmplaSearch, setVisaoAmplaSearch] = useState('');

  const activeOrders = useMemo(() => (orders || []).filter(o => o && !o.finished && (!o.finishedAt || String(o.finishedAt).trim() === '')), [orders]);

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

  const sortedActiveOrders = useMemo(() => {
    return (orders || [])
      .filter(o => o && !o.finished && (!o.finishedAt || String(o.finishedAt).trim() === ''))
      .sort((a, b) => {
        const numA = a.osNumber ?? a.id;
        const numB = b.osNumber ?? b.id;
        return numB - numA;
      });
  }, [orders]);

  const filteredVisaoAmplaOrders = useMemo(() => {
    const query = (visaoAmplaSearch || '').toLowerCase().trim().replace(/\s+/g, ' ');
    const list = sortedActiveOrders || [];
    if (!query) return list;

    return list.filter(o => {
      if (!o) return false;
      const client = (clients || []).find(c => c && c.id === o.clientId);
      const clientName = (client?.name || '').toLowerCase();
      const clientNickname = (client?.nickname || '').toLowerCase();
      
      const mechanic = (clients || []).find(c => c && c.id === o.mechanicId);
      const mechanicName = (mechanic?.name || '').toLowerCase();
      const mechanicNickname = (mechanic?.nickname || '').toLowerCase();

      const motorModel = (o.motorModel || '').toLowerCase();
      const osNum = String(o.osNumber ?? o.id).toLowerCase();

      return osNum.includes(query) || 
             clientName.includes(query) || 
             clientNickname.includes(query) || 
             mechanicName.includes(query) || 
             mechanicNickname.includes(query) || 
             motorModel.includes(query);
    });
  }, [sortedActiveOrders, visaoAmplaSearch, clients]);

  const renderVisaoAmplaTable = () => {
    try {
      const ordersToRender = filteredVisaoAmplaOrders || [];
      if (ordersToRender.length === 0) {
        return (
          <tr>
            <td colSpan={7} className="py-12 text-center text-muted-foreground/60 font-medium text-xs">
              Nenhuma ordem de serviço ativa encontrada.
            </td>
          </tr>
        );
      }
      return ordersToRender.map((order) => {
        if (!order) return null;
        const client = (clients || []).find((c) => c && c.id === order.clientId);
        const clientName = (client?.name || 'Cliente Removido').toUpperCase();
        const mechanic = (clients || []).find((c) => c && c.id === order.mechanicId);
        
        let motorText = 'MOTOR NÃO ESPECIFICADO';
        if (order.motorModel) {
          try {
            motorText = order.motorModel.split(', ').map(m => m ? m.replace(/\s*\(.*\)/, '').trim().toUpperCase() : '').filter(Boolean).join(', ');
          } catch (e) {
            console.error('Error parsing motorModel:', e);
            motorText = String(order.motorModel).toUpperCase();
          }
        }
        
        return (
          <tr
            key={order.id}
            onClick={() => handleOpenViewModal(order)}
            className="hover:bg-secondary/40 cursor-pointer transition-colors duration-150 group"
          >
            <td className="py-2 px-3 font-mono font-bold text-sm text-foreground tabular-nums">
              #{order.osNumber || order.id}
            </td>
            <td className="py-2 px-3 text-foreground text-xs">
              <div className="flex flex-col space-y-0.5">
                {client?.nickname ? (
                  <>
                    <span className="font-bold text-foreground text-xs uppercase tracking-wide">
                      {client.nickname.toUpperCase()}
                    </span>
                    <span className="text-xs text-muted-foreground font-semibold uppercase">
                      {client.name}
                    </span>
                  </>
                ) : (
                  <span className="font-extrabold uppercase tracking-wide">{clientName}</span>
                )}
                {client?.phone && (
                  <span className="text-xs text-muted-foreground font-bold">
                    {client.phone}
                  </span>
                )}
              </div>
            </td>
            <td className="py-2 px-3 text-foreground text-xs">
              <div className="flex flex-col space-y-0.5">
                {mechanic ? (
                  mechanic.nickname ? (
                    <>
                      <span className="font-bold text-foreground text-xs uppercase tracking-wide">
                        {mechanic.nickname.toUpperCase()}
                      </span>
                      <span className="text-xs text-muted-foreground font-semibold uppercase">
                        {mechanic.name}
                      </span>
                    </>
                  ) : (
                    <span className="font-extrabold uppercase tracking-wide">{mechanic.name}</span>
                  )
                ) : null}
              </div>
            </td>
            <td className="py-2 px-3 font-bold text-foreground text-sm uppercase">
              {motorText}
            </td>
            <td className="py-2 px-3 text-sm whitespace-nowrap">{daysAgoLabel(order.arrivalDate || order.createdAt)?.label || '—'}</td>
            <td className="py-2 px-3"><ServiceStatusBadge status={order.serviceStatus} /></td>
            <td className="py-2 px-3">
              {(() => {
                const group = getGroupedPaymentForOrder(order.id);
                const p = getOrderPaymentSummary(order, group);
                return (
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <PaymentBadge situation={p.situation} grouped={!!group} />
                    {p.situation !== 'pago' && <span className="text-xs font-semibold text-danger">falta {formatBRL(p.balance)}</span>}
                  </div>
                );
              })()}
            </td>
          </tr>
        );
      });
    } catch (error) {
      console.error('Error rendering Visão Ampla:', error);
      return (
        <tr>
          <td colSpan={7} className="py-12 text-center text-danger font-medium text-xs">
            Erro ao carregar a listagem operacional.
          </td>
        </tr>
      );
    }
  };

  const {
    filters, setFilters, clearFilters,
    sort, setSort,
    page, setPage, pageSize, setPageSize,
    filteredOrders,
    totalFilteredCount, totalCount,
    allMotors, allDisplacements,
    allPaymentMethods, allPaymentStatuses, allServiceStatuses,
    allServiceTypes,
    clientOptions,
    allPartsLeft,
  } = useOrderFilters({
    storageKey: 'dashboard',
    orders: activeOrders,
    clients,
  });

  const [localSearch, setLocalSearch] = useState(filters.search);

  React.useEffect(() => {
    setLocalSearch(filters.search);
  }, [filters.search]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== filters.search) {
        setFilters({ ...filters, search: localSearch });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, filters.search, setFilters]);

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [quickOsOpen, setQuickOsOpen] = useState(false);

  const handleOpenViewModal = (order: Order) => {
    setSelectedOrder(order);
    setIsViewModalOpen(true);
  };

  const [statusChangeData, setStatusChangeData] = useState<{ orderId: number; newStatus: ServiceStatus } | null>(null);
  const [newStatusObservation, setNewStatusObservation] = useState('');
  const [statusChangeDeliveryDate, setStatusChangeDeliveryDate] = useState('');

  const handleStatusChange = async (orderId: number, newVal: string | null) => {
    if (!newVal) return;
    const mainEl = document.querySelector('main') || document.querySelector('.dashboard-content');
    const prevScroll = mainEl ? mainEl.scrollTop : 0;
    const prevWindowScroll = typeof window !== 'undefined' ? window.scrollY : 0;

    if (mainEl) {
      mainEl.style.overflowY = 'hidden';
    }

    try {
      if (newVal === 'Finalizado / Entregue') {
        await updateOrder(orderId, {
          finished: true,
          finishedAt: new Date().toISOString()
        });
        toast.success(`O.S. #${orderId} finalizada com sucesso!`);

        const restore = () => {
          if (mainEl) mainEl.scrollTop = prevScroll;
          if (typeof window !== 'undefined') window.scrollTo(0, prevWindowScroll);
        };
        setTimeout(restore, 50);
        setTimeout(restore, 150);
        setTimeout(() => {
          restore();
          if (mainEl) mainEl.style.overflowY = '';
        }, 300);
      } else if (newVal === 'Pronto') {
        await updateOrder(orderId, {
          serviceStatus: 'Pronto',
          finished: false
        });
        toast.success(`Status da O.S. #${orderId} alterado para Pronto.`);

        const restore = () => {
          if (mainEl) mainEl.scrollTop = prevScroll;
          if (typeof window !== 'undefined') window.scrollTo(0, prevWindowScroll);
        };
        setTimeout(restore, 50);
        setTimeout(restore, 150);
        setTimeout(() => {
          restore();
          if (mainEl) mainEl.style.overflowY = '';
        }, 300);
      } else {
        const targetOrder = orders.find(o => o.id === orderId);
        setStatusChangeData({ orderId, newStatus: newVal as ServiceStatus });
        setNewStatusObservation(targetOrder?.statusObservation || '');
        if (newVal === 'Levou') {
          setStatusChangeDeliveryDate(targetOrder?.deliveryDate || new Date().toISOString().split('T')[0]);
        }
        if (mainEl) mainEl.style.overflowY = '';
      }
    } catch (err) {
      toast.error('Erro ao atualizar status.');
      if (mainEl) mainEl.style.overflowY = '';
    }
  };

  const confirmStatusChange = async () => {
    if (!statusChangeData) return;
    const mainEl = document.querySelector('main') || document.querySelector('.dashboard-content');
    const prevScroll = mainEl ? mainEl.scrollTop : 0;
    const prevWindowScroll = typeof window !== 'undefined' ? window.scrollY : 0;

    if (mainEl) {
      mainEl.style.overflowY = 'hidden';
    }

    try {
      const isLevou = statusChangeData.newStatus === 'Levou';
      await updateOrder(statusChangeData.orderId, {
        serviceStatus: statusChangeData.newStatus,
        statusObservation: newStatusObservation.trim(),
        finished: false,
        ...(isLevou ? { deliveryDate: statusChangeDeliveryDate } : {})
      });
      toast.success(`Status da O.S. #${statusChangeData.orderId} alterado para ${statusChangeData.newStatus}.`);
      setStatusChangeData(null);
      if (typeof document !== 'undefined' && document.activeElement) {
        (document.activeElement as HTMLElement).blur();
      }
      
      const restore = () => {
        if (mainEl) mainEl.scrollTop = prevScroll;
        if (typeof window !== 'undefined') window.scrollTo(0, prevWindowScroll);
      };
      setTimeout(restore, 50);
      setTimeout(restore, 150);
      setTimeout(() => {
        restore();
        if (mainEl) mainEl.style.overflowY = '';
      }, 300);
    } catch (err) {
      toast.error('Erro ao atualizar status.');
      if (mainEl) mainEl.style.overflowY = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* ═══ HEADER BAR ═══ */}
      <div className="flex items-center justify-between gap-4 p-4 -mx-8 -mt-8 bg-card border-b border-border transition-colors duration-200">
        {/* Search Input */}
        <div className="relative w-96 max-w-full">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground/60 stroke-[1.5]" />
          <input
            type="text"
            placeholder="Buscar O.S., cliente, mecânico ou motor"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full pl-9 pr-9 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-secondary-foreground transition-all"
          />
          {localSearch && (
            <button
              onClick={() => {
                setLocalSearch('');
                setFilters({ ...filters, search: '' });
              }}
              className="absolute right-3 top-2.5 hover:text-foreground text-muted-foreground/60 transition-colors flex items-center justify-center h-4 w-4 rounded-full"
            >
              <X className="w-3.5 h-3.5 stroke-[2]" />
            </button>
          )}
        </div>

        {/* Actions & Profile */}
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setQuickOsOpen(true)}
            className="solid-btn h-9 px-4 rounded-lg font-bold text-sm gap-1.5"
          >
            <Plus className="w-4 h-4 stroke-[2]" /> Nova O.S.
          </Button>

        </div>
      </div>

      {/* ═══ SUB TABS ═══ */}
      <div className="flex gap-2 border-b border-border/60 pb-px -mt-2">
        <button
          onClick={() => setActiveTab('gerenciamento')}
          className={cn(
            "px-4 py-2 text-sm font-bold border-b-2 transition-all cursor-pointer",
            activeTab === 'gerenciamento'
              ? "border-primary text-foreground font-bold"
              : "border-transparent text-muted-foreground/60 hover:text-foreground font-bold"
          )}
        >
          Lista detalhada
        </button>
        <button
          onClick={() => setActiveTab('visao-ampla')}
          className={cn(
            "px-4 py-2 text-sm font-bold border-b-2 transition-all cursor-pointer",
            activeTab === 'visao-ampla'
              ? "border-primary text-foreground font-bold"
              : "border-transparent text-muted-foreground/60 hover:text-foreground font-bold"
          )}
        >
          Lista compacta
        </button>
      </div>

      {/* ═══ GERENCIAMENTO TAB CONTENT ═══ */}
      {activeTab === 'gerenciamento' && (
        <>
          {/* ═══ PAGE TITLE & SUBTITLE ═══ */}
          <div className="flex justify-between items-end gap-4 flex-wrap pt-2">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight text-foreground">O.S. em Andamento</h2>
              <p className="text-muted-foreground mt-0.5 text-sm">Ordens de serviço abertas na oficina.</p>
            </div>
          </div>

          {/* ═══ FILTER BAR ═══ */}
          {(
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
              showValues={false}
              showSearch={false}
              showStatusInBar={true}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
            />
          )}

          {/* ═══ TABLE ═══ */}
          <div className="w-full space-y-3">
            {/* Table Header (Grid matching row cols) */}
            <div className="hidden md:grid grid-cols-[72px_minmax(0,1.5fr)_minmax(0,1fr)_172px_124px_32px] xl:grid-cols-[88px_minmax(0,1.6fr)_minmax(0,1.3fr)_104px_176px_150px_40px] gap-x-3 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <div>Nº O.S.</div>
              <div>Cliente</div>
              <div>Motor</div>
              <div className="hidden xl:block">Chegada</div>
              <div>Status</div>
              <div>Pagamento</div>
              <div></div>
            </div>

            {/* Table Body (List of card rows) */}
            <div className="space-y-1.5">
              {filteredOrders.length === 0 ? (
                <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground/60 font-medium text-xs">
                  Nenhuma ordem de serviço ativa encontrada.
                </div>
              ) : (
                filteredOrders.map((order) => (
                  <DashboardOrderRow
                    key={order.id}
                    order={order}
                    client={clients.find((c) => c.id === order.clientId)}
                    mechanic={clients.find((c) => c.id === order.mechanicId)}
                    groupedPayment={getGroupedPaymentForOrder(order.id)}
                    onEdit={onEdit}
                    onView={handleOpenViewModal}
                    onStatusChange={handleStatusChange}
                    onFinish={handleOpenViewModal}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </div>
          </div>

          {/* ═══ PAGINATION ═══ */}
          <Pagination
            currentPage={page}
            totalPages={Math.ceil(totalFilteredCount / pageSize)}
            pageSize={pageSize}
            totalItems={totalFilteredCount}
            onPageChange={setPage}
          />
        </>
      )}

      {/* ═══ VISÃO AMPLA TAB CONTENT ═══ */}
      {activeTab === 'visao-ampla' && (
        <div className="space-y-6">
          {/* ═══ PAGE TITLE & SUBTITLE ═══ */}
          <div className="pt-2">
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground">O.S. em Andamento</h2>
            <p className="text-muted-foreground mt-0.5 text-sm">Ordens de serviço abertas na oficina, uma por linha.</p>
          </div>

          {/* ═══ SEARCH BAR ═══ */}
          <div className="relative w-full max-w-2xl">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-muted-foreground/60 stroke-[1.5]" />
            <input
              type="text"
              placeholder="Buscar O.S., cliente, mecânico ou motor"
              value={visaoAmplaSearch}
              onChange={(e) => setVisaoAmplaSearch(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-secondary-foreground transition-all"
            />
            {visaoAmplaSearch && (
              <button
                onClick={() => setVisaoAmplaSearch('')}
                className="absolute right-3.5 top-3 hover:text-foreground text-muted-foreground/60 transition-colors flex items-center justify-center h-4 w-4 rounded-full"
              >
                <X className="w-3.5 h-3.5 stroke-[2]" />
              </button>
            )}
          </div>

          {/* ═══ TABLE ═══ */}
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/40 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 px-3">Nº O.S.</th>
                  <th className="py-2 px-3">Cliente</th>
                  <th className="py-2 px-3">Mecânico</th>
                  <th className="py-2 px-3">Motor</th>
                  <th className="py-2 px-3">Chegada</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Pagamento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {renderVisaoAmplaTable()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ MODAL O.S. (View Mode) ═══ */}
      {isViewModalOpen && (
        <OSViewModal
          isOpen={isViewModalOpen}
          order={selectedOrder}
          onClose={() => setIsViewModalOpen(false)}
          onEdit={(order) => {
            setIsViewModalOpen(false);
            onEdit?.(order);
          }}
          onDelete={(id) => {
            handleDelete(id);
          }}
        />
      )}

      {/* ── Nova O.S. Rápida (Form Panel) ── */}
      <div
        className={cn(
          "fixed inset-y-0 right-0 w-[95vw] max-w-[850px] bg-background border-l border-border shadow-xl z-[100] transform transition-transform duration-300 ease-out flex flex-col",
          quickOsOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b shrink-0 bg-card">
          <h2 className="text-md font-extrabold flex items-center gap-2">
            <Plus className="w-4 h-4 text-foreground stroke-[2]" /> Nova O.S. Rápida
          </h2>
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-secondary w-7 h-7" onClick={() => setQuickOsOpen(false)}>
            <X className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 bg-background">
          {quickOsOpen && (
            <OSForm onComplete={() => setQuickOsOpen(false)} />
          )}
        </div>
      </div>

      {/* Backdrop */}
      {quickOsOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-[90] transition-opacity duration-200"
          onClick={() => setQuickOsOpen(false)}
        />
      )}

      {statusChangeData && (
        <Dialog open={!!statusChangeData} onOpenChange={(open) => { if (!open) setStatusChangeData(null); }}>
          <DialogContent className="w-[min(450px,calc(100vw-32px))] p-6 border border-border/50 dark:border-border bg-card rounded-xl shadow-2xl z-[9999] flex flex-col gap-4" finalFocus={false}>
            <DialogHeader>
              <DialogTitle className="text-sm font-bold text-foreground uppercase tracking-wider">
                Alterar Status da O.S. #{statusChangeData.orderId}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-bold text-muted-foreground uppercase">Novo Status:</span>
                <ServiceStatusBadge status={statusChangeData.newStatus} />
              </div>

              {statusChangeData.newStatus === 'Levou' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-danger uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Data em que o cliente levou
                  </label>
                  <DatePicker
                    value={statusChangeDeliveryDate}
                    onChange={(dateStr) => setStatusChangeDeliveryDate(dateStr)}
                    className="w-full h-10 rounded-lg border-danger/30 dark:border-danger/40 bg-danger/50 dark:bg-danger/20 text-danger"
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Observação do Status <span className="text-xs text-muted-foreground/40 normal-case tracking-normal">(Opcional)</span>
                </label>
                <Input
                  placeholder="Ex: Aguardando pistões 0.50"
                  maxLength={80}
                  value={newStatusObservation}
                  onChange={(e) => setNewStatusObservation(e.target.value)}
                  className="w-full h-10 rounded-lg border border-border bg-background px-3 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="flex items-center justify-end gap-2 mt-2">
              <Button
                variant="outline"
                onClick={() => setStatusChangeData(null)}
                className="h-9 px-4 rounded-lg font-bold text-xs uppercase tracking-wider"
              >
                Cancelar
              </Button>
              <Button
                onClick={confirmStatusChange}
                className="h-9 px-4 rounded-lg bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider"
              >
                Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
