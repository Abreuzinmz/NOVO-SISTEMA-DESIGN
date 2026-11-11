'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { OSPrintReport } from './os-print-report';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Order, useStore, ServiceStatus, PaymentStatus, PaymentMethod, ServiceItem } from '@/lib/store';
import {
  Clock,
  Phone,
  Printer,
  Pencil,
  Trash2,
  CheckCircle2,
  FileText,
  Wrench,
  Calendar,
  X,
  Edit,
  MapPin,
  Plus,
  Check,
  Mail,
  Globe,
  Layers,
  PlusCircle,
  AlertTriangle,
  Unlink,
  CreditCard,
  DollarSign,
} from 'lucide-react';
import { cn, formatMotorDisplay, formatMotorModelAndCylinders, getLocalDateString, getOrderNetValue } from '@/lib/utils';
import { PrintPreviewModal } from './print-preview-modal';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { PaymentEntryModal, PaymentEntryItem, PixIcon, DinheiroIcon, DebitoIcon, CreditoIcon, normalizeMethodValue } from './resumo-financeiro';
import { ChevronRight, Ban, RotateCcw } from 'lucide-react';

const CANCEL_REASONS = ['Cliente desistiu', 'Orçamento não aprovado', 'Motor sem conserto', 'Outro'];
import { isPartItem } from '@/lib/service-catalog';
import { ClientProfilePanel } from './client-profile-panel';

/** Forma de pagamento: ícone e texto curto ("Crédito" à vista, "Crédito 3x" parcelado) */
function paymentMethodInfo(method?: string) {
  const { methodKey, methodLabel, installments } = normalizeMethodValue(method);
  const icon = methodKey === 'pix' ? <PixIcon size={20} className="text-success" />
    : methodKey === 'dinheiro' ? <DinheiroIcon size={22} />
    : methodKey === 'debito' ? <DebitoIcon size={24} />
    : <CreditoIcon size={24} />;
  const label = methodKey === 'credito' && installments && installments !== 'À vista' ? `${methodLabel} ${installments}` : methodLabel;
  const full = methodKey === 'credito' ? `${methodLabel} ${installments || 'À vista'}` : methodLabel;
  return { icon, label, full };
}

const formatEntryDate = (d?: string) => (d ? new Date(String(d).slice(0, 10) + 'T12:00:00').toLocaleDateString('pt-BR') : '');

/** Linha do histórico de pagamentos: nº da entrada, ícone da forma, valor, data e, embaixo, o pagador */
function PaymentHistoryRow({ entry, onOpen, number }: { entry: any; onOpen: () => void; number?: number }) {
  const amount = parseFloat(entry.amount) || 0;
  const { icon, label } = paymentMethodInfo(entry.method);
  const payer = entry.payer && String(entry.payer).trim();
  return (
    <button
      type="button"
      onClick={onOpen}
      title="Ver lançamento"
      className="w-full text-left flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-50 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/15 pl-2 pr-1.5 py-2 transition-colors cursor-pointer"
    >
      {number !== undefined && (
        <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-[11px] font-extrabold flex items-center justify-center shrink-0 tabular-nums">{number}</span>
      )}
      <span className="w-9 h-9 rounded-lg bg-white dark:bg-white/10 border border-emerald-100 dark:border-emerald-500/20 flex items-center justify-center shrink-0">{icon}</span>
      <span className="flex-1 min-w-0">
        {number !== undefined && (
          <span className={cn(
            "inline-block mb-0.5 text-[9.5px] font-extrabold uppercase tracking-wider rounded px-1.5 py-px",
            number === 1 ? "bg-emerald-600 text-white" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
          )}>
            {number}ª entrada{number === 1 ? ' · primeira' : ''}
          </span>
        )}
        <span className="flex items-baseline gap-1.5 min-w-0">
          <span className="text-sm font-extrabold text-foreground tabular-nums whitespace-nowrap">{amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
          <span className="text-[11px] font-semibold uppercase text-muted-foreground whitespace-nowrap truncate">{label}</span>
        </span>
        {entry.date && <span className="block text-[11px] text-muted-foreground">{formatEntryDate(entry.date)}</span>}
        {payer && <span className="block text-[11px] font-semibold uppercase text-foreground/75 truncate" title={payer}>{payer}</span>}
      </span>
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
    </button>
  );
}
import { getPartImage } from '@/lib/part-images';
import { detectBrandFromName, getBrandLogoSrc } from '@/lib/motor-brands';
import { Package, Settings as SettingsIcon, Gauge } from 'lucide-react';

// ── Blocos visuais do modo de visualização ──

/** Cabeçalho de cada cartão: ícone, título e contador */
function ViewCardHeader({ icon: Icon, title, count, right }: { icon: React.ElementType; title: string; count?: number; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 mb-2.5">
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4" />
        </span>
        <span className="text-xs font-extrabold uppercase tracking-wide text-foreground truncate">{title}</span>
      </div>
      {right ?? (count !== undefined && (
        <span className="h-5 px-2 rounded-md bg-muted text-[11px] font-semibold text-muted-foreground flex items-center tabular-nums shrink-0">
          {count} {count === 1 ? 'item' : 'itens'}
        </span>
      ))}
    </div>
  );
}

/** Peças em quadrinhos: foto, nome embaixo e quantidade no canto superior direito */
// classes completas (o Tailwind precisa encontrá-las escritas no código)
// Linhas que o cartão de pagamento ocupa na grade da visualização
const PAYMENT_ROW_SPAN: Record<number, string> = { 1: 'md:row-span-1', 2: 'md:row-span-2', 3: 'md:row-span-3' };
const TILE_COLS: Record<number, string> = { 1: 'sm:grid-cols-1', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-4', 5: 'sm:grid-cols-5' };

/**
 * Até 4 itens: 4 colunas; com 5 ou mais: 5 colunas (todos do mesmo tamanho). row = lado a lado com a outra seção: todos numa linha.
 * fill = uma linha só ao lado do motor: os quadrinhos (e as fotos) crescem até a altura do cartão do motor.
 */
function PartTiles({ parts, row, fill }: { parts: string[]; row?: boolean; fill?: boolean }) {
  const cols = row ? parts.length : fill ? Math.min(Math.max(parts.length, 3), 5) : parts.length >= 5 ? 5 : 4;
  return (
    <div className={cn("grid gap-2 grid-cols-2", TILE_COLS[cols], fill && "flex-1 auto-rows-fr")}>
      {parts.map((p, i) => {
        const [name, qtyStr] = p.includes('|') ? p.split('|') : [p, '1'];
        const qty = parseInt(qtyStr) || 1;
        const img = getPartImage(name);
        return (
          <div key={i} className="relative rounded-xl border border-border bg-card flex flex-col items-center justify-center gap-1 px-2 pt-2 pb-1.5 min-w-0">
            <span className="absolute top-1.5 right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-muted text-[11px] font-bold text-foreground flex items-center justify-center tabular-nums">{qty}</span>
            <div className={cn("w-full flex items-center justify-center", fill ? "flex-1 basis-0 min-h-14 max-h-24 px-4" : "h-11 px-5")}>
              {img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={img} alt="" draggable={false} className="max-w-full max-h-full object-contain" />
              ) : (
                <Package className={cn("text-muted-foreground/40", fill ? "w-10 h-10" : "w-8 h-8")} />
              )}
            </div>
            <span className={cn("w-full text-center font-bold uppercase leading-tight text-foreground line-clamp-2 break-words", cols === 5 ? "text-[11px] tracking-tight" : fill ? "text-[13px]" : "text-xs")} title={name}>{name}</span>
          </div>
        );
      })}
    </div>
  );
}


const getStatusBorderColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'na fila':
      return '#9ca3af';
    case 'em andamento':
      return '#3b82f6';
    case 'aguardando peça':
    case 'aguardando peca':
      return '#f59e0b';
    case 'pronto':
      return '#22c55e';
    case 'levou':
      return '#ef4444';
    case 'concluído':
    case 'concluido':
      return '#16a34a';
    default:
      return '#3b82f6';
  }
};

interface OSViewModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (order: Order) => void;
  onDelete?: (id: number) => void;
  onFinish?: (order: Order) => void;
}

/**
 * Modal de visualização da O.S. Pelo perfil do cliente dá para abrir outra O.S. do histórico:
 * o modal passa a mostrar essa O.S. (até fechar ou receber outra O.S. de fora).
 */
export function OSViewModal(props: OSViewModalProps) {
  const { orders } = useStore();
  const [shownOrderId, setShownOrderId] = useState<number | null>(null);
  useEffect(() => { setShownOrderId(null); }, [props.order?.id, props.isOpen]);
  const shown = shownOrderId != null ? (orders.find(o => o.id === shownOrderId) || props.order) : props.order;
  return <OSViewModalContent key={shown?.id ?? 'none'} {...props} order={shown} onOpenOrder={(o) => setShownOrderId(o.id)} />;
}

function OSViewModalContent({
  order: orderProp,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onFinish,
  onOpenOrder
}: OSViewModalProps & { onOpenOrder?: (order: Order) => void }) {
  const {
    clients,
    updateOrder,
    deleteOrder,
    orders,
    groupedPayments,
    getGroupedPaymentForOrder,
    getPendingOrdersForClient,
    createGroupedPayment,
    addEntradaGroupedPayment,
    updateEntradaGroupedPayment,
    deleteEntradaGroupedPayment,
    dissolveGroupedPayment
  } = useStore();
  const confirmDialog = useConfirmDialog();
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  // Compact "Finalizar/Editar Pagamento" modal: null = closed, otherwise carries
  // which lançamento (if any) is being edited and the values to weigh it against.
  // Lançamento aberto em visualização (com Editar / Excluir)
  const [viewEntry, setViewEntry] = useState<{ entry: any; index: number } | null>(null);
  const [paymentEntryModal, setPaymentEntryModal] = useState<{
    mode: 'add' | 'edit';
    entry?: PaymentEntryItem;
    index?: number;
    totalValue: number;
    paidElsewhere: number;
    discount?: number;
    showDiscount?: boolean;
  } | null>(null);

  // Grouped Payments state
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [selectedOsForGrouping, setSelectedOsForGrouping] = useState<number[]>([]);
  const [isSubmittingGroup, setIsSubmittingGroup] = useState(false);
  const [entradaValor, setEntradaValor] = useState('');
  const [entradaFormaPagamento, setEntradaFormaPagamento] = useState('PIX');
  const [entradaNomePagador, setEntradaNomePagador] = useState('');
  const [entradaData, setEntradaData] = useState(getLocalDateString());
  const [entradaObservacao, setEntradaObservacao] = useState('');
  const [isSubmittingEntrada, setIsSubmittingEntrada] = useState(false);
  const [isDeleteGroupedConfirmOpen, setIsDeleteGroupedConfirmOpen] = useState(false);
  const [isDissolveModalOpen, setIsDissolveModalOpen] = useState(false);
  const [showAllEntradas, setShowAllEntradas] = useState(false);

  const order = useMemo(() => {
    if (!orderProp) return null;
    return orders.find(o => o.id === orderProp.id) || orderProp;
  }, [orders, orderProp]);

  const groupedPayment = useMemo(() => {
    if (!order) return undefined;
    return getGroupedPaymentForOrder(order.id);
  }, [order, getGroupedPaymentForOrder, groupedPayments]);

  const sortedGroupEntradas = useMemo(() => {
    if (!groupedPayment?.entradas) return [];
    return groupedPayment.entradas
      .map((e, idx) => ({ ...e, originalNum: idx + 1 }))
      .sort((a, b) => {
        const dateA = a.data ? new Date(a.data).getTime() : 0;
        const dateB = b.data ? new Date(b.data).getTime() : 0;
        if (dateB !== dateA) return dateB - dateA;
        return b.originalNum - a.originalNum;
      });
  }, [groupedPayment?.entradas]);

  const pendingClientOrders = useMemo(() => {
    if (!order || !order.clientId) return [];
    return getPendingOrdersForClient(order.clientId);
  }, [order, getPendingOrdersForClient]);

  function normalizePix(v: string): PaymentMethod | '' {
    return (v && v.toUpperCase() === 'PIX' ? 'PIX' : v) as PaymentMethod | '';
  }

  // ── Handlers for PaymentEntryModal (Individual O.S. Payment) ──
  const handleIndividualAddEntrada = async (data: PaymentEntryItem, discount?: number) => {
    if (!order) return;
    setIsSubmittingPayment(true);
    try {
      const currentEntries = getEntries();
      const updatedEntries = [...currentEntries, data];
      const totalPaid = updatedEntries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const finalDiscount = discount !== undefined ? discount : (order.discount || 0);
      const net = Math.max(0, order.totalValue - finalDiscount);
      const isPaid = totalPaid >= net && net > 0;

      await updateOrder(order.id, {
        paymentStatus: isPaid ? 'Pago' : 'Entrada',
        paymentMethod: data.method as any,
        paymentDate: data.date,
        pixPaidBy: data.payer || undefined,
        paymentEntries: updatedEntries,
        entryValue: totalPaid,
        discount: finalDiscount,
        netValue: net,
        balanceValue: Math.max(0, net - totalPaid),
      });
    } catch (e: any) {
      toast.error('Erro ao adicionar entrada: ' + (e?.message || e));
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleIndividualUpdateEntrada = async (id: string, data: PaymentEntryItem, discount?: number) => {
    if (!order) return;
    setIsSubmittingPayment(true);
    try {
      const currentEntries = getEntries();
      const updatedEntries = currentEntries.map(e => (e.id === id ? data : e));
      const totalPaid = updatedEntries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const finalDiscount = discount !== undefined ? discount : (order.discount || 0);
      const net = Math.max(0, order.totalValue - finalDiscount);
      const isPaid = totalPaid >= net && net > 0;

      await updateOrder(order.id, {
        paymentStatus: isPaid ? 'Pago' : 'Entrada',
        paymentMethod: data.method as any,
        paymentDate: data.date,
        pixPaidBy: data.payer || undefined,
        paymentEntries: updatedEntries,
        entryValue: totalPaid,
        discount: finalDiscount,
        netValue: net,
        balanceValue: Math.max(0, net - totalPaid),
      });
    } catch (e: any) {
      toast.error('Erro ao atualizar entrada: ' + (e?.message || e));
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleIndividualDeleteEntrada = async (id: string, index: number) => {
    if (!order) return;
    const ok = await confirmDialog.confirm({
      title: "Remover este lançamento?",
      description: "O valor pago será removido do histórico de pagamento desta O.S. Esta ação não pode ser desfeita.",
    });
    if (!ok) return;
    setIsSubmittingPayment(true);
    try {
      const currentEntries = getEntries();
      const updatedEntries = currentEntries.filter((e, i) => {
        if (index !== undefined && index >= 0) {
          return i !== index;
        }
        if (id && e.id) {
          return e.id !== id;
        }
        return true;
      });
      const totalPaid = updatedEntries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const net = order.netValue;
      const newStatus: PaymentStatus = totalPaid >= net && net > 0 ? 'Pago' : (totalPaid > 0 ? 'Entrada' : 'Não Pago');
      const lastEntry = updatedEntries[updatedEntries.length - 1];

      await updateOrder(order.id, {
        paymentStatus: newStatus,
        paymentMethod: (lastEntry?.method as any) || (newStatus === 'Não Pago' ? '' : undefined),
        paymentDate: lastEntry?.date || (newStatus === 'Não Pago' ? '' : undefined),
        pixPaidBy: lastEntry?.payer || (newStatus === 'Não Pago' ? '' : undefined),
        secondPaymentMethod: '' as any,
        secondPaymentDate: '',
        secondPixPaidBy: '',
        paymentEntries: updatedEntries,
        entryValue: totalPaid,
        balanceValue: Math.max(0, net - totalPaid),
        observations: (order.observations || "").replace(/\[ENTRADAS_JSON:\[[\s\S]*?\]\]/i, "").trim() + (updatedEntries.length > 0 ? `\n\n[ENTRADAS_JSON:${JSON.stringify(updatedEntries)}]` : ""),
      });
    } catch (e: any) {
      toast.error('Erro ao remover entrada: ' + (e?.message || e));
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // ── Handlers for PaymentEntryModal (Grouped Payment) ──
  const handleGroupedAddEntrada = async (data: PaymentEntryItem) => {
    if (!groupedPayment) return;
    setIsSubmittingPayment(true);
    try {
      await addEntradaGroupedPayment(groupedPayment.id, {
        valor: data.amount,
        formaPagamento: data.method,
        nomePagador: data.payer,
        data: data.date,
      });
    } catch (e: any) {
      toast.error('Erro ao lançar entrada agrupada: ' + (e?.message || e));
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleGroupedUpdateEntrada = async (id: string, data: PaymentEntryItem) => {
    if (!groupedPayment) return;
    setIsSubmittingPayment(true);
    try {
      await updateEntradaGroupedPayment(groupedPayment.id, id, {
        valor: data.amount,
        formaPagamento: data.method,
        nomePagador: data.payer,
        data: data.date,
      });
    } catch (e: any) {
      toast.error('Erro ao atualizar entrada agrupada: ' + (e?.message || e));
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleGroupedDeleteEntrada = async (id: string) => {
    if (!groupedPayment) return;
    const ok = await confirmDialog.confirm({
      title: "Remover este lançamento?",
      description: "O valor pago será removido do histórico de pagamento agrupado. Esta ação não pode ser desfeita.",
    });
    if (!ok) return;
    setIsSubmittingPayment(true);
    try {
      await deleteEntradaGroupedPayment(groupedPayment.id, id);
    } catch (e: any) {
      toast.error('Erro ao remover entrada agrupada: ' + (e?.message || e));
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const getEntries = () => {
    if (!order || order.paymentStatus === 'Não Pago') return [];

    // 1. Try from order.paymentEntries
    if (order.paymentEntries && Array.isArray(order.paymentEntries) && order.paymentEntries.length > 0) {
      return order.paymentEntries.map((e: any, index: number) => ({
        id: e.id || `entry-${index}-${order.id}`,
        amount: e.amount !== undefined ? (parseFloat(e.amount.toString()) || 0) : (parseFloat(e.value?.toString() || '0') || 0),
        method: normalizePix(e.method || ''),
        date: e.date || '',
        payer: e.payer || e.pixPaidBy || '',
      }));
    }

    let parsed: any[] | null = null;
    const match = order.observations?.match(/\[ENTRADAS_JSON:(\[[\s\S]*?\])\]/i);
    if (match) {
      try {
        parsed = JSON.parse(match[1]);
      } catch (e) {
        console.error("Failed to parse ENTRADAS_JSON", e);
      }
    }

    let entriesList: any[] = [];
    if (parsed && Array.isArray(parsed) && parsed.length > 0) {
      entriesList = parsed.map((e: any, index: number) => ({
        id: e.id || `entry-${index}-${order.id}`,
        amount: e.amount !== undefined ? (parseFloat(e.amount.toString()) || 0) : (parseFloat(e.value?.toString() || '0') || 0),
        method: normalizePix(e.method || ''),
        date: e.date || '',
        payer: e.payer || e.pixPaidBy || '',
      }));
    } else {
      // 2. Fallback to legacy fields ONLY if order genuinely had a legacy payment registered
      const entryVal = Number(order.entryValue) || 0;
      if (order.paymentStatus === 'Entrada' && entryVal > 0) {
        entriesList.push({
          id: `legacy-entry-1-${order.id}`,
          amount: entryVal,
          method: normalizePix(order.paymentMethod || 'PIX'),
          date: order.paymentDate || '',
          payer: order.pixPaidBy || '',
        });
        if (order.secondPaymentMethod) {
          const secondVal = Math.max(0, (Number(order.netValue) || 0) - entryVal);
          if (secondVal > 0) {
            entriesList.push({
              id: `legacy-entry-2-${order.id}`,
              amount: secondVal,
              method: normalizePix(order.secondPaymentMethod || ''),
              date: order.secondPaymentDate || '',
              payer: order.secondPixPaidBy || '',
            });
          }
        }
      } else if (order.paymentStatus === 'Pago' && (Number(order.netValue) || 0) > 0) {
        entriesList.push({
          id: `legacy-pago-${order.id}`,
          amount: Number(order.netValue) || 0,
          method: normalizePix(order.paymentMethod || 'PIX'),
          date: order.paymentDate || getLocalDateString(),
          payer: order.pixPaidBy || '',
        });
      }
    }

    return entriesList;
  };

  const [isEditing, setIsEditing] = useState(false);
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [showPaidHistory, setShowPaidHistory] = useState(false);
  const [showClientProfile, setShowClientProfile] = useState(false);
  const [editPartsLeft, setEditPartsLeft] = useState<string[]>([]);
  const [editAdditionalParts, setEditAdditionalParts] = useState<string[]>([]);
  const [editServices, setEditServices] = useState<ServiceItem[]>([]);
  const [editObservations, setEditObservations] = useState('');
  const [editServiceStatus, setEditServiceStatus] = useState<ServiceStatus>('Na Fila');
  const [editArrivalDate, setEditArrivalDate] = useState('');
  const [editOsNumber, setEditOsNumber] = useState('');
  const [editStatusObservation, setEditStatusObservation] = useState('');

  const [editMechanicId, setEditMechanicId] = useState('');
  const [editMechanicSearchText, setEditMechanicSearchText] = useState('');
  const [isEditMechanicSelectorOpen, setIsEditMechanicSelectorOpen] = useState(false);

  const mechanics = useMemo(() => {
    return (clients || []).filter(c => c && c.clientType === 'mechanic');
  }, [clients]);

  const filteredEditMechanics = useMemo(() => {
    const q = editMechanicSearchText.toLowerCase().trim();
    if (!q) return mechanics;
    return mechanics.filter(m =>
      (m.name || '').toLowerCase().includes(q) ||
      (m.nickname || '').toLowerCase().includes(q)
    );
  }, [mechanics, editMechanicSearchText]);

  const editMechContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (editMechContainerRef.current && !editMechContainerRef.current.contains(event.target as Node)) {
        setIsEditMechanicSelectorOpen(false);
        if (editMechanicId) {
          const foundMech = clients.find(c => c.id === editMechanicId);
          if (foundMech) {
            setEditMechanicSearchText(foundMech.nickname ? foundMech.nickname.toUpperCase() : foundMech.name);
          }
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [editMechanicId, clients]);
  const [showPrintReport, setShowPrintReport] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isConfirmingConcluir, setIsConfirmingConcluir] = useState(false);
  const [concluirDate, setConcluirDate] = useState('');
  const [isStatusConfirmOpen, setIsStatusConfirmOpen] = useState(false);

  const handleConfirmPrint = (onReady?: () => void) => {
    setShowPrintReport(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const api = (window as any).electronAPI;
        if (api?.print) {
          api.print({ silent: false, printBackground: true })
            .then((res: any) => {
              if (!res.success && res.failureReason) {
                if (res.failureReason !== 'Print job canceled') {
                  console.error('Print failed:', res.failureReason);
                } else {
                  console.log('Print job canceled by user');
                }
              }
            })
            .catch((err: any) => console.error(err))
            .finally(() => {
              setShowPrintReport(false);
              onReady?.();
            });
        } else {
          window.print();
          setTimeout(() => {
            setShowPrintReport(false);
            onReady?.();
          }, 500);
        }
      });
    });
  };

  const handleConfirmPDF = async (onReady?: () => void): Promise<{ success: boolean; filePath?: string; canceled?: boolean }> => {
    if (!order) return { success: false };
    setShowPrintReport(true);
    return new Promise<{ success: boolean; filePath?: string; canceled?: boolean }>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(async () => {
          try {
            const api = (window as any).electronAPI;
            if (api?.printToPDF) {
              const res = await api.printToPDF(`OS_${order.osNumber || order.id}.pdf`);
              resolve(res);
            } else {
              resolve({ success: false });
            }
          } catch (err) {
            console.error(err);
            resolve({ success: false });
          } finally {
            setShowPrintReport(false);
            onReady?.();
          }
        });
      });
    });
  };

  const handleConcluir = () => {
    if (!order) return;
    if (order.serviceStatus !== 'Pronto') {
      setIsStatusConfirmOpen(true);
      return;
    }
    setConcluirDate(new Date().toISOString().split('T')[0]);
    setIsConfirmingConcluir(true);
  };

  const confirmStatusAndConcluir = async () => {
    if (!order || isSubmittingPayment) return;
    setIsSubmittingPayment(true);
    try {
      await updateOrder(order.id, { serviceStatus: 'Pronto' });
      toast.success('Status atualizado para PRONTO.');
      setIsStatusConfirmOpen(false);
      setConcluirDate(new Date().toISOString().split('T')[0]);
      setIsConfirmingConcluir(true);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao atualizar o status.');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const confirmConcluir = async () => {
    if (!order || !concluirDate || isSubmittingPayment) return;
    setIsSubmittingPayment(true);
    const mainEl = document.querySelector('main') || document.querySelector('.dashboard-content');
    const prevScroll = mainEl ? mainEl.scrollTop : 0;
    const prevWindowScroll = typeof window !== 'undefined' ? window.scrollY : 0;

    if (mainEl) {
      mainEl.style.overflowY = 'hidden';
    }

    try {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const finishedAtISO = concluirDate === todayStr
        ? now.toISOString()
        : new Date(concluirDate + 'T' + now.toTimeString().split(' ')[0]).toISOString();

      await updateOrder(order.id, {
        finished: true,
        finishedAt: finishedAtISO,
        deliveryDate: concluirDate
      });
      toast.success(`O.S. #${order.id} finalizada com sucesso!`);
      setIsConfirmingConcluir(false);
      if (typeof document !== 'undefined' && document.activeElement) {
        (document.activeElement as HTMLElement).blur();
      }
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao concluir O.S.');
    } finally {
      setIsSubmittingPayment(false);
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
    }
  };

  // Load and reset states on open/change
  useEffect(() => {
    if (order && isOpen) {
      setEditPartsLeft(order.partsLeft || []);
      setEditAdditionalParts(order.additionalParts || []);
      setEditServices(order.services || []);

      const rawObs = order.observations || '';
      setEditObservations(rawObs.replace(/\[ENTRADAS_JSON:\[[\s\S]*?\]\]/i, "").trim().toUpperCase());

      setEditServiceStatus(order.serviceStatus || 'Na Fila');

      let initialArrivalDate = '';
      if (order.arrivalDate) {
        initialArrivalDate = order.arrivalDate;
      } else {
        try {
          initialArrivalDate = new Date(order.createdAt || new Date()).toISOString().split('T')[0];
        } catch (e) {
          initialArrivalDate = new Date().toISOString().split('T')[0];
        }
      }
      setEditArrivalDate(initialArrivalDate);
      setEditOsNumber(String(order.osNumber || order.id));
      setEditStatusObservation(order.statusObservation || '');
      setEditMechanicId(order.mechanicId || '');
      const mech = clients.find(c => c.id === order.mechanicId);
      setEditMechanicSearchText(mech ? (mech.nickname ? mech.nickname.toUpperCase() : mech.name) : '');
      setIsEditMechanicSelectorOpen(false);
    }
  }, [order, isOpen, clients]);

  // Reset isEditing to false only when the modal is opened
  useEffect(() => {
    if (isOpen) {
      setIsEditing(false);
      setIsEditingStatus(false);
    }
  }, [isOpen]);

  const handleUpdatePartLeft = (index: number, name: string, qty: string) => {
    setEditPartsLeft(prev => prev.map((item, idx) => idx === index ? `${name.toUpperCase()}|${qty}` : item));
  };
  const handleAddPartLeft = () => {
    setEditPartsLeft(prev => [...prev, '|1']);
  };
  const handleRemovePartLeft = (index: number) => {
    setEditPartsLeft(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateAdditionalPart = (index: number, name: string, qty: string) => {
    setEditAdditionalParts(prev => prev.map((item, idx) => idx === index ? `${name.toUpperCase()}|${qty}` : item));
  };
  const handleAddAdditionalPart = () => {
    setEditAdditionalParts(prev => [...prev, '|1']);
  };
  const handleRemoveAdditionalPart = (index: number) => {
    setEditAdditionalParts(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateService = (index: number, field: keyof ServiceItem, value: any) => {
    setEditServices(prev => prev.map((s, idx) => idx === index ? { ...s, [field]: value } : s));
  };
  const handleRemoveService = (index: number) => {
    setEditServices(prev => prev.filter((_, idx) => idx !== index));
  };
  const handleAddService = () => {
    setEditServices(prev => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        name: '',
        value: 0,
        quantity: 1,
        measure: ''
      }
    ]);
  };

  // Dynamic calculated net value in edit mode
  const editTotalValue = editServices.reduce((acc, curr) => acc + (curr.value * curr.quantity), 0);
  const editNetValue = editTotalValue - (order?.discount || 0);

  const handleSave = async () => {
    if (!order || isSubmittingPayment) return;
    setIsSubmittingPayment(true);

    // Clean up empty lines or empty items from partsLeft and additionalParts
    const cleanedPartsLeft = editPartsLeft
      .map(p => p.trim())
      .filter(p => {
        const [name] = p.split('|');
        return name.trim().length > 0;
      });

    const cleanedAdditionalParts = editAdditionalParts
      .map(p => p.trim())
      .filter(p => {
        const [name] = p.split('|');
        return name.trim().length > 0;
      });

    // Clean up services
    const cleanedServices = editServices.filter(s => s.name.trim().length > 0);

    // Calculate dynamic totals
    const finalTotalValue = cleanedServices.reduce((acc, curr) => acc + (curr.value * curr.quantity), 0);
    const finalNetValue = finalTotalValue - (order.discount || 0);

    const cleanObs = editObservations.replace(/\[ENTRADAS_JSON:\[[\s\S]*?\]\]/i, "").trim().toUpperCase();
    const existingEntriesMatch = order.observations?.match(/\[ENTRADAS_JSON:(\[[\s\S]*?\])\]/i);
    const serializedObs = cleanObs + (existingEntriesMatch ? `\n\n${existingEntriesMatch[0]}` : "");

    const cleanOsNumberStr = editOsNumber.trim();
    if (!cleanOsNumberStr) {
      toast.error('O número da O.S. não pode estar vazio');
      setIsSubmittingPayment(false);
      return;
    }
    const cleanOsNumberVal = Number(cleanOsNumberStr);
    const isDuplicate = orders.some(o => o.id !== order.id && (o.osNumber === cleanOsNumberVal || (!o.osNumber && o.id === cleanOsNumberVal)));
    if (isDuplicate) {
      toast.error('Já existe uma O.S. com esse número');
      setIsSubmittingPayment(false);
      return;
    }

    const mainEl = document.querySelector('main') || document.querySelector('.dashboard-content');
    const prevScroll = mainEl ? mainEl.scrollTop : 0;
    const prevWindowScroll = typeof window !== 'undefined' ? window.scrollY : 0;

    if (mainEl) {
      mainEl.style.overflowY = 'hidden';
    }

    try {
      await updateOrder(order.id, {
        partsLeft: cleanedPartsLeft,
        additionalParts: cleanedAdditionalParts,
        services: cleanedServices,
        observations: serializedObs,
        totalValue: finalTotalValue,
        netValue: finalNetValue,
        balanceValue: order.paymentStatus === 'Pago' ? 0 : (order.paymentStatus === 'Entrada' ? Math.max(0, finalNetValue - (order.entryValue || 0)) : finalNetValue),
        serviceStatus: editServiceStatus,
        arrivalDate: editArrivalDate,
        finished: order.finished,
        osNumber: cleanOsNumberVal,
        statusObservation: editStatusObservation.trim(),
        mechanicId: editMechanicId || undefined,
      });
      toast.success('Alterações salvas com sucesso!');
      setIsEditing(false);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao salvar alterações.');
    } finally {
      setIsSubmittingPayment(false);
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
    }
  };

  const handleSaveStatus = async () => {
    if (!order || isSubmittingPayment) return;
    setIsSubmittingPayment(true);
    try {
      await updateOrder(order.id, { serviceStatus: editServiceStatus });
      toast.success('Status atualizado com sucesso!');
      setIsEditingStatus(false);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao salvar o status.');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleDiscardStatus = () => {
    if (!order) return;
    setEditServiceStatus(order.serviceStatus || 'Na Fila');
    setIsEditingStatus(false);
  };

  const handleDiscard = () => {
    if (!order) return;
    setEditPartsLeft(order.partsLeft || []);
    setEditAdditionalParts(order.additionalParts || []);
    setEditServices(order.services || []);
    const rawObs = order.observations || '';
    setEditObservations(rawObs.replace(/\[ENTRADAS_JSON:\[[\s\S]*?\]\]/i, "").trim().toUpperCase());
    setEditServiceStatus(order.serviceStatus || 'Na Fila');
    setEditStatusObservation(order.statusObservation || '');
    setEditMechanicId(order.mechanicId || '');
    const mech = clients.find(c => c.id === order.mechanicId);
    setEditMechanicSearchText(mech ? (mech.nickname ? mech.nickname.toUpperCase() : mech.name) : '');
    setIsEditMechanicSelectorOpen(false);

    let initialArrivalDate = '';
    if (order.arrivalDate) {
      initialArrivalDate = order.arrivalDate;
    } else {
      try {
        initialArrivalDate = new Date(order.createdAt || new Date()).toISOString().split('T')[0];
      } catch (e) {
        initialArrivalDate = new Date().toISOString().split('T')[0];
      }
    }
    setEditArrivalDate(initialArrivalDate);
    setEditOsNumber(String(order.osNumber || order.id));
    setIsEditing(false);
  };

  // ── Cancelar / reabrir O.S. (o motivo fica na observação do status) ──
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelOther, setCancelOther] = useState('');
  const isCancelled = order?.serviceStatus === 'Cancelada';
  const openCancelDialog = () => { setCancelReason(''); setCancelOther(''); setIsCancelOpen(true); };
  const handleCancelOrder = async () => {
    if (!order) return;
    const reason = cancelReason === 'Outro' ? cancelOther.trim() : cancelReason;
    if (!reason) return;
    const today = new Date().toLocaleDateString('pt-BR');
    try {
      await updateOrder(order.id, { serviceStatus: 'Cancelada', statusObservation: `Cancelada em ${today} · ${reason}` });
      setIsCancelOpen(false);
      toast.success(`O.S. #${order.osNumber || order.id} cancelada.`);
    } catch {
      toast.error('Não foi possível cancelar a O.S.');
    }
  };
  const handleReopenOrder = async () => {
    if (!order) return;
    const ok = await confirmDialog.confirm({
      title: `Reabrir O.S. #${order.osNumber || order.id}?`,
      description: 'Ela volta para a fila de trabalho com o status "Na Fila".',
      confirmLabel: 'Reabrir',
    });
    if (!ok) return;
    try {
      await updateOrder(order.id, { serviceStatus: 'Na Fila', statusObservation: '' });
      toast.success('O.S. reaberta.');
    } catch {
      toast.error('Não foi possível reabrir a O.S.');
    }
  };

  if (!order) return null;

  const client = clients.find(c => c.id === order.clientId);
  const hasObservations = !!order.observations && order.observations.replace(/\[ENTRADAS_JSON:\[[\s\S]*?\]\]/i, "").trim().length > 0;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR');
    } catch (e) {
      return dateStr;
    }
  };

  const getStatusBadge = (status: ServiceStatus) => {
    switch (status) {
      case 'Na Fila': return (
        <span className="inline-flex items-center gap-1 px-2.5 py-[3px] rounded-full text-[10.5px] font-extrabold tracking-wider bg-secondary text-secondary-foreground border border-border">
          <span className="w-1.5 h-1.5 rounded-full bg-secondary-foreground/60 shrink-0" />
          NA FILA
        </span>
      );
      case 'Em Andamento': return (
        <span className="inline-flex items-center gap-1 px-2.5 py-[3px] rounded-full text-[10.5px] font-extrabold tracking-wider bg-info/10 text-info border border-info/20">
          <span className="w-1.5 h-1.5 rounded-full bg-info shrink-0" />
          EM ANDAMENTO
        </span>
      );
      case 'Aguardando Peça': return (
        <span className="inline-flex items-center gap-1 px-2.5 py-[3px] rounded-full text-[10.5px] font-extrabold tracking-wider bg-warning/10 text-warning border border-warning/20">
          <span className="w-1.5 h-1.5 rounded-full bg-warning shrink-0" />
          AGUARDANDO PEÇA
        </span>
      );
      case 'Pronto': return (
        <span className="inline-flex items-center gap-1 px-2.5 py-[3px] rounded-full text-[10.5px] font-extrabold tracking-wider bg-success/10 text-success border border-success/20">
          <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
          PRONTO
        </span>
      );
      case 'Levou': return (
        <span className="inline-flex items-center gap-1 px-2.5 py-[3px] rounded-full text-[10.5px] font-extrabold tracking-wider bg-danger/10 text-danger border border-danger/20">
          <span className="w-1.5 h-1.5 rounded-full bg-danger shrink-0" />
          LEVOU
        </span>
      );
      case 'Cancelada': return (
        <span className="inline-flex items-center gap-1 px-2.5 py-[3px] rounded-full text-[10.5px] font-extrabold tracking-wider bg-muted text-muted-foreground border border-border">
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 shrink-0" />
          CANCELADA
        </span>
      );
    }
  };

  const getStatusOptionLabel = (status: ServiceStatus) => {
    switch (status) {
      case 'Na Fila': return (
        <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 shrink-0" />
          Na Fila
        </span>
      );
      case 'Em Andamento': return (
        <span className="flex items-center gap-1.5 text-xs font-bold text-info">
          <span className="w-1.5 h-1.5 rounded-full bg-info shrink-0" />
          Em Andamento
        </span>
      );
      case 'Aguardando Peça': return (
        <span className="flex items-center gap-1.5 text-xs font-bold text-warning">
          <span className="w-1.5 h-1.5 rounded-full bg-warning shrink-0" />
          Aguardando Peça
        </span>
      );
      case 'Pronto': return (
        <span className="flex items-center gap-1.5 text-xs font-bold text-success">
          <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
          Pronto
        </span>
      );
      case 'Levou': return (
        <span className="flex items-center gap-1.5 text-xs font-bold text-levou">
          <span className="w-1.5 h-1.5 rounded-full bg-levou shrink-0" />
          Levou
        </span>
      );
      case 'Cancelada': return (
        <span className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 shrink-0" />
          Cancelada
        </span>
      );
    }
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case 'Não Pago': return (
        <span className="inline-flex items-center justify-center px-2.5 py-[3px] rounded-full text-[10.5px] font-extrabold tracking-wider bg-danger/10 text-danger border border-danger/20">
          NÃO PAGO
        </span>
      );
      case 'Entrada': return (
        <span className="inline-flex items-center justify-center px-2.5 py-[3px] rounded-full text-[10.5px] font-extrabold tracking-wider bg-warning/10 text-warning border border-warning/20">
          ENTRADA
        </span>
      );
      case 'Pago': return (
        <span className="inline-flex items-center justify-center px-2.5 py-[3px] rounded-full text-[10.5px] font-extrabold tracking-wider bg-success/10 text-success border border-success/20">
          PAGO
        </span>
      );
      default: return (
        <span className="inline-flex items-center justify-center px-2.5 py-[3px] rounded-full text-[10.5px] font-extrabold tracking-wider bg-secondary text-secondary-foreground border border-border">
          {status.toUpperCase()}
        </span>
      );
    }
  };

  const motorModels = order.motorModel ? order.motorModel.split(', ') : [];
  const displacements = order.displacement ? order.displacement.split(', ') : [];
  const motors = motorModels.map((m, idx) => {
    const cylindersMatch = m.match(/\((\d+)\s*(?:CIL|cil|Cil|Cilindros|cilindros)?\)/i);
    const cylinders = cylindersMatch ? `${cylindersMatch[1]} CIL` : '';
    const model = m.replace(/\s*\(.*\)/, '').trim().toUpperCase();
    const displacement = displacements[idx] || '';
    return { model, cylinders, displacement };
  });

  const showPartsLeft = isEditing || (order.partsLeft && order.partsLeft.length > 0);
  const showAdditionalParts = isEditing || (order.additionalParts && order.additionalParts.length > 0);
  // Até 5 itens somando as duas seções: material e peças ficam lado a lado, numa linha só
  // (cada coluna com a largura proporcional aos seus itens)
  const partsSideBySide = !isEditing && !!showPartsLeft && !!showAdditionalParts
    && (order.partsLeft?.length || 0) + (order.additionalParts?.length || 0) <= 5;
  // Modal mais largo só quando precisa: 5 quadrinhos lado a lado numa linha
  const wideModal = partsSideBySide && (order.partsLeft?.length || 0) + (order.additionalParts?.length || 0) >= 5;
  // Cartão de peças baixo: fica só na linha do motor; alto: ocupa também o começo da coluna do pagamento
  // Só uma seção com até 5 itens também cabe numa linha ao lado do motor
  const partsOneRow = partsSideBySide || (!isEditing && !showPartsLeft !== !showAdditionalParts
    && ((showPartsLeft ? order.partsLeft?.length : order.additionalParts?.length) || 0) <= 5);
  const partsRows = partsOneRow ? 1 : 2;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        const mainEl = document.querySelector('main') || document.querySelector('.dashboard-content');
        const prevScroll = mainEl ? mainEl.scrollTop : 0;
        const prevWindowScroll = typeof window !== 'undefined' ? window.scrollY : 0;

        if (mainEl) {
          mainEl.style.overflowY = 'hidden';
        }

        if (typeof document !== 'undefined' && document.activeElement) {
          (document.activeElement as HTMLElement).blur();
        }

        onClose();

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
      }
    }}>
      <DialogContent
        showCloseButton={false}
        useFlexLayout={true}
        className={cn(
          "print-friendly-modal",
          wideModal ? "w-[min(1200px,calc(100vw-48px))] md:w-[min(1200px,calc(100vw-140px))]" : "w-[min(1000px,calc(100vw-48px))] md:w-[min(1000px,calc(100vw-140px))]",
          "max-h-[calc(100vh-48px)] p-0 border-0 bg-transparent ring-0 rounded-none overflow-visible shadow-none outline-none flex flex-col gap-0 print:block print:!static print:!w-full print:!max-w-none print:!h-auto print:border-none print:shadow-none print:bg-card print:overflow-visible"
        )}
        style={{ transform: 'none' }}
        finalFocus={false}
      >
        <style dangerouslySetInnerHTML={{
          __html: `
          /* Hide print report on screen */
          #print-os-report {
            display: none !important;
          }

          @media print {
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
             html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #fff !important;
              height: auto !important;
              min-height: unset !important;
              overflow: visible !important;
            }

            /* Hide everything in the body except the print report container */
            body > *:not(#print-os-report) {
              display: none !important;
            }

            #print-os-report {
              display: block !important;
              position: relative !important;
              left: auto !important;
              top: auto !important;
              width: 100% !important;
              height: auto !important;
              min-height: unset !important;
              z-index: 99999 !important;
              pointer-events: auto !important;
              background: #fff !important;
            }
          }
        `}} />

        <div className="relative flex flex-col flex-1 min-h-0 print:hidden">
          <DialogClose render={
            <Button
              variant="outline"
              size="icon"
              title="Fechar"
              className="absolute z-20 top-2 right-2 md:top-0 md:-right-14 w-10 h-10 rounded-full border-border bg-card hover:bg-secondary shadow-lg print:hidden"
            >
              <X className="w-5 h-5 text-muted-foreground hover:text-foreground" />
            </Button>
          } />

          {/* ═══ ÁREA PRINCIPAL ═══ */}
          <div className="flex-1 min-w-0 flex flex-col min-h-0 rounded-2xl border border-border bg-card overflow-hidden shadow-[0_12px_24px_-4px_rgba(0,0,0,0.08),_0_4px_12px_-2px_rgba(0,0,0,0.04)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.4)]">

          {/* ═══ CABEÇALHO (Nº da O.S., status e cliente) ═══ */}
          <section className="shrink-0 px-4 pt-4">
            <div className="rounded-xl bg-blue-50/70 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 px-4 py-3 flex flex-col md:flex-row md:items-stretch gap-3 md:gap-4 select-none">
              {/* Nº da O.S., abertura, dias em aberto e status */}
              {(() => {
                const openedAt = order.arrivalDate ? new Date(order.arrivalDate + 'T12:00:00') : new Date(order.createdAt);
                const today = new Date();
                today.setHours(12, 0, 0, 0);
                const opened = new Date(openedAt);
                opened.setHours(12, 0, 0, 0);
                const days = Math.max(0, Math.round((today.getTime() - opened.getTime()) / 86400000));
                const daysLabel = days === 0 ? 'Aberta hoje' : days === 1 ? 'Há 1 dia' : `Há ${days} dias`;
                return (
                  // Nº da O.S. no canto esquerdo do cabeçalho
                  <div className="shrink-0 md:pr-4 md:border-r border-blue-200/70 dark:border-blue-500/20">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-700/80 dark:text-blue-300/80">O.S. Nº</span>
                    <div className="font-extrabold text-3xl leading-none tracking-tight text-blue-600 dark:text-blue-400 tabular-nums mt-0.5">
                      #{String(order.osNumber || order.id).padStart(4, '0')}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2 whitespace-nowrap">
                      <Calendar className="w-3.5 h-3.5" />
                      <strong className="text-foreground font-semibold">{openedAt.toLocaleDateString('pt-BR')}</strong>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1 whitespace-nowrap">
                      <Clock className="w-3.5 h-3.5" />
                      <strong className={cn("font-semibold", days >= 30 ? "text-danger" : days >= 15 ? "text-warning" : "text-foreground")}>{daysLabel}</strong>
                    </div>
                    {order.statusObservation && !isCancelled && (
                      <div className="text-xs text-muted-foreground font-semibold break-words mt-2 max-w-[220px]">{order.statusObservation}</div>
                    )}
                    {order.finished && (order.finishedAt || order.deliveryDate) && (
                      <div className="text-xs font-bold text-success mt-2">
                        Finalizado em: {new Date(order.finishedAt || (order.deliveryDate as string) + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Cliente: ícone do tipo, apelido acima do nome, tipo ao lado e contatos em linha */}
              <div className="flex-1 min-w-0 flex flex-col justify-center gap-2.5">
                {/* ícone com a mesma altura do apelido + nome; clique abre o perfil do cliente */}
                <div
                  role={client ? 'button' : undefined}
                  tabIndex={client ? 0 : undefined}
                  title={client ? 'Abrir perfil do cliente' : undefined}
                  onClick={client ? () => setShowClientProfile(true) : undefined}
                  onKeyDown={client ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowClientProfile(true); } } : undefined}
                  className={cn(
                    "group/cliente flex items-center gap-3 min-w-0 self-start max-w-full",
                    client && "-m-1.5 p-1.5 pr-2 rounded-xl cursor-pointer transition-colors hover:bg-blue-100/70 dark:hover:bg-blue-500/10 outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60"
                  )}
                >
                <div className="min-w-0 flex flex-col justify-center">
                  {client?.nickname && (
                    <div className="text-xs font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400 leading-tight">{client.nickname}</div>
                  )}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
                    <span className="text-lg font-extrabold uppercase tracking-tight text-foreground break-words leading-snug">{client?.name || 'CLIENTE REMOVIDO'}</span>
                    {client && (
                      <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                        Tipo:{' '}
                        <span className={cn(
                          "inline-block ml-1 text-[11px] font-extrabold tracking-wider uppercase rounded-full border px-2.5 py-0.5 align-middle",
                          client.clientType === 'mechanic' ? "bg-info/10 text-info border-info/20" : "bg-card text-secondary-foreground border-border"
                        )}>
                          {client.clientType === 'mechanic' ? 'Mecânico' : 'Cliente'}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
                {client && <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 -ml-1 transition-opacity group-hover/cliente:opacity-100 shrink-0" />}
                </div>

                {(client?.phone || client?.document?.trim() || client?.city?.trim()) && (() => {
                  const docDigits = (client?.document || '').replace(/\D/g, '');
                  const rows = [
                    client?.phone ? { icon: Phone, label: 'TEL.', value: client.phone } : null,
                    client?.document?.trim() ? { icon: FileText, label: docDigits.length > 11 ? 'CNPJ' : 'CPF', value: client.document } : null,
                    client?.city?.trim() ? { icon: MapPin, label: 'CID.', value: client.city } : null,
                  ].filter(Boolean) as { icon: React.ElementType; label: string; value: string }[];
                  return (
                    <div className="flex items-center min-w-0">
                      {rows.map((r, i) => (
                        <div key={r.label} className={cn("flex items-center gap-2 min-w-0", i < rows.length - 1 && "shrink-0", i > 0 && "pl-3 ml-3 border-l border-blue-200/70 dark:border-blue-500/20")}>
                          <r.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground shrink-0">{r.label}</span>
                          <span className="min-w-0 text-[13px] font-semibold text-foreground truncate" title={r.value}>{r.value}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Mecânico responsável */}
              {order.mechanicId && (() => {
                const m = clients.find(c => c.id === order.mechanicId);
                const nickname = m?.nickname || order.mechanicNickname;
                const name = m?.name || order.mechanicName;
                const displayName = nickname ? nickname.toUpperCase() : name;
                return displayName ? (
                  <div className="shrink-0 md:pl-4 md:border-l border-blue-200/70 dark:border-blue-500/20 flex items-center">
                    <div className="md:w-[215px] rounded-xl border border-info/20 bg-info/5 dark:bg-info/10 px-3 py-2.5 flex items-center gap-2.5 min-w-0">
                      <span className="w-10 h-10 rounded-lg bg-info/15 text-info flex items-center justify-center shrink-0">
                        <Wrench className="w-5 h-5" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold uppercase whitespace-nowrap text-info">Mecânico responsável</div>
                        <div className="text-sm font-extrabold uppercase text-foreground truncate" title={name || displayName}>{displayName}</div>
                        {nickname && name && name.toUpperCase() !== nickname.toUpperCase() && (
                          <div className="text-xs font-medium uppercase text-muted-foreground truncate">{name}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          </section>

          {/* ═══ BODY ═══ */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
            {isCancelled && !isEditing && (
              <div className="mx-4 mt-4 flex items-center gap-3 rounded-xl border border-border bg-muted/60 px-4 py-3">
                <span className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center shrink-0">
                  <Ban className="w-4 h-4 text-muted-foreground" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-foreground">O.S. cancelada</div>
                  {order.statusObservation && <div className="text-xs font-semibold text-muted-foreground break-words">{order.statusObservation}</div>}
                </div>
                <Button variant="outline" size="sm" onClick={handleReopenOrder} className="h-8 px-3 rounded-lg text-xs font-bold uppercase tracking-wider gap-1.5 shrink-0">
                  <RotateCcw className="w-3.5 h-3.5" /> Reabrir
                </Button>
              </div>
            )}
            {/* Top Section: Motor + Cards + Financial */}
            <div className={cn(
              "flex flex-col p-4 gap-4 min-w-0",
              isEditing ? "md:flex-row" : cn("md:grid md:grid-cols-[minmax(0,1fr)_320px]", partsRows === 2
                ? (hasObservations ? "md:grid-rows-[auto_auto_auto_1fr]" : "md:grid-rows-[auto_auto_1fr]")
                : (hasObservations ? "md:grid-rows-[auto_auto_1fr]" : "md:grid-rows-[auto_1fr]"))
            )}>
              {/* Left Column: Motor & Materials (na visualização vira parte da grade) */}
              <div className={isEditing ? "flex-1 min-w-0 space-y-4" : "contents"}>
                {/* Top Row: Material Deixado / Peças Adicionais (left) + Motor (right) */}
                <div className={cn(
                  "grid gap-4 items-stretch min-w-0 md:col-start-1 md:row-start-1", partsRows === 2 && "md:row-span-2 md:self-start",
                  isEditing
                    ? (showPartsLeft ? "grid-cols-1 sm:grid-cols-[1.6fr_1fr]" : "grid-cols-1")
                    : "grid-cols-1"
                )}>
                    {isEditing && showPartsLeft && (
                      <div className="border border-border rounded-xl bg-background p-3 shadow-sm min-w-0">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground dark:text-foreground/80 block mb-3">MATERIAL DEIXADO</span>
                        {(
                          <div className="flex flex-col gap-2">
                            {editPartsLeft.map((p, idx) => {
                              const [name, qtyStr] = p.includes('|') ? p.split('|') : [p, '1'];
                              return (
                                <div key={idx} className="flex items-center gap-1.5 animate-in fade-in duration-200">
                                  <Input
                                    type="text"
                                    value={name}
                                    placeholder="Material"
                                    onChange={(e) => handleUpdatePartLeft(idx, e.target.value, qtyStr)}
                                    className="flex-1 h-8 px-2 py-1 text-xs font-semibold uppercase placeholder:normal-case bg-card"
                                  />
                                  <Input
                                    type="number"
                                    value={qtyStr}
                                    min="1"
                                    onChange={(e) => handleUpdatePartLeft(idx, name, e.target.value)}
                                    className="w-14 h-8 px-1 py-1 text-xs text-center font-semibold font-mono bg-card"
                                  />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemovePartLeft(idx)}
                                    className="w-8 h-8 rounded text-destructive hover:bg-destructive/10 shrink-0"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              );
                            })}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleAddPartLeft}
                              className="mt-1 h-8 rounded border-dashed text-xs font-bold uppercase tracking-wider"
                            >
                              <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                  {/* Material deixado e peças adicionais no mesmo cartão (visualização) */}
                  {!isEditing && (showPartsLeft || showAdditionalParts) && (
                    (() => {
                      const sideBySide = partsSideBySide;
                      return (
                        <div
                          className={cn(
                            "border border-border rounded-xl bg-background p-3 shadow-sm min-w-0",
                            sideBySide ? "sm:grid sm:grid-cols-[var(--parts-cols)]" : partsOneRow && "flex flex-col"
                          )}
                          style={sideBySide ? { '--parts-cols': `${order.partsLeft!.length}fr ${order.additionalParts!.length}fr` } as React.CSSProperties : undefined}
                        >
                          {showPartsLeft && (
                            <div className={cn("min-w-0", partsOneRow && "flex-1 flex flex-col", sideBySide && "sm:pr-3")}>
                              <ViewCardHeader icon={Package} title="Material deixado" count={order.partsLeft?.length || 0} />
                              <PartTiles parts={order.partsLeft || []} row={sideBySide} fill={partsOneRow} />
                            </div>
                          )}
                          {showPartsLeft && showAdditionalParts && (
                            <hr className={cn("border-border my-2.5", sideBySide && "sm:hidden")} />
                          )}
                          {showAdditionalParts && (
                            <div className={cn("min-w-0", partsOneRow && "flex-1 flex flex-col", sideBySide && "sm:pl-3 sm:border-l sm:border-border")}>
                              <ViewCardHeader icon={SettingsIcon} title="Peças adicionais" count={order.additionalParts?.length || 0} />
                              <PartTiles parts={order.additionalParts || []} row={sideBySide} fill={partsOneRow} />
                            </div>
                          )}
                        </div>
                      );
                    })()
                  )}

                  {/* Motor (na visualização fica na coluna da direita) */}
                  {isEditing && (
                  <div className="border border-border rounded-xl bg-background p-4 shadow-sm min-w-0">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground dark:text-foreground/80 block mb-3">MOTOR</span>
                    <div className="space-y-2">
                      {motors.map((m, idx) => (
                        <div key={idx} className="flex items-center flex-wrap gap-x-3 gap-y-1">
                          <span className="font-bold text-sm uppercase tracking-wide text-foreground">
                            {m.model || 'MOTOR NÃO INFORMADO'}
                          </span>
                          {m.displacement && (
                            <span className="font-bold text-sm uppercase tracking-wide text-foreground">
                              {m.displacement}
                            </span>
                          )}
                          {m.cylinders && (
                            <span className="font-bold text-sm uppercase tracking-wide text-foreground">
                              {m.cylinders}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  )}
                </div>

                {/* Peças Adicionais (edição) */}
                {isEditing && showAdditionalParts && (
                  <div className="border border-border rounded-xl bg-background p-4 shadow-sm">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground dark:text-foreground/80 block mb-3">PEÇAS ADICIONAIS</span>
                    {isEditing ? (
                      <div className="flex flex-col gap-2">
                        {editAdditionalParts.map((p, idx) => {
                          const [name, qtyStr] = p.includes('|') ? p.split('|') : [p, '1'];
                          return (
                            <div key={idx} className="flex items-center gap-1.5 animate-in fade-in duration-200">
                              <Input
                                type="text"
                                value={name}
                                placeholder="Peça"
                                onChange={(e) => handleUpdateAdditionalPart(idx, e.target.value, qtyStr)}
                                className="flex-1 h-8 px-2 py-1 text-xs font-semibold uppercase placeholder:normal-case bg-card"
                              />
                              <Input
                                type="number"
                                value={qtyStr}
                                min="1"
                                onChange={(e) => handleUpdateAdditionalPart(idx, name, e.target.value)}
                                className="w-14 h-8 px-1 py-1 text-xs text-center font-semibold font-mono bg-card"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveAdditionalPart(idx)}
                                className="w-8 h-8 rounded text-destructive hover:bg-destructive/10 shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          );
                        })}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAddAdditionalPart}
                          className="mt-1 h-8 rounded border-dashed text-xs font-bold uppercase tracking-wider"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {order.additionalParts && order.additionalParts.map((p, i) => {
                          const [name, qtyStr] = p.includes('|') ? p.split('|') : [p, '1'];
                          const qty = parseInt(qtyStr) || 1;
                          return (
                            <div
                              key={i}
                              className="flex items-center gap-1.5 border border-border bg-secondary/50 px-3 py-1.5 rounded-lg transition-all hover:bg-secondary/60"
                            >
                              {qty > 1 && (
                                <span className="text-xs font-bold text-foreground shrink-0">
                                  ({qty})
                                </span>
                              )}
                              <span className="text-xs font-bold uppercase tracking-tight text-foreground">{name}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Bottom Section: Services List */}
                <div className={cn("border border-border rounded-xl bg-background overflow-hidden shadow-sm min-w-0 md:col-start-1 self-start w-full", partsRows === 2 ? "md:row-start-3" : "md:row-start-2")}>
                  <div className="px-3 py-2.5 border-b border-border flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300 flex items-center justify-center shrink-0"><Wrench className="w-4 h-4" /></span>
                      <span className="text-xs font-extrabold uppercase tracking-wide text-foreground">Serviços executados</span>
                    </span>
                    <span className="text-xs font-bold text-foreground/80 bg-secondary/60 px-2 py-0.5 rounded border border-border">
                      {isEditing ? editServices.length : order.services.length} itens
                    </span>
                  </div>
                  {isEditing ? (
                    <div className="divide-y divide-border">
                      {editServices.map((s, idx) => (
                        <div key={s.id} className="p-3.5 space-y-2 hover:bg-secondary/5 transition-colors animate-in fade-in slide-in-from-top-1 duration-200">
                          <div className="flex gap-2">
                            <Input
                              type="text"
                              value={s.name}
                              placeholder="Nome do serviço"
                              onChange={(e) => handleUpdateService(idx, 'name', e.target.value.toUpperCase())}
                              className="flex-1 h-8 px-2 py-1 text-xs font-semibold uppercase placeholder:normal-case bg-card"
                            />
                            <Input
                              type="text"
                              value={s.measure || ''}
                              placeholder="Medida (Ex: 0.25)"
                              onChange={(e) => handleUpdateService(idx, 'measure', e.target.value.toUpperCase())}
                              className="w-28 h-8 px-2 py-1 text-xs font-semibold uppercase placeholder:normal-case bg-card"
                            />
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-muted-foreground dark:text-foreground/80 uppercase">Valor:</span>
                              <div className="relative group">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-primary/90 text-xs font-mono font-bold">R$</span>
                                <Input
                                  type="number"
                                  value={s.value}
                                  min="0"
                                  onChange={(e) => handleUpdateService(idx, 'value', parseFloat(e.target.value) || 0)}
                                  className="w-24 h-8 pl-7 pr-2 py-1 text-xs font-mono font-semibold bg-card"
                                />
                              </div>
                              <span className="text-xs font-bold text-muted-foreground dark:text-foreground/80 uppercase ml-1">Qtd:</span>
                              <Input
                                type="number"
                                value={s.quantity}
                                min="1"
                                onChange={(e) => handleUpdateService(idx, 'quantity', parseInt(e.target.value) || 1)}
                                className="w-14 h-8 px-1 py-1 text-xs text-center font-semibold font-mono bg-card"
                              />
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveService(idx)}
                              className="w-8 h-8 rounded text-destructive hover:bg-destructive/10 shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <div className="p-3 bg-secondary/20 border-t border-border">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAddService}
                          className="w-full h-8 rounded border-dashed text-xs font-bold uppercase tracking-wider bg-card border-border"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar Serviço
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="divide-y divide-border dark:divide-border/80">
                      {(() => {
                        // Com 2+ motores, separa os serviços como no relatório: comuns, motor 1, motor 2...
                        const renderService = (s: ServiceItem) => (
                          <div key={s.id} className="flex justify-between items-center gap-3 px-3 py-1.5 text-[13px] hover:bg-secondary/20 transition-colors">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="w-6 h-6 rounded-full bg-muted text-xs font-bold text-foreground/80 flex items-center justify-center shrink-0 tabular-nums">
                                {s.quantity || 1}
                              </span>
                              {isPartItem(s) && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-amber-500/10 text-amber-700 border border-amber-500/30 dark:text-amber-300 shrink-0">Peça</span>
                              )}
                              <span className="font-semibold uppercase text-foreground break-words">
                                {s.id === 'eix-retificar' && s.measure ? `Retificar Eixo — ${s.measure}` : s.name}
                              </span>
                              {s.measure && s.id !== 'eix-retificar' && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold uppercase bg-primary/10 text-primary border border-border">
                                  {s.measure}
                                </span>
                              )}
                            </div>
                            <span className="font-mono font-bold text-success shrink-0 tabular-nums">
                              {(s.value * (s.quantity || 1)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                          </div>
                        );
                        // serviços primeiro, peças no fim (marcadas com "Peça")
                        const svcItems = [...order.services.filter(s => !isPartItem(s)), ...order.services.filter(isPartItem)];
                        if (motors.length < 2) return svcItems.map(renderService);
                        const isCommon = (s: ServiceItem) => s.motorId === 'all' || (s.motorId as unknown) === null;
                        const motorIndexOf = (s: ServiceItem) => Number(s.motorId ?? '0');
                        const groups: { title: string; items: ServiceItem[] }[] = [
                          { title: 'Comuns a todos os motores', items: svcItems.filter(isCommon) },
                          ...motors.map((m, idx) => ({
                            title: `Motor ${idx + 1}: ${[m.model, m.displacement, m.cylinders].filter(Boolean).join(' ')}`,
                            items: svcItems.filter(s => !isCommon(s) && motorIndexOf(s) === idx),
                          })),
                          {
                            title: 'Sem motor definido',
                            items: svcItems.filter(s => !isCommon(s) && !(motorIndexOf(s) >= 0 && motorIndexOf(s) < motors.length)),
                          },
                        ];
                        return <>{groups.filter(g => g.items.length > 0).map(g => (
                          <div key={g.title}>
                            <div className="px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground bg-secondary/20">{g.title}</div>
                            {g.items.map(renderService)}
                          </div>
                        ))}</>;
                      })()}
                      {order.services.length === 0 && (
                        <div className="px-4 py-8 text-center text-xs text-muted-foreground font-bold uppercase tracking-wider italic">
                          Nenhum serviço registrado
                        </div>
                      )}
                      {order.services.length > 0 && (() => {
                        const sum = (list: ServiceItem[]) => list.reduce((acc, sv) => acc + sv.value * (sv.quantity || 1), 0);
                        const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                        const svcTotal = sum(order.services.filter(s => !isPartItem(s)));
                        const partsTotal = sum(order.services.filter(isPartItem));
                        return (
                          <div className="m-2 rounded-lg bg-blue-50/70 dark:bg-blue-500/10 px-3 py-2 space-y-1">
                            {partsTotal > 0 || order.services.some(isPartItem) ? (
                              <>
                                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                                  <span>Serviços</span>
                                  <span className="font-mono text-sm tabular-nums">{fmt(svcTotal)}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                                  <span>Peças</span>
                                  <span className="font-mono text-sm tabular-nums">{fmt(partsTotal)}</span>
                                </div>
                                <div className="flex items-center justify-between border-t border-blue-200/70 dark:border-blue-500/20 pt-1">
                                  <span className="text-[13px] font-bold text-foreground">Total</span>
                                  <span className="text-base font-extrabold font-mono text-foreground tabular-nums">{fmt(svcTotal + partsTotal)}</span>
                                </div>
                              </>
                            ) : (
                              <div className="flex items-center justify-between">
                                <span className="text-[13px] font-bold text-foreground">Total dos serviços</span>
                                <span className="text-base font-extrabold font-mono text-foreground tabular-nums">{fmt(svcTotal)}</span>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* Card de Observações */}
                {(((order.observations && order.observations.replace(/\[ENTRADAS_JSON:\[[\s\S]*?\]\]/i, "").trim().length > 0)) || isEditing) && (
                  <div className={cn("border border-border rounded-xl bg-background overflow-hidden shadow-sm animate-in fade-in slide-in-from-top-1 duration-200 min-w-0 md:col-start-1 self-start w-full", partsRows === 2 ? "md:row-start-4" : "md:row-start-3")}>
                    <div className="bg-secondary/30 px-4 py-3 border-b border-border flex justify-between items-center">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground dark:text-foreground/80">OBSERVAÇÕES</span>
                    </div>
                    <div className="p-4 text-xs font-semibold">
                      {isEditing ? (
                        <Textarea
                          value={editObservations}
                          onChange={(e) => setEditObservations(e.target.value)}
                          placeholder="Observações sobre o serviço (opcional)"
                          className="min-h-[100px] w-full p-3 border border-border bg-card rounded-lg focus:outline-none focus:border-secondary-foreground transition-all text-xs font-semibold uppercase placeholder:normal-case resize-y leading-relaxed"
                        />
                      ) : (
                        <p className="whitespace-pre-wrap font-bold text-foreground uppercase tracking-tight text-xs leading-relaxed">
                          {order.observations.replace(/\[ENTRADAS_JSON:\[[\s\S]*?\]\]/i, "").trim()}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Motor + Pagamento */}
              <div className={isEditing ? "w-full md:w-[300px] shrink-0 min-w-0 flex flex-col gap-4" : "contents"}>
                {!isEditing && motors.length > 0 && (
                  <div className={cn("border border-border rounded-xl bg-background p-3 shadow-sm min-w-0 md:col-start-2 md:row-start-1", partsRows === 2 && "md:self-start")}>
                    <ViewCardHeader icon={Gauge} title={motors.length > 1 ? `Motores (${motors.length})` : 'Motor'} right={<span />} />
                    <div className="space-y-3">
                      {motors.map((m, idx) => {
                        const spec = order.motorSpecs?.[idx];
                        const brand = spec?.brand || detectBrandFromName(m.model);
                        const logo = getBrandLogoSrc(brand);
                        const tiles = [
                          { label: 'Cilindrada', value: m.displacement || '-' },
                          { label: 'Cilindros', value: m.cylinders || '-' },
                          { label: 'Válvulas', value: spec?.valves ? spec.valves.replace(/V$/i, '') + ' VAL' : '-' },
                        ];
                        // Demais dados do motor (quando informados na O.S.)
                        const extras: { label: string; value: string; orange?: boolean }[] = [];
                        if (spec?.engineModel) extras.push({ label: 'Modelo', value: spec.engineModel.toUpperCase() });
                        if (spec?.cars) extras.push({ label: 'Veículo', value: spec.cars.toUpperCase() });
                        if (spec?.aspiration) extras.push({ label: 'Aspiração', value: spec.aspiration.toUpperCase(), orange: true });
                        return (
                          <div key={idx} className="space-y-1.5">
                            <div className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-2.5 py-1.5">
                              <span className="w-11 h-8 flex items-center justify-center shrink-0">
                                {logo ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={logo} alt={brand} className="max-w-full max-h-full object-contain" draggable={false} />
                                ) : (
                                  <Gauge className="w-6 h-6 text-muted-foreground/50" />
                                )}
                              </span>
                              <div className="min-w-0">
                                <div className="text-xs font-semibold uppercase text-muted-foreground truncate">
                                  {brand || '—'}
                                </div>
                                <div className="text-sm font-extrabold uppercase text-foreground truncate">{m.model || 'MOTOR NÃO INFORMADO'}</div>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-1.5">
                              {tiles.map((t) => (
                                <div key={t.label} className="rounded-lg border border-border bg-card px-2 py-1.5 min-w-0">
                                  <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground truncate">{t.label}</div>
                                  <div className="text-[13px] font-bold text-foreground truncate">{t.value}</div>
                                </div>
                              ))}
                            </div>
                            {extras.length > 0 && (
                              <div className={cn("grid gap-1.5", extras.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
                                {extras.map((t, ti) => (
                                  <div
                                    key={t.label}
                                    title={`${t.label}: ${t.value}`}
                                    className={cn(
                                      "rounded-lg border px-2 py-1.5 min-w-0",
                                      t.orange ? "bg-orange-50 border-orange-200 dark:bg-orange-500/10 dark:border-orange-500/30" : "bg-card border-border",
                                      extras.length === 3 && ti === 2 && "col-span-2"
                                    )}
                                  >
                                    <div className={cn("text-[10px] font-semibold uppercase tracking-wide truncate", t.orange ? "text-orange-600/80 dark:text-orange-300/80" : "text-muted-foreground")}>{t.label}</div>
                                    <div className={cn("text-[13px] font-bold leading-tight break-words line-clamp-2", t.orange ? "text-orange-600 dark:text-orange-400" : "text-foreground")}>{t.value}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              <div className={cn("border border-border rounded-xl bg-background p-3 shadow-sm flex flex-col flex-1 min-w-0", !isEditing && cn("md:col-start-2 md:row-start-2", PAYMENT_ROW_SPAN[partsRows + (hasObservations ? 1 : 0)]))}>
                {!isEditing && (
                  <ViewCardHeader icon={CreditCard} title="Pagamento" right={getPaymentBadge(order.paymentStatus)} />
                )}
                <div className="space-y-3 flex-1">
                  {groupedPayment ? (
                    /* ═══ REFORMULADO: CARD DE PAGAMENTO AGRUPADO ═══ */
                    <div className="space-y-2 animate-in fade-in duration-200">
                      {/* Status no topo, fora/acima do card principal */}
                      <div className="text-center font-bold text-sm tracking-wide py-0.5">
                        <span
                          className={
                            groupedPayment.status === 'pago'
                              ? 'text-success'
                              : groupedPayment.status === 'pagamento_parcial'
                              ? 'text-warning'
                              : 'text-danger'
                          }
                        >
                          {groupedPayment.status === 'pago'
                            ? 'Quitado'
                            : groupedPayment.status === 'pagamento_parcial'
                            ? 'Pagamento Parcial'
                            : 'Aguardando o Pagamento'}
                        </span>
                      </div>

                      {/* Card com borda arredondada */}
                      <div className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-xs">
                        {/* Cabeçalho do Card (Label + Botão Desfazer) */}
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">
                            HISTÓRICO DE ENTRADAS ({groupedPayment.entradas?.length || 0})
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsDissolveModalOpen(true)}
                            title="Desfazer este Pagamento Agrupado"
                            className="h-6 px-2 text-xs font-bold text-danger hover:text-danger hover:bg-danger/10 rounded uppercase flex items-center gap-1 cursor-pointer"
                          >
                            <Unlink className="w-3 h-3 stroke-[2.5]" /> DESFAZER
                          </Button>
                        </div>

                        {/* Lista de Caixinhas de Entradas */}
                        {sortedGroupEntradas && sortedGroupEntradas.length > 0 ? (
                          <div className="space-y-2">
                            {(showAllEntradas ? sortedGroupEntradas : sortedGroupEntradas.slice(0, 2)).map((e, idx) => (
                              <div
                                key={e.id || idx}
                                className="bg-info/5 dark:bg-info/10 border border-info/15 rounded-xl p-2.5 space-y-1"
                              >
                                <div className="flex justify-between items-center gap-2">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="text-xs font-bold text-info uppercase tracking-wide truncate">
                                      {e.originalNum}. {e.formaPagamento.toUpperCase()}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <span className="text-xs font-bold font-mono text-info">
                                      {e.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </span>
                                    <button
                                      type="button"
                                      title="Editar lançamento"
                                      onClick={() => setPaymentEntryModal({
                                        mode: 'edit',
                                        entry: { id: e.id, amount: e.valor, method: e.formaPagamento, date: e.data, payer: e.nomePagador },
                                        totalValue: groupedPayment.valorTotal,
                                        paidElsewhere: Math.max(0, groupedPayment.valorPago - e.valor),
                                      })}
                                      className="w-5 h-5 rounded flex items-center justify-center text-info/70 hover:text-info hover:bg-info/10 transition-colors ml-1"
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      title="Remover lançamento"
                                      onClick={() => e.id && handleGroupedDeleteEntrada(e.id)}
                                      className="w-5 h-5 rounded flex items-center justify-center text-danger/70 hover:text-danger hover:bg-danger/10 transition-colors"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>

                                <div className="flex justify-between items-center text-xs pt-1 border-t border-info/10">
                                  <span className="text-muted-foreground font-bold uppercase">DATA:</span>
                                  <span className="font-mono font-bold text-foreground">{formatDate(e.data)}</span>
                                </div>

                                {e.nomePagador && e.nomePagador.trim() !== '' && (
                                  <div className="pt-1 border-t border-info/10 text-xs">
                                    <span className="text-muted-foreground font-bold uppercase block">PAGADOR:</span>
                                    <span className="font-bold text-foreground uppercase break-words leading-tight block mt-0.5">
                                      {e.nomePagador.toUpperCase()}
                                    </span>
                                  </div>
                                )}

                                {e.observacao && (
                                  <div className="text-xs text-muted-foreground italic pt-0.5">
                                    {e.observacao}
                                  </div>
                                )}
                              </div>
                            ))}

                            {sortedGroupEntradas.length > 2 && (
                              <button
                                type="button"
                                onClick={() => setShowAllEntradas(prev => !prev)}
                                className="text-xs font-bold text-info hover:underline flex items-center justify-center w-full py-1 cursor-pointer transition-colors"
                              >
                                {showAllEntradas
                                  ? 'Ver menos'
                                  : `Ver todas as entradas (${sortedGroupEntradas.length})`}
                              </button>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs italic text-muted-foreground text-center py-2">
                            Nenhuma entrada lançada ainda.
                          </p>
                        )}

                        {/* Lista de O.S. do Grupo */}
                        <div className="space-y-1.5 pt-2.5 border-t border-dashed border-border text-xs">
                          {groupedPayment.osIds.map(osId => {
                            const groupOs = orders.find(o => o.id === osId);
                            const netVal = groupOs ? getOrderNetValue(groupOs) : 0;
                            const osLabel = groupOs ? `O.S - ${groupOs.osNumber || groupOs.id}` : `O.S - ${osId}`;
                            return (
                              <div key={osId} className="flex justify-between items-center font-medium text-foreground">
                                <span className="font-bold text-xs">{osLabel}</span>
                                <span className="font-mono font-bold text-muted-foreground">
                                  TOTAL {netVal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                              </div>
                            );
                          })}

                          <div className="flex justify-end items-center gap-1.5 pt-2 text-xs font-bold text-foreground text-right whitespace-nowrap">
                            <span>TOTAL DO GRUPO</span>
                            <span className="font-mono">{groupedPayment.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                          </div>

                          {groupedPayment.status !== 'pago' ? (
                            <div className="flex justify-end items-center gap-1.5 text-xs font-bold text-warning text-right whitespace-nowrap">
                              <span>RESTANTE (SALDO)</span>
                              <span className="font-mono">{Math.max(0, groupedPayment.valorTotal - groupedPayment.valorPago).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </div>
                          ) : (
                            <div className="flex justify-end items-center text-xs font-bold text-success text-right whitespace-nowrap">
                              <span>PAGAMENTO QUITADO</span>
                            </div>
                          )}
                        </div>

                        {/* Botão Lançar Nova Entrada no Grupo */}
                        {groupedPayment.status !== 'pago' && (
                          <div className="flex justify-center">
                            <Button
                              onClick={() => setPaymentEntryModal({
                                mode: 'add',
                                totalValue: groupedPayment.valorTotal,
                                paidElsewhere: groupedPayment.valorPago,
                              })}
                              className="w-full max-w-[220px] h-8 solid-btn font-bold text-xs uppercase tracking-wider gap-1.5 shadow-sm rounded-lg cursor-pointer"
                            >
                              <CreditCard className="w-3.5 h-3.5 stroke-[2.5]" />
                              NOVA ENTRADA NO GRUPO
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* ═══ NÃO PAGO ═══ */}
                      {order.paymentStatus === 'Não Pago' && (
                        <div className="space-y-2 text-center py-3">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60 block">SITUAÇÃO</span>
                          <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 dark:text-red-400 dark:bg-red-500/10 dark:border-red-500/30 px-3.5 py-1 rounded-full inline-block">
                            AGUARDANDO PAGAMENTO
                          </span>
                        </div>
                      )}

                      {/* ═══ ENTRADA / PAGO: histórico de pagamentos (numerado pela data) ═══ */}
                      {(order.paymentStatus === 'Entrada' || order.paymentStatus === 'Pago') && getEntries().length > 0 && (() => {
                        const ordered = getEntries()
                          .map((entry: any, index: number) => ({ entry, index }))
                          .sort((x: any, y: any) => String(x.entry.date || '').localeCompare(String(y.entry.date || '')) || x.index - y.index);
                        const totalPaid = ordered.reduce((acc: number, it: any) => acc + (parseFloat(it.entry.amount) || 0), 0);
                        const lastDate = ordered.length ? ordered[ordered.length - 1].entry.date : '';
                        const list = (
                          <div className="space-y-2">
                            {ordered.map(({ entry, index }: any, pos: number) => {
                              const entryAmount = parseFloat(entry.amount) || 0;
                              return (
                                <PaymentHistoryRow
                                  key={entry.id || index}
                                  entry={entry}
                                  onOpen={() => setViewEntry({ entry: { ...entry, amount: entryAmount }, index })}
                                />
                              );
                            })}
                          </div>
                        );
                        if (order.paymentStatus === 'Pago') {
                          const methods = Array.from(new Set(ordered.map((it: any) => paymentMethodInfo(it.entry.method).label))) as string[];
                          const single = ordered.length === 1;
                          const openSingle = () => {
                            const { entry, index } = ordered[0];
                            setViewEntry({ entry: { ...entry, amount: parseFloat(entry.amount) || 0 }, index });
                          };
                          return (
                            <div className="space-y-2 animate-in fade-in duration-200">
                              {/* Um pagamento só: o próprio cartão abre o lançamento (sem botão de histórico) */}
                              <div
                                role={single ? 'button' : undefined}
                                tabIndex={single ? 0 : undefined}
                                title={single ? 'Clique para ver o lançamento' : undefined}
                                onClick={single ? openSingle : undefined}
                                onKeyDown={single ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSingle(); } } : undefined}
                                className={cn(
                                  "rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-500/25 dark:bg-emerald-500/10 p-3 flex items-center gap-3",
                                  single && "cursor-pointer transition-colors hover:bg-emerald-100/70 dark:hover:bg-emerald-500/15"
                                )}
                              >
                                <span className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                                  <CheckCircle2 className="w-5 h-5" />
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="text-[11px] font-extrabold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Pagamento finalizado</div>
                                  <div className="text-lg font-extrabold text-foreground tabular-nums leading-tight">
                                    {totalPaid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                  </div>
                                  <div className="text-[11px] font-semibold uppercase text-emerald-800/80 dark:text-emerald-200/80 truncate" title={methods.join(', ')}>
                                    {methods.join(' · ')}
                                  </div>
                                </div>
                                {single && <ChevronRight className="w-4 h-4 text-emerald-700/60 dark:text-emerald-300/60 shrink-0" />}
                              </div>
                              {!single && (
                              <button
                                type="button"
                                onClick={() => setShowPaidHistory(true)}
                                className="w-full h-8 rounded-lg border border-border bg-card hover:bg-muted text-[11px] font-bold uppercase tracking-wide text-foreground/80 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                              >
                                <Clock className="w-3.5 h-3.5" />
                                Ver histórico de pagamentos ({ordered.length})
                              </button>
                              )}

                              {/* Modal: registros dos pagamentos */}
                              <Dialog open={showPaidHistory} onOpenChange={setShowPaidHistory}>
                                <DialogContent showCloseButton={false} className="sm:max-w-[440px] z-[1100] rounded-2xl bg-popover border border-border ring-1 ring-foreground/15 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.45)] p-0 gap-0 overflow-hidden" overlayClassName="z-[1099] bg-black/55 supports-backdrop-filter:backdrop-blur-[2px]" forceOverlay>
                                  <div className="flex items-center gap-3 px-5 pt-5 pb-3">
                                    <span className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300 flex items-center justify-center shrink-0">
                                      <Clock className="w-[18px] h-[18px]" />
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <DialogTitle className="text-sm font-extrabold uppercase tracking-wide text-foreground">Histórico de pagamentos</DialogTitle>
                                      <div className="text-xs text-muted-foreground">O.S. #{String(order.osNumber || order.id).padStart(4, '0')} · {ordered.length} {ordered.length === 1 ? 'pagamento' : 'pagamentos'}</div>
                                    </div>
                                    <DialogClose render={
                                      <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground">
                                        <X className="w-4 h-4" />
                                      </Button>
                                    } />
                                  </div>
                                  <div className="px-5 pb-3 space-y-2 max-h-[55vh] overflow-y-auto">
                                    {ordered.map(({ entry, index }: any, pos: number) => {
                                      const entryAmount = parseFloat(entry.amount) || 0;
                                      return (
                                        <PaymentHistoryRow
                                          key={entry.id || index}
                                          entry={entry}
                                          onOpen={() => { setShowPaidHistory(false); setViewEntry({ entry: { ...entry, amount: entryAmount }, index }); }}
                                        />
                                      );
                                    })}
                                  </div>
                                  <div className="px-5 py-3 border-t border-border flex items-center justify-between text-sm font-bold">
                                    <span className="uppercase tracking-wide text-muted-foreground text-xs">Total pago</span>
                                    <span className="text-success tabular-nums">{totalPaid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          );
                        }
                        return (
                          <div className="space-y-2 animate-in fade-in duration-200">
                            <div className="text-xs font-semibold text-muted-foreground">
                              Histórico de pagamentos - {ordered.length}
                            </div>
                            {list}
                          </div>
                        );
                      })()}
                    </>
                  )}
                </div>

                {!groupedPayment && (
                  <div className="pt-2 mt-2 flex flex-col gap-1.5">
                    {(() => {
                      const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                      const total = isEditing ? editTotalValue : order.totalValue;
                      const discount = Number(order.discount) || 0;
                      const finalValue = isEditing ? editNetValue : order.netValue;
                      const paid = getEntries().reduce((acc: number, curr: any) => acc + (parseFloat(curr.amount) || 0), 0);
                      const remaining = Math.max(0, finalValue - paid);
                      return (
                        <div className="rounded-xl border border-border bg-muted/30 px-3 py-2 flex flex-col gap-1">
                          <div className="flex justify-between items-center text-xs font-semibold text-muted-foreground">
                            <span>Valor total</span>
                            <span className="font-mono text-sm">{brl(total)}</span>
                          </div>
                          {discount > 0 && (
                            <div className="flex justify-between items-center text-xs font-semibold text-muted-foreground">
                              <span>Desconto</span>
                              <span className="font-mono text-sm text-warning">- {brl(discount)}</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center border-t border-border pt-1 mt-0.5">
                            <span className="text-xs font-bold uppercase tracking-wider text-foreground">Valor final</span>
                            <span className="text-xl font-bold font-mono text-foreground tracking-tight">{brl(finalValue)}</span>
                          </div>
                          {/* Só com alguma entrada; quitada: o cartão "Pagamento finalizado" já mostra o que foi pago */}
                          {paid > 0 && !(order.paymentStatus === 'Pago' && getEntries().length > 0 && !isEditing) && (
                            <>
                              <div className="flex justify-between items-center text-xs font-bold text-success border-t border-border pt-1 mt-0.5">
                                <span className="uppercase tracking-wider">Total pago{getEntries().length > 0 ? ` (${getEntries().length})` : ''}</span>
                                <span className="font-mono text-sm">{brl(paid)}</span>
                              </div>
                              <div className={cn("flex justify-between items-center text-xs font-bold", remaining > 0 ? "text-warning" : "text-success")}>
                                <span className="uppercase tracking-wider">Restante</span>
                                <span className="font-mono text-sm">{remaining > 0 ? brl(remaining) : 'Quitado'}</span>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })()}

                    {/* Ações de Pagamento */}
                    <div className="flex flex-col items-center gap-1.5 pt-1.5">
                      {order.paymentStatus !== 'Pago' && (
                        <Button
                          onClick={() => setPaymentEntryModal({
                            mode: 'add',
                            totalValue: order.totalValue,
                            paidElsewhere: getEntries().reduce((acc: number, curr: any) => acc + (parseFloat(curr.amount) || 0), 0),
                            discount: order.discount || 0,
                            showDiscount: true,
                          })}
                          className="w-full max-w-[240px] h-9 font-bold text-xs uppercase tracking-wider gap-1.5 shadow-sm rounded-lg cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <DollarSign className="w-4 h-4 stroke-[2.5]" />
                          Registrar pagamento
                        </Button>
                      )}

                      {/* Agrupar O.S. (quando O.S. não faz parte de grupo, não está finalizada e cliente tem 2+ O.S. pendentes) */}
                      {!order.finished && pendingClientOrders.length > 1 && !isEditingStatus && (
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedOsForGrouping([order.id]);
                            setIsGroupModalOpen(true);
                          }}
                          title="Agrupar com outras O.S. deste cliente para pagamento conjunto"
                          className="w-full max-w-[240px] h-9 font-bold text-xs uppercase tracking-wider gap-1.5 rounded-lg border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100 hover:text-violet-800 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-300"
                        >
                          <Layers className="w-4 h-4 shrink-0" />
                          <span className="truncate">Agrupar pagamento conjunto</span>
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
              </div>
            </div>
          </div>

          {/* ═══ FOOTER ═══ */}
          <div className="shrink-0 p-5 border-t border-border bg-card print:hidden">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                disabled={isEditingStatus}
                onClick={() => setIsPreviewOpen(true)}
                className="h-9 px-3 rounded-lg text-muted-foreground hover:text-foreground gap-2 text-xs font-bold uppercase tracking-wider disabled:opacity-50"
              >
                <Printer className="w-4 h-4 stroke-[2]" /> Imprimir relatório
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isEditingStatus}
                  onClick={async () => {
                    if (!order) return;
                    if (groupedPayment) {
                      setIsDeleteGroupedConfirmOpen(true);
                    } else if (onDelete) {
                      onDelete(order.id);
                    } else {
                      const ok = await confirmDialog.confirm({
                        title: `Excluir O.S. #${order.osNumber || order.id}?`,
                        description: "Esta ação não pode ser desfeita.",
                      });
                      if (!ok) return;
                      deleteOrder(order.id);
                      onClose();
                    }
                  }}
                  className="h-9 px-3 rounded-lg text-danger hover:bg-danger/10 gap-2 text-xs font-bold uppercase tracking-wider disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4 stroke-[2]" /> Excluir O.S.
                </Button>
                {!isCancelled && !order?.finished && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isEditingStatus}
                    onClick={openCancelDialog}
                    className="h-9 px-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted gap-2 text-xs font-bold uppercase tracking-wider disabled:opacity-50"
                  >
                    <Ban className="w-4 h-4 stroke-[2]" /> Cancelar O.S.
                  </Button>
                )}
                {onEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isEditingStatus}
                    onClick={() => order && onEdit?.(order)}
                    className="h-9 px-3.5 rounded-lg border-border bg-background hover:bg-secondary text-foreground gap-2 text-xs font-bold uppercase tracking-wider disabled:opacity-50"
                  >
                    <Edit className="w-4 h-4 stroke-[2]" /> Editar O.S.
                  </Button>
                )}
                {order && order.paymentStatus === 'Pago' && !order.finished && !isCancelled && (
                  <Button
                    onClick={handleConcluir}
                    disabled={isEditingStatus}
                    className="solid-btn h-9 px-4 rounded-lg font-bold text-xs uppercase tracking-wider gap-2 shadow-sm disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" /> Finalizar O.S.
                  </Button>
                )}
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* ═══ PRINT DEDICATED TEMPLATE ═══ */}
        {(() => {
          const getFormattedEmissionDate = () => {
            if (order.arrivalDate) {
              try {
                const parts = order.arrivalDate.split('-');
                if (parts.length === 3) {
                  const year = parts[0];
                  const month = parts[1];
                  const day = parts[2];
                  if (order.createdAt) {
                    const d = new Date(order.createdAt);
                    const hours = String(d.getHours()).padStart(2, '0');
                    const minutes = String(d.getMinutes()).padStart(2, '0');
                    return `${day}/${month}/${year}, ${hours}:${minutes}`;
                  }
                  return `${day}/${month}/${year}`;
                }
              } catch (e) {}
            }
            if (!order.createdAt) return '';
            try {
              const d = new Date(order.createdAt);
              const day = String(d.getDate()).padStart(2, '0');
              const month = String(d.getMonth() + 1).padStart(2, '0');
              const year = d.getFullYear();
              const hours = String(d.getHours()).padStart(2, '0');
              const minutes = String(d.getMinutes()).padStart(2, '0');
              return `${day}/${month}/${year}, ${hours}:${minutes}`;
            } catch (e) {
              return '';
            }
          };

          const cleanObservations = order.observations ? order.observations.replace(/\[ENTRADAS_JSON:\[[\s\S]*?\]\]/i, "").trim() : '';

          const hasPartsLeft = order.partsLeft && order.partsLeft.length > 0;
          const hasAdditionalParts = order.additionalParts && order.additionalParts.length > 0;
          const hasAnyExtraParts = hasPartsLeft || hasAdditionalParts;

          const motorModelStr = motors.map(m => m.model).join(', ');
          const cylindersStr = motors.map(m => m.cylinders).filter(Boolean).join(', ');

          const isCompact = order.services.length > 3 || hasAnyExtraParts || (cleanObservations && cleanObservations.length > 80);

          const serviceCount = order.services.length;
          const hasObs = cleanObservations ? 1 : 0;
          const extraPartsCount = (order.partsLeft?.length || 0) + (order.additionalParts?.length || 0);

          return showPrintReport && typeof window !== 'undefined' ? createPortal(
            <div id="print-os-report">
              <OSPrintReport
                order={order}
                client={client || null}
                motors={motors}
                getEntries={getEntries}
                formatDate={formatDate}
              />
            </div>,
            document.body
          ) : null;
        })()}

        {isPreviewOpen && order && (
          <PrintPreviewModal
            isOpen={isPreviewOpen}
            onClose={() => setIsPreviewOpen(false)}
            order={order}
            client={client || null}
            motors={motors}
            getEntries={getEntries}
            formatDate={formatDate}
            onConfirmPrint={handleConfirmPrint}
            onConfirmPDF={(window as any).electronAPI?.printToPDF ? handleConfirmPDF : undefined}
          />
        )}

        {isStatusConfirmOpen && order && (
          <Dialog open={isStatusConfirmOpen} onOpenChange={setIsStatusConfirmOpen}>
            <DialogContent
              showCloseButton={false}
              className="max-w-[340px] p-6 bg-card border border-border rounded-xl shadow-2xl flex flex-col gap-4 outline-none"
              finalFocus={false}
            >
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning shrink-0" /> Status Incompleto
                </h3>
                <p className="text-xs text-muted-foreground font-semibold leading-relaxed">
                  Esta O.S. está com o status <strong className="text-foreground">{getStatusOptionLabel(order.serviceStatus)}</strong>. Para concluir, o status precisa estar como <strong className="text-foreground">PRONTO</strong>.
                </p>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isSubmittingPayment}
                  onClick={() => setIsStatusConfirmOpen(false)}
                  className="h-8 px-3 rounded-md text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground bg-background border-border disabled:opacity-50"
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  disabled={isSubmittingPayment}
                  onClick={confirmStatusAndConcluir}
                  className="h-8 px-3 rounded-md solid-btn font-bold text-xs uppercase tracking-wider shadow-sm disabled:opacity-50"
                >
                  {isSubmittingPayment ? 'Atualizando...' : 'Marcar como Pronto'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {isConfirmingConcluir && order && (
          <Dialog open={isConfirmingConcluir} onOpenChange={setIsConfirmingConcluir}>
            <DialogContent
              showCloseButton={false}
              className="max-w-[320px] p-6 bg-card border border-border rounded-xl shadow-2xl flex flex-col gap-4 outline-none"
              finalFocus={false}
            >
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Finalizar O.S.</h3>
                <p className="text-xs text-muted-foreground font-semibold leading-relaxed">
                  Informe a data de finalização
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground dark:text-foreground/80 uppercase tracking-wider block">
                  DATA DE FINALIZAÇÃO
                </label>
                <Input
                  type="date"
                  value={concluirDate}
                  onChange={(e) => setConcluirDate(e.target.value)}
                  className="h-9 py-1 px-2.5 rounded-lg text-xs font-bold bg-card border-border w-full text-center"
                  required
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isSubmittingPayment}
                  onClick={() => setIsConfirmingConcluir(false)}
                  className="h-8 px-3 rounded-md text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground bg-background border-border disabled:opacity-50"
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  disabled={!concluirDate || isSubmittingPayment}
                  onClick={confirmConcluir}
                  className="h-8 px-3 rounded-md solid-btn font-bold text-xs uppercase tracking-wider shadow-sm disabled:opacity-50"
                >
                  {isSubmittingPayment ? 'Confirmando...' : 'Confirmar'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* ═══ MODAL DE AGRUPAMENTO DE O.S. ═══ */}
        {isGroupModalOpen && order && (
          <Dialog open={isGroupModalOpen} onOpenChange={setIsGroupModalOpen}>
            <DialogContent className="max-w-lg bg-card text-card-foreground p-6 rounded-xl border border-border shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-base font-bold uppercase tracking-wider flex items-center gap-2 text-info">
                  <Layers className="w-5 h-5 stroke-[2.5]" /> AGRUPAR O.S. PARA PAGAMENTO CONJUNTO
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Selecione as Ordens de Serviço pendentes do cliente <strong className="text-foreground">{client?.name || 'Cliente'}</strong> para incluir no pagamento agrupado:
                </p>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {pendingClientOrders.map(pOrder => {
                    const pNet = getOrderNetValue(pOrder);
                    const isChecked = selectedOsForGrouping.includes(pOrder.id);
                    return (
                      <div
                        key={pOrder.id}
                        onClick={() => {
                          if (isChecked) {
                            if (selectedOsForGrouping.length > 1) {
                              setSelectedOsForGrouping(selectedOsForGrouping.filter(id => id !== pOrder.id));
                            } else {
                              toast.warning("Selecione pelo menos uma O.S. para o grupo.");
                            }
                          } else {
                            setSelectedOsForGrouping([...selectedOsForGrouping, pOrder.id]);
                          }
                        }}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                          isChecked
                            ? 'border-info bg-info/10 dark:bg-info/20'
                            : 'border-border bg-background hover:bg-secondary'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="rounded border-border text-info focus:ring-info w-4 h-4 cursor-pointer"
                          />
                          <div>
                            <span className="font-mono font-bold text-xs block text-foreground">O.S. #{pOrder.id}</span>
                            <span className="text-xs text-muted-foreground font-semibold">
                              {pOrder.motorModel} {pOrder.displacement}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-xs text-foreground block">
                            {pNet.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                          {pOrder.discount && Number(pOrder.discount) > 0 ? (
                            <span className="text-xs text-warning font-semibold block">
                              Desconto: {Number(pOrder.discount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="bg-secondary/80 p-3 rounded-lg flex justify-between items-center border border-border">
                  <span className="text-xs font-bold uppercase text-muted-foreground">Valor Total do Grupo ({selectedOsForGrouping.length} O.S.):</span>
                  <span className="text-lg font-bold font-mono text-info">
                    {pendingClientOrders
                      .filter(o => selectedOsForGrouping.includes(o.id))
                      .reduce((sum, o) => sum + getOrderNetValue(o), 0)
                      .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                {selectedOsForGrouping.length < 2 && (
                  <span className="mr-auto text-sm text-muted-foreground">Selecione pelo menos 2 O.S. para agrupar.</span>
                )}
                <Button variant="outline" size="sm" onClick={() => setIsGroupModalOpen(false)} className="h-9 text-sm font-semibold">
                  Cancelar
                </Button>
                <Button
                  disabled={selectedOsForGrouping.length < 2 || isSubmittingGroup}
                  onClick={async () => {
                    setIsSubmittingGroup(true);
                    try {
                      await createGroupedPayment(order.clientId, selectedOsForGrouping);
                      setIsGroupModalOpen(false);
                    } catch (e: any) {
                      toast.error("Erro ao criar pagamento agrupado: " + (e?.message || e));
                    } finally {
                      setIsSubmittingGroup(false);
                    }
                  }}
                  className="solid-btn h-9 font-bold text-sm px-4"
                >
                  {isSubmittingGroup ? 'Agrupando…' : 'Agrupar O.S.'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* ═══ VISUALIZAÇÃO DE UM LANÇAMENTO (com Editar / Excluir) ═══ */}
        <Dialog open={!!viewEntry} onOpenChange={(o) => { if (!o) setViewEntry(null); }}>
          <DialogContent showCloseButton={false} className="sm:max-w-[400px] z-[1100] rounded-2xl bg-popover border border-border ring-1 ring-foreground/15 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.45)] p-0 gap-0 overflow-hidden" overlayClassName="z-[1099] bg-black/55 supports-backdrop-filter:backdrop-blur-[2px]" forceOverlay>
            {viewEntry && (() => {
              const e = viewEntry.entry;
              const amount = parseFloat(e.amount) || 0;
              const { icon, full } = paymentMethodInfo(e.method);
              const rows: { label: string; value: string }[] = [
                { label: 'Forma de pagamento', value: full },
                { label: 'Data', value: formatEntryDate(e.date) || '—' },
                { label: 'Pagador', value: (e.payer && String(e.payer).trim()) ? String(e.payer).toUpperCase() : '—' },
              ];
              return (
                <>
                  <div className="flex items-center gap-3 p-5 border-b border-border">
                    <span className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/25 flex items-center justify-center shrink-0">{icon}</span>
                    <div className="min-w-0 flex-1">
                      <DialogTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lançamento {viewEntry.index + 1}</DialogTitle>
                      <div className="text-2xl font-extrabold text-foreground tabular-nums">{amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                    </div>
                    <DialogClose render={
                      <Button variant="outline" size="icon" className="w-8 h-8 rounded-lg border-border shrink-0"><X className="w-4 h-4 text-muted-foreground" /></Button>
                    } />
                  </div>
                  <div className="p-5 space-y-2.5">
                    {rows.map((r) => (
                      <div key={r.label} className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-muted-foreground">{r.label}</span>
                        <span className="font-semibold text-foreground text-right break-words">{r.value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between gap-2 px-5 py-3.5 border-t border-border bg-muted/30">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => { const v = viewEntry; setViewEntry(null); handleIndividualDeleteEntrada(v.entry.id, v.index); }}
                      className="h-9 px-3 rounded-lg text-danger hover:bg-danger/10 gap-1.5 text-xs font-bold uppercase tracking-wider"
                    >
                      <Trash2 className="w-4 h-4" /> Excluir
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        const v = viewEntry;
                        setViewEntry(null);
                        setPaymentEntryModal({
                          mode: 'edit',
                          entry: { id: v.entry.id, amount: parseFloat(v.entry.amount) || 0, method: v.entry.method, date: v.entry.date, payer: v.entry.payer },
                          index: v.index,
                          totalValue: order.totalValue,
                          paidElsewhere: Math.max(0, getEntries().reduce((sum: number, c: any) => sum + (parseFloat(c.amount) || 0), 0) - (parseFloat(v.entry.amount) || 0)),
                          discount: order.discount || 0,
                          showDiscount: true,
                        });
                      }}
                      className="solid-btn h-9 px-4 rounded-lg gap-1.5 text-xs font-bold uppercase tracking-wider"
                    >
                      <Pencil className="w-4 h-4" /> Editar pagamento
                    </Button>
                  </div>
                </>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* ═══ MODAL COMPACTO DE LANÇAMENTO (FINALIZAR / REGISTRAR / EDITAR PAGAMENTO) ═══ */}
        {paymentEntryModal && order && (
          <PaymentEntryModal
            open={!!paymentEntryModal}
            onOpenChange={(open) => { if (!open) setPaymentEntryModal(null); }}
            mode={paymentEntryModal.mode}
            initialData={paymentEntryModal.entry}
            totalValue={paymentEntryModal.totalValue}
            paidElsewhere={paymentEntryModal.paidElsewhere}
            discount={paymentEntryModal.discount}
            showDiscount={paymentEntryModal.showDiscount}
            clientName={client?.name || ''}
            isSaving={isSubmittingPayment}
            onSubmit={async (data, discount) => {
              const editingId = paymentEntryModal.mode === 'edit' ? paymentEntryModal.entry?.id : undefined;
              if (groupedPayment) {
                if (editingId) {
                  await handleGroupedUpdateEntrada(editingId, data);
                } else {
                  await handleGroupedAddEntrada(data);
                }
              } else {
                if (editingId) {
                  await handleIndividualUpdateEntrada(editingId, data, discount);
                } else {
                  await handleIndividualAddEntrada(data, discount);
                }
              }
            }}
          />
        )}

        {/* ═══ CANCELAR O.S. (motivo) ═══ */}
        {isCancelOpen && order && (
          <Dialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
            <DialogContent className="max-w-md bg-card border border-border p-6 rounded-xl shadow-2xl space-y-4">
              <DialogHeader>
                <DialogTitle className="text-base font-bold uppercase tracking-wider flex items-center gap-2 text-foreground">
                  <Ban className="w-5 h-5 text-muted-foreground" /> Cancelar O.S. #{order.osNumber || order.id}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  A O.S. continua salva, sai da lista de trabalho e não conta mais nos valores a receber. Dá para reabrir depois.
                </p>
                <div className="text-xs font-bold uppercase tracking-wider text-foreground/80">Motivo</div>
                <div className="grid grid-cols-2 gap-2">
                  {CANCEL_REASONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setCancelReason(r)}
                      className={cn(
                        "h-10 px-3 rounded-lg border text-xs font-bold text-left transition-colors cursor-pointer",
                        cancelReason === r ? "bg-foreground text-background border-foreground" : "bg-card border-border text-foreground/80 hover:bg-muted"
                      )}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                {cancelReason === 'Outro' && (
                  <Textarea
                    autoFocus
                    value={cancelOther}
                    onChange={(e) => setCancelOther(e.target.value)}
                    placeholder="Descreva o motivo"
                    className="min-h-[70px] text-sm"
                  />
                )}
                {groupedPayment && (
                  <p className="text-xs font-semibold text-warning">Esta O.S. faz parte de um pagamento agrupado; o grupo não é alterado.</p>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="ghost" onClick={() => setIsCancelOpen(false)} className="h-9 px-3 text-xs font-bold uppercase tracking-wider">Voltar</Button>
                <Button
                  onClick={handleCancelOrder}
                  disabled={!cancelReason || (cancelReason === 'Outro' && !cancelOther.trim())}
                  className="h-9 px-4 rounded-lg bg-foreground text-background hover:bg-foreground/90 text-xs font-bold uppercase tracking-wider gap-2"
                >
                  <Ban className="w-4 h-4" /> Cancelar O.S.
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* ═══ MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE O.S. AGRUPADA ═══ */}
        {isDeleteGroupedConfirmOpen && order && groupedPayment && (
          <Dialog open={isDeleteGroupedConfirmOpen} onOpenChange={setIsDeleteGroupedConfirmOpen}>
            <DialogContent className="max-w-md bg-card border border-border p-6 rounded-xl shadow-2xl space-y-4">
              <DialogHeader>
                <DialogTitle className="text-base font-bold text-danger uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" /> Excluir O.S. #{order.id}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-3 py-1">
                <div className="bg-danger/10 border border-danger/20 p-3 rounded-lg text-danger text-xs font-semibold space-y-1">
                  <p className="font-bold uppercase tracking-wider">Atenção: O.S. Pertence a um Pagamento Agrupado!</p>
                  <p className="text-xs leading-relaxed">
                    Esta O.S. faz parte de um pagamento agrupado com outras {groupedPayment.osIds.length - 1} O.S. (#{groupedPayment.osIds.filter(id => id !== order.id).join(', #')}).
                  </p>
                </div>

                {groupedPayment.osIds.length === 2 ? (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Ao excluir a O.S. #{order.id}, restará apenas 1 O.S. no grupo. Você deseja <strong>desfazer o agrupamento completamente</strong> ou <strong>manter o grupo ajustado com a O.S. restante</strong>?
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    A exclusão removerá esta O.S. do grupo e recalculará o valor total e o saldo restante do pagamento agrupado.
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-border">
                {groupedPayment.osIds.length === 2 ? (
                  <>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={async () => {
                        setIsDeleteGroupedConfirmOpen(false);
                        await deleteOrder(order.id, { dissolveGroupIfOneLeft: true });
                        onClose();
                      }}
                      className="w-full text-xs font-bold uppercase tracking-wider h-9"
                    >
                      DESFAZER AGRUPAMENTO E EXCLUIR O.S.
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        setIsDeleteGroupedConfirmOpen(false);
                        await deleteOrder(order.id, { dissolveGroupIfOneLeft: false });
                        onClose();
                      }}
                      className="w-full text-xs font-bold uppercase tracking-wider h-9 border-info/30 text-info"
                    >
                      MANTER GRUPO REAJUSTADO E EXCLUIR O.S.
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={async () => {
                      setIsDeleteGroupedConfirmOpen(false);
                      await deleteOrder(order.id);
                      onClose();
                    }}
                    className="w-full text-xs font-bold uppercase tracking-wider h-9"
                  >
                    CONFIRMAR EXCLUSÃO DA O.S.
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsDeleteGroupedConfirmOpen(false)}
                  className="w-full text-xs font-bold uppercase tracking-wider h-8 text-muted-foreground"
                >
                  CANCELAR
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* ═══ MODAL DE DESFAZER AGRUPAMENTO DE PAGAMENTO ═══ */}
        {isDissolveModalOpen && groupedPayment && (
          <Dialog open={isDissolveModalOpen} onOpenChange={setIsDissolveModalOpen}>
            <DialogContent className="max-w-md bg-card border border-border p-6 rounded-xl shadow-2xl space-y-4">
              <DialogHeader>
                <DialogTitle className="text-base font-bold uppercase tracking-wider flex items-center gap-2 text-info">
                  <Unlink className="w-5 h-5 stroke-[2.5]" /> Desfazer Agrupamento?
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-3 py-1">
                <div className="bg-secondary p-3 rounded-lg space-y-1.5 text-xs border border-border">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground uppercase font-bold text-xs">O.S. Incluídas:</span>
                    <span className="font-bold font-mono text-foreground">{groupedPayment.osIds.length} O.S. (#{groupedPayment.osIds.join(', #')})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground uppercase font-bold text-xs">Valor Total do Grupo:</span>
                    <span className="font-mono font-bold text-foreground">
                      {groupedPayment.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground uppercase font-bold text-xs">Valor Já Pago:</span>
                    <span className="font-mono font-bold text-success">
                      {groupedPayment.valorPago.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                </div>

                {groupedPayment.valorPago > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      O grupo possui <strong>{groupedPayment.valorPago.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong> já pagos. O que você deseja fazer com este valor ao desfazer o agrupamento?
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Ao desfazer o agrupamento, cada O.S. voltará a ser tratada individualmente como <strong>Aguardando Pagamento</strong>.
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-border">
                {groupedPayment.valorPago > 0 ? (
                  <>
                    <Button
                      size="sm"
                      onClick={async () => {
                        setIsDissolveModalOpen(false);
                        await dissolveGroupedPayment(groupedPayment.id, { actionOnPaid: 'distribute' });
                      }}
                      className="w-full text-xs font-bold uppercase tracking-wider h-9 solid-btn"
                    >
                      DISTRIBUIR VALOR PAGO PROPORCIONALMENTE
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        setIsDissolveModalOpen(false);
                        await dissolveGroupedPayment(groupedPayment.id, { actionOnPaid: 'discard' });
                      }}
                      className="w-full text-xs font-bold uppercase tracking-wider h-9 border-warning/30 text-warning"
                    >
                      DESCARTAR HISTÓRICO E RESETAR O.S.
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={async () => {
                      setIsDissolveModalOpen(false);
                      await dissolveGroupedPayment(groupedPayment.id, { actionOnPaid: 'discard' });
                    }}
                    className="w-full text-xs font-bold uppercase tracking-wider h-9"
                  >
                    DESFAZER AGRUPAMENTO
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsDissolveModalOpen(false)}
                  className="w-full text-xs font-bold uppercase tracking-wider h-8 text-muted-foreground"
                >
                  CANCELAR
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      {/* Perfil do cliente por cima do modal */}
      {client && (
        <ClientProfilePanel
          clientId={client.id}
          currentOrderId={order.id}
          open={showClientProfile}
          onOpenChange={setShowClientProfile}
          onOpenOrder={(o) => { setShowClientProfile(false); onOpenOrder?.(o); }}
        />
      )}
      </DialogContent>
    </Dialog>
  );
}
