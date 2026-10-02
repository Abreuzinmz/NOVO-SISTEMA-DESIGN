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
  User,
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
import { PaymentEntryModal, PaymentEntryItem } from './resumo-financeiro';

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

export function OSViewModal({
  order: orderProp,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onFinish
}: OSViewModalProps) {
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

  if (!order) return null;

  const client = clients.find(c => c.id === order.clientId);

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
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-secondary text-secondary-foreground border border-border">
          <span className="w-1.5 h-1.5 rounded-full bg-secondary-foreground/60 shrink-0" />
          NA FILA
        </span>
      );
      case 'Em Andamento': return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#0EA5E9]/10 text-[#0EA5E9] dark:text-[#38BDF8] border border-[#0EA5E9]/20 dark:border-[#38BDF8]/20">
          <span className="w-1.5 h-1.5 rounded-full bg-[#0EA5E9] dark:bg-[#38BDF8] shrink-0" />
          EM ANDAMENTO
        </span>
      );
      case 'Aguardando Peça': return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
          AGUARDANDO PEÇA
        </span>
      );
      case 'Pronto': return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#34C759]/10 text-[#34C759] border border-[#34C759]/20">
          <span className="w-1.5 h-1.5 rounded-full bg-[#34C759] shrink-0" />
          PRONTO
        </span>
      );
      case 'Levou': return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
          LEVOU
        </span>
      );
    }
  };

  const getStatusOptionLabel = (status: ServiceStatus) => {
    switch (status) {
      case 'Na Fila': return (
        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
          Na Fila
        </span>
      );
      case 'Em Andamento': return (
        <span className="flex items-center gap-1.5 text-xs font-bold text-[#0EA5E9] dark:text-[#38BDF8]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#0EA5E9] dark:bg-[#38BDF8] shrink-0" />
          Em Andamento
        </span>
      );
      case 'Aguardando Peça': return (
        <span className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
          Aguardando Peça
        </span>
      );
      case 'Pronto': return (
        <span className="flex items-center gap-1.5 text-xs font-bold text-[#34C759]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#34C759] shrink-0" />
          Pronto
        </span>
      );
      case 'Levou': return (
        <span className="flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
          Levou
        </span>
      );
    }
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case 'Não Pago': return (
        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#FF5A5F]/10 text-[#FF5A5F] border border-[#FF5A5F]/20">
          PENDENTE
        </span>
      );
      case 'Entrada': return (
        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          ENTRADA
        </span>
      );
      case 'Pago': return (
        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#34C759]/10 text-[#34C759] border border-[#34C759]/20">
          PAGO
        </span>
      );
      default: return (
        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-secondary text-secondary-foreground border border-border">
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
        className="print-friendly-modal w-[min(1100px,calc(100vw-48px))] max-h-[calc(100vh-48px)] p-0 border border-neutral-300 dark:border-neutral-800 bg-card rounded-2xl overflow-hidden shadow-[0_12px_24px_-4px_rgba(0,0,0,0.08),_0_4px_12px_-2px_rgba(0,0,0,0.04)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.4)] outline-none flex flex-col gap-0 print:block print:!static print:!w-full print:!max-w-none print:!h-auto print:border-none print:shadow-none print:bg-white print:overflow-visible"
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

        <div className="flex flex-col flex-1 min-h-0 print:hidden">

          {/* ═══ HEADER ═══ */}
          <div className="shrink-0 border-b border-neutral-300 dark:border-neutral-800 bg-card p-5 flex items-start justify-between print:px-0 print:bg-white">
            <div className="flex items-start gap-4">
              <div
                className="py-[11px] px-[16px] rounded-[10px] border border-[#e0e0e0] dark:border-neutral-800 border-l-[4px] bg-white dark:bg-neutral-900 flex flex-col items-center justify-center shadow-sm overflow-hidden shrink-0 select-none"
                style={{ borderLeftColor: getStatusBorderColor(isEditingStatus ? editServiceStatus : order.serviceStatus) }}
              >
                <span className="font-black text-xl tracking-tighter text-blue-600 dark:text-blue-400">
                  #{String(order.osNumber || order.id).padStart(4, '0')}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mt-1">
                  O.S. Nº
                </span>
              </div>
              <div className="pt-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-foreground uppercase tracking-tight flex items-baseline gap-1.5 flex-wrap">
                    <span>{client?.name || 'CLIENTE REMOVIDO'}</span>
                    {client?.nickname && (
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400 normal-case shrink-0">
                        ({client.nickname.toUpperCase()})
                      </span>
                    )}
                  </h2>
                  {client && (
                    <span className={cn(
                      "inline-flex items-center px-1.5 py-0.5 text-[9px] font-extrabold tracking-widest uppercase rounded border",
                      client.clientType === 'mechanic'
                        ? "bg-[#0EA5E9]/10 text-[#0EA5E9] border-[#0EA5E9]/20"
                        : "bg-secondary text-secondary-foreground border-border"
                    )}>
                      {client.clientType === 'mechanic' ? 'MECÂNICO' : 'CLIENTE'}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-1.5 mt-2">
                  {(client?.phone || client?.document?.trim()) && (
                    <div className="flex items-center gap-4">
                      {client?.phone && (
                        <div className="text-sm font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                          <Phone className="w-4 h-4 stroke-[2.5] shrink-0 text-neutral-500 dark:text-neutral-400" />
                          <span>{client.phone}</span>
                        </div>
                      )}
                      {client?.document?.trim() && (
                        <div className="text-sm font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                          <FileText className="w-4 h-4 stroke-[2.5] shrink-0 text-neutral-500 dark:text-neutral-400" />
                          <span>CPF/CNPJ: {client.document}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {client?.city?.trim() && (
                    <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 stroke-[2] shrink-0" />
                      <span>Cidade: {client.city}</span>
                    </div>
                  )}
                  {order.mechanicId && (
                    (() => {
                      const m = clients.find(c => c.id === order.mechanicId);
                      const nickname = m?.nickname || order.mechanicNickname;
                      const name = m?.name || order.mechanicName;
                      const displayName = nickname ? nickname.toUpperCase() : name;
                      return displayName ? (
                        <div className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5 mt-0.5">
                          <User className="w-4 h-4 stroke-[2.5] shrink-0 text-neutral-500 dark:text-neutral-400" />
                          <span>Mecânico: {displayName}</span>
                        </div>
                      ) : null;
                    })()
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="text-right flex flex-col items-end gap-2 print:hidden">
                {isEditingStatus ? (
                  <>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={handleSaveStatus}
                        disabled={isSubmittingPayment}
                        className="h-8 px-3 rounded-lg bg-[#34C759] hover:bg-[#34C759]/90 text-white font-black text-[10px] uppercase tracking-wider gap-1 shadow-sm disabled:opacity-50"
                      >
                        {isSubmittingPayment ? (
                          <span>SALVANDO...</span>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" /> SALVAR
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={handleDiscardStatus}
                        disabled={isSubmittingPayment}
                        variant="outline"
                        className="h-8 px-3 rounded-lg border-border bg-background hover:bg-secondary text-foreground font-black text-[10px] uppercase tracking-wider gap-1 shadow-sm disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" /> CANCELAR
                      </Button>
                    </div>
                    <Select value={editServiceStatus} onValueChange={(val) => setEditServiceStatus(val as ServiceStatus)}>
                      <SelectTrigger className="premium-input h-8 rounded-lg text-xs font-bold bg-card border-neutral-300 dark:border-neutral-800 w-[160px] flex justify-between gap-1.5">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent className="z-[9999] bg-white dark:bg-[#0A0A0C] border border-neutral-300 dark:border-neutral-800 rounded-lg shadow-2xl">
                        <SelectItem value="Na Fila">{getStatusOptionLabel("Na Fila")}</SelectItem>
                        <SelectItem value="Em Andamento">{getStatusOptionLabel("Em Andamento")}</SelectItem>
                        <SelectItem value="Aguardando Peça">{getStatusOptionLabel("Aguardando Peça")}</SelectItem>
                        <SelectItem value="Pronto">{getStatusOptionLabel("Pronto")}</SelectItem>
                        <SelectItem value="Levou">{getStatusOptionLabel("Levou")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={() => setIsEditingStatus(true)}
                      variant="outline"
                      className="h-8 px-3 rounded-lg border-border bg-background hover:bg-secondary text-foreground font-black text-[10px] uppercase tracking-wider gap-1.5 shadow-sm"
                    >
                      <Pencil className="w-3.5 h-3.5" /> EDITAR
                    </Button>
                    <div className="flex flex-col items-end gap-1.5">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(order.serviceStatus)}
                        {getPaymentBadge(order.paymentStatus)}
                      </div>
                      {order.statusObservation && (
                        <div className="text-[10px] text-muted-foreground font-semibold max-w-[180px] break-words text-right">
                          {order.statusObservation}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">
                        Abertura: {order.arrivalDate ? new Date(order.arrivalDate + 'T12:00:00').toLocaleDateString('pt-BR') : new Date(order.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                      {order.finished && (order.finishedAt || order.deliveryDate) && (
                        <>
                          <span className="text-xs font-bold text-muted-foreground/40">•</span>
                          <span className="text-xs font-bold text-[#10B981]">
                            Finalizado em: {new Date(order.finishedAt || (order.deliveryDate as string) + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </span>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
              <DialogClose render={
                <Button variant="outline" size="icon" className="w-8 h-8 rounded-lg border-border bg-background hover:bg-secondary shrink-0 print:hidden">
                  <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                </Button>
              } />
            </div>
          </div>

          {/* ═══ BODY ═══ */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
            {/* Top Section: Motor + Cards + Financial */}
            <div className="flex flex-col md:flex-row p-5 gap-5 min-w-0">
              {/* Left Column: Motor & Materials */}
              <div className="flex-1 min-w-0 space-y-5">
                {/* Top Row: Material Deixado / Peças Adicionais (left) + Motor (right) */}
                <div className={cn(
                  "grid gap-4 items-stretch",
                  showPartsLeft ? "grid-cols-1 sm:grid-cols-[1.6fr_1fr]" : "grid-cols-1"
                )}>
                    {showPartsLeft && (
                      <div className="border border-neutral-300 dark:border-neutral-800 rounded-xl bg-background p-4 shadow-sm min-w-0">
                        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-600 dark:text-neutral-300 block mb-3">MATERIAL DEIXADO</span>
                        {isEditing ? (
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
                                    className="flex-1 h-8 px-2 py-1 text-xs font-semibold uppercase bg-card"
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
                              className="mt-1 h-8 rounded border-dashed text-[10px] font-black uppercase tracking-wider"
                            >
                              <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
                            </Button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {order.partsLeft && order.partsLeft.map((p, i) => {
                              const [name, qtyStr] = p.includes('|') ? p.split('|') : [p, '1'];
                              const qty = parseInt(qtyStr) || 1;
                              return (
                                <div
                                  key={i}
                                  className="flex items-center gap-1.5 border border-neutral-300 dark:border-neutral-800 bg-secondary/50 px-3 py-1.5 rounded-lg transition-all hover:bg-secondary/60"
                                >
                                  {qty > 1 && (
                                    <span className="text-xs font-black text-foreground shrink-0">
                                      ({qty})
                                    </span>
                                  )}
                                  <span className="text-xs font-bold uppercase tracking-tight text-foreground">
                                    {name}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                  {/* Motor */}
                  <div className="border border-neutral-300 dark:border-neutral-800 rounded-xl bg-background p-4 shadow-sm min-w-0">
                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-600 dark:text-neutral-300 block mb-3">MOTOR</span>
                    <div className="space-y-2">
                      {motors.map((m, idx) => (
                        <div key={idx} className="flex items-center flex-wrap gap-x-3 gap-y-1">
                          <span className="font-black text-sm uppercase tracking-wide text-foreground">
                            {m.model || 'MOTOR NÃO INFORMADO'}
                          </span>
                          {m.displacement && (
                            <span className="font-black text-sm uppercase tracking-wide text-foreground">
                              {m.displacement}
                            </span>
                          )}
                          {m.cylinders && (
                            <span className="font-black text-sm uppercase tracking-wide text-foreground">
                              {m.cylinders}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Peças Adicionais: full-width row so chips can stay on a single line */}
                {showAdditionalParts && (
                  <div className="border border-neutral-300 dark:border-neutral-800 rounded-xl bg-background p-4 shadow-sm">
                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-600 dark:text-neutral-300 block mb-3">PEÇAS ADICIONAIS</span>
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
                                className="flex-1 h-8 px-2 py-1 text-xs font-semibold uppercase bg-card"
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
                          className="mt-1 h-8 rounded border-dashed text-[10px] font-black uppercase tracking-wider"
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
                              className="flex items-center gap-1.5 border border-neutral-300 dark:border-neutral-800 bg-secondary/50 px-3 py-1.5 rounded-lg transition-all hover:bg-secondary/60"
                            >
                              {qty > 1 && (
                                <span className="text-xs font-black text-foreground shrink-0">
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
                <div className="border border-neutral-300 dark:border-neutral-800 rounded-xl bg-background overflow-hidden shadow-sm">
                  <div className="bg-secondary/30 px-4 py-3 border-b border-neutral-300 dark:border-neutral-800 flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-600 dark:text-neutral-300">SERVIÇOS EXECUTADOS</span>
                    <span className="text-[10px] font-black text-neutral-700 dark:text-neutral-300 bg-secondary/60 px-2 py-0.5 rounded border border-neutral-300 dark:border-neutral-800">
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
                              className="flex-1 h-8 px-2 py-1 text-xs font-semibold uppercase bg-card"
                            />
                            <Input
                              type="text"
                              value={s.measure || ''}
                              placeholder="Medida (Ex: 0.25)"
                              onChange={(e) => handleUpdateService(idx, 'measure', e.target.value.toUpperCase())}
                              className="w-28 h-8 px-2 py-1 text-xs font-semibold uppercase bg-card"
                            />
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-neutral-600 dark:text-neutral-300 uppercase">Valor:</span>
                              <div className="relative group">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-primary/90 text-[10px] font-mono font-black">R$</span>
                                <Input
                                  type="number"
                                  value={s.value}
                                  min="0"
                                  onChange={(e) => handleUpdateService(idx, 'value', parseFloat(e.target.value) || 0)}
                                  className="w-24 h-8 pl-7 pr-2 py-1 text-xs font-mono font-semibold bg-card"
                                />
                              </div>
                              <span className="text-[10px] font-black text-neutral-600 dark:text-neutral-300 uppercase ml-1">Qtd:</span>
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
                      <div className="p-3 bg-secondary/20 border-t border-neutral-300 dark:border-neutral-800">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAddService}
                          className="w-full h-8 rounded border-dashed text-[10px] font-black uppercase tracking-wider bg-card border-neutral-300 dark:border-neutral-800"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar Serviço
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="divide-y divide-neutral-200 dark:divide-neutral-800/80">
                      {order.services.map((s) => (
                        <div key={s.id} className="flex justify-between items-center px-4 py-3 text-sm hover:bg-secondary/20 transition-colors">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-black uppercase tracking-tight text-foreground truncate">
                              {s.id === 'eix-retificar' && s.measure ? `Retificar Eixo — ${s.measure}` : s.name}
                            </span>
                            {s.measure && s.id !== 'eix-retificar' && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-neutral-300 dark:border-neutral-750">
                                {s.measure}
                              </span>
                            )}
                            {s.quantity > 1 && (
                              <span className="text-[10px] font-black px-1.5 py-0.5 bg-secondary/80 rounded border border-neutral-300 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300">
                                ×{s.quantity}
                              </span>
                            )}
                          </div>
                          <span className="font-mono font-black text-[#10B981] tracking-tight shrink-0">
                            {(s.value * s.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        </div>
                      ))}
                      {order.services.length === 0 && (
                        <div className="px-4 py-8 text-center text-xs text-neutral-500 dark:text-neutral-400 font-bold uppercase tracking-widest italic">
                          Nenhum serviço registrado
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Card de Observações */}
                {(((order.observations && order.observations.replace(/\[ENTRADAS_JSON:\[[\s\S]*?\]\]/i, "").trim().length > 0)) || isEditing) && (
                  <div className="border border-neutral-300 dark:border-neutral-800 rounded-xl bg-background overflow-hidden shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="bg-secondary/30 px-4 py-3 border-b border-neutral-300 dark:border-neutral-800 flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase tracking-widest text-neutral-600 dark:text-neutral-300">OBSERVAÇÕES</span>
                    </div>
                    <div className="p-4 text-xs font-semibold">
                      {isEditing ? (
                        <Textarea
                          value={editObservations}
                          onChange={(e) => setEditObservations(e.target.value)}
                          placeholder="ADICIONAR OBSERVAÇÕES..."
                          className="min-h-[100px] w-full p-3 border border-neutral-300 dark:border-neutral-800 bg-card rounded-lg focus:outline-none focus:border-secondary-foreground transition-all text-xs font-semibold uppercase resize-y leading-relaxed"
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

              {/* Right Column: Financial Card */}
              <div className="w-full md:w-[320px] shrink-0 min-w-0 border border-neutral-300 dark:border-neutral-800 rounded-xl bg-secondary/20 p-4 shadow-sm flex flex-col">
                <div className="space-y-3 flex-1">
                  {groupedPayment ? (
                    /* ═══ REFORMULADO: CARD DE PAGAMENTO AGRUPADO ═══ */
                    <div className="space-y-2 animate-in fade-in duration-200">
                      {/* Status no topo, fora/acima do card principal */}
                      <div className="text-center font-black text-sm tracking-wide py-0.5">
                        <span
                          className={
                            groupedPayment.status === 'pago'
                              ? 'text-green-600 dark:text-green-400'
                              : groupedPayment.status === 'pagamento_parcial'
                              ? 'text-amber-500 dark:text-amber-400'
                              : 'text-[#FF5A5F]'
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
                      <div className="bg-card border border-neutral-300 dark:border-neutral-800 rounded-2xl p-4 space-y-3 shadow-xs">
                        {/* Cabeçalho do Card (Label + Botão Desfazer) */}
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground/70">
                            HISTÓRICO DE ENTRADAS ({groupedPayment.entradas?.length || 0})
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsDissolveModalOpen(true)}
                            title="Desfazer este Pagamento Agrupado"
                            className="h-6 px-2 text-[10px] font-black text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded uppercase flex items-center gap-1 cursor-pointer"
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
                                className="bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/15 rounded-xl p-2.5 space-y-1"
                              >
                                <div className="flex justify-between items-center gap-2">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wide truncate">
                                      {e.originalNum}. {e.formaPagamento.toUpperCase()}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <span className="text-xs font-black font-mono text-indigo-600 dark:text-indigo-400">
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
                                      className="w-5 h-5 rounded flex items-center justify-center text-indigo-500/70 hover:text-indigo-600 hover:bg-indigo-500/10 transition-colors ml-1"
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      title="Remover lançamento"
                                      onClick={() => e.id && handleGroupedDeleteEntrada(e.id)}
                                      className="w-5 h-5 rounded flex items-center justify-center text-red-500/70 hover:text-red-600 hover:bg-red-500/10 transition-colors"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>

                                <div className="flex justify-between items-center text-[10px] pt-1 border-t border-indigo-500/10">
                                  <span className="text-muted-foreground font-black uppercase">DATA:</span>
                                  <span className="font-mono font-bold text-foreground">{formatDate(e.data)}</span>
                                </div>

                                {e.nomePagador && e.nomePagador.trim() !== '' && (
                                  <div className="pt-1 border-t border-indigo-500/10 text-[10px]">
                                    <span className="text-muted-foreground font-black uppercase block">PAGADOR:</span>
                                    <span className="font-black text-foreground uppercase break-words leading-tight block mt-0.5">
                                      {e.nomePagador.toUpperCase()}
                                    </span>
                                  </div>
                                )}

                                {e.observacao && (
                                  <div className="text-[10px] text-muted-foreground italic pt-0.5">
                                    {e.observacao}
                                  </div>
                                )}
                              </div>
                            ))}

                            {sortedGroupEntradas.length > 2 && (
                              <button
                                type="button"
                                onClick={() => setShowAllEntradas(prev => !prev)}
                                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center justify-center w-full py-1 cursor-pointer transition-colors"
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
                        <div className="space-y-1.5 pt-2.5 border-t border-dashed border-neutral-200 dark:border-neutral-800 text-xs">
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

                          <div className="flex justify-end items-center gap-1.5 pt-2 text-xs font-black text-foreground text-right whitespace-nowrap">
                            <span>TOTAL DO GRUPO</span>
                            <span className="font-mono">{groupedPayment.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                          </div>

                          {groupedPayment.status !== 'pago' ? (
                            <div className="flex justify-end items-center gap-1.5 text-xs font-black text-amber-500 dark:text-amber-400 text-right whitespace-nowrap">
                              <span>RESTANTE (SALDO)</span>
                              <span className="font-mono">{Math.max(0, groupedPayment.valorTotal - groupedPayment.valorPago).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </div>
                          ) : (
                            <div className="flex justify-end items-center text-xs font-black text-green-600 dark:text-green-400 text-right whitespace-nowrap">
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
                              className="w-full max-w-[220px] h-8 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-wider gap-1.5 shadow-sm rounded-lg cursor-pointer"
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
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 block">SITUAÇÃO</span>
                          <span className="text-xs font-bold text-[#FF5A5F] bg-[#FF5A5F]/10 border border-[#FF5A5F]/20 px-3 py-1 rounded-full inline-block">
                            AGUARDANDO PAGAMENTO
                          </span>
                        </div>
                      )}

                      {/* ═══ ENTRADA / PARCIAL ═══ */}
                      {order.paymentStatus === 'Entrada' && (
                        <div className="bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 space-y-2.5 animate-in fade-in duration-200">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] uppercase tracking-widest text-blue-600 dark:text-blue-400 font-black">
                              STATUS DO PAGAMENTO
                            </span>
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-[9px] font-black tracking-widest uppercase animate-pulse">
                              PAGO PARCIAL
                            </Badge>
                          </div>
                          <div className="space-y-2 pt-0.5">
                            {getEntries().map((entry: any, index: number) => {
                              const methodText = String(entry.method || 'PIX')
                                .replace(/pix/i, 'PIX')
                                .replace(/dinheiro/i, 'DINHEIRO')
                                .replace(/débito|debito/i, 'DÉBITO')
                                .replace(/crédito|credito/i, 'CRÉDITO')
                                .toUpperCase();
                              const entryAmount = parseFloat(entry.amount) || 0;
                              return (
                                <div key={entry.id || index} className="bg-white dark:bg-zinc-950 border border-blue-500/10 dark:border-blue-500/5 rounded-lg p-2.5 space-y-1.5 shadow-xs">
                                  <div className="flex justify-between items-center border-b border-blue-500/10 pb-1 mb-1">
                                    <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                                      {index + 1}. {methodText}
                                    </span>
                                    <div className="flex items-center gap-1">
                                      <span className="font-mono font-black text-blue-600 dark:text-blue-400 text-xs">
                                        {entryAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                      </span>
                                      <button
                                        type="button"
                                        title="Editar lançamento"
                                        onClick={() => setPaymentEntryModal({
                                          mode: 'edit',
                                          entry: { id: entry.id, amount: entryAmount, method: entry.method, date: entry.date, payer: entry.payer },
                                          index,
                                          totalValue: order.totalValue,
                                          paidElsewhere: Math.max(0, getEntries().reduce((s: number, c: any) => s + (parseFloat(c.amount) || 0), 0) - entryAmount),
                                          discount: order.discount || 0,
                                          showDiscount: true,
                                        })}
                                        className="w-5 h-5 rounded flex items-center justify-center text-blue-500/70 hover:text-blue-600 hover:bg-blue-500/10 transition-colors ml-1"
                                      >
                                        <Pencil className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        title="Remover lançamento"
                                        onClick={() => handleIndividualDeleteEntrada(entry.id, index)}
                                        className="w-5 h-5 rounded flex items-center justify-center text-red-500/70 hover:text-red-600 hover:bg-red-500/10 transition-colors"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                  {entry.date && (
                                    <div className="flex justify-between items-center text-[10px] text-foreground">
                                      <span className="text-muted-foreground uppercase font-black">DATA:</span>
                                      <span className="font-mono font-bold">{formatDate(entry.date)}</span>
                                    </div>
                                  )}
                                  {entry.payer && entry.payer.trim() && (
                                    <div className="flex flex-col gap-0.5 text-[10px] pt-1 border-t border-dashed border-blue-500/5 mt-1">
                                      <span className="text-muted-foreground uppercase font-black">PAGADOR:</span>
                                      <span className="font-black uppercase break-words leading-tight mt-0.5">
                                        {entry.payer.toUpperCase()}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* ═══ PAGO (INTEGRAL OU DUAS ETAPAS) ═══ */}
                      {order.paymentStatus === 'Pago' && (
                        <div className="bg-green-500/5 dark:bg-green-500/10 border border-green-500/20 rounded-xl p-3 space-y-2.5 animate-in fade-in duration-200">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] uppercase tracking-widest text-green-600 dark:text-green-400 font-black">
                              STATUS DO PAGAMENTO
                            </span>
                            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-[9px] font-black tracking-widest uppercase">
                              TOTAL QUITADO
                            </Badge>
                          </div>
                          <div className="space-y-2 pt-0.5">
                            {getEntries().map((entry: any, index: number) => {
                              const methodText = String(entry.method || 'PIX')
                                .replace(/pix/i, 'PIX')
                                .replace(/dinheiro/i, 'DINHEIRO')
                                .replace(/débito|debito/i, 'DÉBITO')
                                .replace(/crédito|credito/i, 'CRÉDITO')
                                .toUpperCase();
                              const entryAmount = parseFloat(entry.amount) || 0;
                              return (
                                <div key={entry.id || index} className="bg-white dark:bg-zinc-950 border border-green-500/10 dark:border-green-500/5 rounded-lg p-2.5 space-y-1.5 shadow-xs">
                                  <div className="flex justify-between items-center border-b border-green-500/10 pb-1 mb-1">
                                    <span className="text-[10px] font-black text-green-600 dark:text-green-400 uppercase tracking-wider">
                                      {index + 1}. {methodText}
                                    </span>
                                    <div className="flex items-center gap-1">
                                      <span className="font-mono font-black text-green-600 dark:text-green-400 text-xs">
                                        {entryAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                      </span>
                                      <button
                                        type="button"
                                        title="Editar lançamento"
                                        onClick={() => setPaymentEntryModal({
                                          mode: 'edit',
                                          entry: { id: entry.id, amount: entryAmount, method: entry.method, date: entry.date, payer: entry.payer },
                                          index,
                                          totalValue: order.totalValue,
                                          paidElsewhere: Math.max(0, getEntries().reduce((s: number, c: any) => s + (parseFloat(c.amount) || 0), 0) - entryAmount),
                                          discount: order.discount || 0,
                                          showDiscount: true,
                                        })}
                                        className="w-5 h-5 rounded flex items-center justify-center text-green-500/70 hover:text-green-600 hover:bg-green-500/10 transition-colors ml-1"
                                      >
                                        <Pencil className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        title="Remover lançamento"
                                        onClick={() => handleIndividualDeleteEntrada(entry.id, index)}
                                        className="w-5 h-5 rounded flex items-center justify-center text-red-500/70 hover:text-red-600 hover:bg-red-500/10 transition-colors"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                  {entry.date && (
                                    <div className="flex justify-between items-center text-[10px] text-foreground">
                                      <span className="text-muted-foreground uppercase font-black">DATA:</span>
                                      <span className="font-mono font-bold">{formatDate(entry.date)}</span>
                                    </div>
                                  )}
                                  {entry.payer && entry.payer.trim() && (
                                    <div className="flex flex-col gap-0.5 text-[10px] pt-1 border-t border-dashed border-green-500/5 mt-1">
                                      <span className="text-muted-foreground uppercase font-black">PAGADOR:</span>
                                      <span className="font-black uppercase break-words leading-tight mt-0.5">
                                        {entry.payer.toUpperCase()}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {!groupedPayment && (
                  <div className="pt-3 mt-3 flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-xs font-semibold text-muted-foreground">
                      <span>Valor Total</span>
                      <span className="font-mono">
                        {isEditing ? editTotalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : order.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                    {order.discount && Number(order.discount) > 0 ? (
                      <div className="flex justify-between items-center text-xs font-semibold text-muted-foreground">
                        <span>Desconto</span>
                        <span className="font-mono text-amber-500 dark:text-amber-400">
                          {order.discount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>
                    ) : null}
                    <hr className="border-neutral-300 dark:border-neutral-800 my-0.5" />
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-black uppercase tracking-widest text-foreground">TOTAL FINAL</span>
                      <span className="text-2xl font-black font-mono text-foreground tracking-tight">
                        {isEditing ? editNetValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : order.netValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                    {order.paymentStatus === 'Entrada' && getEntries().length > 0 && (
                      <div className="flex justify-between items-center text-xs font-black text-amber-500 pt-0.5">
                        <span className="uppercase tracking-wider">Restante (Saldo)</span>
                        <span className="font-mono">
                          {Math.max(0, (isEditing ? editNetValue : order.netValue) - getEntries().reduce((acc: number, curr: any) => acc + (parseFloat(curr.amount) || 0), 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>
                    )}

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
                          className="w-full max-w-[220px] h-8 bg-[#00ac56] hover:bg-[#00964b] text-white font-black text-[10px] uppercase tracking-wider gap-1.5 shadow-sm rounded-lg cursor-pointer"
                        >
                          <DollarSign className="w-3.5 h-3.5 stroke-[2.5]" />
                          {order.paymentStatus === 'Entrada' ? 'FINALIZAR PAGAMENTO' : 'REGISTRAR PAGAMENTO'}
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
                          className="w-full max-w-[220px] h-8 border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-[10px] uppercase tracking-wide gap-1.5 rounded-xl"
                        >
                          <Layers className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">AGRUPAR PAGAMENTO CONJUNTO</span>
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ═══ FOOTER ═══ */}
          <div className="shrink-0 p-5 border-t border-neutral-300 dark:border-neutral-800 bg-card print:hidden">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                disabled={isEditingStatus}
                onClick={() => setIsPreviewOpen(true)}
                className="h-8 px-3 rounded-md text-muted-foreground hover:text-foreground gap-2 text-[10px] font-black uppercase tracking-wider disabled:opacity-50"
              >
                <Printer className="w-4 h-4 stroke-[2]" /> IMPRIMIR RELATÓRIO
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
                  className="h-8 px-3 rounded-md text-[#FF5A5F] hover:bg-[#FF5A5F]/10 gap-2 text-[10px] font-black uppercase tracking-wider disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4 stroke-[2]" /> EXCLUIR O.S.
                </Button>
                {onEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isEditingStatus}
                    onClick={() => order && onEdit?.(order)}
                    className="h-8 px-3 rounded-md border-neutral-300 dark:border-neutral-800 bg-background hover:bg-secondary text-foreground gap-2 text-[10px] font-black uppercase tracking-wider disabled:opacity-50"
                  >
                    <Edit className="w-4 h-4 stroke-[2]" /> EDITAR O.S.
                  </Button>
                )}
                {order && order.paymentStatus === 'Pago' && !order.finished && (
                  <Button
                    onClick={handleConcluir}
                    disabled={isEditingStatus}
                    className="h-8 px-3 rounded-md bg-[#10B981] hover:bg-[#10B981]/90 text-white font-black text-[10px] uppercase tracking-wider gap-2 shadow-sm disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" /> CONCLUIR
                  </Button>
                )}
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
              className="max-w-[340px] p-6 bg-card border border-neutral-300 dark:border-neutral-800 rounded-2xl shadow-2xl flex flex-col gap-4 outline-none"
              finalFocus={false}
            >
              <div className="space-y-1.5">
                <h3 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" /> Status Incompleto
                </h3>
                <p className="text-[11px] text-muted-foreground font-semibold leading-relaxed">
                  Esta O.S. está com o status <strong className="text-foreground">{getStatusOptionLabel(order.serviceStatus)}</strong>. Para concluir, o status precisa estar como <strong className="text-foreground">PRONTO</strong>.
                </p>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isSubmittingPayment}
                  onClick={() => setIsStatusConfirmOpen(false)}
                  className="h-8 px-3 rounded-md text-[10px] font-black uppercase tracking-wider text-muted-foreground hover:text-foreground bg-background border-neutral-300 dark:border-neutral-800 disabled:opacity-50"
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  disabled={isSubmittingPayment}
                  onClick={confirmStatusAndConcluir}
                  className="h-8 px-3 rounded-md bg-[#10B981] hover:bg-[#10B981]/90 text-white font-black text-[10px] uppercase tracking-wider shadow-sm disabled:opacity-50"
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
              className="max-w-[320px] p-6 bg-card border border-neutral-300 dark:border-neutral-800 rounded-2xl shadow-2xl flex flex-col gap-4 outline-none"
              finalFocus={false}
            >
              <div className="space-y-1">
                <h3 className="text-sm font-black text-foreground uppercase tracking-wider">Finalizar O.S.</h3>
                <p className="text-[11px] text-muted-foreground font-semibold leading-relaxed">
                  Informe a data de finalização
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-neutral-600 dark:text-neutral-300 uppercase tracking-widest block">
                  DATA DE FINALIZAÇÃO
                </label>
                <Input
                  type="date"
                  value={concluirDate}
                  onChange={(e) => setConcluirDate(e.target.value)}
                  className="h-9 py-1 px-2.5 rounded-lg text-xs font-bold bg-card border-neutral-300 dark:border-neutral-800 w-full text-center"
                  required
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isSubmittingPayment}
                  onClick={() => setIsConfirmingConcluir(false)}
                  className="h-8 px-3 rounded-md text-[10px] font-black uppercase tracking-wider text-muted-foreground hover:text-foreground bg-background border-neutral-300 dark:border-neutral-800 disabled:opacity-50"
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  disabled={!concluirDate || isSubmittingPayment}
                  onClick={confirmConcluir}
                  className="h-8 px-3 rounded-md bg-[#10B981] hover:bg-[#10B981]/90 text-white font-black text-[10px] uppercase tracking-wider shadow-sm disabled:opacity-50"
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
            <DialogContent className="max-w-lg bg-card text-card-foreground p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-base font-black uppercase tracking-wider flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
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
                            ? 'border-indigo-500 bg-indigo-500/10 dark:bg-indigo-500/20'
                            : 'border-neutral-200 dark:border-neutral-800 bg-background hover:bg-secondary'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                          />
                          <div>
                            <span className="font-mono font-black text-xs block text-foreground">O.S. #{pOrder.id}</span>
                            <span className="text-[10px] text-muted-foreground font-semibold">
                              {pOrder.motorModel} {pOrder.displacement}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-black text-xs text-foreground block">
                            {pNet.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                          {pOrder.discount && Number(pOrder.discount) > 0 ? (
                            <span className="text-[9px] text-amber-500 font-semibold block">
                              Desconto: {Number(pOrder.discount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="bg-secondary/80 p-3 rounded-lg flex justify-between items-center border border-neutral-200 dark:border-neutral-800">
                  <span className="text-xs font-black uppercase text-muted-foreground">Valor Total do Grupo ({selectedOsForGrouping.length} O.S.):</span>
                  <span className="text-lg font-black font-mono text-indigo-600 dark:text-indigo-400">
                    {pendingClientOrders
                      .filter(o => selectedOsForGrouping.includes(o.id))
                      .reduce((sum, o) => sum + getOrderNetValue(o), 0)
                      .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                <Button variant="ghost" size="sm" onClick={() => setIsGroupModalOpen(false)} className="h-8 text-[10px] font-black uppercase">
                  CANCELAR
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
                  className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-wider px-4"
                >
                  {isSubmittingGroup ? 'CRIANDO...' : 'CRIAR PAGAMENTO AGRUPADO'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

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

        {/* ═══ MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE O.S. AGRUPADA ═══ */}
        {isDeleteGroupedConfirmOpen && order && groupedPayment && (
          <Dialog open={isDeleteGroupedConfirmOpen} onOpenChange={setIsDeleteGroupedConfirmOpen}>
            <DialogContent className="max-w-md bg-card border border-neutral-300 dark:border-neutral-800 p-6 rounded-2xl shadow-2xl space-y-4">
              <DialogHeader>
                <DialogTitle className="text-base font-black text-red-600 dark:text-red-400 uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" /> Excluir O.S. #{order.id}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-3 py-1">
                <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-red-700 dark:text-red-300 text-xs font-semibold space-y-1">
                  <p className="font-bold uppercase tracking-wider">Atenção: O.S. Pertence a um Pagamento Agrupado!</p>
                  <p className="text-[11px] leading-relaxed">
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
                      className="w-full text-[10px] font-black uppercase tracking-wider h-9"
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
                      className="w-full text-[10px] font-black uppercase tracking-wider h-9 border-indigo-500/30 text-indigo-600 dark:text-indigo-400"
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
                    className="w-full text-[10px] font-black uppercase tracking-wider h-9"
                  >
                    CONFIRMAR EXCLUSÃO DA O.S.
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsDeleteGroupedConfirmOpen(false)}
                  className="w-full text-[10px] font-black uppercase tracking-wider h-8 text-muted-foreground"
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
            <DialogContent className="max-w-md bg-card border border-neutral-300 dark:border-neutral-800 p-6 rounded-2xl shadow-2xl space-y-4">
              <DialogHeader>
                <DialogTitle className="text-base font-black uppercase tracking-wider flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                  <Unlink className="w-5 h-5 stroke-[2.5]" /> Desfazer Agrupamento?
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-3 py-1">
                <div className="bg-secondary p-3 rounded-lg space-y-1.5 text-xs border border-neutral-200 dark:border-neutral-800">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground uppercase font-black text-[10px]">O.S. Incluídas:</span>
                    <span className="font-bold font-mono text-foreground">{groupedPayment.osIds.length} O.S. (#{groupedPayment.osIds.join(', #')})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground uppercase font-black text-[10px]">Valor Total do Grupo:</span>
                    <span className="font-mono font-black text-foreground">
                      {groupedPayment.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground uppercase font-black text-[10px]">Valor Já Pago:</span>
                    <span className="font-mono font-black text-green-600 dark:text-green-400">
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

              <div className="flex flex-col gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                {groupedPayment.valorPago > 0 ? (
                  <>
                    <Button
                      size="sm"
                      onClick={async () => {
                        setIsDissolveModalOpen(false);
                        await dissolveGroupedPayment(groupedPayment.id, { actionOnPaid: 'distribute' });
                      }}
                      className="w-full text-[10px] font-black uppercase tracking-wider h-9 bg-indigo-600 hover:bg-indigo-700 text-white"
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
                      className="w-full text-[10px] font-black uppercase tracking-wider h-9 border-amber-500/30 text-amber-600 dark:text-amber-400"
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
                    className="w-full text-[10px] font-black uppercase tracking-wider h-9"
                  >
                    DESFAZER AGRUPAMENTO
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsDissolveModalOpen(false)}
                  className="w-full text-[10px] font-black uppercase tracking-wider h-8 text-muted-foreground"
                >
                  CANCELAR
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}
