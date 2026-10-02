'use client';

import React, { useMemo, useState } from 'react';
import { useStore, Order, ServiceStatus } from '@/lib/store';
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
  Bell,
  ChevronDown,
  SlidersHorizontal,
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
  onEdit,
  onView,
  onStatusChange,
  onFinish,
  onDelete
}: DashboardOrderRowProps) => {
  const getStatusColorBarClass = (status: ServiceStatus) => {
    switch (status) {
      case 'Na Fila': return 'bg-zinc-400 dark:bg-[#3f3f46]';
      case 'Em Andamento': return 'bg-blue-500 dark:bg-blue-600';
      case 'Aguardando Peça': return 'bg-amber-500 dark:bg-amber-600';
      case 'Pronto': return 'bg-[#34c759] dark:bg-[#16a34a]';
      case 'Levou': return 'bg-red-500 dark:bg-red-600';
      default: return 'bg-zinc-400';
    }
  };

  const getStatusBadge = (status: ServiceStatus, deliveryDate?: string) => {
    const baseClass = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border border-transparent shadow-xs";
    switch (status) {
      case 'Na Fila': return (
        <span className={cn(baseClass, "bg-[#f4f4f5] dark:bg-[#27272a]/60 text-[#71717a] dark:text-[#a1a1aa] border-[#e4e4e7]/60 dark:border-[#3f3f46]/30")}>
          <span className="w-1.5 h-1.5 rounded-full bg-[#71717a] dark:bg-[#a1a1aa] shrink-0" />
          NA FILA
        </span>
      );
      case 'Em Andamento': return (
        <span className={cn(baseClass, "bg-[#e0f2fe] dark:bg-[#0ea5e9]/10 text-[#0369a1] dark:text-[#38bdf8] border-[#bae6fd]/60 dark:border-[#0ea5e9]/20")}>
          <span className="w-1.5 h-1.5 rounded-full bg-[#0369a1] dark:bg-[#38bdf8] shrink-0" />
          EM ANDAMENTO
        </span>
      );
      case 'Aguardando Peça': return (
        <span className={cn(baseClass, "bg-[#fef9c3] dark:bg-[#eab308]/10 text-[#a16207] dark:text-[#facc15] border-[#fef08a]/60 dark:border-[#eab308]/20")}>
          <span className="w-1.5 h-1.5 rounded-full bg-[#a16207] dark:bg-[#facc15] shrink-0" />
          AGUARDANDO PEÇA
        </span>
      );
      case 'Pronto': return (
        <span className={cn(baseClass, "bg-[#dcfce7] dark:bg-[#22c55e]/10 text-[#15803d] dark:text-[#4ade80] border-[#bbf7d0]/60 dark:border-[#22c55e]/20")}>
          <span className="w-1.5 h-1.5 rounded-full bg-[#15803d] dark:bg-[#4ade80] shrink-0" />
          PRONTO
        </span>
      );
      case 'Levou': return (
        <div className="flex flex-col items-center gap-0.5">
          <span className={cn(baseClass, "bg-[#fee2e2] dark:bg-[#ef4444]/10 text-[#b91c1c] dark:text-[#f87171] border-[#fecaca]/60 dark:border-[#ef4444]/20")}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#b91c1c] dark:bg-[#f87171] shrink-0" />
            LEVOU
          </span>
          {deliveryDate && (
            <span className="text-[9px] font-mono font-bold text-red-600 dark:text-red-400/80">
              {deliveryDate.split('-').reverse().join('/')}
            </span>
          )}
        </div>
      );
    }
  };

  const getPaymentBadge = (status: string) => {
    const baseClass = "inline-flex items-center justify-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border border-transparent shadow-xs min-w-[90px]";
    switch (status) {
      case 'Não Pago': return (
        <span className={cn(baseClass, "bg-[#fef2f2] dark:bg-[#ef4444]/10 text-[#b91c1c] dark:text-[#ef4444] border-[#fecaca]/60 dark:border-[#ef4444]/20")}>
          PENDENTE
        </span>
      );
      case 'Entrada': return (
        <span className={cn(baseClass, "bg-[#fffbeb] dark:bg-[#f59e0b]/10 text-[#b45309] dark:text-[#f59e0b] border-[#fde68a]/60 dark:border-[#f59e0b]/20")}>
          ENTRADA
        </span>
      );
      case 'Pago': return (
        <span className={cn(baseClass, "bg-[#ecfdf5] dark:bg-[#10b981]/10 text-[#047857] dark:text-[#10b981] border-[#a7f3d0]/60 dark:border-[#10b981]/20")}>
          PAGO
        </span>
      );
      default: return (
        <span className={cn(baseClass, "bg-secondary text-secondary-foreground border-border")}>
          {status.toUpperCase()}
        </span>
      );
    }
  };

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
    return parsedMotors.map(pm => pm.model).join(', ');
  }, [parsedMotors]);

  return (
    <div
      id={`order-row-${order.id}`}
      onClick={() => onView(order)}
      className={cn(
        "relative group overflow-hidden rounded-xl border transition-all duration-200 cursor-pointer",
        "grid grid-cols-[130px_1.8fr_1.5fr_1.5fr_160px_140px_60px] gap-x-2 items-center p-4 pr-6 min-h-[76px]",
        // Dark mode styles
        "dark:bg-[#16161a] dark:border-[#27272a]/30 dark:hover:bg-[#1c1c21]",
        // Light mode styles
        "bg-white border-[#e4e4e7]/60 hover:bg-[#f4f4f5]/60 shadow-xs"
      )}
    >
      {/* Left colored bar */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-[6px] rounded-l-xl", getStatusColorBarClass(order.serviceStatus))} />
      
      {/* Nº O.S. */}
      <div className="pl-4 font-mono font-black text-xl text-[#2563eb] dark:text-white">
        #{order.osNumber || order.id}
      </div>

      {/* Cliente */}
      <div className="space-y-0.5 pr-2 ml-2 min-w-0" title={client?.nickname ? `${client.nickname} (${client.name || ''})` : client?.name}>
        {client?.nickname ? (
          <>
            <div className="font-black text-foreground text-xs uppercase tracking-wide truncate">
              {client.nickname.toUpperCase()}
            </div>
            <div className="text-[10px] text-muted-foreground font-semibold truncate uppercase">
              {client.name}
            </div>
          </>
        ) : (
          <div className="font-extrabold text-foreground text-xs uppercase tracking-wide truncate">
            {client?.name || 'Cliente Removido'}
          </div>
        )}
        {client?.phone && (
          <div className="text-[10px] text-muted-foreground font-bold">
            {client.phone}
          </div>
        )}
      </div>

      {/* Mecânico Responsável */}
      <div className="space-y-0.5 pr-2 ml-2 min-w-0" title={mechanic?.nickname ? `${mechanic.nickname} (${mechanic.name || ''})` : mechanic?.name}>
        {mechanic ? (
          mechanic.nickname ? (
            <>
              <div className="font-black text-foreground text-xs uppercase tracking-wide truncate">
                {mechanic.nickname.toUpperCase()}
              </div>
              <div className="text-[10px] text-muted-foreground font-semibold truncate uppercase">
                {mechanic.name}
              </div>
            </>
          ) : (
            <div className="font-extrabold text-foreground text-xs uppercase tracking-wide truncate">
              {mechanic.name}
            </div>
          )
        ) : null}
      </div>

      {/* Motor */}
      <div className="space-y-1 pr-2 min-w-0" title={motorTitle || 'Motor Não Especificado'}>
        {parsedMotors.length > 0 ? (
          parsedMotors.map((pm, idx) => (
            <div key={idx} className="flex items-center gap-1.5 flex-wrap">
              <span className="font-extrabold text-foreground text-xs uppercase tracking-wide truncate">
                {pm.model}
              </span>
              {pm.disp && (
                <span className="inline-flex items-center justify-center font-mono text-[9px] font-bold px-2 py-0.5 rounded bg-[#f3f4f6] dark:bg-[#27272a] text-muted-foreground border border-border/20 shrink-0">
                  {pm.disp}
                </span>
              )}
              {pm.cylinders && (
                <span className="inline-flex items-center justify-center font-bold text-[9px] px-2 py-0.5 rounded bg-[#f3f4f6] dark:bg-[#27272a] text-muted-foreground border border-border/20 uppercase tracking-wide shrink-0">
                  {pm.cylinders}
                </span>
              )}
            </div>
          ))
        ) : (
          <div className="font-extrabold text-foreground text-xs uppercase tracking-wide truncate">
            Motor Não Especificado
          </div>
        )}
      </div>

      {/* Status */}
      <div className="flex flex-col items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
        <Select
          value={order.finished ? 'Finalizado / Entregue' : order.serviceStatus}
          onValueChange={(val) => onStatusChange(order.id, val)}
        >
          <SelectTrigger className="border-none bg-transparent hover:bg-transparent shadow-none p-0 h-auto focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 w-auto flex justify-center cursor-pointer [&_svg]:hidden">
            {getStatusBadge(order.serviceStatus, order.deliveryDate)}
          </SelectTrigger>
          <SelectContent className="z-[9999] bg-white dark:bg-[#0A0A0C] border border-border/50 dark:border-white/[0.08] rounded-lg shadow-2xl min-w-[150px] w-auto p-1.5">
            <SelectItem value="Na Fila" className="rounded-md py-2 px-3 focus:bg-primary/5 dark:focus:bg-white/[0.06] cursor-pointer transition-colors duration-150 group">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary-foreground shrink-0" />
                <span className="font-bold text-[10px] uppercase tracking-[0.1em]">Na Fila</span>
              </div>
            </SelectItem>
            <SelectItem value="Em Andamento" className="rounded-md py-2 px-3 focus:bg-primary/5 dark:focus:bg-white/[0.06] cursor-pointer transition-colors duration-150 group">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0EA5E9] dark:bg-[#38BDF8] shrink-0" />
                <span className="font-bold text-[10px] uppercase tracking-[0.1em] text-[#0EA5E9] dark:text-[#38BDF8]">Em Andamento</span>
              </div>
            </SelectItem>
            <SelectItem value="Aguardando Peça" className="rounded-md py-2 px-3 focus:bg-primary/5 dark:focus:bg-white/[0.06] cursor-pointer transition-colors duration-150 group">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                <span className="font-bold text-[10px] uppercase tracking-[0.1em] text-amber-600 dark:text-amber-400">Aguardando Peça</span>
              </div>
            </SelectItem>
            <SelectItem value="Pronto" className="rounded-md py-2 px-3 focus:bg-primary/5 dark:focus:bg-white/[0.06] cursor-pointer transition-colors duration-150 group">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#34C759] shrink-0" />
                <span className="font-bold text-[10px] uppercase tracking-[0.1em] text-[#34C759]">Pronto</span>
              </div>
            </SelectItem>
            <SelectItem value="Levou" className="rounded-md py-2 px-3 focus:bg-red-500/10 focus:text-red-600 dark:focus:text-red-400 cursor-pointer transition-colors duration-150 group">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                <span className="font-bold text-[10px] uppercase tracking-[0.1em] text-red-600 dark:text-red-400">Levou</span>
              </div>
            </SelectItem>
            <SelectItem value="Finalizado / Entregue" className="rounded-md py-2 px-3 focus:bg-primary/5 dark:focus:bg-white/[0.06] cursor-pointer transition-colors duration-150 group">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary-foreground shrink-0" />
                <span className="font-bold text-[10px] uppercase tracking-[0.1em] text-foreground">Finalizado / Entregue</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        {order.statusObservation && (
          <span className="text-[10px] text-muted-foreground font-semibold text-center max-w-[140px] break-words">
            {order.statusObservation}
          </span>
        )}
      </div>

      {/* Pagamento */}
      <div className="flex justify-center">
        {getPaymentBadge(order.paymentStatus)}
      </div>

      {/* Ações */}
      <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" className="hover:bg-secondary/40 rounded-md w-7 h-7 transition-colors" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="min-w-[150px] bg-card border-border rounded-lg shadow-lg">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-[9px] uppercase tracking-wider text-muted-foreground/60 px-2.5 py-1.5">Ações</DropdownMenuLabel>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(order); }} className="hover:bg-secondary cursor-pointer rounded mx-1 text-xs">
                <Pencil className="w-3.5 h-3.5 mr-2 stroke-[1.5]" /> Editar O.S.
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(order); }} className="hover:bg-secondary cursor-pointer rounded mx-1 text-xs">
                <Eye className="w-3.5 h-3.5 mr-2 stroke-[1.5]" /> Visualizar
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                className="cursor-pointer font-bold rounded mx-1 text-xs text-[#34C759] hover:bg-[#34C759]/10"
                onClick={() => onFinish(order)}
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-2 stroke-[1.5]" /> Finalizar O.S.
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                className="text-[#FF5A5F] hover:bg-[#FF5A5F]/10 cursor-pointer font-bold rounded mx-1 text-xs"
                onClick={() => onDelete(order.id)}
              >
                <Trash2 className="w-3.5 h-3.5 mr-2 stroke-[1.5]" /> Excluir
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
            <td colSpan={4} className="py-12 text-center text-muted-foreground/60 font-medium text-xs">
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
            <td className="py-4 px-4 font-mono font-black text-sm text-[#2563eb] dark:text-blue-400">
              #{order.osNumber || order.id}
            </td>
            <td className="py-4 px-4 text-foreground text-xs">
              <div className="flex flex-col space-y-0.5">
                {client?.nickname ? (
                  <>
                    <span className="font-black text-foreground text-xs uppercase tracking-wide">
                      {client.nickname.toUpperCase()}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase">
                      {client.name}
                    </span>
                  </>
                ) : (
                  <span className="font-extrabold uppercase tracking-wide">{clientName}</span>
                )}
                {client?.phone && (
                  <span className="text-[10px] text-muted-foreground font-bold">
                    {client.phone}
                  </span>
                )}
              </div>
            </td>
            <td className="py-4 px-4 text-foreground text-xs">
              <div className="flex flex-col space-y-0.5">
                {mechanic ? (
                  mechanic.nickname ? (
                    <>
                      <span className="font-black text-foreground text-xs uppercase tracking-wide">
                        {mechanic.nickname.toUpperCase()}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase">
                        {mechanic.name}
                      </span>
                    </>
                  ) : (
                    <span className="font-extrabold uppercase tracking-wide">{mechanic.name}</span>
                  )
                ) : null}
              </div>
            </td>
            <td className="py-4 px-4 font-extrabold text-foreground text-xs uppercase tracking-wide">
              {motorText}
            </td>
          </tr>
        );
      });
    } catch (error) {
      console.error('Error rendering Visão Ampla:', error);
      return (
        <tr>
          <td colSpan={4} className="py-12 text-center text-red-500 font-medium text-xs">
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
  const [isFilterBarOpen, setIsFilterBarOpen] = useState(false);

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

  const getStatusBadge = (status: ServiceStatus, deliveryDate?: string) => {
    switch (status) {
      case 'Na Fila': return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black bg-secondary text-secondary-foreground border border-border">
          <span className="w-1.5 h-1.5 rounded-full bg-secondary-foreground shrink-0" />
          NA FILA
        </span>
      );
      case 'Em Andamento': return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black bg-[#0EA5E9]/10 dark:bg-[#38BDF8]/10 text-[#0EA5E9] dark:text-[#38BDF8] border border-[#0EA5E9]/20 dark:border-[#38BDF8]/20">
          <span className="w-1.5 h-1.5 rounded-full bg-[#0EA5E9] dark:bg-[#38BDF8] shrink-0" />
          EM ANDAMENTO
        </span>
      );
      case 'Aguardando Peça': return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
          AGUARDANDO PEÇA
        </span>
      );
      case 'Pronto': return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black bg-[#34C759]/10 text-green-700 dark:text-[#34C759] border border-[#34C759]/20">
          <span className="w-1.5 h-1.5 rounded-full bg-[#34C759] shrink-0" />
          PRONTO
        </span>
      );
      case 'Levou': return (
        <div className="flex flex-col items-center gap-0.5">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
            LEVOU
          </span>
          {deliveryDate && (
            <span className="text-[9px] font-mono font-bold text-red-600 dark:text-red-400/80">
              {deliveryDate.split('-').reverse().join('/')}
            </span>
          )}
        </div>
      );
    }
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case 'Não Pago': return (
        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[10px] font-black bg-[#FF5A5F]/10 text-red-600 dark:text-[#FF5A5F] border border-[#FF5A5F]/20">
          PENDENTE
        </span>
      );
      case 'Entrada': return (
        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
          ENTRADA
        </span>
      );
      case 'Pago': return (
        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[10px] font-black bg-[#34C759]/10 text-green-700 dark:text-[#34C759] border border-[#34C759]/20">
          PAGO
        </span>
      );
      default: return (
        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[10px] font-black bg-secondary text-secondary-foreground border border-border">
          {status.toUpperCase()}
        </span>
      );
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
            placeholder="Pesquisar por O.S., Cliente ou Motor..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full pl-9 pr-9 py-2 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-secondary-foreground transition-all"
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
            className="solid-btn h-9 px-4 rounded-lg font-bold text-xs gap-1.5 uppercase tracking-wider"
          >
            <Plus className="w-4 h-4 stroke-[2]" /> Nova O.S. Rápida
          </Button>

          <button className="w-9 h-9 flex items-center justify-center rounded-lg border border-border hover:bg-secondary/40 transition-colors">
            <Bell className="w-4 h-4 text-muted-foreground stroke-[1.5]" />
          </button>

          {/* Profile */}
          <div className="flex items-center gap-2 pl-2 border-l border-border">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-border bg-secondary flex items-center justify-center">
              <span className="text-xs font-bold text-foreground">RM</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground stroke-[1.5]" />
          </div>
        </div>
      </div>

      {/* ═══ SUB TABS ═══ */}
      <div className="flex gap-2 border-b border-border/60 pb-px -mt-2">
        <button
          onClick={() => setActiveTab('gerenciamento')}
          className={cn(
            "px-4 py-2 text-xs font-black uppercase tracking-widest border-b-2 transition-all cursor-pointer",
            activeTab === 'gerenciamento'
              ? "border-primary text-foreground font-black"
              : "border-transparent text-muted-foreground/60 hover:text-foreground font-bold"
          )}
        >
          Gerenciamento
        </button>
        <button
          onClick={() => setActiveTab('visao-ampla')}
          className={cn(
            "px-4 py-2 text-xs font-black uppercase tracking-widest border-b-2 transition-all cursor-pointer",
            activeTab === 'visao-ampla'
              ? "border-primary text-foreground font-black"
              : "border-transparent text-muted-foreground/60 hover:text-foreground font-bold"
          )}
        >
          Visão Ampla
        </button>
      </div>

      {/* ═══ GERENCIAMENTO TAB CONTENT ═══ */}
      {activeTab === 'gerenciamento' && (
        <>
          {/* ═══ PAGE TITLE & SUBTITLE ═══ */}
          <div className="flex justify-between items-end gap-4 flex-wrap pt-2">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight text-foreground">O.S. em Andamento</h2>
              <p className="text-muted-foreground mt-0.5 text-xs font-medium">Gerencie as ordens de serviço ativas na oficina.</p>
            </div>

            {/* Filter Trigger & Counter */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                onClick={() => setIsFilterBarOpen(!isFilterBarOpen)}
                className={cn(
                  "h-9 px-4 gap-2 font-bold uppercase tracking-wider text-[10px] rounded-lg transition-all border-border",
                  isFilterBarOpen && "bg-secondary text-foreground"
                )}
              >
                <SlidersHorizontal className="w-3.5 h-3.5 stroke-[1.5]" />
                Filtros Avançados
              </Button>

              <div className="h-9 px-3.5 flex items-center justify-center bg-card border border-border rounded-lg text-xs font-mono font-bold text-foreground transition-colors duration-200">
                {totalFilteredCount} / {totalCount}
              </div>
            </div>
          </div>

          {/* ═══ FILTER BAR (Collapsible) ═══ */}
          {isFilterBarOpen && (
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
            />
          )}

          {/* ═══ TABLE ═══ */}
          <div className="w-full space-y-3">
            {/* Table Header (Grid matching row cols) */}
            <div className="hidden md:grid grid-cols-[130px_1.8fr_1.5fr_1.5fr_160px_140px_60px] gap-x-2 px-6 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
              <div className="pl-4">Nº O.S.</div>
              <div>Cliente</div>
              <div>Mec. Responsável</div>
              <div>Motor</div>
              <div className="text-center">Status</div>
              <div className="text-center">Pagamento</div>
              <div className="text-right"></div>
            </div>

            {/* Table Body (List of card rows) */}
            <div className="space-y-3">
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
            onPageSizeChange={setPageSize}
          />
        </>
      )}

      {/* ═══ VISÃO AMPLA TAB CONTENT ═══ */}
      {activeTab === 'visao-ampla' && (
        <div className="space-y-6">
          {/* ═══ PAGE TITLE & SUBTITLE ═══ */}
          <div className="pt-2">
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground uppercase">O.S. EM ANDAMENTO</h2>
            <p className="text-muted-foreground mt-0.5 text-xs font-medium">Gerencie as ordens de serviço ativas na oficina.</p>
          </div>

          {/* ═══ SEARCH BAR ═══ */}
          <div className="relative w-full max-w-2xl">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-muted-foreground/60 stroke-[1.5]" />
            <input
              type="text"
              placeholder="PESQUISAR POR O.S., CLIENTE OU MOTOR"
              value={visaoAmplaSearch}
              onChange={(e) => setVisaoAmplaSearch(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-secondary-foreground transition-all uppercase tracking-wider"
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
                <tr className="border-b border-border/40 text-[10px] font-black uppercase tracking-wider text-muted-foreground/60">
                  <th className="py-3 px-4 w-[12%]">Nº O.S.</th>
                  <th className="py-3 px-4 w-[33%]">Cliente</th>
                  <th className="py-3 px-4 w-[25%]">Mec. Responsável</th>
                  <th className="py-3 px-4 w-[30%] font-bold">Motor</th>
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
          <DialogContent className="w-[min(450px,calc(100vw-32px))] p-6 border border-border/50 dark:border-white/[0.08] bg-card rounded-2xl shadow-2xl z-[9999] flex flex-col gap-4" finalFocus={false}>
            <DialogHeader>
              <DialogTitle className="text-sm font-black text-foreground uppercase tracking-wider">
                Alterar Status da O.S. #{statusChangeData.orderId}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-bold text-muted-foreground uppercase">Novo Status:</span>
                {getStatusBadge(statusChangeData.newStatus)}
              </div>

              {statusChangeData.newStatus === 'Levou' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Data em que o cliente levou
                  </label>
                  <DatePicker
                    value={statusChangeDeliveryDate}
                    onChange={(dateStr) => setStatusChangeDeliveryDate(dateStr)}
                    className="w-full h-10 rounded-lg border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20 text-red-900 dark:text-red-200"
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Observação do Status <span className="text-[8px] text-muted-foreground/40 normal-case tracking-normal">(Opcional)</span>
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
