'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useStore, ServiceItem, Order, ServiceStatus, PaymentStatus, PaymentMethod, Client } from '@/lib/store';
import { ResumoFinanceiro, PagoConfirmationData, PaymentEntryItem, PaymentStatusType } from './resumo-financeiro';
import { DatePicker } from '@/components/ui/date-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MaskedInput } from '@/components/ui/masked-input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus,
  Trash2,
  Pencil,
  UserPlus,
  Users,
  User,
  Calculator,
  Wrench,
  Package,
  Calendar as CalendarIcon,
  BadgeDollarSign,
  Search,
  Check,
  ChevronsUpDown,
  Hash,
  Printer,
  MessageSquare,
  Settings,
  X,
  DollarSign,
  CreditCard,
  Wallet,
  AlertTriangle,
  Phone,
  MapPin,
  FileText,
  Tag,
  MessageCircle,
  Minus,
  Sparkles,
  Smartphone,
  Copy,
  ExternalLink,
  UserX,
  RotateCcw
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
  DialogClose
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { ServiceCatalog } from '@/components/service-catalog';
import { toast } from 'sonner';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { cn, formatMotorDisplay, getLocalDateString } from '@/lib/utils';
import { fetchMotors, fetchModels, addMotor as addMotorToDb, addModel as addModelToDb, deleteMotor as deleteMotorFromDb, deleteModel as deleteModelFromDb, updateModel as updateModelInDb, fetchMotorCatalog, saveCatalogMotor, type CatalogMotor } from '@/lib/motors';
import { MotorSpecsCard } from '@/components/motor-specs-card';
import { PrintPreviewModal } from './print-preview-modal';
import { FormSection, FieldLabel, IconField, ClientTypeToggle, ClientDialogHeader, ClientDialogFooter, iconInputClass, clientDialogClass } from '@/components/client-form';
import { OSPrintReport } from './os-print-report';

const normalizeText = (value: any = ''): string => {
  try {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  } catch (e) {
    console.error('Error normalizing text:', e);
    return '';
  }
};

const normalizeNumber = (value: any = ''): string => {
  try {
    return String(value || '').replace(/\D/g, '');
  } catch (e) {
    console.error('Error normalizing number:', e);
    return '';
  }
};

const getInitials = (name?: string): string => {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '--';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const formatCurrencyInputDisplay = (value: any): string => {
  if (value === '' || value === null || value === undefined) return '';
  const str = value.toString();
  const negative = str.trim().startsWith('-');
  const [intPartRaw, decPart] = str.replace('-', '').split('.');
  const intPart = (intPartRaw || '0').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (negative ? '-' : '') + intPart + (decPart !== undefined ? ',' + decPart : '');
};

const parseCurrencyInputValue = (raw: string): string => {
  const negative = raw.trim().startsWith('-');
  let cleaned = raw.replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, '');
  const firstDot = cleaned.indexOf('.');
  if (firstDot !== -1) {
    cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
  }
  return (negative ? '-' : '') + cleaned;
};

const getWhatsAppUrl = (phone?: string, name?: string, osNum?: string): string => {
  if (!phone) return '#';
  const digits = phone.replace(/\D/g, '');
  const cleanPhone = digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
  const greeting = name ? `Olá, ${name}!` : 'Olá!';
  const osText = osNum ? ` referente à Ordem de Serviço #${osNum}` : '';
  const message = encodeURIComponent(`${greeting} Entramos em contato da Retífica${osText}.`);
  return `https://wa.me/${cleanPhone}?text=${message}`;
};

const WhatsAppIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" className={className} aria-hidden>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.454 5.71 1.455h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 00-3.48-8.413Z" />
  </svg>
);

export interface MotorSpec {
  model: string;
  cylinders: string;
  displacement: string;
  /** Extras (seção Especificações do Motor): gravados em motor_specs */
  valves?: string;
  engineModel?: string;
  cars?: string;
  aspiration?: string;
  brand?: string;
  showExtra?: boolean;
}

function OSFormImpl({
  onComplete,
  order,
  readOnly = false,
  initialClientId
}: {
  onComplete?: () => void,
  order?: Order,
  readOnly?: boolean,
  /** Cliente já escolhido ao abrir uma O.S. nova (ex.: a partir da tela de Clientes) */
  initialClientId?: string
}) {
  const { clients, addClient, updateClient, deleteClient, addOrder, updateOrder, orders, refreshClients } = useStore();
  const confirmDialog = useConfirmDialog();

  function normalizePix(v: string): PaymentMethod | '' {
    return (v && v.toUpperCase() === 'PIX' ? 'PIX' : v) as PaymentMethod | '';
  }

  // Form State
  const [osNumber, setOsNumber] = useState(order?.id?.toString() || '');
  const [clientId, setClientId] = useState(order?.clientId || initialClientId || '');
  const [clientError, setClientError] = useState('');
  useEffect(() => { if (clientId) setClientError(''); }, [clientId]);
  const [mechanicId, setMechanicId] = useState(order?.mechanicId || '');
  const [mechanicSearchText, setMechanicSearchText] = useState('');
  const [isMechanicSelectorOpen, setIsMechanicSelectorOpen] = useState(false);

  useEffect(() => {
    if (mechanicId) {
      setMechanicSearchText('');
    }
  }, [mechanicId]);

  const [isUpdatingMechanicId, setIsUpdatingMechanicId] = useState<string | null>(null);

  const filteredMechanicsForOS = useMemo(() => {
    const q = normalizeText(mechanicSearchText);
    const mechs = (clients || []).filter(c => c && c.clientType === 'mechanic');
    if (!q) return mechs;
    return mechs.filter(m =>
      normalizeText(m.name).includes(q) ||
      normalizeText(m.nickname).includes(q)
    );
  }, [clients, mechanicSearchText]);

  const filteredNonMechanicsForOS = useMemo(() => {
    const q = normalizeText(mechanicSearchText);
    const nonMechs = (clients || []).filter(c => c && c.clientType !== 'mechanic');
    if (!q) return nonMechs;
    return nonMechs.filter(m =>
      normalizeText(m.name).includes(q) ||
      normalizeText(m.nickname).includes(q)
    );
  }, [clients, mechanicSearchText]);

  const handleMarkAsMechanic = useCallback(async (clientToMark: Client) => {
    if (!clientToMark || !clientToMark.id) return;
    setIsUpdatingMechanicId(clientToMark.id);
    try {
      await updateClient(clientToMark.id, { clientType: 'mechanic' });
      setMechanicId(clientToMark.id);
      setMechanicSearchText('');
      setIsMechanicSelectorOpen(false);
      toast.success(`${clientToMark.name} foi marcado como mecânico e selecionado.`);
    } catch (err: any) {
      console.error('[handleMarkAsMechanic] Erro ao atualizar cliente para mecânico:', err);
      toast.error('Erro ao marcar cliente como mecânico. Tente novamente.');
    } finally {
      setIsUpdatingMechanicId(null);
    }
  }, [updateClient]);

  const osMechContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (osMechContainerRef.current && !osMechContainerRef.current.contains(event.target as Node)) {
        setIsMechanicSelectorOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Parse initial motors list
  const initialMotorsList = useMemo<MotorSpec[]>(() => {
    if (!order?.motorModel) return [];
    const models = order.motorModel.split(', ');
    const disps = order.displacement ? order.displacement.split(', ') : [];

    return models.map((m, idx) => {
      const cylindersMatch = m.match(/\((\d+)\s*(?:CIL|cil|Cil|Cilindros|cilindros)?\)/i);
      const cylinders = cylindersMatch ? cylindersMatch[1] : '';
      const model = m.replace(/\s*\(.*\)/, '').trim().toUpperCase();
      const displacement = disps[idx] || '';
      const extra = order.motorSpecs?.[idx] || {};
      return { model, cylinders, displacement, ...extra };
    });
  }, [order]);

  // Especificações extras de cada motor, na mesma ordem de motor_model
  const buildMotorSpecs = () => {
    const specs = motorsList.map(m => ({
      valves: m.valves || undefined,
      engineModel: m.engineModel || undefined,
      cars: m.cars || undefined,
      aspiration: m.aspiration || undefined,
      brand: m.brand || undefined,
      showExtra: m.showExtra || undefined,
    }));
    return specs.some(s => Object.values(s).some(Boolean)) ? specs : [];
  };

  const [motorsList, setMotorsList] = useState<MotorSpec[]>(initialMotorsList);

  const [motorModels, setMotorModels] = useState<string[]>(
    order?.motorModel ? order.motorModel.split(', ').map(m => m.toUpperCase()) : []
  );
  const [displacements, setDisplacements] = useState<string[]>(
    order?.displacement ? order.displacement.split(', ') : []
  );

  const [currentCylinders, setCurrentCylinders] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const defaultPartsLeft = ['BLOCO', 'CABEÇOTE', 'EIXO', 'PISTÕES'];
  const initialPartsLeft = [...defaultPartsLeft];
  (order?.partsLeft || []).forEach(p => {
    const name = (p.includes('|') ? p.split('|')[0] : p).toUpperCase();
    if (name && !initialPartsLeft.includes(name)) {
      initialPartsLeft.push(name);
    }
  });

  const [availablePartsLeft, setAvailablePartsLeft] = useState<string[]>(initialPartsLeft);
  const [newPartLeftName, setNewPartLeftName] = useState('');
  const [partsLeft, setPartsLeft] = useState<string[]>(
    (order?.partsLeft || []).map(p => p.toUpperCase())
  );
  const [additionalParts, setAdditionalParts] = useState<string[]>(
    (order?.additionalParts || []).map(p => p.toUpperCase())
  );
  const [services, setServices] = useState<ServiceItem[]>(order?.services || []);
  const [discount, setDiscount] = useState<number | string>(order?.discount || '');
  const [observations, setObservations] = useState(() => {
    const raw = order?.observations || '';
    return raw.replace(/\[ENTRADAS_JSON:\[[\s\S]*?\]\]/i, "").trim().toUpperCase();
  });
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus>(order?.serviceStatus || 'Na Fila');
  const [statusObservation, setStatusObservation] = useState(order?.statusObservation || '');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(order?.paymentStatus || 'Não Pago');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>(order?.paymentMethod || '');
  const [paymentDate, setPaymentDate] = useState(order?.paymentDate || '');
  const [pixPaidBy, setPixPaidBy] = useState(order?.pixPaidBy || '');
  const [showPrintReport, setShowPrintReport] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const [entries, setEntries] = useState<PaymentEntryItem[]>(() => {
    if (!order || order.paymentStatus === 'Não Pago') return [];

    // 1. Try from order.paymentEntries
    let parsed: any[] | null = null;
    if (order.paymentEntries && Array.isArray(order.paymentEntries) && order.paymentEntries.length > 0) {
      parsed = order.paymentEntries;
    } else {
      const match = order.observations?.match(/\[ENTRADAS_JSON:(\[[\s\S]*?\])\]/i);
      if (match) {
        try {
          parsed = JSON.parse(match[1]);
        } catch (e) {
          console.error("Failed to parse ENTRADAS_JSON", e);
        }
      }
    }

    let initialList: PaymentEntryItem[] = [];
    if (parsed && Array.isArray(parsed) && parsed.length > 0) {
      initialList = parsed.map((e: any, index: number) => ({
        id: e.id || `entry-${index}-${Date.now()}`,
        amount: e.amount !== undefined ? (parseFloat(e.amount.toString()) || 0) : (parseFloat(e.value?.toString() || '0') || 0),
        method: normalizePix(e.method || ''),
        date: e.date || getLocalDateString(),
        payer: e.payer || e.pixPaidBy || '',
      }));
    } else {
      // 2. Fallback to legacy fields ONLY if order genuinely had legacy payment registered
      const entryVal = Number(order.entryValue) || 0;
      if (order.paymentStatus === 'Entrada' && entryVal > 0) {
        initialList.push({
          id: `legacy-1-${Date.now()}`,
          amount: entryVal,
          method: normalizePix(order.paymentMethod || 'PIX'),
          date: order.paymentDate || getLocalDateString(),
          payer: order.pixPaidBy || '',
        });

        if (order.secondPaymentMethod) {
          const secondVal = Math.max(0, (Number(order.netValue) || 0) - entryVal);
          if (secondVal > 0) {
            initialList.push({
              id: `legacy-2-${Date.now()}`,
              amount: secondVal,
              method: normalizePix(order.secondPaymentMethod || ''),
              date: order.secondPaymentDate || getLocalDateString(),
              payer: order.secondPixPaidBy || '',
            });
          }
        }
      } else if (order.paymentStatus === 'Pago' && (Number(order.netValue) || 0) > 0) {
        initialList.push({
          id: `pago-${Date.now()}`,
          amount: Number(order.netValue) || 0,
          method: normalizePix(order.paymentMethod || 'PIX'),
          date: order.paymentDate || getLocalDateString(),
          payer: order.pixPaidBy || '',
        });
      }
    }

    return initialList;
  });

  const [deliveryDate, setDeliveryDate] = useState(order?.deliveryDate || '');
  const [arrivalDate, setArrivalDate] = useState(order?.arrivalDate || new Date().toISOString().split('T')[0]);
  const [finished, setFinished] = useState(order?.finished || false);
  const [finishedAtDate, setFinishedAtDate] = useState(() => {
    if (order?.finishedAt) {
      return order.finishedAt.split('T')[0];
    }
    if (order?.finished) {
      return new Date().toISOString().split('T')[0];
    }
    return '';
  });
  const [isStatusConfirmOpen, setIsStatusConfirmOpen] = useState(false);

  // Custom Options State
  const [customMotor, setCustomMotor] = useState('');
  const [availableMotors, setAvailableMotors] = useState<string[]>([]);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isLoadingMotors, setIsLoadingMotors] = useState(false);
  const [motorToDelete, setMotorToDelete] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [motorToEdit, setMotorToEdit] = useState<string | null>(null);
  const [newMotorName, setNewMotorName] = useState('');
  const [showEditMotorConfirm, setShowEditMotorConfirm] = useState(false);


  const [availableDisplacements, setAvailableDisplacements] = useState<string[]>(() => {
    const initialDisplacements = ['1.0', '1.3', '1.4', '1.6', '1.8', '2.0', '2.2', '2.3', '2.4', '2.8', '3.0'];
    if (order?.displacement) {
      order.displacement.split(', ').forEach(val => {
        if (val && !initialDisplacements.includes(val)) {
          initialDisplacements.push(val);
        }
      });
    }
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('retifica_custom_displacements');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            parsed.forEach(val => {
              if (val && !initialDisplacements.includes(val)) {
                initialDisplacements.push(val);
              }
            });
          }
        } catch (e) {
          console.error("Error loading custom displacements from localStorage", e);
        }
      }
    }
    return initialDisplacements.sort((a, b) => parseFloat(a) - parseFloat(b));
  });

  // Keep localStorage in sync with custom displacements in availableDisplacements
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const defaultDisplacements = ['1.0', '1.3', '1.4', '1.6', '1.8', '2.0', '2.2', '2.3', '2.4', '2.8', '3.0'];
      const customOnes = availableDisplacements.filter(d => !defaultDisplacements.includes(d));
      localStorage.setItem('retifica_custom_displacements', JSON.stringify(customOnes));
    }
  }, [availableDisplacements]);

  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [clientsError, setClientsError] = useState<string | null>(null);

  const loadClientsData = useCallback((mounted: boolean = true) => {
    setIsLoadingClients(true);
    setClientsError(null);
    return refreshClients()
      .then(() => {
        if (mounted) setClientsError(null);
      })
      .catch((err) => {
        console.error("Erro ao carregar clientes:", err);
        if (mounted) setClientsError("Falha ao carregar clientes.");
      })
      .finally(() => {
        if (mounted) setIsLoadingClients(false);
      });
  }, [refreshClients]);

  useEffect(() => {
    let mounted = true;
    setIsLoadingMotors(true);

    loadClientsData(mounted);

    Promise.all([fetchMotors(), fetchModels(), fetchMotorCatalog()])
      .then(([dbMotors, dbModels, dbCatalog]) => {
        if (!mounted) return;
        setAvailableMotors(dbMotors.map(m => m.toUpperCase()));
        setAvailableModels(dbModels.map(m => m.toUpperCase()));
        setMotorCatalog(dbCatalog);
      })
      .catch(() => { })
      .finally(() => {
        if (mounted) setIsLoadingMotors(false);
      });
    return () => { mounted = false; };
  }, [loadClientsData]);

  // Catálogo de motores (marca, modelos do motor, veículos) usado na busca
  const [motorCatalog, setMotorCatalog] = useState<CatalogMotor[]>([]);
  const reloadMotorCatalog = useCallback(() => {
    fetchMotorCatalog().then(setMotorCatalog).catch(() => { });
  }, []);

  const handleSaveCatalogMotor = useCallback(async (
    motor: { name: string; brand: string; engineModels: string[]; cars: string[] },
    originalName?: string
  ) => {
    try {
      await saveCatalogMotor(motor, originalName);
      if (originalName && originalName.toUpperCase() !== motor.name) {
        // motores desta O.S. com o nome antigo passam a usar o novo
        setMotorsList(prev => prev.map(m => m.model.toUpperCase() === originalName.toUpperCase() ? { ...m, model: motor.name, brand: motor.brand } : m));
      }
      reloadMotorCatalog();
      toast.success(originalName ? `Motor "${motor.name}" atualizado.` : `Motor "${motor.name}" cadastrado.`);
      return true;
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao salvar o motor.');
      return false;
    }
  }, [reloadMotorCatalog]);

  // Client Modal State
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isClientSelectorOpen, setIsClientSelectorOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientWhatsapp, setNewClientWhatsapp] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientPhone2, setNewClientPhone2] = useState('');
  const [newClientDoc, setNewClientDoc] = useState('');
  const [newClientType, setNewClientType] = useState<'regular' | 'mechanic'>('regular');
  const [newClientAddress, setNewClientAddress] = useState('');
  const [clientSearchText, setClientSearchText] = useState('');
  const [debouncedClientSearchQuery, setDebouncedClientSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Edit Client Modal State
  const [isEditClientModalOpen, setIsEditClientModalOpen] = useState(false);
  const [targetEditingClientId, setTargetEditingClientId] = useState<string>('');
  const [editClientName, setEditClientName] = useState('');
  const [editClientPhone, setEditClientPhone] = useState('');
  const [editClientPhone2, setEditClientPhone2] = useState('');
  const [editClientWhatsapp, setEditClientWhatsapp] = useState('');
  const [editClientDoc, setEditClientDoc] = useState('');
  const [editClientType, setEditClientType] = useState<'regular' | 'mechanic'>('regular');
  const [editClientAddress, setEditClientAddress] = useState('');

  // Client Modal State additions
  const [newClientNickname, setNewClientNickname] = useState('');
  const [newClientDefaultMechanicId, setNewClientDefaultMechanicId] = useState('');
  const [newClientMechSearch, setNewClientMechSearch] = useState('');
  const [isNewClientMechDropdownOpen, setIsNewClientMechDropdownOpen] = useState(false);

  // Edit Client Modal State additions
  const [editClientNickname, setEditClientNickname] = useState('');
  const [editClientDefaultMechanicId, setEditClientDefaultMechanicId] = useState('');
  const [editClientMechSearch, setEditClientMechSearch] = useState('');
  const [isEditClientMechDropdownOpen, setIsEditClientMechDropdownOpen] = useState(false);

  const newClientMechContainerRef = useRef<HTMLDivElement>(null);
  const editClientMechContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (newClientMechContainerRef.current && !newClientMechContainerRef.current.contains(event.target as Node)) {
        setIsNewClientMechDropdownOpen(false);
      }
      if (editClientMechContainerRef.current && !editClientMechContainerRef.current.contains(event.target as Node)) {
        setIsEditClientMechDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const mechanics = useMemo(() => {
    return (clients || []).filter(c => c && c.clientType === 'mechanic');
  }, [clients]);

  const filteredNewClientMech = useMemo(() => {
    const q = normalizeText(newClientMechSearch);
    if (!q) return mechanics;
    return mechanics.filter(m =>
      normalizeText(m.name).includes(q) ||
      normalizeText(m.nickname).includes(q)
    );
  }, [mechanics, newClientMechSearch]);

  const filteredEditClientMech = useMemo(() => {
    const q = normalizeText(editClientMechSearch);
    if (!q) return mechanics;
    return mechanics.filter(m =>
      normalizeText(m.name).includes(q) ||
      normalizeText(m.nickname).includes(q)
    );
  }, [mechanics, editClientMechSearch]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedClientSearchQuery(clientSearchText);
    }, 300);
    return () => clearTimeout(handler);
  }, [clientSearchText]);

  const newClientDuplicateMatches = useMemo(() => {
    try {
      const normName = normalizeText(newClientName);
      const normPhone = normalizeNumber(newClientPhone);
      const normDoc = normalizeNumber(newClientDoc);

      const nameMatch = normName ? (clients || []).find(c => c && normalizeText(c.name) === normName) || null : null;
      const phoneMatch = normPhone ? (clients || []).find(c => c && c.phone && normalizeNumber(c.phone) === normPhone) || null : null;
      const docMatch = normDoc ? (clients || []).find(c => c && c.document && normalizeNumber(c.document) === normDoc) || null : null;

      return { nameMatch, phoneMatch, docMatch };
    } catch (e) {
      console.error('[newClientDuplicateMatches] Error in duplicate check memo:', e);
      return { nameMatch: null, phoneMatch: null, docMatch: null };
    }
  }, [newClientName, newClientPhone, newClientDoc, clients]);

  const newClientConflicts = useMemo(() => {
    const conflicts: { client: Client; fields: ('name' | 'phone' | 'document')[] }[] = [];
    const add = (client: Client | null, field: 'name' | 'phone' | 'document') => {
      if (!client) return;
      const existing = conflicts.find(c => c.client.id === client.id);
      if (existing) existing.fields.push(field);
      else conflicts.push({ client, fields: [field] });
    };
    add(newClientDuplicateMatches.nameMatch, 'name');
    add(newClientDuplicateMatches.phoneMatch, 'phone');
    add(newClientDuplicateMatches.docMatch, 'document');
    return conflicts;
  }, [newClientDuplicateMatches]);

  const isNewClientDuplicate = newClientConflicts.length > 0;

  const exactMatchClient = useMemo(() => {
    try {
      const normQ = normalizeText(debouncedClientSearchQuery);
      const digitsQ = normalizeNumber(debouncedClientSearchQuery);

      if (!normQ && !digitsQ) return null;

      const match = (clients || []).find(c => {
        if (!c) return false;
        if (normQ && normalizeText(c.name) === normQ) return true;
        if (digitsQ && c.phone && normalizeNumber(c.phone) === digitsQ) return true;
        if (digitsQ && c.document && normalizeNumber(c.document) === digitsQ) return true;
        return false;
      });

      if (match && match.id === clientId) return null;
      return match;
    } catch (e) {
      console.error('[exactMatchClient] Error in exact match memo:', e);
      return null;
    }
  }, [debouncedClientSearchQuery, clients, clientId]);

  // Custom portal-based client selector state
  const clientTriggerRef = useRef<HTMLInputElement>(null);
  const clientDropdownRef = useRef<HTMLDivElement>(null);
  const osNumberRef = useRef<HTMLInputElement>(null);
  const justAddedClientRef = useRef<boolean>(false);
  const [clientDropdownPos, setClientDropdownPos] = useState<{ top?: number; bottom?: number; left: number; width: number }>({ left: 0, width: 380 });

  // Custom portal-based motor, cylinders and displacement selector state
  const motorTriggerRef = useRef<HTMLInputElement>(null);
  const motorDropdownRef = useRef<HTMLDivElement>(null);
  const motorHighlightedItemRef = useRef<HTMLDivElement>(null);
  const [isMotorDropdownOpen, setIsMotorDropdownOpen] = useState(false);
  const [motorSearchQuery, setMotorSearchQuery] = useState('');
  const [motorDropdownPos, setMotorDropdownPos] = useState<{ top?: number; bottom?: number; left: number; width: number }>({ left: 0, width: 380 });
  const [motorHighlightIndex, setMotorHighlightIndex] = useState<number>(0);

  const cylindersTriggerRef = useRef<HTMLInputElement>(null);
  const cylindersDropdownRef = useRef<HTMLDivElement>(null);
  const cylindersHighlightedItemRef = useRef<HTMLButtonElement>(null);
  const [isCylindersDropdownOpen, setIsCylindersDropdownOpen] = useState(false);
  const [cylindersDropdownPos, setCylindersDropdownPos] = useState<{ top?: number; bottom?: number; left: number; width: number }>({ left: 0, width: 380 });
  const [cylindersHighlightIndex, setCylindersHighlightIndex] = useState<number>(0);
  const availableCylinders = useMemo(() => ['3', '4', '5', '6'], []);

  const displacementTriggerRef = useRef<HTMLInputElement>(null);
  const displacementDropdownRef = useRef<HTMLDivElement>(null);
  const displacementHighlightedItemRef = useRef<HTMLButtonElement>(null);
  const [isDisplacementDropdownOpen, setIsDisplacementDropdownOpen] = useState(false);
  const [displacementSearchQuery, setDisplacementSearchQuery] = useState('');
  const [displacementDropdownPos, setDisplacementDropdownPos] = useState<{ top?: number; bottom?: number; left: number; width: number }>({ left: 0, width: 380 });
  const [displacementHighlightIndex, setDisplacementHighlightIndex] = useState<number>(0);

  const calculateDropdownPosition = useCallback(() => {
    if (clientTriggerRef.current) {
      const rect = clientTriggerRef.current.getBoundingClientRect();
      const dropdownMaxHeight = 280; // max-h of dropdown
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const spaceAbove = rect.top - 8;
      const dropdownWidth = Math.max(rect.width, 380);
      const clampedLeft = Math.min(rect.left, window.innerWidth - dropdownWidth - 8);

      if (spaceBelow >= dropdownMaxHeight || spaceBelow >= spaceAbove) {
        setClientDropdownPos({
          top: rect.bottom + 4,
          bottom: undefined,
          left: Math.max(8, clampedLeft),
          width: dropdownWidth,
        });
      } else {
        setClientDropdownPos({
          top: undefined,
          bottom: window.innerHeight - rect.top + 4,
          left: Math.max(8, clampedLeft),
          width: dropdownWidth,
        });
      }
    }
  }, []);

  useEffect(() => {
    if (!isClientSelectorOpen) return;
    window.addEventListener('resize', calculateDropdownPosition);
    window.addEventListener('scroll', calculateDropdownPosition, true);
    return () => {
      window.removeEventListener('resize', calculateDropdownPosition);
      window.removeEventListener('scroll', calculateDropdownPosition, true);
    };
  }, [isClientSelectorOpen, calculateDropdownPosition]);

  // Sync motorsList with motorModels and displacements for submit logic
  useEffect(() => {
    setMotorModels(motorsList.map(m => m.cylinders ? `${m.model.toUpperCase()} (${m.cylinders} CIL)` : m.model.toUpperCase()));
    setDisplacements(motorsList.map(m => m.displacement));
  }, [motorsList]);

  const handleAddOrUpdateMotor = useCallback((customDisp?: string) => {
    const model = motorSearchQuery.trim().toUpperCase();
    if (!model) {
      toast.error('Selecione ou digite o modelo do motor.');
      return;
    }

    const cylinders = currentCylinders.trim();
    const displacement = (customDisp !== undefined ? customDisp : displacementSearchQuery).trim();

    const newMotor: MotorSpec = { model, cylinders, displacement };

    if (editingIndex !== null) {
      setMotorsList(prev => prev.map((m, idx) => idx === editingIndex ? newMotor : m));
      setEditingIndex(null);
      toast.success('Motor atualizado.');
    } else {
      setMotorsList(prev => {
        const exists = prev.some(m =>
          m.model.toUpperCase() === newMotor.model.toUpperCase() &&
          m.cylinders === newMotor.cylinders &&
          m.displacement === newMotor.displacement
        );
        if (exists) return prev;
        return [...prev, newMotor];
      });
      toast.success('Motor adicionado.');
    }

    // Register custom motor in database if new
    const norm = normalizeText(model);
    const existingMotor = availableMotors.find(m => normalizeText(m) === norm);
    const existingModel = availableModels.find(m => normalizeText(m) === norm);
    if (!existingMotor && !existingModel) {
      setAvailableMotors(prev => [...prev, model].sort((a, b) => normalizeText(a).localeCompare(normalizeText(b))));
      addMotorToDb(model).catch(() => { });
    }

    // Ensure all dropdowns are explicitly closed and no autofocus is triggered
    setIsMotorDropdownOpen(false);
    setIsCylindersDropdownOpen(false);
    setIsDisplacementDropdownOpen(false);

    // Limpar os campos da especificação do motor
    setMotorSearchQuery('');
    setCurrentCylinders('');
    setDisplacementSearchQuery('');

    // Blur active element to prevent automatic reopen/refocus
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, [motorSearchQuery, currentCylinders, displacementSearchQuery, editingIndex, availableMotors, availableModels]);

  const handleEditMotor = useCallback((index: number) => {
    const m = motorsList[index];
    if (!m) return;
    setMotorSearchQuery(m.model);
    setCurrentCylinders(m.cylinders);
    setDisplacementSearchQuery(m.displacement);
    setEditingIndex(index);
    setTimeout(() => {
      motorTriggerRef.current?.focus();
    }, 0);
  }, [motorsList]);

  // Posição do motor ao qual o serviço está ligado, seguindo a mesma regra do relatório:
  // 'all' ou null = serviço comum (null), ausente = primeiro motor (0), '0', '1'... = posição.
  const getServiceMotorIndex = (s: ServiceItem): number | null => {
    const raw = s.motorId as string | null | undefined;
    if (raw === 'all' || raw === null) return null;
    const idx = Number(raw ?? '0');
    return Number.isInteger(idx) && idx >= 0 ? idx : null;
  };

  // Motor aguardando confirmação de remoção (tem serviços ligados a ele)
  const [motorIndexToRemove, setMotorIndexToRemove] = useState<number | null>(null);

  const removeMotorAt = useCallback((index: number, linkedServices: 'remove' | 'keep-common' | 'unchanged') => {
    // motorId é a posição do motor: os serviços dos motores seguintes descem uma posição
    if (linkedServices !== 'unchanged') {
      setServices(prev => prev.flatMap(s => {
        const motorIdx = getServiceMotorIndex(s);
        if (motorIdx === null || motorIdx < index) return [s];
        if (motorIdx === index) return linkedServices === 'remove' ? [] : [{ ...s, motorId: 'all' }];
        return [{ ...s, motorId: String(motorIdx - 1) }];
      }));
    }
    setMotorsList(prev => prev.filter((_, idx) => idx !== index));
    if (editingIndex === index) {
      setEditingIndex(null);
      setMotorSearchQuery('');
      setCurrentCylinders('');
      setDisplacementSearchQuery('');
    } else if (editingIndex !== null && editingIndex > index) {
      setEditingIndex(prev => prev! - 1);
    }
  }, [editingIndex]);

  const handleRemoveMotor = useCallback((index: number) => {
    // Único motor: os serviços ficam como estão, para que trocar o motor mantenha todos eles
    if (motorsList.length === 1) {
      removeMotorAt(index, 'unchanged');
      return;
    }
    if (services.some(s => getServiceMotorIndex(s) === index)) {
      setMotorIndexToRemove(index);
      return;
    }
    removeMotorAt(index, 'keep-common');
  }, [motorsList.length, services, removeMotorAt]);

  const servicesLinkedToMotorToRemove = motorIndexToRemove === null
    ? []
    : services.filter(s => getServiceMotorIndex(s) === motorIndexToRemove);

  const calculateMotorDropdownPosition = useCallback(() => {
    if (motorTriggerRef.current) {
      const rect = motorTriggerRef.current.getBoundingClientRect();
      const dropdownMaxHeight = 280;
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const spaceAbove = rect.top - 8;
      const dropdownWidth = Math.max(rect.width, 380);
      const clampedLeft = Math.min(rect.left, window.innerWidth - dropdownWidth - 8);

      if (spaceBelow >= dropdownMaxHeight || spaceBelow >= spaceAbove) {
        setMotorDropdownPos({
          top: rect.bottom + 4,
          bottom: undefined,
          left: Math.max(8, clampedLeft),
          width: dropdownWidth,
        });
      } else {
        setMotorDropdownPos({
          top: undefined,
          bottom: window.innerHeight - rect.top + 4,
          left: Math.max(8, clampedLeft),
          width: dropdownWidth,
        });
      }
    }
  }, []);

  const calculateDisplacementDropdownPosition = useCallback(() => {
    if (displacementTriggerRef.current) {
      const rect = displacementTriggerRef.current.getBoundingClientRect();
      const dropdownMaxHeight = 280;
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const spaceAbove = rect.top - 8;
      const dropdownWidth = Math.max(rect.width, 380);
      const clampedLeft = Math.min(rect.left, window.innerWidth - dropdownWidth - 8);

      if (spaceBelow >= dropdownMaxHeight || spaceBelow >= spaceAbove) {
        setDisplacementDropdownPos({
          top: rect.bottom + 4,
          bottom: undefined,
          left: Math.max(8, clampedLeft),
          width: dropdownWidth,
        });
      } else {
        setDisplacementDropdownPos({
          top: undefined,
          bottom: window.innerHeight - rect.top + 4,
          left: Math.max(8, clampedLeft),
          width: dropdownWidth,
        });
      }
    }
  }, []);

  const calculateCylindersDropdownPosition = useCallback(() => {
    if (cylindersTriggerRef.current) {
      const rect = cylindersTriggerRef.current.getBoundingClientRect();
      const dropdownMaxHeight = 280;
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const spaceAbove = rect.top - 8;
      const dropdownWidth = Math.max(rect.width, 380);
      const clampedLeft = Math.min(rect.left, window.innerWidth - dropdownWidth - 8);

      if (spaceBelow >= dropdownMaxHeight || spaceBelow >= spaceAbove) {
        setCylindersDropdownPos({
          top: rect.bottom + 4,
          bottom: undefined,
          left: Math.max(8, clampedLeft),
          width: dropdownWidth,
        });
      } else {
        setCylindersDropdownPos({
          top: undefined,
          bottom: window.innerHeight - rect.top + 4,
          left: Math.max(8, clampedLeft),
          width: dropdownWidth,
        });
      }
    }
  }, []);

  useEffect(() => {
    if (!isMotorDropdownOpen) return;
    window.addEventListener('resize', calculateMotorDropdownPosition);
    window.addEventListener('scroll', calculateMotorDropdownPosition, true);
    return () => {
      window.removeEventListener('resize', calculateMotorDropdownPosition);
      window.removeEventListener('scroll', calculateMotorDropdownPosition, true);
    };
  }, [isMotorDropdownOpen, calculateMotorDropdownPosition]);

  useEffect(() => {
    if (!isDisplacementDropdownOpen) return;
    window.addEventListener('resize', calculateDisplacementDropdownPosition);
    window.addEventListener('scroll', calculateDisplacementDropdownPosition, true);
    return () => {
      window.removeEventListener('resize', calculateDisplacementDropdownPosition);
      window.removeEventListener('scroll', calculateDisplacementDropdownPosition, true);
    };
  }, [isDisplacementDropdownOpen, calculateDisplacementDropdownPosition]);

  useEffect(() => {
    if (!isCylindersDropdownOpen) return;
    window.addEventListener('resize', calculateCylindersDropdownPosition);
    window.addEventListener('scroll', calculateCylindersDropdownPosition, true);
    return () => {
      window.removeEventListener('resize', calculateCylindersDropdownPosition);
      window.removeEventListener('scroll', calculateCylindersDropdownPosition, true);
    };
  }, [isCylindersDropdownOpen, calculateCylindersDropdownPosition]);

  // Close motor dropdown on click outside
  useEffect(() => {
    if (!isMotorDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        motorDropdownRef.current && !motorDropdownRef.current.contains(target) &&
        motorTriggerRef.current && !motorTriggerRef.current.contains(target)
      ) {
        setIsMotorDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => document.removeEventListener('mousedown', handleClickOutside, true);
  }, [isMotorDropdownOpen]);

  // Close displacement dropdown on click outside
  useEffect(() => {
    if (!isDisplacementDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        displacementDropdownRef.current && !displacementDropdownRef.current.contains(target) &&
        displacementTriggerRef.current && !displacementTriggerRef.current.contains(target)
      ) {
        setIsDisplacementDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => document.removeEventListener('mousedown', handleClickOutside, true);
  }, [isDisplacementDropdownOpen]);

  // Close cylinders dropdown on click outside
  useEffect(() => {
    if (!isCylindersDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        cylindersDropdownRef.current && !cylindersDropdownRef.current.contains(target) &&
        cylindersTriggerRef.current && !cylindersTriggerRef.current.contains(target)
      ) {
        setIsCylindersDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => document.removeEventListener('mousedown', handleClickOutside, true);
  }, [isCylindersDropdownOpen]);

  // Close motor dropdown on Escape
  useEffect(() => {
    if (!isMotorDropdownOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setIsMotorDropdownOpen(false);
        motorTriggerRef.current?.blur();
      }
    };
    document.addEventListener('keydown', handleEsc, true);
    return () => document.removeEventListener('keydown', handleEsc, true);
  }, [isMotorDropdownOpen]);

  // Close displacement dropdown on Escape
  useEffect(() => {
    if (!isDisplacementDropdownOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setIsDisplacementDropdownOpen(false);
        displacementTriggerRef.current?.blur();
      }
    };
    document.addEventListener('keydown', handleEsc, true);
    return () => document.removeEventListener('keydown', handleEsc, true);
  }, [isDisplacementDropdownOpen]);



  // Close cylinders dropdown on Escape
  useEffect(() => {
    if (!isCylindersDropdownOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setIsCylindersDropdownOpen(false);
        cylindersTriggerRef.current?.blur();
      }
    };
    document.addEventListener('keydown', handleEsc, true);
    return () => document.removeEventListener('keydown', handleEsc, true);
  }, [isCylindersDropdownOpen]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isMotorDropdownOpen && motorHighlightedItemRef.current) {
      motorHighlightedItemRef.current.scrollIntoView({
        block: 'nearest',
      });
    }
  }, [motorHighlightIndex, isMotorDropdownOpen]);

  useEffect(() => {
    if (isDisplacementDropdownOpen && displacementHighlightedItemRef.current) {
      displacementHighlightedItemRef.current.scrollIntoView({
        block: 'nearest',
      });
    }
  }, [displacementHighlightIndex, isDisplacementDropdownOpen]);

  useEffect(() => {
    if (isCylindersDropdownOpen && cylindersHighlightedItemRef.current) {
      cylindersHighlightedItemRef.current.scrollIntoView({
        block: 'nearest',
      });
    }
  }, [cylindersHighlightIndex, isCylindersDropdownOpen]);

  const combinedUniqueMotors = useMemo(() => {
    const unique = new Set<string>();
    availableMotors.forEach(m => unique.add(m.toUpperCase()));
    availableModels.forEach(m => unique.add(m.toUpperCase()));

    const q = normalizeText(motorSearchQuery);
    const filtered = Array.from(unique).filter(motor => {
      if (!q) return true;
      return normalizeText(motor).includes(q);
    });
    return filtered.sort((a, b) => normalizeText(a).localeCompare(normalizeText(b)));
  }, [availableMotors, availableModels, motorSearchQuery]);

  const motorOptions = useMemo(() => {
    const options: Array<{ type: string; label: string; value: string }> = [];

    const hasQuery = !!motorSearchQuery.trim();
    if (!hasQuery) {
      options.push({ type: 'none', label: 'Nenhum motor/modelo selecionado', value: '' });
    }

    combinedUniqueMotors.forEach(m => {
      options.push({ type: 'motor', label: m, value: m });
    });

    const queryUpper = motorSearchQuery.trim().toUpperCase();
    const queryNorm = normalizeText(queryUpper);
    const hasMatch = combinedUniqueMotors.some(m => normalizeText(m) === queryNorm);

    if (queryUpper && !hasMatch) {
      options.push({ type: 'create_motor', label: `+ Cadastrar "${queryUpper}" como Motor`, value: queryUpper });
      options.push({ type: 'create_model', label: `+ Cadastrar "${queryUpper}" como Modelo`, value: queryUpper });
    }
    return options;
  }, [combinedUniqueMotors, motorSearchQuery]);

  const filteredCylinders = useMemo(() => {
    const q = normalizeText(currentCylinders);
    return availableCylinders.filter(c => {
      if (!q) return true;
      return normalizeText(c).includes(q);
    });
  }, [availableCylinders, currentCylinders]);

  const cylindersOptions = useMemo(() => {
    const options = [{ type: 'none', label: 'Nenhum cilindro selecionado', value: '' }];
    filteredCylinders.forEach(c => {
      options.push({ type: 'cylinder', label: `${c} Cilindros`, value: c });
    });
    return options;
  }, [filteredCylinders]);

  const filteredDisplacements = useMemo(() => {
    const q = normalizeText(displacementSearchQuery);
    return availableDisplacements.filter(d => {
      if (!q) return true;
      return normalizeText(d).includes(q);
    });
  }, [availableDisplacements, displacementSearchQuery]);

  const displacementOptions = useMemo(() => {
    const options: Array<{ type: string; label: string; value: string }> = [];
    const hasQuery = !!displacementSearchQuery.trim();
    if (!hasQuery) {
      options.push({ type: 'none', label: 'Nenhuma cilindrada selecionada', value: '' });
    }

    filteredDisplacements.forEach(d => {
      options.push({ type: 'displacement', label: d, value: d });
    });

    const queryNorm = normalizeText(displacementSearchQuery);
    const hasExactMatch = availableDisplacements.some(d => normalizeText(d) === queryNorm);

    if (hasQuery && !hasExactMatch) {
      options.push({ type: 'create_displacement', label: `+ Cadastrar '${displacementSearchQuery.trim()}'`, value: displacementSearchQuery.trim() });
    }

    return options;
  }, [filteredDisplacements, displacementSearchQuery, availableDisplacements]);

  // Reset highlight index when filtered list changes
  useEffect(() => {
    setMotorHighlightIndex(0);
  }, [motorOptions]);

  useEffect(() => {
    const q = (currentCylinders || '').trim();
    if (q) {
      const exactIndex = cylindersOptions.findIndex(
        opt => opt.type === 'cylinder' && opt.value.toString() === q
      );
      if (exactIndex !== -1) {
        setCylindersHighlightIndex(exactIndex);
      } else if (cylindersOptions.length > 1) {
        setCylindersHighlightIndex(1);
      } else {
        setCylindersHighlightIndex(0);
      }
    } else {
      setCylindersHighlightIndex(0);
    }
  }, [cylindersOptions, currentCylinders]);

  useEffect(() => {
    setDisplacementHighlightIndex(0);
  }, [displacementOptions]);

  // Add new engine model/displacement functions
  const handleAddNewMotor = useCallback((newMotor: string) => {
    const motor = newMotor.trim().toUpperCase();
    if (!motor) return;
    const norm = normalizeText(motor);
    const existing = availableMotors.find(m => normalizeText(m) === norm);
    if (!existing) {
      setAvailableMotors(prev => [...prev, motor].sort((a, b) => normalizeText(a).localeCompare(normalizeText(b))));
      addMotorToDb(motor).then(() => {
        fetchMotors().then((dbMotors) => {
          setAvailableMotors(dbMotors.map(m => m.toUpperCase()));
        });
      }).catch(() => { });
      toast.success(`Motor "${motor}" adicionado.`);
      setMotorSearchQuery(motor);
    } else {
      setMotorSearchQuery(existing);
    }
    setIsMotorDropdownOpen(false);

    // Focus the next input (cylinders)
    const cylindersInput = document.getElementById('motor-cylinders-input');
    cylindersInput?.focus();
  }, [availableMotors]);

  const handleAddNewModel = useCallback((newModel: string) => {
    const model = newModel.trim().toUpperCase();
    if (!model) return;
    const norm = normalizeText(model);
    const existing = availableModels.find(m => normalizeText(m) === norm);
    if (!existing) {
      setAvailableModels(prev => [...prev, model].sort((a, b) => normalizeText(a).localeCompare(normalizeText(b))));
      addModelToDb(model).then(() => {
        fetchModels().then((dbModels) => {
          setAvailableModels(dbModels.map(m => m.toUpperCase()));
        });
      }).catch(() => { });
      toast.success(`Modelo "${model}" adicionado.`);
      setMotorSearchQuery(model);
    } else {
      setMotorSearchQuery(existing);
    }
    setIsMotorDropdownOpen(false);

    // Focus the next input (cylinders)
    const cylindersInput = document.getElementById('motor-cylinders-input');
    cylindersInput?.focus();
  }, [availableModels]);

  const handleAddNewDisplacement = useCallback((newDisp: string) => {
    const disp = newDisp.trim();
    if (!disp) return;
    if (!availableDisplacements.includes(disp)) {
      const updatedAvail = [...availableDisplacements, disp].sort((a, b) => parseFloat(a) - parseFloat(b));
      setAvailableDisplacements(updatedAvail);
      toast.success(`Cilindrada "${disp}" adicionada.`);
    }
    setDisplacementSearchQuery(disp);
    setIsDisplacementDropdownOpen(false);
  }, [availableDisplacements]);

  const handleStartEditMotor = (value: string) => {
    setIsMotorDropdownOpen(false);
    setMotorToEdit(value);
    setNewMotorName(value);
    setShowEditMotorConfirm(true);
  };

  const handleConfirmEditMotor = async () => {
    if (!motorToEdit || !newMotorName.trim()) return;
    const oldName = motorToEdit;
    const newName = newMotorName.trim().toUpperCase();
    if (oldName === newName) {
      setShowEditMotorConfirm(false);
      setMotorToEdit(null);
      return;
    }



    try {
      await updateModelInDb(oldName, newName);
      setAvailableMotors(prev => prev.map(m => m === oldName ? newName : m).sort((a, b) => normalizeText(a).localeCompare(normalizeText(b))));
      setAvailableModels(prev => prev.map(m => m === oldName ? newName : m).sort((a, b) => normalizeText(a).localeCompare(normalizeText(b))));
      setMotorModels(prev => prev.map(m => m === oldName ? newName : m));
      if (motorSearchQuery === oldName) {
        setMotorSearchQuery(newName);
      }
      toast.success(`Motor/Modelo "${oldName}" alterado para "${newName}".`);
    } catch (err: any) {
      toast.warning(err?.message || `Falha ao atualizar "${oldName}" no banco local.`);
    }

    setShowEditMotorConfirm(false);
    setMotorToEdit(null);
  };

  const handleStartDeleteMotor = (value: string) => {
    setIsMotorDropdownOpen(false);
    setMotorToDelete(value);
    setShowDeleteConfirm(true);
  };

  // Keyboard navigation event handlers
  const handleMotorKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (readOnly) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setIsMotorDropdownOpen(false);
      motorTriggerRef.current?.blur();
    }

    const totalOptions = motorOptions.length;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      if (!isMotorDropdownOpen) {
        setIsMotorDropdownOpen(true);
        calculateMotorDropdownPosition();
      } else if (totalOptions > 0) {
        setMotorHighlightIndex(prev => Math.min(totalOptions - 1, prev + 1));
      }
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      if (isMotorDropdownOpen && totalOptions > 0) {
        setMotorHighlightIndex(prev => Math.max(0, prev - 1));
      }
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (isMotorDropdownOpen) {
        const option = motorOptions[motorHighlightIndex];
        if (option) {
          if (option.type === 'none') {
            setMotorSearchQuery('');
            setIsMotorDropdownOpen(false);
            const cylindersInput = document.getElementById('motor-cylinders-input');
            cylindersInput?.focus();
          } else if (option.type === 'motor' || option.type === 'model') {
            setMotorSearchQuery(option.value);
            setIsMotorDropdownOpen(false);
            const cylindersInput = document.getElementById('motor-cylinders-input');
            cylindersInput?.focus();
          } else if (option.type === 'create_motor') {
            handleAddNewMotor(option.value);
          } else if (option.type === 'create_model') {
            handleAddNewModel(option.value);
          }
        }
      } else {
        const queryUpper = motorSearchQuery.trim().toUpperCase();
        if (combinedUniqueMotors.length > 0) {
          setMotorSearchQuery(combinedUniqueMotors[0]);
          setIsMotorDropdownOpen(false);
          const cylindersInput = document.getElementById('motor-cylinders-input');
          cylindersInput?.focus();
        } else if (queryUpper) {
          handleAddNewMotor(queryUpper);
        } else {
          const cylindersInput = document.getElementById('motor-cylinders-input');
          cylindersInput?.focus();
        }
      }
    }
  }, [
    isMotorDropdownOpen,
    motorOptions,
    motorHighlightIndex,
    motorSearchQuery,
    combinedUniqueMotors,
    calculateMotorDropdownPosition,
    handleAddNewMotor,
    handleAddNewModel,
    readOnly
  ]);

  const handleCylindersKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (readOnly) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setIsCylindersDropdownOpen(false);
      cylindersTriggerRef.current?.blur();
    }

    const totalOptions = cylindersOptions.length;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      if (!isCylindersDropdownOpen) {
        setIsCylindersDropdownOpen(true);
        calculateCylindersDropdownPosition();
      } else if (totalOptions > 0) {
        setCylindersHighlightIndex(prev => Math.min(totalOptions - 1, prev + 1));
      }
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      if (isCylindersDropdownOpen && totalOptions > 0) {
        setCylindersHighlightIndex(prev => Math.max(0, prev - 1));
      }
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (isCylindersDropdownOpen) {
        const option = cylindersOptions[cylindersHighlightIndex];
        if (option) {
          if (option.type === 'none') {
            setCurrentCylinders('');
          } else {
            setCurrentCylinders(option.value);
          }
        }
        setIsCylindersDropdownOpen(false);
      } else {
        if (filteredCylinders.length > 0 && currentCylinders.trim()) {
          setCurrentCylinders(filteredCylinders[0]);
        }
      }
      const dispInput = document.getElementById('motor-displacement-input');
      dispInput?.focus();
    }
  }, [
    isCylindersDropdownOpen,
    cylindersOptions,
    cylindersHighlightIndex,
    filteredCylinders,
    currentCylinders,
    calculateCylindersDropdownPosition,
    readOnly
  ]);



  const handleDisplacementKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (readOnly) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setIsDisplacementDropdownOpen(false);
      displacementTriggerRef.current?.blur();
    }

    const totalOptions = displacementOptions.length;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      if (!isDisplacementDropdownOpen) {
        setIsDisplacementDropdownOpen(true);
        calculateDisplacementDropdownPosition();
      } else if (totalOptions > 0) {
        setDisplacementHighlightIndex(prev => Math.min(totalOptions - 1, prev + 1));
      }
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      if (isDisplacementDropdownOpen && totalOptions > 0) {
        setDisplacementHighlightIndex(prev => Math.max(0, prev - 1));
      }
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();

      let finalDisp = displacementSearchQuery.trim();

      if (isDisplacementDropdownOpen) {
        const option = displacementOptions[displacementHighlightIndex];
        if (option) {
          if (option.type === 'none') {
            finalDisp = '';
            setDisplacementSearchQuery('');
            setIsDisplacementDropdownOpen(false);
          } else {
            finalDisp = option.value;
            setDisplacementSearchQuery(option.value);
            setIsDisplacementDropdownOpen(false);
          }
        }
      } else {
        if (filteredDisplacements.length > 0 && finalDisp) {
          finalDisp = filteredDisplacements[0];
          setDisplacementSearchQuery(finalDisp);
        }
      }

      if (finalDisp && !availableDisplacements.includes(finalDisp)) {
        const updatedAvail = [...availableDisplacements, finalDisp].sort((a, b) => parseFloat(a) - parseFloat(b));
        setAvailableDisplacements(updatedAvail);
        toast.success(`Cilindrada "${finalDisp}" adicionada.`);
      }

      handleAddOrUpdateMotor(finalDisp);
    }
  }, [
    isDisplacementDropdownOpen,
    displacementOptions,
    displacementHighlightIndex,
    filteredDisplacements,
    displacementSearchQuery,
    availableDisplacements,
    calculateDisplacementDropdownPosition,
    handleAddOrUpdateMotor,
    readOnly
  ]);

  const getSearchScore = useCallback((c: Client, normQ: string, digitsQ: string): number => {
    try {
      if (!c) return 0;
      const normName = normalizeText(c.name);
      const normNickname = normalizeText(c.nickname || '');
      if (normName.startsWith(normQ) || normNickname.startsWith(normQ)) return 3;
      if (normName.includes(normQ) || normNickname.includes(normQ)) return 2;

      if (digitsQ) {
        const digitsPhone = normalizeNumber(c.phone);
        const digitsDoc = normalizeNumber(c.document);
        if (digitsPhone.includes(digitsQ) || digitsDoc.includes(digitsQ)) {
          return 1;
        }
      }
    } catch (e) {
      console.error('Error calculating search score:', e);
    }
    return 0;
  }, []);

  const filteredClients = useMemo(() => {
    try {
      const q = (debouncedClientSearchQuery || '').trim();
      if (q.length < 2) {
        return [];
      }
      const normQ = normalizeText(q);
      const digitsQ = normalizeNumber(q);
      const selectedClient = (clients || []).find(c => c && c.id === clientId);
      const isShowingSelected = selectedClient && normalizeText(debouncedClientSearchQuery) === normalizeText(selectedClient.name);

      return [...(clients || [])]
        .filter(c => {
          if (!c) return false;
          if (isShowingSelected) return true;

          const normName = normalizeText(c.name);
          const normNickname = normalizeText(c.nickname || '');
          const digitsPhone = normalizeNumber(c.phone);
          const digitsDoc = normalizeNumber(c.document);

          const matchesName = normName.includes(normQ) || normNickname.includes(normQ);
          const matchesPhone = digitsQ !== '' && digitsPhone.includes(digitsQ);
          const matchesDoc = digitsQ !== '' && digitsDoc.includes(digitsQ);

          return matchesName || matchesPhone || matchesDoc;
        })
        .sort((a, b) => {
          if (!a || !b) return 0;
          if (isShowingSelected) {
            return (a.name || '').localeCompare(b.name || '', 'pt-BR');
          }
          const scoreA = getSearchScore(a, normQ, digitsQ);
          const scoreB = getSearchScore(b, normQ, digitsQ);
          if (scoreA !== scoreB) {
            return scoreB - scoreA;
          }
          return (a.name || '').localeCompare(b.name || '', 'pt-BR');
        });
    } catch (e) {
      console.error('Error filtering clients:', e);
      return [];
    }
  }, [clients, debouncedClientSearchQuery, clientId, getSearchScore]);

  // Keyboard navigation state and refs for client selector
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);
  const highlightedItemRef = useRef<HTMLButtonElement>(null);

  // Reset highlightedIndex when filteredClients changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredClients]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isClientSelectorOpen && highlightedItemRef.current) {
      highlightedItemRef.current.scrollIntoView({
        block: 'nearest',
      });
    }
  }, [highlightedIndex, isClientSelectorOpen]);

  // Focus O.S. Nº when the client quick registration modal closes, if a client was just selected/added
  useEffect(() => {
    if (!isClientModalOpen && justAddedClientRef.current) {
      justAddedClientRef.current = false;
      osNumberRef.current?.focus();
    }
  }, [isClientModalOpen]);

  const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (readOnly) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setIsClientSelectorOpen(false);
      if (clientId) {
        const client = clients.find(c => c.id === clientId);
        if (client) {
          setClientSearchText(client.name);
        }
      }
      clientTriggerRef.current?.blur();
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      if (!isClientSelectorOpen) {
        if ((clientSearchText || '').trim().length >= 2) {
          setIsClientSelectorOpen(true);
          calculateDropdownPosition();
        }
      } else if (filteredClients.length > 0) {
        setHighlightedIndex(prev => Math.min(filteredClients.length - 1, prev + 1));
      }
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      if (isClientSelectorOpen && filteredClients.length > 0) {
        setHighlightedIndex(prev => Math.max(0, prev - 1));
      }
    }

    if (e.key === 'Enter') {
      if (isClientSelectorOpen) {
        e.preventDefault();
        e.stopPropagation();
        if (filteredClients.length > 0) {
          const selected = filteredClients[highlightedIndex];
          if (selected) {
            setClientId(selected.id);
            setSelectedClient(selected);
            setClientSearchText(selected.name);
            setIsClientSelectorOpen(false);
            clientTriggerRef.current?.blur();
            osNumberRef.current?.focus();
          }
        } else {
          setIsClientSelectorOpen(false);
          setNewClientName(clientSearchText.toUpperCase());
          setIsClientModalOpen(true);
        }
      }
    }
  }, [
    isClientSelectorOpen,
    filteredClients,
    highlightedIndex,
    clientSearchText,
    clientId,
    clients,
    calculateDropdownPosition,
    readOnly
  ]);

  // Close client dropdown on Escape
  useEffect(() => {
    if (!isClientSelectorOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setIsClientSelectorOpen(false);
        if (clientId) {
          const client = clients.find(c => c.id === clientId);
          if (client) {
            setClientSearchText(client.name);
          }
        }
        clientTriggerRef.current?.blur();
      }
    };
    document.addEventListener('keydown', handleEsc, true);
    return () => document.removeEventListener('keydown', handleEsc, true);
  }, [isClientSelectorOpen, clientId, clients]);

  // Close client dropdown on click outside
  useEffect(() => {
    if (!isClientSelectorOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        clientDropdownRef.current && !clientDropdownRef.current.contains(target) &&
        clientTriggerRef.current && !clientTriggerRef.current.contains(target)
      ) {
        setIsClientSelectorOpen(false);
        if (clientId) {
          const client = clients.find(c => c.id === clientId);
          if (client) {
            setClientSearchText(client.name);
          }
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => document.removeEventListener('mousedown', handleClickOutside, true);
  }, [isClientSelectorOpen, clientId, clients]);

  const confirmSetStatusReady = () => {
    setServiceStatus('Pronto');
    setFinished(true);
    if (!finishedAtDate) {
      setFinishedAtDate(new Date().toISOString().split('T')[0]);
    }
    setIsStatusConfirmOpen(false);
  };

  const handleAutoGenerateOS = async (e: React.MouseEvent) => {
    e.preventDefault();
    const isElectron = typeof window !== 'undefined' && !!window.electronAPI;
    let next = 1001;
    if (isElectron) {
      try {
        const dbMaxRes = await window.electronAPI!.dbQuery("SELECT MAX(id) as maxId FROM ordens_servico");
        const maxDbId = dbMaxRes && dbMaxRes[0] && dbMaxRes[0].maxId != null ? Number(dbMaxRes[0].maxId) : 0;
        const maxStateId = orders.length > 0 ? Math.max(...orders.map(o => o.id)) : 0;
        let candidate = Math.max(maxDbId, maxStateId, 1000) + 1;
        let exists = await window.electronAPI!.dbQuery("SELECT id FROM ordens_servico WHERE id = ?", [candidate]);
        while (exists && exists.length > 0) {
          candidate++;
          exists = await window.electronAPI!.dbQuery("SELECT id FROM ordens_servico WHERE id = ?", [candidate]);
        }
        next = candidate;
      } catch (err) {
        next = orders.length > 0 ? Math.max(...orders.map(o => o.id)) + 1 : 1001;
      }
    } else {
      next = orders.length > 0 ? Math.max(...orders.map(o => o.id)) + 1 : 1001;
    }
    setOsNumber(next.toString());
  };

  // Selected Client Details Display State
  const [clientPhone, setClientPhone] = useState('');
  const [clientDoc, setClientDoc] = useState('');
  const [clientType, setClientType] = useState<'regular' | 'mechanic'>('regular');
  const prevClientIdRef = useRef<string | number>('');

  useEffect(() => {
    if (clientId && clientId !== prevClientIdRef.current) {
      const foundClient = clients.find(c => c.id === clientId);
      if (foundClient) {
        setSelectedClient(foundClient);
        setClientPhone(foundClient.phone || '');
        setClientDoc(foundClient.document || '');
        setClientType(foundClient.clientType || 'regular');
        setClientSearchText('');
        prevClientIdRef.current = clientId;
        if (!order && foundClient.defaultMechanicId) {
          setMechanicId(foundClient.defaultMechanicId);
        }
      }
    } else if (!clientId) {
      setSelectedClient(null);
      setClientPhone('');
      setClientDoc('');
      setClientType('regular');
      // Do not clear clientSearchText here to prevent wiping it during typing / store refreshes
      prevClientIdRef.current = '';
      if (!order) {
        setMechanicId('');
      }
    }
  }, [clientId, clients, order]);

  const openEditClientModalFor = (found: Client) => {
    setTargetEditingClientId(found.id);
    setEditClientName(found.name || '');
    setEditClientPhone(normalizeNumber(found.phone || ''));
    setEditClientPhone2(normalizeNumber(found.phone2 || ''));
    setEditClientWhatsapp(normalizeNumber(found.whatsapp || ''));
    setEditClientDoc(normalizeNumber(found.document || ''));
    setEditClientType(found.clientType || 'regular');
    setEditClientAddress(found.city || '');
    setEditClientNickname(found.nickname || '');
    setEditClientDefaultMechanicId(found.defaultMechanicId || '');
    const mech = clients.find(c => c.id === found.defaultMechanicId);
    setEditClientMechSearch(mech ? mech.name : '');
    setIsClientModalOpen(false);
    setIsEditClientModalOpen(true);
  };

  const handleOpenEditClientModal = () => {
    const found = clients.find(c => c.id === clientId);
    if (!found) return;
    openEditClientModalFor(found);
  };

  const handleClearClient = () => {
    setClientId('');
    setSelectedClient(null);
    setClientSearchText('');
    setIsClientSelectorOpen(false);
    // o mecânico fica dentro do bloco do cliente: limpa junto
    setMechanicId('');
    setMechanicSearchText('');
    setIsMechanicSelectorOpen(false);
  };

  // Trocar: volta para a busca de cliente
  const handleSwapClient = () => {
    setClientId('');
    setSelectedClient(null);
    setClientSearchText('');
    setIsClientSelectorOpen(true);
    setTimeout(() => {
      clientTriggerRef.current?.focus();
    }, 50);
  };

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const handleCopy = (text: string, fieldName: string) => {
    if (!text || text === '—') return;
    try {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      toast.success(`${fieldName} copiado!`);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error('Não foi possível copiar.');
    }
  };

  // Mecânico habitual do cliente (cadastros antigos com mecânico padrão)
  const defaultMechanicOfClient = useMemo(() => {
    if (!selectedClient?.defaultMechanicId) return null;
    return (clients || []).find(c => c && c.id === selectedClient.defaultMechanicId) || null;
  }, [selectedClient, clients]);

  const handleSelectCompleteMotor = () => {
    if (readOnly) return;
    const cyl = parseInt(motorsList[0]?.cylinders || '') || 4;
    const completeParts = ['BLOCO|1', 'CABEÇOTE|1', 'EIXO|1', `PISTÕES|${cyl}`];
    const otherParts = partsLeft.filter(p => !['BLOCO', 'CABEÇOTE', 'EIXO', 'PISTÕES'].includes(p.split('|')[0]));
    setPartsLeft([...completeParts, ...otherParts]);
    toast.success('Motor completo selecionado (Bloco, Cabeçote, Eixo e Pistões).');
  };

  const handleClearAllParts = () => {
    if (readOnly) return;
    if (partsLeft.length === 0 && additionalParts.length === 0) return;
    setPartsLeft([]);
    setAdditionalParts([]);
    toast.info('Materiais e peças desmarcados.');
  };

  const handleOpenNewClientModal = async () => {
    const queryDigits = normalizeNumber(clientSearchText);
    const existingClient = await checkDuplicateInDatabase({
      name: clientSearchText,
      phone: queryDigits,
      document: queryDigits
    });
    if (existingClient) {
      toast.error(`O cliente "${existingClient.name}" já está cadastrado. Selecionando automaticamente.`);
      setClientId(existingClient.id);
      setSelectedClient(existingClient);
      setClientSearchText('');
      setIsClientSelectorOpen(false);
      return;
    }
    setNewClientName(clientSearchText.toUpperCase());
    setIsClientModalOpen(true);
  };

  const handleSaveClientEditModal = async () => {
    const targetId = targetEditingClientId || clientId;
    const found = clients.find(c => c.id === targetId);
    if (!found) return;

    if (!editClientName.trim()) {
      toast.error('O nome do cliente é obrigatório.');
      return;
    }
    if (editClientPhone && editClientPhone.length < 10) {
      toast.error('Telefone inválido. Digite no mínimo 10 números (com DDD).');
      return;
    }
    if (editClientWhatsapp && editClientWhatsapp.length < 10) {
      toast.error('WhatsApp inválido. Digite no mínimo 10 números (com DDD).');
      return;
    }
    if (editClientPhone) {
      const normPhone = normalizeNumber(editClientPhone);
      if (clients.some(c => c.id !== found.id && c.phone && normalizeNumber(c.phone) === normPhone)) {
        toast.error('Este número de telefone já está cadastrado para outro cliente.');
        return;
      }
    }
    if (editClientDoc) {
      const docDigits = normalizeNumber(editClientDoc);
      if (docDigits.length !== 11 && docDigits.length !== 14) {
        toast.error('CPF ou CNPJ inválido.');
        return;
      }
    }

    const newPhone = editClientPhone ? maskPhone(editClientPhone) : '';
    const newPhone2 = editClientPhone2 ? maskPhone(editClientPhone2) : '';
    const newWhatsapp = editClientWhatsapp ? maskPhone(editClientWhatsapp) : '';
    const newDoc = editClientDoc ? maskCPFCNPJ(editClientDoc) : '';

    try {
      await updateClient(found.id, {
        name: editClientName.trim().toUpperCase(),
        phone: newPhone,
        phone2: newPhone2,
        whatsapp: newWhatsapp,
        document: newDoc,
        city: editClientAddress.trim().toUpperCase(),
        clientType: editClientType,
        nickname: editClientNickname.trim().toUpperCase(),
        defaultMechanicId: editClientType === 'regular' ? editClientDefaultMechanicId : '',
      });
      // Sync local display states immediately
      setClientPhone(newPhone);
      setClientDoc(newDoc);
      setClientType(editClientType);
      setSelectedClient(prev => prev ? {
        ...prev,
        name: editClientName.trim().toUpperCase(),
        phone: newPhone,
        phone2: newPhone2,
        whatsapp: newWhatsapp,
        document: newDoc,
        city: editClientAddress.trim().toUpperCase(),
        clientType: editClientType,
        nickname: editClientNickname.trim().toUpperCase(),
        defaultMechanicId: editClientType === 'regular' ? editClientDefaultMechanicId : ''
      } : prev);
      setClientSearchText(editClientName.trim().toUpperCase());
      setIsEditClientModalOpen(false);
      toast.success('Dados do cliente atualizados com sucesso!');
    } catch (err) {
      console.error('Erro ao atualizar dados do cliente:', err);
      toast.error('Erro ao salvar alterações.');
    }
  };

  const handleDeleteClientModal = async () => {
    const targetId = targetEditingClientId || clientId;
    const found = clients.find(c => c.id === targetId);
    if (!found) return;
    const ok = await confirmDialog.confirm({
      title: `Excluir cliente "${found.name}"?`,
      description: "Esta ação não pode ser desfeita.",
    });
    if (!ok) return;
    try {
      await deleteClient(found.id);
      setClientId('');
      setSelectedClient(null);
      setClientSearchText('');
      setIsEditClientModalOpen(false);
      toast.success('Cliente excluído com sucesso.');
    } catch (err) {
      console.error('Erro ao excluir cliente:', err);
      toast.error('Erro ao excluir cliente.');
    }
  };

  const maskPhone = (v: string) => {
    v = normalizeNumber(v);
    if (v.length <= 10) {
      return v.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
    } else {
      return v.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
    }
  };

  const maskCPFCNPJ = (v: string) => {
    v = normalizeNumber(v);
    if (v.length <= 11) {
      return v.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    } else {
      return v.replace(/(\d{2})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1/$2").replace(/(\d{4})(\d{1,2})$/, "$1-$2");
    }
  };

  const checkDuplicateInDatabase = useCallback(async (data: { name?: string; phone?: string; document?: string }): Promise<Client | null> => {
    try {
      const normName = data && data.name ? normalizeText(data.name) : '';
      const normPhone = data && data.phone ? normalizeNumber(data.phone) : '';
      const normDoc = data && data.document ? normalizeNumber(data.document) : '';

      if (!normName && !normPhone && !normDoc) return null;

      let freshClientsList: Client[] = [];
      const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

      try {
        if (isElectron) {
          const sqliteClients = await window.electronAPI!.dbQuery("SELECT * FROM clientes");
          freshClientsList = sqliteClients.map((row: any) => ({
            id: row.id,
            name: row.name || '',
            phone: row.phone || '',
            phone2: row.phone2 || '',
            document: row.document || '',
            whatsapp: row.whatsapp || '',
            city: row.city || '',
            clientType: row.client_type || 'regular',
          }));
        }
      } catch (e) {
        console.error("Erro ao validar clientes no banco local:", e);
        freshClientsList = clients;
      }

      if (!freshClientsList || freshClientsList.length === 0) {
        freshClientsList = clients || [];
      }

      for (const c of freshClientsList) {
        if (!c) continue;
        if (normName && normalizeText(c.name) === normName) {
          return c;
        }
        if (normPhone && c.phone && normalizeNumber(c.phone) === normPhone) {
          return c;
        }
        if (normDoc && c.document && normalizeNumber(c.document) === normDoc) {
          return c;
        }
      }
    } catch (err) {
      console.error("Erro geral na validação de duplicados:", err);
    }

    return null;
  }, [clients]);

  const handleAddClient = async () => {
    if (!newClientName) {
      toast.error('O nome do cliente é obrigatório.');
      return;
    }
    if (newClientPhone && newClientPhone.length < 10) {
      toast.error('Telefone inválido. Digite no mínimo 10 números (com DDD).');
      return;
    }
    if (newClientDoc && newClientDoc.length !== 11 && newClientDoc.length !== 14) {
      toast.error('CPF ou CNPJ inválido.');
      return;
    }
    if (newClientWhatsapp && newClientWhatsapp.length < 10) {
      toast.error('WhatsApp inválido. Digite no mínimo 10 números (com DDD).');
      return;
    }

    // Validate duplicates locally & fetch fresh list to check remote duplicates
    const existingClient = await checkDuplicateInDatabase({
      name: newClientName,
      phone: newClientPhone,
      document: newClientDoc
    });
    if (existingClient) {
      toast.error(`O cliente "${existingClient.name}" já está cadastrado.`);
      setClientId(existingClient.id);
      setSelectedClient(existingClient);
      setClientSearchText(existingClient.name);
      setIsClientModalOpen(false);

      // Reset form
      setNewClientName('');
      setNewClientNickname('');
      setNewClientPhone('');
      setNewClientPhone2('');
      setNewClientWhatsapp('');
      setNewClientDoc('');
      setNewClientAddress('');
      setNewClientType('regular');
      return;
    }

    const client = await addClient({
      name: newClientName.toUpperCase(),
      phone: newClientPhone ? maskPhone(newClientPhone) : '',
      phone2: newClientPhone2 ? maskPhone(newClientPhone2) : '',
      document: newClientDoc ? maskCPFCNPJ(newClientDoc) : '',
      whatsapp: newClientWhatsapp ? maskPhone(newClientWhatsapp) : '',
      city: newClientAddress.toUpperCase(),
      clientType: newClientType,
      nickname: newClientNickname.trim().toUpperCase()
    });
    if (client && client.id) {
      setClientId(client.id);
      justAddedClientRef.current = true;
    }
    setIsClientModalOpen(false);
    setNewClientName('');
    setNewClientNickname('');
    setNewClientPhone('');
    setNewClientPhone2('');
    setNewClientWhatsapp('');
    setNewClientDoc('');
    setNewClientType('regular');
    setNewClientAddress('');
    toast.success('Cliente cadastrado com sucesso!');
  };

  const handleAddService = (svc: { id?: string, name: string, value?: number, quantity?: number, measure?: string, motorId?: string }) => {
    const newService: ServiceItem = {
      id: svc.id || crypto.randomUUID(),
      name: svc.name,
      value: svc.value || 0,
      quantity: svc.quantity || 1,
      measure: svc.measure,
      motorId: svc.motorId !== undefined ? svc.motorId : (motorsList.length === 1 ? '0' : undefined),
    };
    setServices([...services, newService]);
  };

  const handleRemoveService = (id: string) => {
    setServices(services.filter(s => s.id !== id));
  };

  const updateServiceField = <K extends keyof ServiceItem>(id: string, field: K, value: ServiceItem[K]) => {
    setServices(services.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const totalValue = services.reduce((acc, curr) => acc + (curr.value * curr.quantity), 0);
  const parsedDiscount = parseFloat(discount.toString()) || 0;
  const netValue = Math.max(0, totalValue - parsedDiscount);
  const sumOfEntries = entries.reduce((acc, entry) => acc + (parseFloat(entry.amount.toString()) || 0), 0);
  const balanceValue = paymentStatus === 'Pago' ? 0 : (paymentStatus === 'Entrada' ? Math.max(0, netValue - sumOfEntries) : netValue);

  const handleConfirmPago = (data: PagoConfirmationData) => {
    setPaymentStatus('Pago');
    const existing = entries[0];
    const newEntry: PaymentEntryItem = {
      id: existing?.id || `pago-${Date.now()}`,
      amount: netValue,
      method: data.method,
      date: data.date,
      payer: data.payer,
    };
    setEntries([newEntry]);
    setPaymentMethod(data.method as any);
    setPaymentDate(data.date);
    setPixPaidBy(data.payer || '');
  };

  const handleAddEntrada = (data: PaymentEntryItem) => {
    const updatedEntries = [...entries, data];
    const totalPaid = updatedEntries.reduce((acc, e) => acc + (parseFloat(e.amount.toString()) || 0), 0);
    const isPaid = totalPaid >= netValue && netValue > 0;
    setPaymentStatus(isPaid ? 'Pago' : 'Entrada');
    setEntries(updatedEntries);
    setPaymentMethod(data.method as any);
    setPaymentDate(data.date);
    if (data.payer) setPixPaidBy(data.payer);
  };

  const handleUpdateEntrada = (id: string, data: PaymentEntryItem) => {
    const updatedEntries = entries.map(e => e.id === id ? data : e);
    const totalPaid = updatedEntries.reduce((acc, e) => acc + (parseFloat(e.amount.toString()) || 0), 0);
    const isPaid = totalPaid >= netValue && netValue > 0;
    setPaymentStatus(isPaid ? 'Pago' : 'Entrada');
    setEntries(updatedEntries);
  };

  const handleDeleteEntrada = (id: string, index?: number) => {
    const updated = entries.filter((e, idx) => {
      if (index !== undefined && index >= 0) {
        return idx !== index;
      }
      if (id && e.id) {
        return e.id !== id;
      }
      return true;
    });
    if (updated.length === 0) {
      setPaymentStatus('Não Pago');
    } else {
      const totalPaid = updated.reduce((acc, e) => acc + (parseFloat(e.amount.toString()) || 0), 0);
      const isPaid = totalPaid >= netValue && netValue > 0;
      setPaymentStatus(isPaid ? 'Pago' : 'Entrada');
    }
    setEntries(updated);
  };

  const handleStatusChange = (status: PaymentStatusType) => {
    if (status === 'nao_pago') {
      setPaymentStatus('Não Pago');
      setEntries([]);
      setPaymentMethod('');
      setPixPaidBy('');
    } else if (status === 'entrada') {
      setPaymentStatus('Entrada');
    } else if (status === 'pago') {
      setPaymentStatus('Pago');
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR');
    } catch (e) {
      return dateStr;
    }
  };

  const getEntries = useCallback(() => {
    return entries;
  }, [entries]);

  const getCurrentOrderObject = (): Order => {
    const parsedDisc = parseFloat(discount.toString()) || 0;
    const normalizedEntries = entries.map((e: any, index: number) => {
      const amount = (index === 0 && paymentStatus === 'Pago' && entries.length === 1)
        ? netValue
        : (parseFloat(e.amount.toString()) || 0);
      return {
        ...e,
        amount,
        method: normalizePix(e.method || ''),
      };
    });

    const lastEntry = normalizedEntries[normalizedEntries.length - 1];
    const firstEntry = normalizedEntries[0];

    return {
      id: order?.id || (osNumber ? parseInt(osNumber) : 0),
      osNumber: order?.osNumber || (osNumber ? parseInt(osNumber) : undefined),
      clientId,
      motorModel: motorModels.join(', '),
      displacement: displacements.join(', '),
      motorSpecs: buildMotorSpecs(),
      serviceStatus,
      paymentStatus,
      paymentMethod: normalizePix(paymentMethod || lastEntry?.method || firstEntry?.method || '') || undefined,
      entryValue: paymentStatus === 'Pago' ? netValue : sumOfEntries,
      balanceValue,
      partsLeft,
      additionalParts,
      services,
      discount: parsedDisc,
      totalValue,
      netValue,
      paymentEntries: normalizedEntries,
      finished,
      finishedAt: finished
        ? (order?.finished && order?.finishedAt && order.finishedAt.split('T')[0] === finishedAtDate
          ? order.finishedAt
          : (finishedAtDate
            ? (finishedAtDate === new Date().toISOString().split('T')[0]
              ? new Date().toISOString()
              : new Date(finishedAtDate + 'T' + new Date().toTimeString().split(' ')[0]).toISOString())
            : new Date().toISOString()))
        : undefined,
      deliveryDate,
      arrivalDate,
      observations: (observations.replace(/\[ENTRADAS_JSON:\[[\s\S]*?\]\]/i, "").trim().toUpperCase() + (observations.replace(/\[ENTRADAS_JSON:\[[\s\S]*?\]\]/i, "").trim() ? "\n\n" : "") + `[ENTRADAS_JSON:${JSON.stringify(normalizedEntries)}]`),
      paymentDate: paymentDate || lastEntry?.date || firstEntry?.date || undefined,
      pixPaidBy: pixPaidBy || lastEntry?.payer || firstEntry?.payer || undefined,
      statusObservation: statusObservation.trim(),
      createdAt: order?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  };

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
    const currentOrder = getCurrentOrderObject();
    setShowPrintReport(true);
    return new Promise<{ success: boolean; filePath?: string; canceled?: boolean }>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(async () => {
          try {
            const api = (window as any).electronAPI;
            if (api?.printToPDF) {
              const res = await api.printToPDF(`OS_${currentOrder.osNumber || currentOrder.id}.pdf`);
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

  const defaultAdditionalParts = ['MANCAIS DO BLOCO', 'TAMPA CABEÇOTE', 'JETCOOLER', 'COMANDO DE VÁLVULA'];
  const initialAdditionalParts = [...defaultAdditionalParts];
  order?.additionalParts?.forEach(p => {
    const uppercased = p.toUpperCase();
    if (!initialAdditionalParts.includes(uppercased)) {
      initialAdditionalParts.push(uppercased);
    }
  });

  const [availableAdditionalParts, setAvailableAdditionalParts] = useState(initialAdditionalParts);
  const [newAdditionalPartName, setNewAdditionalPartName] = useState('');

  const handleAddAdditionalPart = (e: React.MouseEvent) => {
    e.preventDefault();
    const name = newAdditionalPartName.trim().toUpperCase();
    if (!name) return;

    if (!availableAdditionalParts.includes(name)) {
      setAvailableAdditionalParts([...availableAdditionalParts, name]);
      setAdditionalParts([...additionalParts, name]);
      setNewAdditionalPartName('');
      toast.success(`Peça "${name}" adicionada.`);
    } else {
      if (!additionalParts.includes(name)) {
        setAdditionalParts([...additionalParts, name]);
        setNewAdditionalPartName('');
      } else {
        toast.error('Esta peça já está na lista.');
      }
    }
  };

  const handleRemoveAvailableAdditionalPart = (part: string) => {
    if (defaultAdditionalParts.includes(part)) return;
    setAvailableAdditionalParts(prev => prev.filter(p => p !== part));
    setAdditionalParts(prev => prev.filter(p => p !== part));
  };

  const handleAddPartLeft = (e: React.MouseEvent) => {
    e.preventDefault();
    const name = newPartLeftName.trim().toUpperCase();
    if (!name) return;

    if (!availablePartsLeft.includes(name)) {
      setAvailablePartsLeft([...availablePartsLeft, name]);
      setPartsLeft([...partsLeft, name + '|1']);
      setNewPartLeftName('');
      toast.success(`Material "${name}" adicionado.`);
    } else {
      const isChecked = partsLeft.some(p => p === name || p.startsWith(name + '|'));
      if (!isChecked) {
        setPartsLeft([...partsLeft, name + '|1']);
        setNewPartLeftName('');
      } else {
        toast.error('Este material já está na lista.');
      }
    }
  };

  const handleRemoveAvailablePartLeft = (part: string) => {
    if (defaultPartsLeft.includes(part)) return;
    setAvailablePartsLeft(prev => prev.filter(p => p !== part));
    setPartsLeft(prev => prev.filter(p => p !== part && !p.startsWith(part + '|')));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;

    // Robust clientId validation - never save undefined/null/empty
    const trimmedClientId = (clientId || '').toString().trim();
    if (!trimmedClientId || trimmedClientId === 'undefined' || trimmedClientId === 'null') {
      setClientError('Escolha o cliente desta O.S. (busque pelo nome, telefone ou CPF/CNPJ).');
      clientTriggerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      clientTriggerRef.current?.focus();
      return;
    }

    // Double-check client exists in loaded list
    const clientExists = clients.some(c => c.id === trimmedClientId);
    if (!clientExists) {
      toast.error('Cliente selecionado não encontrado. Selecione novamente.');
      return;
    }

    // Basic validation & Update client details if changed
    const selectedClient = clients.find(c => c.id === clientId);
    if (selectedClient) {
      const trimmedPhone = clientPhone.trim();
      const trimmedDoc = clientDoc.trim();
      const hasChanges = trimmedPhone !== (selectedClient.phone || '') ||
        trimmedDoc !== (selectedClient.document || '') ||
        clientType !== (selectedClient.clientType || 'regular');

      if (hasChanges) {
        if (trimmedPhone && normalizeNumber(trimmedPhone).length < 10) {
          toast.error('Telefone inválido. Digite no mínimo 10 números (com DDD).');
          return;
        }
        if (trimmedPhone) {
          const normPhone = normalizeNumber(trimmedPhone);
          if (clients.some(c => c.id !== selectedClient.id && c.phone && normalizeNumber(c.phone) === normPhone)) {
            toast.error('Este número de telefone já está cadastrado para outro cliente.');
            return;
          }
        }
        if (trimmedDoc) {
          const docDigits = normalizeNumber(trimmedDoc);
          if (docDigits.length !== 11 && docDigits.length !== 14) {
            toast.error('CPF ou CNPJ inválido.');
            return;
          }
        }

        try {
          await updateClient(selectedClient.id, {
            phone: trimmedPhone,
            document: trimmedDoc,
            clientType: clientType
          });
          setIsEditClientModalOpen(false);
        } catch (err) {
          console.error("Erro ao atualizar dados do cliente:", err);
        }
      }
    }
    if (motorModels.length === 0) {
      toast.error('Selecione ao menos um modelo de motor.');
      return;
    }

    const normalizedEntries = entries.map((e: any, index: number) => {
      const amount = (index === 0 && paymentStatus === 'Pago' && entries.length === 1)
        ? netValue
        : e.amount;
      return {
        ...e,
        amount,
        method: normalizePix(e.method || ''),
      };
    });
    const lastEntry = normalizedEntries[normalizedEntries.length - 1];
    const firstEntry = normalizedEntries[0];

    const orderData = {
      clientId: trimmedClientId,
      mechanicId: mechanicId || undefined,
      motorModel: motorModels.join(', '),
      displacement: displacements.join(', '),
      motorSpecs: buildMotorSpecs(),
      serviceStatus,
      paymentStatus,
      paymentMethod: normalizePix(paymentMethod || lastEntry?.method || firstEntry?.method || '') || undefined,
      entryValue: paymentStatus === 'Pago' ? netValue : sumOfEntries,
      balanceValue,
      partsLeft,
      additionalParts,
      services,
      discount: parsedDiscount,
      totalValue,
      netValue,
      paymentEntries: normalizedEntries,
      finished,
      finishedAt: finished
        ? (order?.finished && order?.finishedAt && order.finishedAt.split('T')[0] === finishedAtDate
          ? order.finishedAt
          : (finishedAtDate
            ? (finishedAtDate === new Date().toISOString().split('T')[0]
              ? new Date().toISOString()
              : new Date(finishedAtDate + 'T' + new Date().toTimeString().split(' ')[0]).toISOString())
            : new Date().toISOString()))
        : undefined,
      deliveryDate,
      arrivalDate,
      observations: (observations.replace(/\[ENTRADAS_JSON:\[[\s\S]*?\]\]/i, "").trim().toUpperCase() + (observations.replace(/\[ENTRADAS_JSON:\[[\s\S]*?\]\]/i, "").trim() ? "\n\n" : "") + `[ENTRADAS_JSON:${JSON.stringify(normalizedEntries)}]`),
      paymentDate: paymentDate || lastEntry?.date || firstEntry?.date || undefined,
      pixPaidBy: pixPaidBy || lastEntry?.payer || firstEntry?.payer || undefined,
      statusObservation: statusObservation.trim()
    };

    try {
      if (order) {
        await updateOrder(order.id, orderData);
        toast.success('O.S. atualizada com sucesso!');
      } else {
        await addOrder({
          ...orderData,
          id: osNumber ? parseInt(osNumber) : undefined
        });
        toast.success('O.S. criada com sucesso!');
        if (onComplete) onComplete();
      }
    } catch (err) {
      // Error handled by store toast
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter') {
      const target = e.target as HTMLElement;
      // Support textarea line breaks normally
      if (target.tagName.toLowerCase() === 'textarea') {
        return;
      }

      // Prevent default form submission
      e.preventDefault();

      // If it's a dropdown, select trigger, or command item/input, let it confirm selection
      const isCommandInput = target.hasAttribute('data-cmdk-input') || target.closest('[data-cmdk-root]');
      const isSelectTrigger = target.getAttribute('role') === 'combobox' || target.hasAttribute('data-state');

      if (!isCommandInput && !isSelectTrigger && target.tagName.toLowerCase() === 'input') {
        // Move focus to the next input/select field
        const form = e.currentTarget;
        const elements = Array.from(form.querySelectorAll('input, select, textarea')) as HTMLElement[];
        const focusable = elements.filter(el => {
          if (el.tabIndex === -1) return false;
          if ((el as HTMLInputElement).disabled) return false;
          if ((el as HTMLInputElement).readOnly) return false;
          if (el.offsetWidth === 0 && el.offsetHeight === 0) return false;
          return true;
        });
        const index = focusable.indexOf(target);
        if (index > -1 && index < focusable.length - 1) {
          focusable[index + 1].focus();
        }
      }
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className={cn("space-y-4 max-w-[850px] mx-auto pb-10 print:p-0 print:m-0 print:max-w-none", readOnly && "opacity-100")}>

        {/* ═══ TOPBAR / HEADER ═══ */}
        <div className="flex items-center justify-between print:hidden mb-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              {readOnly ? "Visualizar O.S." : order ? "Editar Ordem de Serviço" : "Nova Ordem de Serviço"}
            </h2>
            <p className="text-muted-foreground mt-1 text-xs font-medium flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
              {readOnly ? `Detalhes da O.S. #${order?.id}` : order ? `Alterando dados da O.S. #${order.id}` : "Preencha os detalhes para gerar uma nova O.S."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {readOnly && (
              <Button
                type="button"
                variant="outline"
                onClick={() => window.print()}
                className="flex items-center gap-2 h-11 px-5 rounded-xl text-xs border-border hover:bg-muted transition-all"
              >
                <Printer className="w-4 h-4" />
                Imprimir O.S.
              </Button>
            )}
            {!readOnly && (
              <Button size="lg" type="submit" className="solid-btn font-bold h-10 px-5 rounded-lg text-sm shadow-sm cursor-pointer">
                {order ? "Salvar Alterações" : "Gerar Ordem de Serviço"}
              </Button>
            )}
          </div>
        </div>

        {/* ═══ SINGLE-COLUMN LAYOUT CONTAINER ═══ */}
        <div className={cn("space-y-6 w-full", readOnly && "pointer-events-none")}>
          {/* SEÇÃO 1: DETALHES DA O.S. */}
          <div className="bg-card border border-border rounded-2xl p-6 sm:p-7 space-y-4 shadow-sm">
            {/* Cabeçalho */}
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                DETALHES DA O.S.
              </span>
            </div>

            {/* Linha: O.S. Nº e Data de Chegada */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
              {/* O.S. Nº */}
              <div className="space-y-2">
                <Label className="text-[13px] font-bold text-foreground/80">O.S. Nº</Label>
                <div className="flex items-center gap-2.5">
                  <Input
                    ref={osNumberRef}
                    type="number"
                    value={osNumber}
                    onChange={e => setOsNumber(e.target.value)}
                    className="flex-1 min-w-0 h-10 px-3.5 font-mono text-sm font-semibold rounded-xl bg-muted/50 border border-border text-foreground focus:bg-card focus:border-foreground/30 transition-all os-number-input shadow-none"
                    placeholder={String(Math.max(1000, ...orders.map(o => Number(o.osNumber || o.id) || 0)) + 1)}
                    title="Deixe em branco para usar o próximo número livre"
                    disabled={!!order || readOnly}
                  />
                  {!order && !readOnly && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAutoGenerateOS}
                      className="h-10 px-3.5 rounded-xl border border-border bg-muted/50 hover:bg-muted text-foreground/80 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shrink-0 shadow-none cursor-pointer"
                      title="Gerar próximo número sequencial de O.S."
                    >
                      <Settings className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>Gerar auto</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* DATA DE CHEGADA */}
              <div className="space-y-2">
                <Label className="text-[13px] font-bold text-foreground/80">Data de Chegada</Label>
                <div className="flex items-center gap-2.5">
                  <div className="flex-1 min-w-0">
                    <DatePicker
                      value={arrivalDate}
                      onChange={(dateStr) => setArrivalDate(dateStr)}
                      placeholder="Selecione a data..."
                      className="w-full h-10 px-3 text-sm font-semibold rounded-xl border border-border bg-muted/50 text-foreground focus:bg-card focus:border-foreground/30 transition-all cursor-pointer shadow-none"
                    />
                  </div>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => setArrivalDate(getLocalDateString())}
                      className="h-10 px-4 rounded-xl bg-primary/10 hover:bg-primary/15 text-primary border border-primary/20 font-bold text-xs uppercase transition-colors shrink-0 cursor-pointer"
                    >
                      HOJE
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Linha 2: Status do Serviço e Observação do Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
              {/* STATUS DO SERVIÇO */}
              <div className="space-y-2">
                <Label className="text-[13px] font-bold uppercase tracking-wider text-foreground/80">STATUS DO SERVIÇO</Label>
                <Select
                  value={serviceStatus}
                  onValueChange={(v) => {
                    const nextStatus = (v as ServiceStatus) || 'Na Fila';
                    setServiceStatus(nextStatus);
                    if (nextStatus === 'Levou' && !deliveryDate) {
                      setDeliveryDate(new Date().toISOString().split('T')[0]);
                    }
                  }}
                  disabled={readOnly}
                >
                  <SelectTrigger className="h-10 w-full rounded-xl border border-border bg-muted/50 hover:bg-muted transition-all px-3.5 group text-sm font-semibold text-foreground focus:outline-none focus:border-foreground/30 flex items-center justify-between gap-2.5 cursor-pointer shadow-none">
                    <div className="flex items-center gap-2.5">
                      <div className={cn(
                        "w-2.5 h-2.5 rounded-full shadow-sm ring-2 ring-offset-1 ring-offset-background",
                        serviceStatus === 'Na Fila' && "bg-gray-400 ring-gray-300 dark:ring-gray-600",
                        serviceStatus === 'Em Andamento' && "bg-blue-500 ring-blue-300 dark:ring-blue-600",
                        serviceStatus === 'Aguardando Peça' && "bg-amber-500 ring-amber-300 dark:ring-amber-600",
                        serviceStatus === 'Pronto' && "bg-green-500 ring-green-300 dark:ring-green-600",
                        serviceStatus === 'Levou' && "bg-violet-500 ring-violet-300 dark:ring-violet-600"
                      )} />
                      <SelectValue className="font-semibold text-sm text-foreground" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="z-[9999] bg-popover border border-border rounded-xl shadow-xl p-1.5 min-w-[220px]">
                    {([
                      ['Na Fila', 'bg-gray-400'],
                      ['Em Andamento', 'bg-blue-500'],
                      ['Aguardando Peça', 'bg-amber-500'],
                      ['Pronto', 'bg-green-500'],
                      ['Levou', 'bg-violet-500'],
                    ] as const).map(([value, dot]) => (
                      <SelectItem key={value} value={value} className="rounded-lg py-2 pl-3 pr-8 focus:bg-muted cursor-pointer transition-colors group">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full", dot)} />
                          <span className="font-bold text-xs text-foreground/80">{value}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {serviceStatus === 'Levou' && (
                  <div className="space-y-1.5 pt-1.5">
                    <label className="text-[11px] font-bold text-levou uppercase tracking-wider ml-1 flex items-center gap-1">
                      <CalendarIcon className="w-3.5 h-3.5" /> Data em que o cliente levou
                    </label>
                    <DatePicker
                      value={deliveryDate}
                      onChange={(dateStr) => setDeliveryDate(dateStr)}
                      className="h-10 rounded-xl border-levou/30 bg-levou/5 text-foreground focus:ring-1 focus:ring-levou shadow-none"
                    />
                  </div>
                )}
              </div>

              {/* OBSERVAÇÃO DO STATUS */}
              <div className="space-y-2">
                <Label className="text-[13px] font-bold uppercase tracking-wider text-foreground/80">
                  OBSERVAÇÃO DO STATUS <span className="text-[11px] text-muted-foreground font-normal tracking-normal">(OPCIONAL)</span>
                </Label>
                <Input
                  placeholder="Ex: Aguardando pistões 0.50"
                  maxLength={80}
                  value={statusObservation}
                  onChange={(e) => setStatusObservation(e.target.value)}
                  disabled={readOnly}
                  className="h-10 w-full rounded-xl border border-border bg-muted/50 px-3.5 text-sm font-medium text-foreground focus:bg-card focus:border-foreground/30 transition-all shadow-none"
                />
              </div>
            </div>
          </div>

          {/* SEÇÃO 2: INFORMAÇÕES DO CLIENTE */}
          <div className="bg-card border border-border rounded-2xl p-6 sm:p-7 space-y-5 shadow-sm">
            {/* Cabeçalho */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-muted text-muted-foreground border border-border flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 stroke-[2]" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-extrabold text-sm sm:text-base uppercase tracking-tight text-foreground">
                    INFORMAÇÕES DO CLIENTE <span className="text-danger">*</span>
                  </h2>
                  <p className="text-xs text-muted-foreground font-medium">
                    Busque por nome, apelido, telefone, CPF/CNPJ ou cidade para vincular à O.S.
                  </p>
                </div>
              </div>

              {!readOnly && (
                !clientId ? (
                  <Button
                    type="button"
                    onClick={handleOpenNewClientModal}
                    className="solid-btn h-9 px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
                    title="Cadastrar novo cliente"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Novo cliente</span>
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSwapClient}
                      className="h-9 px-3.5 rounded-xl border border-border hover:border-foreground/25 bg-card hover:bg-muted text-foreground/80 text-xs font-bold flex items-center gap-1.5 transition-all shadow-none cursor-pointer"
                      title="Buscar ou selecionar outro cliente"
                    >
                      <RotateCcw className="w-3.5 h-3.5 stroke-[2.2] text-muted-foreground" />
                      <span>Trocar</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenEditClientModal}
                      className="h-9 px-3.5 rounded-xl border border-border hover:border-foreground/25 bg-card hover:bg-muted text-foreground/80 text-xs font-bold flex items-center gap-1.5 transition-all shadow-none cursor-pointer"
                      title="Editar dados cadastrais"
                    >
                      <Pencil className="w-3.5 h-3.5 stroke-[2] text-muted-foreground" />
                      <span>Editar</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleClearClient}
                      className="w-9 h-9 rounded-xl border border-danger/30 hover:bg-danger/10 text-danger flex items-center justify-center transition-all cursor-pointer"
                      title="Desvincular / Limpar Cliente"
                    >
                      <X className="w-4 h-4 stroke-[2.2]" />
                    </button>
                  </div>
                )
              )}
            </div>

            {/* Conteúdo do Cliente */}
            {!clientId ? (
              <div className="space-y-4">
                {/* Linha de Busca Full-Width */}
                <div className="relative w-full">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                  <Input
                    ref={clientTriggerRef}
                    type="text"
                    disabled={readOnly}
                    placeholder="Busque por nome, apelido, telefone, CPF/CNPJ ou cidade..."
                    value={clientSearchText}
                    onChange={(e) => {
                      const val = e.target.value;
                      setClientSearchText(val);
                      if (!val) {
                        setClientId('');
                        setSelectedClient(null);
                      }
                      const trimmed = val.trim();
                      if (trimmed.length >= 2) {
                        setIsClientSelectorOpen(true);
                        calculateDropdownPosition();
                      } else {
                        setIsClientSelectorOpen(false);
                      }
                    }}
                    onFocus={(e) => {
                      if (readOnly) return;
                      e.target.select();
                    }}
                    onKeyDown={handleInputKeyDown}
                    aria-invalid={!!clientError}
                    className={cn(
                      "w-full h-11 rounded-xl border border-border bg-muted/50 pl-10 text-[15px] font-medium text-foreground focus:bg-card focus:border-foreground/30 transition-all shadow-none",
                      clientSearchText ? "pr-10" : "pr-4",
                      clientError && "border-danger ring-2 ring-danger/20"
                    )}
                  />
                  {clientSearchText && !readOnly && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClearClient();
                        }}
                        className="w-5 h-5 rounded-full bg-accent hover:bg-danger/10 hover:text-danger text-muted-foreground flex items-center justify-center text-xs transition-colors cursor-pointer"
                        title="Limpar busca"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                  {clientError && (
                    <p role="alert" className="mt-1.5 ml-1 text-sm font-semibold text-danger">{clientError}</p>
                  )}

                  {/* Portal dropdown estilo card flutuante */}
                  {isClientSelectorOpen && typeof window !== 'undefined' && createPortal(
                    <div
                      ref={clientDropdownRef}
                      style={{
                        position: 'fixed',
                        ...(clientDropdownPos.top != null ? { top: clientDropdownPos.top } : {}),
                        ...(clientDropdownPos.bottom != null ? { bottom: clientDropdownPos.bottom } : {}),
                        left: clientDropdownPos.left,
                        width: clientDropdownPos.width,
                        zIndex: 1100,
                      }}
                      className="bg-popover border border-border rounded-2xl shadow-[0_12px_28px_-4px_rgba(15,23,42,0.12),0_4px_10px_-2px_rgba(15,23,42,0.04)] overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150 p-1.5 z-[1100]"
                    >
                      {exactMatchClient && (
                        <div className="p-3 mb-1 bg-warning/10 rounded-xl border border-warning/20 text-xs text-warning font-bold flex flex-col gap-1">
                          <span>⚠️ Cliente já cadastrado</span>
                          <span className="font-normal text-xs text-muted-foreground">O nome "{clientSearchText}" já existe. Selecione o cliente na lista abaixo para prosseguir.</span>
                        </div>
                      )}
                      <div className="max-h-[300px] overflow-y-auto space-y-0.5">
                        {isLoadingClients ? (
                          <p className="p-4 text-xs text-muted-foreground/60 italic text-center">
                            Carregando clientes...
                          </p>
                        ) : clientSearchText.trim() !== debouncedClientSearchQuery.trim() && clientSearchText.trim().length >= 2 ? (
                          <p className="p-4 text-xs text-muted-foreground/60 italic text-center">
                            Buscando...
                          </p>
                        ) : clientsError ? (
                          <div className="p-4 text-center space-y-2">
                            <p className="text-xs text-destructive font-semibold">
                              Falha ao carregar clientes.
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                loadClientsData(true);
                              }}
                              className="h-7 px-3 text-xs uppercase font-bold border-destructive/30 hover:bg-destructive/10 hover:text-destructive mx-auto block"
                            >
                              Tentar Novamente
                            </Button>
                          </div>
                        ) : filteredClients.length === 0 ? (
                          <div className="p-4 text-center space-y-3">
                            <p className="text-xs text-muted-foreground italic">
                              Nenhum cliente encontrado
                            </p>
                            <Button
                              type="button"
                              onClick={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const queryDigits = normalizeNumber(clientSearchText);
                                const existingClient = await checkDuplicateInDatabase({
                                  name: clientSearchText,
                                  phone: queryDigits,
                                  document: queryDigits
                                });
                                if (existingClient) {
                                  toast.error(`O cliente "${existingClient.name}" já está cadastrado. Selecionando automaticamente.`);
                                  setClientId(existingClient.id);
                                  setSelectedClient(existingClient);
                                  setClientSearchText(existingClient.name);
                                  setIsClientSelectorOpen(false);
                                  return;
                                }
                                setIsClientSelectorOpen(false);
                                setNewClientName(clientSearchText.toUpperCase());
                                setIsClientModalOpen(true);
                              }}
                              className="solid-btn h-9 px-4 text-xs font-bold hover:scale-[1.02] transition-all cursor-pointer mx-auto flex items-center gap-1.5 rounded-lg"
                            >
                              <UserPlus className="w-4 h-4 shrink-0" />
                              + Cadastrar novo cliente
                            </Button>
                          </div>
                        ) : (
                          filteredClients.map((client, index) => {
                            const qDigits = normalizeNumber(clientSearchText);
                            const isExactDuplicate = exactMatchClient && (
                              (normalizeText(client.name) === normalizeText(clientSearchText)) ||
                              (qDigits && client.phone && normalizeNumber(client.phone) === qDigits) ||
                              (qDigits && client.document && normalizeNumber(client.document) === qDigits)
                            ) && client.id !== clientId;
                            return (
                              <button
                                key={client.id}
                                ref={index === highlightedIndex ? highlightedItemRef : null}
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setClientId(client.id);
                                  setSelectedClient(client);
                                  setClientSearchText('');
                                  setIsClientSelectorOpen(false);
                                }}
                                className={cn(
                                  "w-full flex items-center justify-between py-2.5 px-3.5 rounded-xl cursor-pointer transition-colors text-left group",
                                  clientId === client.id || index === highlightedIndex
                                    ? "bg-muted"
                                    : "hover:bg-muted/60",
                                  isExactDuplicate && "border border-warning/30 bg-warning/5 hover:bg-warning/10"
                                )}
                              >
                                <div className="flex flex-col min-w-0 pr-3">
                                  <span className="font-bold text-[13.5px] text-foreground tracking-tight">
                                    {client.nickname ? client.nickname.toUpperCase() : client.name}
                                  </span>
                                  {client.nickname && (
                                    <span className="text-xs font-semibold text-foreground/80 mt-0.5">
                                      {client.name}
                                    </span>
                                  )}
                                  {(client.phone || client.document) ? (
                                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                                      {client.phone && <span>{maskPhone(client.phone)}</span>}
                                      {client.phone && client.document && (
                                        <span className="text-muted-foreground/50 font-bold">•</span>
                                      )}
                                      {client.document && <span>{maskCPFCNPJ(client.document)}</span>}
                                    </div>
                                  ) : (!client.nickname && (
                                    <span className="text-xs text-muted-foreground mt-0.5">Sem contato</span>
                                  ))}
                                </div>
                                <div className="shrink-0 flex items-center gap-1.5">
                                  {client.clientType === 'mechanic' ? (
                                    <span className="text-[10px] font-bold tracking-wider bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30 rounded-lg px-2.5 py-0.5 uppercase">
                                      MECÂNICO
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-bold tracking-wider bg-muted text-muted-foreground border border-border rounded-lg px-2.5 py-0.5 uppercase">
                                      CLIENTE
                                    </span>
                                  )}
                                  {clientId === client.id && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>,
                    document.body
                  )}
                </div>

                {/* Estado vazio */}
                <div className="w-full py-10 sm:py-12 px-6 rounded-2xl border border-dashed border-border flex flex-col items-center justify-center text-center bg-transparent">
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center shrink-0 mb-3 text-muted-foreground">
                    <UserX className="w-6 h-6 stroke-[1.5]" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">
                    Nenhum cliente selecionado
                  </span>
                  <span className="text-sm font-bold text-foreground mt-1">
                    Use a busca acima ou cadastre um novo cliente.
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* CARD DE DADOS DO CLIENTE */}
                {(() => {
                  const isMechanicClient = selectedClient?.clientType === 'mechanic';
                  const fullAddress = selectedClient?.city || '';
                  const cleanDoc = normalizeNumber(selectedClient?.document || '');
                  const docLabel = cleanDoc.length > 11 ? 'CNPJ' : 'CPF';
                  const infoTile = "rounded-2xl border border-border bg-card p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:border-foreground/20 transition-all group";
                  const infoIcon = "w-10 h-10 rounded-xl bg-muted text-muted-foreground border border-border flex items-center justify-center shrink-0";
                  const copyBtn = "opacity-0 group-hover:opacity-100 focus:opacity-100 p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer";
                  const waBtn = "px-2.5 py-1 rounded-lg border border-emerald-300 dark:border-emerald-700/80 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-bold hover:scale-105 active:scale-95 transition-all flex items-center gap-1 shrink-0 cursor-pointer";
                  const value = (filled: boolean) => cn("text-sm sm:text-[15px] select-all truncate mt-0.5", filled ? "font-black font-mono tracking-tight text-foreground" : "font-medium text-muted-foreground");

                  return (
                    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4 shadow-sm">
                      {/* Cabeçalho do card: avatar + apelido/nome e tag do tipo */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className={cn(
                            "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm text-white",
                            isMechanicClient ? "bg-slate-800" : "bg-slate-700"
                          )}>
                            {isMechanicClient ? <Wrench className="w-6 h-6 stroke-[2]" /> : <User className="w-6 h-6 stroke-[2]" />}
                          </div>

                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground font-semibold">
                              <span className="uppercase tracking-wider text-[11px] text-muted-foreground/80 font-bold">Apelido:</span>
                              <span className={cn(
                                "text-sm sm:text-base font-extrabold text-foreground tracking-tight",
                                !selectedClient?.nickname && "font-normal italic text-muted-foreground text-xs sm:text-sm"
                              )}>
                                {selectedClient?.nickname || 'Não informado'}
                              </span>
                            </div>
                            <h3
                              className="text-lg sm:text-xl font-black text-foreground uppercase tracking-tight leading-tight truncate select-all mt-0.5"
                              title={selectedClient?.name || ''}
                            >
                              {selectedClient?.name || '—'}
                            </h3>
                          </div>
                        </div>

                        <div className="shrink-0 pt-1">
                          {isMechanicClient ? (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-500/30 bg-blue-50/70 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold tracking-tight">
                              <Wrench className="w-3.5 h-3.5 stroke-[2.2]" />
                              <span>Mecânico</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border bg-muted text-muted-foreground text-xs font-bold tracking-tight">
                              <User className="w-3.5 h-3.5 stroke-[2.2]" />
                              <span>Cliente Padrão</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="border-t border-border pt-1" />

                      {/* Grade 2x2 */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
                        {/* 1. TELEFONE 1 */}
                        <div className={infoTile}>
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={infoIcon}><Phone className="w-4 h-4 stroke-[2]" /></div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">TELEFONE 1</span>
                              <span className={value(!!selectedClient?.phone)}>
                                {selectedClient?.phone ? maskPhone(selectedClient.phone) : 'Não cadastrado'}
                              </span>
                            </div>
                          </div>
                          {selectedClient?.phone && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button type="button" onClick={() => handleCopy(maskPhone(selectedClient.phone!), 'Telefone 1')} className={copyBtn} title="Copiar Telefone 1">
                                {copiedField === 'Telefone 1' ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                              <a href={getWhatsAppUrl(selectedClient.whatsapp || selectedClient.phone, selectedClient.nickname || selectedClient.name, osNumber)} target="_blank" rel="noopener noreferrer" className={waBtn} title="Conversar no WhatsApp">
                                <WhatsAppIcon className="w-3.5 h-3.5" />
                                <span>WhatsApp</span>
                              </a>
                            </div>
                          )}
                        </div>

                        {/* 2. TELEFONE 2 */}
                        <div className={infoTile}>
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={infoIcon}><Smartphone className="w-4 h-4 stroke-[2]" /></div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">TELEFONE 2</span>
                              <span className={value(!!selectedClient?.phone2)}>
                                {selectedClient?.phone2 ? maskPhone(selectedClient.phone2) : 'Não cadastrado'}
                              </span>
                            </div>
                          </div>
                          {selectedClient?.phone2 && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button type="button" onClick={() => handleCopy(maskPhone(selectedClient.phone2!), 'Telefone 2')} className={copyBtn} title="Copiar Telefone 2">
                                {copiedField === 'Telefone 2' ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                              <a href={getWhatsAppUrl(selectedClient.phone2, selectedClient.nickname || selectedClient.name, osNumber)} target="_blank" rel="noopener noreferrer" className={waBtn} title="Conversar no WhatsApp (Telefone 2)">
                                <WhatsAppIcon className="w-3.5 h-3.5" />
                                <span>WhatsApp</span>
                              </a>
                            </div>
                          )}
                        </div>

                        {/* 3. CPF / CNPJ */}
                        <div className={infoTile}>
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={infoIcon}><CreditCard className="w-4 h-4 stroke-[2]" /></div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{docLabel}</span>
                              <span className={value(!!selectedClient?.document)}>
                                {selectedClient?.document ? maskCPFCNPJ(selectedClient.document) : 'Não informado'}
                              </span>
                            </div>
                          </div>
                          {selectedClient?.document && (
                            <button type="button" onClick={() => handleCopy(maskCPFCNPJ(selectedClient.document!), 'CPF/CNPJ')} className={cn(copyBtn, 'shrink-0')} title="Copiar Documento">
                              {copiedField === 'CPF/CNPJ' ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>

                        {/* 4. ENDEREÇO / CIDADE */}
                        <div className={infoTile}>
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={infoIcon}><MapPin className="w-4 h-4 stroke-[2]" /></div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">ENDEREÇO / CIDADE</span>
                              <span className={cn(value(!!fullAddress), 'font-sans')} title={fullAddress || ''}>
                                {fullAddress || 'Não informado'}
                              </span>
                            </div>
                          </div>
                          {fullAddress && (
                            <div className="flex items-center gap-1 shrink-0">
                              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`} target="_blank" rel="noopener noreferrer" className={cn(copyBtn, 'hover:text-blue-600 dark:hover:text-blue-400')} title="Ver no Google Maps">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                              <button type="button" onClick={() => handleCopy(fullAddress, 'Endereço')} className={copyBtn} title="Copiar Endereço">
                                {copiedField === 'Endereço' ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* MECÂNICO RESPONSÁVEL (quando o cliente não é mecânico) */}
                {selectedClient?.clientType !== 'mechanic' && (
                  mechanicId ? (
                    (() => {
                      const mechanic = clients.find(c => c.id === mechanicId);
                      if (!mechanic) return null;
                      return (
                        <div className="space-y-2 pt-1">
                          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                            <Wrench className="w-3.5 h-3.5" />
                            <span>MECÂNICO RESPONSÁVEL</span>
                          </p>
                          <div className="p-3.5 sm:p-4 rounded-2xl bg-card border border-border flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div className="w-11 h-11 rounded-xl bg-slate-800 text-white flex items-center justify-center shrink-0 shadow-sm">
                                <Wrench className="w-5 h-5 stroke-[2]" />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-[11px] font-medium text-muted-foreground truncate">
                                  Apelido: {mechanic.nickname || 'Não informado'}
                                </span>
                                <strong className="text-sm sm:text-base font-black text-foreground uppercase tracking-tight truncate mt-0.5">
                                  {mechanic.name}
                                </strong>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground font-medium">
                                  {mechanic.document && (
                                    <div className="flex items-center gap-1.5 font-mono text-xs">
                                      <span className="text-[10px] font-bold uppercase text-muted-foreground/80">{normalizeNumber(mechanic.document).length > 11 ? 'CNPJ' : 'CPF'}</span>
                                      <FileText className="w-3.5 h-3.5 shrink-0" />
                                      <span>{maskCPFCNPJ(mechanic.document)}</span>
                                    </div>
                                  )}
                                  {mechanic.phone && (
                                    <div className="flex items-center gap-1.5 font-mono text-xs">
                                      <span className="text-[10px] font-bold uppercase text-muted-foreground/80">TELEFONE 1</span>
                                      <Phone className="w-3.5 h-3.5 shrink-0" />
                                      <span>{maskPhone(mechanic.phone)}</span>
                                      <a
                                        href={getWhatsAppUrl(mechanic.whatsapp || mechanic.phone, mechanic.nickname || mechanic.name, osNumber)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-5 h-5 rounded-md bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center transition-all ml-0.5 cursor-pointer"
                                        title="WhatsApp do Mecânico"
                                      >
                                        <WhatsAppIcon className="w-3 h-3" />
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {!readOnly && (
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => openEditClientModalFor(mechanic)}
                                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                  title="Ver / editar cadastro do mecânico"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMechanicId('');
                                    setMechanicSearchText('');
                                  }}
                                  className="p-2 rounded-lg hover:bg-danger/10 hover:text-danger text-muted-foreground transition-colors cursor-pointer"
                                  title="Desvincular mecânico"
                                >
                                  <X className="w-4 h-4 stroke-[2.2]" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    /* Quando não há mecânico vinculado */
                    <div className="space-y-2 pt-1">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                        MECÂNICO RESPONSÁVEL <span className="normal-case font-normal tracking-normal">(opcional)</span>
                      </label>

                      {defaultMechanicOfClient && (
                        <div className="p-2.5 rounded-xl bg-muted/50 border border-border flex items-center justify-between gap-3 max-w-lg mb-2">
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Mecânico habitual do cliente</p>
                            <p className="text-xs font-bold text-foreground truncate">
                              {defaultMechanicOfClient.nickname ? `${defaultMechanicOfClient.nickname.toUpperCase()} (${defaultMechanicOfClient.name})` : defaultMechanicOfClient.name}
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              setMechanicId(defaultMechanicOfClient.id);
                              toast.success(`Mecânico ${defaultMechanicOfClient.name} vinculado.`);
                            }}
                            className="solid-btn h-7 px-3 text-xs font-bold rounded-lg cursor-pointer shrink-0"
                          >
                            Vincular
                          </Button>
                        </div>
                      )}

                      <div ref={osMechContainerRef} className="relative w-full">
                        <div className="relative">
                          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                          <Input
                            type="text"
                            disabled={readOnly}
                            placeholder="Pesquisar mecânico por nome, apelido ou telefone..."
                            value={mechanicSearchText}
                            onChange={(e) => {
                              setMechanicSearchText(e.target.value);
                              setIsMechanicSelectorOpen(true);
                            }}
                            onFocus={() => {
                              if (!readOnly) setIsMechanicSelectorOpen(true);
                            }}
                            className={cn(
                              "w-full h-11 rounded-xl border border-border bg-card pl-10 text-[13.5px] font-medium text-foreground focus:border-foreground/30 transition-all shadow-none",
                              mechanicSearchText ? "pr-10" : "pr-4"
                            )}
                          />
                          {mechanicSearchText && !readOnly && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setMechanicSearchText('');
                                  setIsMechanicSelectorOpen(false);
                                }}
                                className="w-5 h-5 rounded-full bg-accent hover:bg-danger/10 hover:text-danger text-muted-foreground flex items-center justify-center text-xs transition-colors cursor-pointer"
                              >
                                ✕
                              </button>
                            </div>
                          )}
                        </div>

                        {isMechanicSelectorOpen && (
                          <div className="absolute z-[1200] w-full mt-1.5 max-h-[240px] overflow-y-auto bg-popover border border-border rounded-2xl shadow-[0_12px_28px_-4px_rgba(15,23,42,0.12),0_4px_10px_-2px_rgba(15,23,42,0.04)] p-1.5 space-y-0.5">
                            {filteredMechanicsForOS.length > 0 ? (
                              filteredMechanicsForOS.map((mech) => {
                                const handleSelect = () => {
                                  setMechanicId(mech.id);
                                  setMechanicSearchText('');
                                  setIsMechanicSelectorOpen(false);
                                };
                                return (
                                  <button
                                    key={mech.id}
                                    type="button"
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      handleSelect();
                                    }}
                                    onPointerDown={(e) => {
                                      e.preventDefault();
                                      handleSelect();
                                    }}
                                    onClick={handleSelect}
                                    className="w-full flex items-center justify-between py-2 px-3 rounded-xl cursor-pointer hover:bg-muted/60 transition-colors text-left"
                                  >
                                    <div className="flex flex-col min-w-0 pr-3">
                                      <span className="font-bold text-[13px] text-foreground tracking-tight">
                                        {mech.nickname ? mech.nickname.toUpperCase() : mech.name}
                                      </span>
                                      {mech.nickname && (
                                        <span className="text-xs font-semibold text-foreground/80 mt-0.5">
                                          {mech.name}
                                        </span>
                                      )}
                                      {(mech.phone || mech.document) && (
                                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                                          {mech.phone && <span>{maskPhone(mech.phone)}</span>}
                                          {mech.phone && mech.document && (
                                            <span className="text-muted-foreground/50 font-bold">•</span>
                                          )}
                                          {mech.document && <span>{maskCPFCNPJ(mech.document)}</span>}
                                        </div>
                                      )}
                                    </div>
                                    <span className="text-[10px] font-bold tracking-wider bg-muted text-foreground/80 border border-border rounded-lg px-2 py-0.5 uppercase shrink-0">
                                      MECÂNICO
                                    </span>
                                  </button>
                                );
                              })
                            ) : filteredNonMechanicsForOS.length > 0 ? (
                              <>
                                <div className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-muted/60 rounded-lg">
                                  Não marcados como mecânico ainda
                                </div>
                                {filteredNonMechanicsForOS.map((client) => {
                                  const clientDisplayName = client.nickname ? `${client.nickname.toUpperCase()} (${client.name})` : client.name;
                                  const isUpdating = isUpdatingMechanicId === client.id;
                                  return (
                                    <div
                                      key={client.id}
                                      className="w-full text-left px-3 py-2 text-xs hover:bg-muted/60 rounded-xl text-foreground font-bold flex items-center justify-between gap-2"
                                    >
                                      <span className="truncate">{clientDisplayName}</span>
                                      <button
                                        type="button"
                                        disabled={isUpdating}
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          handleMarkAsMechanic(client);
                                        }}
                                        onPointerDown={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          handleMarkAsMechanic(client);
                                        }}
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          handleMarkAsMechanic(client);
                                        }}
                                        className="shrink-0 flex items-center gap-1 px-2.5 py-1 text-[10px] font-extrabold text-foreground/80 bg-muted hover:bg-accent border border-border rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                                      >
                                        <Plus className="w-3 h-3 stroke-[2.5]" />
                                        <span>{isUpdating ? 'Marcando...' : 'Marcar como mecânico'}</span>
                                      </button>
                                    </div>
                                  );
                                })}
                              </>
                            ) : (
                              <div className="p-3 text-xs text-muted-foreground/60 italic text-center">Nenhum mecânico ou cliente encontrado</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          {/* CARD 2: MATERIAIS E PEÇAS */}
          <div className="bg-card border border-border/60 dark:border-border rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                  <Package className="w-4 h-4 text-primary" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-[0.2em] text-foreground/90 font-bold">
                    MATERIAIS E PEÇAS
                  </span>
                  {(partsLeft.length > 0 || additionalParts.length > 0) && (
                    <span className="text-[10px] font-bold bg-muted text-foreground/80 px-2.5 py-0.5 rounded-full border border-border font-mono tracking-normal">
                      {partsLeft.length} deixados • {additionalParts.length} adicionais
                    </span>
                  )}
                </div>
              </div>

              {!readOnly && (partsLeft.length > 0 || additionalParts.length > 0) && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleClearAllParts}
                    className="h-7 px-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-danger hover:bg-danger/10 border border-transparent hover:border-danger/20 flex items-center gap-1 transition-all cursor-pointer"
                    title="Desmarcar todos os materiais e peças"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>Limpar</span>
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {([
                  {
                    key: 'left',
                    label: 'MATERIAL DEIXADO',
                    available: availablePartsLeft,
                    defaults: defaultPartsLeft,
                    selected: partsLeft,
                    setSelected: setPartsLeft,
                    defaultQty: (name: string) => (name === 'PISTÕES' || name === 'BIELAS') ? (parseInt(motorsList[0]?.cylinders || '') || 4) : 1,
                    onRemoveAvailable: handleRemoveAvailablePartLeft,
                    newValue: newPartLeftName,
                    setNewValue: setNewPartLeftName,
                    onAdd: handleAddPartLeft,
                    addPlaceholder: 'Adicionar outro material...',
                    idPrefix: 'material',
                  },
                  {
                    key: 'additional',
                    label: 'PEÇAS ADICIONAIS',
                    available: availableAdditionalParts,
                    defaults: defaultAdditionalParts,
                    selected: additionalParts,
                    setSelected: setAdditionalParts,
                    defaultQty: (name: string) => name.includes('MANCAIS') ? 5 : name.includes('JETCOOLER') ? (parseInt(motorsList[0]?.cylinders || '') || 4) : 1,
                    onRemoveAvailable: handleRemoveAvailableAdditionalPart,
                    newValue: newAdditionalPartName,
                    setNewValue: setNewAdditionalPartName,
                    onAdd: handleAddAdditionalPart,
                    addPlaceholder: 'Adicionar outra peça...',
                    idPrefix: 'additional',
                  },
                ]).map((group) => (
                  <div key={group.key} className="space-y-2.5">
                    <div className="flex items-center justify-between min-h-[30px] pb-1">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground ml-1">
                          {group.label}
                        </Label>
                        {group.selected.length > 0 && (
                          <span className="text-[10px] font-bold text-muted-foreground">
                            ({group.selected.length})
                          </span>
                        )}
                      </div>

                      {group.key === 'left' && !readOnly && (
                        <button
                          type="button"
                          onClick={handleSelectCompleteMotor}
                          className="h-7 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider text-foreground/80 bg-muted hover:bg-accent border border-border flex items-center gap-1.5 transition-all cursor-pointer shadow-none"
                          title="Marcar Bloco, Cabeçote, Eixo e Pistões"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          <span>MOTOR COMPLETO</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {group.available.map(part => {
                        const normalizedPart = part.toUpperCase();
                        const entry = group.selected.find(p => p === normalizedPart || p.startsWith(normalizedPart + '|'));
                        const isChecked = !!entry;
                        const qty = entry && entry.includes('|') ? parseInt(entry.split('|')[1]) || 1 : 1;

                        const togglePart = () => {
                          if (readOnly) return;
                          if (isChecked) {
                            group.setSelected(group.selected.filter(p => p !== normalizedPart && !p.startsWith(normalizedPart + '|')));
                          } else {
                            group.setSelected([...group.selected, `${normalizedPart}|${group.defaultQty(normalizedPart)}`]);
                          }
                        };

                        const setQty = (newQty: number) => {
                          if (newQty < 1 || readOnly) return;
                          group.setSelected(group.selected.map(p =>
                            (p === normalizedPart || p.startsWith(normalizedPart + '|')) ? `${normalizedPart}|${newQty}` : p
                          ));
                        };

                        const partId = `${group.idPrefix}-${normalizeText(part).replace(/\s+/g, '-')}`;

                        return (
                          <div
                            key={part}
                            onClick={togglePart}
                            className={cn(
                              "group relative flex items-center justify-between min-h-[44px] px-3 py-1.5 rounded-xl border transition-all cursor-pointer select-none",
                              isChecked
                                ? "bg-foreground/[0.04] border-foreground/30 shadow-2xs"
                                : "bg-card border-border hover:border-foreground/20 hover:bg-muted/50"
                            )}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1 pr-1">
                              <Checkbox
                                id={partId}
                                checked={isChecked}
                                onCheckedChange={togglePart}
                                className="w-4 h-4 rounded-md border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-primary-foreground transition-colors"
                                disabled={readOnly}
                              />
                              <span className={cn(
                                "text-xs font-bold uppercase tracking-tight leading-snug transition-colors",
                                isChecked ? "text-foreground" : "text-muted-foreground"
                              )}>
                                {part}
                              </span>
                            </div>
                            {isChecked ? (
                              <div
                                className="flex items-center gap-0.5 shrink-0 ml-1 bg-card rounded-lg p-0.5 border border-border shadow-2xs"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setQty(qty - 1); }}
                                  className="w-5 h-5 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                  disabled={qty <= 1 || readOnly}
                                  title="Diminuir"
                                >
                                  <Minus className="w-2.5 h-2.5 stroke-[2.5]" />
                                </button>
                                <span className="min-w-[15px] text-center text-xs font-black font-mono text-foreground">
                                  {qty}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setQty(qty + 1); }}
                                  className="w-5 h-5 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                  disabled={readOnly}
                                  title="Aumentar"
                                >
                                  <Plus className="w-2.5 h-2.5 stroke-[2.5]" />
                                </button>
                              </div>
                            ) : (
                              !group.defaults.includes(part) && !readOnly && (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); group.onRemoveAvailable(part); }}
                                  className="text-muted-foreground hover:text-danger p-1 rounded-lg hover:bg-danger/10 transition-all shrink-0 opacity-70 group-hover:opacity-100"
                                  title="Remover da lista"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {!readOnly && (
                      <div className="flex gap-2 mt-3 pt-2 border-t border-dashed border-border">
                        <Input
                          placeholder={group.addPlaceholder}
                          value={group.newValue}
                          onChange={e => group.setNewValue(e.target.value.toUpperCase())}
                          className="h-10 text-xs w-full rounded-xl border border-border bg-card px-3.5 text-foreground placeholder:normal-case uppercase"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              group.onAdd(e as any);
                            }
                          }}
                        />
                        <Button
                          onClick={group.onAdd}
                          size="sm"
                          type="button"
                          disabled={!group.newValue.trim()}
                          className="solid-btn h-10 px-3.5 rounded-xl font-semibold text-xs flex items-center gap-1.5 shrink-0 shadow-2xs disabled:opacity-40 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span className="hidden sm:inline">Adicionar</span>
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CARD 3: ESPECIFICAÇÕES DO MOTOR (layout do SELEÇÃO MT) */}
          <MotorSpecsCard
            motors={motorsList}
            readOnly={readOnly}
            catalog={motorCatalog}
            displacementOptions={availableDisplacements}
            onAddDisplacement={(d) => {
              if (!availableDisplacements.includes(d)) {
                setAvailableDisplacements(prev => [...prev, d].sort((x, y) => parseFloat(x) - parseFloat(y)));
              }
            }}
            onAdd={(m) => {
              setMotorsList(prev => [...prev, m]);
              // motor digitado que ainda não está no catálogo passa a existir na busca
              if (!motorCatalog.some(c => c.name.toUpperCase() === m.model.toUpperCase())) {
                addModelToDb(m.model).then(reloadMotorCatalog).catch(() => { });
              }
            }}
            onUpdate={(index, m) => setMotorsList(prev => prev.map((old, i) => i === index ? m : old))}
            onRemove={handleRemoveMotor}
            onSaveCatalogMotor={handleSaveCatalogMotor}
            onDeleteCatalogMotor={handleStartDeleteMotor}
          />

          {/* CARD 4: CATÁLOGO DE SERVIÇOS */}
          <div className="bg-card border border-border/60 dark:border-border rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/50 dark:border-border">
              <div className="flex items-center gap-2.5 text-xs uppercase tracking-[0.2em] text-foreground/90 font-bold">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                  <Wrench className="w-4 h-4 text-primary" />
                </div>
                CATÁLOGO DE SERVIÇOS
              </div>
            </div>

            <div className="pt-1">
              <ServiceCatalog
                selectedServices={services}
                selectedMotorModel={motorsList[0]?.model}
                motorsList={motorsList}
                onAddService={handleAddService}
                onRemoveService={handleRemoveService}
                onUpdateService={(id, updates) => {
                  Object.entries(updates).forEach(([key, value]) => {
                    updateServiceField(id, key as any, value);
                  });
                }}
                onReorderServices={setServices}
                readOnly={readOnly}
              />
            </div>
          </div>

          {/* CARD 5: RESUMO FINANCEIRO */}
          <div className="w-full">
            <ResumoFinanceiro
              subtotal={totalValue}
              desconto={parsedDiscount}
              initialStatus={paymentStatus === 'Pago' ? 'pago' : paymentStatus === 'Entrada' ? 'entrada' : 'nao_pago'}
              entries={entries}
              clientName={clients.find(c => c.id === clientId)?.name || ''}
              onDescontoChange={(newDiscount: number) => setDiscount(newDiscount)}
              onStatusChange={handleStatusChange}
              onConfirmPago={handleConfirmPago}
              onAddEntrada={handleAddEntrada}
              onUpdateEntrada={handleUpdateEntrada}
              onDeleteEntrada={(id, idx) => handleDeleteEntrada(id, idx)}
              context="individual"
            />
          </div>

          {/* CARD 6: OBSERVAÇÕES */}
          <div className="bg-card border border-border/60 dark:border-border rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/50 dark:border-border">
              <div className="flex items-center gap-2.5 text-xs uppercase tracking-[0.2em] text-foreground/90 font-bold">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                  <MessageSquare className="w-4 h-4 text-primary" />
                </div>
                OBSERVAÇÕES
              </div>
            </div>

            <div className="pt-1">
              <Textarea
                value={observations}
                onChange={e => setObservations(e.target.value.toUpperCase())}
                placeholder="Observações sobre o serviço (opcional)"
                className="min-h-[90px] rounded-xl premium-input p-3.5 text-xs resize-none uppercase placeholder:normal-case"
              />
            </div>
          </div>

          {/* CARD 7: FINALIZADO E ENTREGUE (só ao editar) */}
          {order && (
          <div className="flex justify-end w-full">
            <div className="bg-card border border-border/60 dark:border-border rounded-xl p-5 shadow-sm flex flex-col gap-4 select-none hover:border-foreground/10 transition-all w-full max-w-[320px]">
              <div
                className="flex items-center space-x-3 cursor-pointer"
                onClick={() => {
                  const newFinished = !finished;
                  if (newFinished && serviceStatus !== 'Pronto') {
                    setIsStatusConfirmOpen(true);
                    return;
                  }
                  setFinished(newFinished);
                  if (newFinished && !finishedAtDate) {
                    setFinishedAtDate(new Date().toISOString().split('T')[0]);
                  }
                }}
              >
                <Checkbox
                  checked={finished}
                  className="w-4 h-4 rounded border-border pointer-events-none"
                  tabIndex={-1}
                />
                <Label className="font-bold text-xs uppercase tracking-wider text-foreground/80 cursor-pointer m-0">
                  FINALIZADO E ENTREGUE
                </Label>
              </div>

              <div className="flex flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>
                <Label
                  htmlFor="finishedAtDate"
                  className={cn(
                    "text-xs font-bold uppercase tracking-[0.15em] ml-1 transition-colors",
                    finished ? "text-muted-foreground/50" : "text-muted-foreground/30"
                  )}
                >
                  DATA DE FINALIZAÇÃO
                </Label>
                <DatePicker
                  id="finishedAtDate"
                  disabled={!finished}
                  value={finishedAtDate}
                  onChange={(dateStr) => setFinishedAtDate(dateStr)}
                  className={cn(
                    "premium-input h-11 rounded-lg text-xs font-bold bg-card border-border w-full transition-all cursor-pointer",
                    !finished && "opacity-40 cursor-not-allowed bg-muted/20 border-border/40 text-muted-foreground/50"
                  )}
                />
              </div>
            </div>
          </div>
          )}

          {/* Barra de ações fixa no rodapé: salvar sempre à vista */}
          <div className="sticky bottom-0 z-30 -mx-2 px-2 py-3 flex items-center justify-between gap-3 bg-background/95 backdrop-blur border-t border-border pointer-events-auto print:hidden">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPreviewOpen(true)}
              className="h-10 px-4 rounded-lg text-sm font-semibold gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Imprimir
            </Button>
            {!readOnly && (
              <Button type="submit" className="solid-btn font-bold h-10 px-6 rounded-lg text-sm shadow-sm cursor-pointer">
                {order ? "Salvar Alterações" : "Gerar Ordem de Serviço"}
              </Button>
            )}
          </div>

        </div>
      </form>

      {showPrintReport && (() => {
        const currentOrder = getCurrentOrderObject();
        const client = clients.find(c => c.id === clientId) || null;
        return createPortal(
          <div id="print-os-report" style={{ position: 'fixed', top: 0, left: 0, width: '210mm', minHeight: '297mm', zIndex: -9999, pointerEvents: 'none', background: 'white' }}>
            <OSPrintReport
              order={currentOrder}
              client={client}
              motors={motorsList}
              getEntries={getEntries}
              formatDate={formatDate}
            />
          </div>,
          document.body
        );
      })()}

      {isPreviewOpen && (() => {
        const currentOrder = getCurrentOrderObject();
        const client = clients.find(c => c.id === clientId) || null;
        return (
          <PrintPreviewModal
            isOpen={isPreviewOpen}
            onClose={() => setIsPreviewOpen(false)}
            order={currentOrder}
            client={client}
            motors={motorsList}
            getEntries={getEntries}
            formatDate={formatDate}
            onConfirmPrint={handleConfirmPrint}
            onConfirmPDF={(window as any).electronAPI?.printToPDF ? handleConfirmPDF : undefined}
          />
        );
      })()}



      <Dialog open={isStatusConfirmOpen} onOpenChange={setIsStatusConfirmOpen}>
        <DialogContent className="max-w-sm z-[1100]" overlayClassName="z-[1099]">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning shrink-0" /> Status Incompleto
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Esta O.S. está com o status <strong className="text-foreground">{serviceStatus}</strong>. Para marcar como finalizada e entregue, o status precisa estar como <strong className="text-foreground">PRONTO</strong>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end gap-2 flex-row">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsStatusConfirmOpen(false)}
              className="h-9 px-3 rounded-lg text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={confirmSetStatusReady}
              className="h-9 px-4 rounded-lg text-xs bg-primary text-primary-foreground font-bold"
            >
              Marcar como Pronto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm z-[1100]" overlayClassName="z-[1099]">
          <DialogHeader>
            <DialogTitle>Excluir Motor</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir <strong>{motorToDelete}</strong> da lista de motores?
              Motores já utilizados em ordens de serviço não serão afetados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!motorToDelete) return;
                try {
                  await Promise.all([
                    deleteMotorFromDb(motorToDelete),
                    deleteModelFromDb(motorToDelete)
                  ]);
                  setAvailableMotors(prev => prev.filter(m => m !== motorToDelete));
                  setAvailableModels(prev => prev.filter(m => m !== motorToDelete));
                  setMotorCatalog(prev => prev.filter(m => m.name !== motorToDelete));
                  setMotorModels(prev => prev.filter(m => m !== motorToDelete));
                  toast.success(`Motor/Modelo "${motorToDelete}" excluído.`);
                } catch {
                  toast.warning(`Falha ao excluir "${motorToDelete}" do banco local.`);
                }
                setShowDeleteConfirm(false);
                setMotorToDelete(null);
              }}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={motorIndexToRemove !== null} onOpenChange={(open) => { if (!open) setMotorIndexToRemove(null); }}>
        <DialogContent className="max-w-sm z-[1100]" overlayClassName="z-[1099]">
          <DialogHeader>
            <DialogTitle>Remover Motor</DialogTitle>
            <DialogDescription>
              O motor <strong>{motorIndexToRemove !== null ? motorsList[motorIndexToRemove]?.model : ''}</strong> tem
              {servicesLinkedToMotorToRemove.length === 1 ? ' 1 serviço ligado' : ` ${servicesLinkedToMotorToRemove.length} serviços ligados`}.
              O que fazer com {servicesLinkedToMotorToRemove.length === 1 ? 'ele' : 'eles'}?
            </DialogDescription>
          </DialogHeader>
          <ul className="max-h-40 overflow-y-auto space-y-1 text-xs font-bold uppercase text-foreground">
            {servicesLinkedToMotorToRemove.map(s => (
              <li key={s.id} className="flex justify-between gap-2 rounded-md bg-secondary/40 px-2.5 py-1.5">
                <span className="truncate">{s.name}</span>
                <span className="text-muted-foreground shrink-0 normal-case">x{s.quantity || 1}</span>
              </li>
            ))}
          </ul>
          <DialogFooter className="flex flex-col gap-2 sm:flex-col">
            <Button
              onClick={() => {
                if (motorIndexToRemove !== null) removeMotorAt(motorIndexToRemove, 'keep-common');
                setMotorIndexToRemove(null);
              }}
              className="bg-primary text-primary-foreground font-bold"
            >
              Manter como serviços comuns
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (motorIndexToRemove !== null) removeMotorAt(motorIndexToRemove, 'remove');
                setMotorIndexToRemove(null);
              }}
            >
              Remover os serviços junto
            </Button>
            <Button variant="outline" onClick={() => setMotorIndexToRemove(null)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditMotorConfirm} onOpenChange={setShowEditMotorConfirm}>
        <DialogContent className="max-w-sm z-[1100]" overlayClassName="z-[1099]">
          <DialogHeader>
            <DialogTitle>Editar Motor/Modelo</DialogTitle>
            <DialogDescription>
              Digite o novo nome para o motor/modelo:
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newMotorName}
              onChange={(e) => setNewMotorName(e.target.value)}
              placeholder="Ex: AP 1.8"
              className="premium-input uppercase placeholder:normal-case text-xs h-9 rounded-lg"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleConfirmEditMotor();
                }
              }}
            />
          </div>
          <DialogFooter className="flex justify-end gap-2 flex-row">
            <Button variant="outline" onClick={() => { setShowEditMotorConfirm(false); setMotorToEdit(null); }}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmEditMotor}
              className="bg-primary text-primary-foreground font-bold h-9 text-xs"
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Cadastrar Cliente (mesmo formulário da tela Clientes) */}
      {!readOnly && (
        <Dialog open={isClientModalOpen} onOpenChange={setIsClientModalOpen}>
          <DialogContent showCloseButton={false} className={cn(clientDialogClass, 'z-[1100]')} overlayClassName="z-[1099]">
            <ClientDialogHeader title="Novo Cliente" subtitle="Cadastre um novo cliente sem sair da O.S." onClose={() => setIsClientModalOpen(false)} />
            <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-4 space-y-3">
              <FormSection icon={User} title="Dados principais" hint="Informações básicas do cliente.">
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="os-new-client-name" required>Nome completo</FieldLabel>
                  <IconField icon={User}>
                    <Input id="os-new-client-name" value={newClientName} onChange={e => setNewClientName(e.target.value)} placeholder="Digite o nome completo do cliente" className={cn(iconInputClass, 'uppercase placeholder:normal-case')} autoFocus />
                  </IconField>
                      {isNewClientDuplicate && (
                        <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 text-xs font-semibold text-warning mt-1 flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                          <span>⚠️ Cliente já cadastrado</span>
                          <span className="text-xs font-normal text-muted-foreground">Não é permitido cadastrar outro cliente com o mesmo nome, telefone ou CPF/CNPJ. Selecione o cliente existente na lista de busca.</span>
                          <div className="flex flex-col gap-1 mt-0.5">
                            {newClientConflicts.map(({ client, fields }) => {
                              const fieldLabel = fields.length === 1
                                ? (fields[0] === 'name' ? 'Nome já usado por' : fields[0] === 'phone' ? 'Telefone já usado por' : 'CPF/CNPJ já usado por')
                                : 'Já cadastrado (' + fields.map(f => f === 'name' ? 'nome' : f === 'phone' ? 'telefone' : 'CPF/CNPJ').join(', ') + ') por';
                              return (
                                <div key={client.id} className="flex flex-wrap items-center gap-1 text-xs font-normal">
                                  <span className="font-bold text-warning">{fieldLabel}:</span>
                                  <button
                                    type="button"
                                    onClick={() => openEditClientModalFor(client)}
                                    className="font-extrabold text-warning underline decoration-dotted underline-offset-2 hover:text-warning cursor-pointer"
                                  >
                                    {client.name}
                                  </button>
                                  {(client.phone || client.document) && (
                                    <span className="text-muted-foreground">— {[client.phone, client.document].filter(Boolean).join(' · ')}</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <FieldLabel htmlFor="os-new-client-nickname" optional>Apelido / Nome fantasia</FieldLabel>
                    <IconField icon={Tag}>
                      <Input id="os-new-client-nickname" value={newClientNickname} onChange={e => setNewClientNickname(e.target.value)} placeholder="Apelido ou nome fantasia" className={cn(iconInputClass, 'uppercase placeholder:normal-case')} />
                    </IconField>
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel htmlFor="os-new-client-doc" optional>CPF/CNPJ</FieldLabel>
                    <IconField icon={FileText}>
                      <MaskedInput id="os-new-client-doc" value={newClientDoc} mask={maskCPFCNPJ} unmask={(v) => normalizeNumber(v).slice(0, 14)} onValueChange={setNewClientDoc} placeholder="000.000.000-00" className={iconInputClass} />
                    </IconField>
                  </div>
                </div>
              </FormSection>

              <FormSection icon={Phone} title="Contatos" hint="Pelo menos um telefone facilita o atendimento.">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <FieldLabel htmlFor="os-new-client-phone" optional>Telefone</FieldLabel>
                    <IconField icon={Phone}>
                      <MaskedInput id="os-new-client-phone" value={newClientPhone} mask={maskPhone} unmask={(v) => normalizeNumber(v).slice(0, 11)} onValueChange={setNewClientPhone} placeholder="(00) 00000-0000" className={iconInputClass} />
                    </IconField>
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel htmlFor="os-new-client-phone2" optional>Telefone 2</FieldLabel>
                    <IconField icon={Phone}>
                      <MaskedInput id="os-new-client-phone2" value={newClientPhone2} mask={maskPhone} unmask={(v) => normalizeNumber(v).slice(0, 11)} onValueChange={setNewClientPhone2} placeholder="(11) 99999-9999" className={iconInputClass} />
                    </IconField>
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel htmlFor="os-new-client-whatsapp" optional>WhatsApp</FieldLabel>
                    <IconField icon={MessageCircle}>
                      <MaskedInput id="os-new-client-whatsapp" value={newClientWhatsapp} mask={maskPhone} unmask={(v) => normalizeNumber(v).slice(0, 11)} onValueChange={setNewClientWhatsapp} placeholder="(00) 00000-0000" className={iconInputClass} />
                    </IconField>
                  </div>
                </div>
              </FormSection>

              <FormSection icon={MapPin} title="Localização" hint="Cidade do cliente.">
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="os-new-client-city" optional>Cidade</FieldLabel>
                  <IconField icon={MapPin}>
                    <Input id="os-new-client-city" value={newClientAddress} onChange={e => setNewClientAddress(e.target.value)} placeholder="Ex: Curitiba - PR" className={iconInputClass} />
                  </IconField>
                </div>
              </FormSection>

              <FormSection icon={Users} title="Tipo de cliente" description="Selecione o tipo para aplicar as configurações corretas.">
                <ClientTypeToggle value={newClientType} onChange={setNewClientType} />
              </FormSection>
            </div>
            <ClientDialogFooter onCancel={() => setIsClientModalOpen(false)} onSave={handleAddClient} saveDisabled={isNewClientDuplicate} />
          </DialogContent>
        </Dialog>
      )}

      {/* Modal: Editar Cliente / Mecânico (mesmo formulário da tela Clientes) */}
      {!readOnly && (
        <Dialog open={isEditClientModalOpen} onOpenChange={setIsEditClientModalOpen}>
          <DialogContent showCloseButton={false} className={cn(clientDialogClass, 'z-[1100]')} overlayClassName="z-[1099]">
            <ClientDialogHeader
              icon={Pencil}
              title={editClientType === 'mechanic' ? 'Editar Mecânico' : 'Editar Cliente'}
              subtitle="Atualize os dados sem sair da O.S."
              onClose={() => setIsEditClientModalOpen(false)}
            />
            <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-4 space-y-3">
              <FormSection icon={User} title="Dados principais" hint="Informações básicas do cliente.">
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="os-edit-client-name" required>Nome completo</FieldLabel>
                  <IconField icon={User}>
                    <Input id="os-edit-client-name" placeholder="Digite o nome completo do cliente" value={editClientName} onChange={e => setEditClientName(e.target.value.toUpperCase())} className={cn(iconInputClass, 'uppercase placeholder:normal-case')} />
                  </IconField>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <FieldLabel htmlFor="os-edit-client-nickname" optional>Apelido / Nome fantasia</FieldLabel>
                    <IconField icon={Tag}>
                      <Input id="os-edit-client-nickname" placeholder="Apelido ou nome fantasia" value={editClientNickname} onChange={e => setEditClientNickname(e.target.value.toUpperCase())} className={cn(iconInputClass, 'uppercase placeholder:normal-case')} />
                    </IconField>
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel htmlFor="os-edit-client-document" optional>CPF/CNPJ</FieldLabel>
                    <IconField icon={FileText}>
                      <MaskedInput id="os-edit-client-document" value={editClientDoc} mask={maskCPFCNPJ} unmask={(v) => normalizeNumber(v).slice(0, 14)} onValueChange={setEditClientDoc} placeholder="000.000.000-00" className={iconInputClass} />
                    </IconField>
                  </div>
                </div>
              </FormSection>

              <FormSection icon={Phone} title="Contatos" hint="Pelo menos um telefone facilita o atendimento.">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <FieldLabel htmlFor="os-edit-client-phone" optional>Telefone</FieldLabel>
                    <IconField icon={Phone}>
                      <MaskedInput id="os-edit-client-phone" value={editClientPhone} mask={maskPhone} unmask={(v) => normalizeNumber(v).slice(0, 11)} onValueChange={setEditClientPhone} placeholder="(00) 00000-0000" className={iconInputClass} />
                    </IconField>
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel htmlFor="os-edit-client-phone2" optional>Telefone 2</FieldLabel>
                    <IconField icon={Phone}>
                      <MaskedInput id="os-edit-client-phone2" value={editClientPhone2} mask={maskPhone} unmask={(v) => normalizeNumber(v).slice(0, 11)} onValueChange={setEditClientPhone2} placeholder="(11) 99999-9999" className={iconInputClass} />
                    </IconField>
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel htmlFor="os-edit-client-whatsapp" optional>WhatsApp</FieldLabel>
                    <IconField icon={MessageCircle}>
                      <MaskedInput id="os-edit-client-whatsapp" value={editClientWhatsapp} mask={maskPhone} unmask={(v) => normalizeNumber(v).slice(0, 11)} onValueChange={setEditClientWhatsapp} placeholder="(00) 00000-0000" className={iconInputClass} />
                    </IconField>
                  </div>
                </div>
              </FormSection>

              <FormSection icon={MapPin} title="Localização" hint="Cidade do cliente.">
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="os-edit-client-city" optional>Cidade</FieldLabel>
                  <IconField icon={MapPin}>
                    <Input id="os-edit-client-city" placeholder="Ex: Curitiba - PR" value={editClientAddress} onChange={e => setEditClientAddress(e.target.value)} className={iconInputClass} />
                  </IconField>
                </div>
              </FormSection>

              <FormSection icon={Users} title="Tipo de cliente" description="Selecione o tipo para aplicar as configurações corretas.">
                <ClientTypeToggle value={editClientType} onChange={setEditClientType} />
              </FormSection>
            </div>
            <ClientDialogFooter
              onCancel={() => setIsEditClientModalOpen(false)}
              onSave={handleSaveClientEditModal}
              saveLabel="Salvar Alterações"
              onDelete={handleDeleteClientModal}
              deleteLabel={editClientType === 'mechanic' ? 'Excluir Mecânico' : 'Excluir Cliente'}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("OSForm Error boundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="border-destructive/50 bg-destructive/5 p-6 rounded-xl max-w-xl mx-auto my-8">
          <CardHeader>
            <CardTitle className="text-destructive font-bold text-sm uppercase tracking-wider">
              Erro de Renderização do Formulário
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground font-medium leading-relaxed">
              Ocorreu um erro inesperado ao carregar ou atualizar o formulário. Por favor, tente recarregar a página ou voltar para o painel.
            </p>
            {this.state.error?.message && (
              <pre className="p-3 bg-muted dark:bg-card border dark:border-border rounded-lg text-xs text-destructive font-mono overflow-auto max-h-[150px]">
                {this.state.error.message}
              </pre>
            )}
          </CardContent>
          <CardFooter className="flex gap-3">
            <Button
              size="sm"
              variant="outline"
              className="text-xs font-bold uppercase tracking-wider h-9"
              onClick={() => window.location.reload()}
            >
              Recarregar Página
            </Button>
            <Button
              size="sm"
              className="text-xs font-bold uppercase tracking-wider h-9"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Tentar Novamente
            </Button>
          </CardFooter>
        </Card>
      );
    }

    return this.props.children;
  }
}

export function OSForm(props: React.ComponentProps<typeof OSFormImpl>) {
  // Remonta o formulário sempre que muda a O.S. em edição (ou volta para "nova"),
  // para que o estado de uma edição anterior não apareça em outra O.S.
  const formKey = props.order ? `edit-${props.order.id}` : `new-${props.initialClientId || ''}`;
  return (
    <ErrorBoundary key={formKey}>
      <OSFormImpl {...props} />
    </ErrorBoundary>
  );
}
