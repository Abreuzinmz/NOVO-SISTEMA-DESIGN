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
  FileText
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
import { fetchMotors, fetchModels, addMotor as addMotorToDb, addModel as addModelToDb, deleteMotor as deleteMotorFromDb, deleteModel as deleteModelFromDb, updateModel as updateModelInDb } from '@/lib/motors';
import { PrintPreviewModal } from './print-preview-modal';
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

export interface MotorSpec {
  model: string;
  cylinders: string;
  displacement: string;
}

function OSFormImpl({
  onComplete,
  order,
  readOnly = false
}: {
  onComplete?: () => void,
  order?: Order,
  readOnly?: boolean
}) {
  const { clients, addClient, updateClient, deleteClient, addOrder, updateOrder, orders, refreshClients } = useStore();
  const confirmDialog = useConfirmDialog();

  function normalizePix(v: string): PaymentMethod | '' {
    return (v && v.toUpperCase() === 'PIX' ? 'PIX' : v) as PaymentMethod | '';
  }

  // Form State
  const [osNumber, setOsNumber] = useState(order?.id?.toString() || '');
  const [clientId, setClientId] = useState(order?.clientId || '');
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
      return { model, cylinders, displacement };
    });
  }, [order]);

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

    Promise.all([fetchMotors(), fetchModels()])
      .then(([dbMotors, dbModels]) => {
        if (!mounted) return;
        setAvailableMotors(dbMotors.map(m => m.toUpperCase()));
        setAvailableModels(dbModels.map(m => m.toUpperCase()));
      })
      .catch(() => { })
      .finally(() => {
        if (mounted) setIsLoadingMotors(false);
      });
    return () => { mounted = false; };
  }, [loadClientsData]);

  // Client Modal State
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isClientSelectorOpen, setIsClientSelectorOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
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

  const handleRemoveMotor = useCallback((index: number) => {
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
    const newDoc = editClientDoc ? maskCPFCNPJ(editClientDoc) : '';

    try {
      await updateClient(found.id, {
        name: editClientName.trim().toUpperCase(),
        phone: newPhone,
        phone2: newPhone2,
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
      toast.error('Selecione um cliente válido.');
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
            <h2 className="text-3xl font-black tracking-tight text-foreground">
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
              <Button size="lg" type="submit" className="bg-foreground text-background font-extrabold h-11 px-6 rounded-lg text-xs hover:bg-foreground/90 transition-all shadow-md cursor-pointer">
                {order ? "Salvar Alterações" : "Gerar Ordem de Serviço"}
              </Button>
            )}
          </div>
        </div>

        {/* ═══ SINGLE-COLUMN LAYOUT CONTAINER ═══ */}
        <div className={cn("space-y-4 w-full", readOnly && "pointer-events-none")}>
          {/* CARD 1: INFORMAÇÕES DO CLIENTE */}
          <div className="bg-[#F8FAFC] dark:bg-[#24272C] border border-slate-200 dark:border-white/[0.04] rounded-2xl p-5 shadow-sm space-y-3">
            {/* Cabeçalho */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-white/[0.03]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center border border-slate-200 dark:border-white/[0.05] shrink-0">
                  <User className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                </div>
                <span className="font-extrabold text-sm uppercase tracking-wider text-[#1E293B] dark:text-slate-200">
                  INFORMAÇÕES DO CLIENTE
                </span>
              </div>
            </div>

            <div className="space-y-5">
                {/* Linha 1: O.S. Nº e Data de Chegada, lado a lado */}
                <div className="flex items-start gap-4 flex-wrap">
                    {/* O.S. Nº */}
                    <div className="w-32 space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">O.S. Nº</label>
                      <div className="relative flex items-center gap-2.5">
                        <div className="relative w-full">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold text-xs">#</span>
                          <input
                            ref={osNumberRef}
                            type="number"
                            value={osNumber}
                            onChange={e => setOsNumber(e.target.value)}
                            className="w-full h-12 pl-7 pr-3 font-mono text-sm font-bold rounded-xl bg-slate-100 dark:bg-white/5 border border-transparent text-slate-800 dark:text-slate-200 focus:outline-none focus:bg-white focus:border-slate-300 dark:focus:bg-transparent dark:focus:border-white/20 transition-all os-number-input"
                            placeholder="1001"
                            disabled={!!order || readOnly}
                          />
                        </div>
                      </div>

                      {/* Gerar O.S. Automática */}
                      {!order && !readOnly && (
                        <button
                          type="button"
                          onClick={handleAutoGenerateOS}
                          className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors whitespace-nowrap cursor-pointer"
                        >
                          GERAR O.S. AUTOMÁTICA
                        </button>
                      )}
                    </div>

                    {/* DATA DE CHEGADA */}
                    <div className="w-[200px] shrink-0 space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">DATA DE CHEGADA:</label>
                      <div className="relative">
                        <DatePicker
                          value={arrivalDate}
                          onChange={(dateStr) => setArrivalDate(dateStr)}
                          placeholder="Selecione a data..."
                          className="w-full h-12 px-3 text-sm font-bold rounded-xl border border-slate-200 dark:border-white/10 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-400 transition-all cursor-pointer"
                        />
                      </div>
                    </div>
                </div>

                {/* Linha 2: Cliente + Mecânico, visível apenas enquanto nenhum cliente estiver selecionado */}
                {!clientId && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Linha 2: Cliente Selector */}
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">CLIENTE</Label>
                      <div className="relative w-full">
                        <div className="relative">
                          <Input
                            ref={clientTriggerRef}
                            type="text"
                            disabled={readOnly || !!clientId}
                            placeholder="Pesquisar por nome, telefone, CPF/CNPJ..."
                            value={clientId ? (selectedClient?.name || '') : clientSearchText}
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
                            className={cn(
                              "w-full h-12 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 pl-4 text-[15px] font-semibold text-[#111827] dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-400 transition-all",
                              (clientId || clientSearchText) ? "pr-10" : "pr-4",
                              clientId && "bg-slate-50 dark:bg-zinc-900/60 font-bold opacity-100 cursor-default"
                            )}
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                            {(clientId || clientSearchText) && !readOnly && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleClearClient();
                                }}
                                className="w-5 h-5 rounded-full bg-slate-200 hover:bg-red-100 hover:text-red-600 text-slate-600 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-red-900/30 dark:hover:text-red-400 flex items-center justify-center text-xs transition-colors cursor-pointer"
                                title="Limpar cliente selecionado"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Portal dropdown estilo card flutuante fiel à imagem */}
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
                            className="bg-white dark:bg-[#1E2227] border border-slate-200 dark:border-white/10 rounded-2xl shadow-[0_12px_28px_-4px_rgba(15,23,42,0.12),0_4px_10px_-2px_rgba(15,23,42,0.04)] overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150 p-1.5 z-[1100]"
                          >
                            {exactMatchClient && (
                              <div className="p-3 mb-1 bg-amber-500/10 rounded-xl border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 font-bold flex flex-col gap-1">
                                <span>⚠️ Cliente já cadastrado</span>
                                <span className="font-normal text-[10px] text-muted-foreground">O nome "{clientSearchText}" já existe. Selecione o cliente na lista abaixo para prosseguir.</span>
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
                                    className="h-7 px-3 text-[10px] uppercase font-bold border-destructive/30 hover:bg-destructive/10 hover:text-destructive mx-auto block"
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
                                    className="h-9 px-4 text-xs font-bold bg-primary text-primary-foreground hover:scale-[1.02] transition-all cursor-pointer mx-auto flex items-center gap-1.5 rounded-lg"
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
                                          ? "bg-slate-100 dark:bg-white/10"
                                          : "hover:bg-slate-50 dark:hover:bg-white/5",
                                        index === 0 && !clientSearchText && "bg-slate-100/80 dark:bg-white/10",
                                        isExactDuplicate && "border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10"
                                      )}
                                    >
                                      <div className="flex flex-col min-w-0 pr-3">
                                        <span className="font-bold text-[13.5px] text-[#0F172A] dark:text-slate-100 tracking-tight">
                                          {client.nickname ? client.nickname.toUpperCase() : client.name}
                                        </span>
                                        {client.nickname && (
                                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                                            {client.name}
                                          </span>
                                        )}
                                        {(client.phone || client.document) ? (
                                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                            {client.phone && <span>{maskPhone(client.phone)}</span>}
                                            {client.phone && client.document && (
                                              <span className="text-slate-400 dark:text-slate-600 font-bold">•</span>
                                            )}
                                            {client.document && <span>{maskCPFCNPJ(client.document)}</span>}
                                          </div>
                                        ) : (!client.nickname && (
                                          <span className="text-[11px] text-slate-400 mt-0.5">Sem contato</span>
                                        ))}
                                      </div>
                                      <div className="shrink-0 flex items-center gap-1.5">
                                        {client.clientType === 'mechanic' ? (
                                          <span className="text-[10px] font-bold tracking-wider bg-[#EFF6FF] text-[#2563EB] dark:bg-sky-950/60 dark:text-sky-400 border border-[#BFDBFE] dark:border-sky-800 rounded-lg px-2.5 py-0.5 uppercase">
                                            MECÂNICO
                                          </span>
                                        ) : (
                                          <span className="text-[10px] font-bold tracking-wider bg-[#F8FAFC] text-[#475569] dark:bg-white/5 dark:text-slate-300 border border-[#E2E8F0] dark:border-white/10 rounded-lg px-2.5 py-0.5 uppercase">
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
                    </div>

                    {/* Linha 2.5: Mecânico Selector */}
                    <div ref={osMechContainerRef} className="space-y-1.5 relative">
                      <Label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">MECÂNICO DA O.S. (OPCIONAL)</Label>
                      <div className="relative w-full">
                        <Input
                          type="text"
                          disabled={readOnly || !!mechanicId}
                          placeholder="Pesquisar mecânico por nome ou apelido..."
                          value={mechanicId ? (() => {
                            const m = clients.find(c => c.id === mechanicId);
                            return m ? (m.nickname ? `${m.name} (${m.nickname})` : m.name) : '';
                          })() : mechanicSearchText}
                          onChange={(e) => {
                            setMechanicSearchText(e.target.value);
                            setIsMechanicSelectorOpen(true);
                            if (!e.target.value) {
                              setMechanicId('');
                            }
                          }}
                          onFocus={() => {
                            if (!readOnly && !mechanicId) setIsMechanicSelectorOpen(true);
                          }}
                          className={cn(
                            "w-full h-12 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 pl-4 text-[15px] font-semibold text-[#111827] dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-400 transition-all",
                            (mechanicId || mechanicSearchText) ? "pr-10" : "pr-4",
                            mechanicId && "bg-slate-50 dark:bg-zinc-900/60 font-bold opacity-100 cursor-default"
                          )}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                          {(mechanicId || mechanicSearchText) && !readOnly && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMechanicId('');
                                setMechanicSearchText('');
                                setIsMechanicSelectorOpen(false);
                              }}
                              className="w-5 h-5 rounded-full bg-slate-200 hover:bg-red-100 hover:text-red-600 text-slate-600 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-red-900/30 dark:hover:text-red-400 flex items-center justify-center text-xs transition-colors cursor-pointer"
                              title="Limpar mecânico selecionado"
                            >
                              ✕
                            </button>
                          )}
                        </div>

                        {isMechanicSelectorOpen && (
                          <div className="absolute z-[1200] w-full mt-1.5 max-h-[260px] overflow-y-auto bg-white dark:bg-[#1E2227] border border-slate-200 dark:border-white/10 rounded-2xl shadow-[0_12px_28px_-4px_rgba(15,23,42,0.12),0_4px_10px_-2px_rgba(15,23,42,0.04)] p-1.5 space-y-0.5">
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
                                    className="w-full flex items-center justify-between py-2.5 px-3.5 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left"
                                  >
                                    <div className="flex flex-col min-w-0 pr-3">
                                      <span className="font-bold text-[13.5px] text-[#0F172A] dark:text-slate-100 tracking-tight">
                                        {mech.nickname ? mech.nickname.toUpperCase() : mech.name}
                                      </span>
                                      {mech.nickname && (
                                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                                          {mech.name}
                                        </span>
                                      )}
                                      {(mech.phone || mech.document) && (
                                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                          {mech.phone && <span>{maskPhone(mech.phone)}</span>}
                                          {mech.phone && mech.document && (
                                            <span className="text-slate-400 dark:text-slate-600 font-bold">•</span>
                                          )}
                                          {mech.document && <span>{maskCPFCNPJ(mech.document)}</span>}
                                        </div>
                                      )}
                                    </div>
                                    <span className="text-[10px] font-bold tracking-wider bg-[#EFF6FF] text-[#2563EB] dark:bg-sky-950/60 dark:text-sky-400 border border-[#BFDBFE] dark:border-sky-800 rounded-lg px-2.5 py-0.5 uppercase shrink-0">
                                      MECÂNICO
                                    </span>
                                  </button>
                                );
                              })
                            ) : filteredNonMechanicsForOS.length > 0 ? (
                              <>
                                <div className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-slate-50 dark:bg-white/5 rounded-lg">
                                  Não marcados como mecânico ainda
                                </div>
                                {filteredNonMechanicsForOS.map((client) => {
                                  const clientDisplayName = client.nickname ? `${client.nickname.toUpperCase()} (${client.name})` : client.name;
                                  const isUpdating = isUpdatingMechanicId === client.id;
                                  return (
                                    <div
                                      key={client.id}
                                      className="w-full text-left px-3.5 py-2 text-xs hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl text-foreground font-bold flex items-center justify-between gap-2"
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
                                        className="shrink-0 flex items-center gap-1 px-2.5 py-1 text-[10px] font-extrabold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 dark:hover:bg-sky-900/60 border border-sky-200 dark:border-sky-800 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
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
                  </div>
                )}

                {/* Linha 3: Card de Dados do Cliente / Mecânico ou Estado Vazio */}
                {!clientId ? (
                  <div className="border-[1.5px] border-dashed border-slate-300 dark:border-white/15 rounded-2xl py-9 px-6 flex flex-col items-center justify-center text-center gap-3 bg-white dark:bg-[#1E2227]">
                    <div className="w-12 h-12 rounded-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center shadow-xs">
                      <UserPlus className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                    </div>
                    <div className="space-y-1 max-w-md">
                      <p className="font-bold text-[15px] text-[#0F172A] dark:text-slate-100">Nenhum cliente selecionado</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        Pesquise o cliente acima por <span className="font-bold text-slate-700 dark:text-slate-300">nome</span>, <span className="font-bold text-slate-700 dark:text-slate-300">telefone</span> ou <span className="font-bold text-slate-700 dark:text-slate-300">CPF/CNPJ</span> para carregar os dados cadastrais da O.S.
                      </p>
                    </div>
                    {!readOnly && (
                      <div className="flex items-center gap-3 pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            clientTriggerRef.current?.focus();
                            setIsClientSelectorOpen(true);
                            calculateDropdownPosition();
                          }}
                          className="h-10 px-5 rounded-xl border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 font-bold text-xs uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer flex items-center gap-2 transition-all"
                        >
                          <Search className="w-4 h-4" /> Buscar Cliente
                        </Button>
                        <Button
                          type="button"
                          onClick={handleOpenNewClientModal}
                          className="h-10 px-5 rounded-xl bg-[#0B1329] hover:bg-[#1E293B] text-white font-bold text-xs uppercase tracking-wider gap-2 cursor-pointer shadow-sm transition-all"
                        >
                          <Plus className="w-4 h-4" /> Cadastrar Cliente
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                    {/* CARD 1: Dados do Cliente */}
                    <div className="bg-white dark:bg-[#24272C] border border-slate-200 dark:border-white/[0.04] rounded-2xl p-5 shadow-sm space-y-4">
                      <div className="space-y-4">
                        {/* Cabeçalho do card */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                            <span className="text-[13.5px] font-bold text-[#111827] dark:text-slate-100">Dados do Cliente</span>
                          </div>
                          {!readOnly && (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={handleOpenEditClientModal}
                                className="text-[11px] font-bold text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer transition-colors"
                              >
                                Editar Cliente
                              </button>
                              <button
                                type="button"
                                onClick={handleClearClient}
                                className="w-6 h-6 rounded-md border border-slate-200 dark:border-white/10 hover:border-red-300 dark:hover:border-red-500/50 hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-400 hover:text-red-500 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                                title="Desvincular / Limpar Cliente"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Caixa de identidade do cliente: Sem ícone/avatar, apelido em destaque e nome embaixo sem esconder texto */}
                        <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-white/[0.02] shadow-2xs">
                          <div className="min-w-0">
                            <p className="font-bold text-[14px] text-[#111827] dark:text-slate-100 uppercase tracking-tight break-words leading-snug">
                              {selectedClient?.nickname ? selectedClient.nickname : selectedClient?.name}
                            </p>
                            {selectedClient?.nickname && selectedClient?.name && selectedClient.nickname.trim().toUpperCase() !== selectedClient.name.trim().toUpperCase() && (
                              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mt-1 break-words leading-snug">
                                {selectedClient.name}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Informações: Tipo/Categoria primeiro, depois telefones, documento e localização */}
                        <div className="space-y-2.5 pt-1">
                          {/* 1. Tipo / Categoria */}
                          {(selectedClient?.clientType || selectedClient) && (
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 flex items-center justify-center text-slate-500 shrink-0">
                                <User className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider">Tipo / Categoria</p>
                                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 break-words">
                                  {selectedClient?.clientType === 'mechanic' ? 'Mecânico Parceiro' : 'Cliente'}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* 2. Telefones 1 e 2 (sem cortar o número na visualização) */}
                          {(selectedClient?.phone || selectedClient?.phone2) && (
                            <div className="grid grid-cols-1 2xl:grid-cols-2 gap-2.5">
                              {selectedClient?.phone && (
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="w-6 h-6 rounded-full bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 flex items-center justify-center text-slate-500 shrink-0">
                                    <Phone className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider">Telefone</p>
                                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                      {maskPhone(selectedClient.phone)}
                                    </p>
                                  </div>
                                </div>
                              )}
                              {selectedClient?.phone2 && (
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="w-6 h-6 rounded-full bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 flex items-center justify-center text-slate-500 shrink-0">
                                    <Phone className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider">Telefone 2</p>
                                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                      {maskPhone(selectedClient.phone2)}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* 3. Documento (CPF/CNPJ) (se preenchido) */}
                          {selectedClient?.document && (
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 flex items-center justify-center text-slate-500 shrink-0">
                                <FileText className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider">Documento (CPF/CNPJ)</p>
                                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                  {maskCPFCNPJ(selectedClient.document)}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* 4. Localização / Endereço (se preenchido) */}
                          {selectedClient?.city && (
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 flex items-center justify-center text-slate-500 shrink-0">
                                <MapPin className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider">Localização / Endereço</p>
                                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 break-words leading-relaxed">
                                  {selectedClient.city}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* CARD 2: Dados do Mecânico (se houver) OU Selector / Placeholder de Mecânico */}
                    {mechanicId ? (() => {
                      const mechanic = clients.find(c => c.id === mechanicId);
                      if (!mechanic) return null;
                      return (
                        <div className="bg-white dark:bg-[#24272C] border border-slate-200 dark:border-white/[0.04] rounded-2xl p-5 shadow-sm space-y-4">
                          <div className="space-y-4">
                            {/* Cabeçalho do card de mecânico */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Wrench className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                                <div>
                                  <span className="text-[13.5px] font-bold text-[#1E293B] dark:text-slate-200 block leading-tight">Dados do Mecânico</span>
                                  <span className="text-[10.5px] font-medium text-slate-400 dark:text-slate-500 block leading-tight mt-0.5">Mecânico da O.S.</span>
                                </div>
                              </div>
                              {!readOnly && (
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => openEditClientModalFor(mechanic)}
                                    className="text-[11px] font-bold text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer transition-colors"
                                  >
                                    Editar Mecânico
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setMechanicId('');
                                      setMechanicSearchText('');
                                    }}
                                    className="w-6 h-6 rounded-md border border-slate-200 dark:border-white/10 hover:border-red-300 dark:hover:border-red-500/50 hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-400 hover:text-red-500 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                                    title="Desvincular mecânico"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Identidade do mecânico: Sem avatar, apelido em destaque e nome embaixo sem esconder texto */}
                            <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-white/[0.02] shadow-2xs">
                              <div className="min-w-0">
                                <p className="font-bold text-[14px] text-slate-800 dark:text-slate-200 uppercase tracking-tight break-words leading-snug">
                                  {mechanic.nickname ? mechanic.nickname : mechanic.name}
                                </p>
                                {mechanic.nickname && mechanic.name && mechanic.nickname.trim().toUpperCase() !== mechanic.name.trim().toUpperCase() && (
                                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mt-1 break-words leading-snug">
                                    {mechanic.name}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Informações: Tipo / Categoria primeiro, depois telefones, CPF/CNPJ e localização */}
                            <div className="space-y-2.5 pt-1">
                              {/* 1. Tipo / Categoria */}
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-sky-50 dark:bg-sky-950/40 border border-sky-200/60 dark:border-sky-800/50 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
                                  <Wrench className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider">Tipo / Categoria</p>
                                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 break-words">
                                    {mechanic.clientType === 'mechanic' ? 'Mecânico Parceiro' : 'Mecânico'}
                                  </p>
                                </div>
                              </div>

                              {/* 2. Telefone de Contato */}
                              {mechanic.phone && (
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-sky-50 dark:bg-sky-950/40 border border-sky-200/60 dark:border-sky-800/50 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
                                    <Phone className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider">Telefone de Contato</p>
                                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">{maskPhone(mechanic.phone)}</p>
                                  </div>
                                </div>
                              )}

                              {/* 3. Documento (CPF/CNPJ) */}
                              {mechanic.document && (
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-sky-50 dark:bg-sky-950/40 border border-sky-200/60 dark:border-sky-800/50 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
                                    <FileText className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider">Documento (CPF/CNPJ)</p>
                                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">{maskCPFCNPJ(mechanic.document)}</p>
                                  </div>
                                </div>
                              )}

                              {/* 4. Localização / Endereço (se preenchido) */}
                              {mechanic.city && (
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-sky-50 dark:bg-sky-950/40 border border-sky-200/60 dark:border-sky-800/50 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
                                    <MapPin className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider">Localização / Endereço</p>
                                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 break-words leading-relaxed">{mechanic.city}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })() : (
                      <div className="bg-white dark:bg-[#24272C] border border-slate-200 dark:border-white/[0.04] rounded-2xl p-5 shadow-sm space-y-4">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Wrench className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                              <div>
                                <span className="text-[13.5px] font-bold text-[#1E293B] dark:text-slate-200 block leading-tight">Dados do Mecânico</span>
                                <span className="text-[10.5px] font-medium text-slate-400 dark:text-slate-500 block leading-tight mt-0.5">Mecânico da O.S. (Opcional)</span>
                              </div>
                            </div>
                          </div>

                          <div ref={osMechContainerRef} className="space-y-1.5 relative">
                            <div className="relative w-full">
                              <Input
                                type="text"
                                disabled={readOnly}
                                placeholder="Pesquisar mecânico por nome ou apelido..."
                                value={mechanicSearchText}
                                onChange={(e) => {
                                  setMechanicSearchText(e.target.value);
                                  setIsMechanicSelectorOpen(true);
                                }}
                                onFocus={() => {
                                  if (!readOnly) setIsMechanicSelectorOpen(true);
                                }}
                                className={cn(
                                  "w-full h-12 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 pl-4 text-[15px] font-semibold text-[#111827] dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-400 transition-all",
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
                                    className="w-5 h-5 rounded-full bg-slate-200 hover:bg-red-100 hover:text-red-600 text-slate-600 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-red-900/30 dark:hover:text-red-400 flex items-center justify-center text-xs transition-colors cursor-pointer"
                                  >
                                    ✕
                                  </button>
                                </div>
                              )}

                              {isMechanicSelectorOpen && (
                                <div className="absolute z-[1200] w-full mt-1.5 max-h-[240px] overflow-y-auto bg-white dark:bg-[#1E2227] border border-slate-200 dark:border-white/10 rounded-2xl shadow-[0_12px_28px_-4px_rgba(15,23,42,0.12),0_4px_10px_-2px_rgba(15,23,42,0.04)] p-1.5 space-y-0.5">
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
                                          className="w-full flex items-center justify-between py-2.5 px-3.5 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left"
                                        >
                                          <div className="flex flex-col min-w-0 pr-3">
                                            <span className="font-bold text-[13.5px] text-[#0F172A] dark:text-slate-100 tracking-tight">
                                              {mech.nickname ? mech.nickname.toUpperCase() : mech.name}
                                            </span>
                                            {mech.nickname && (
                                              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                                                {mech.name}
                                              </span>
                                            )}
                                            {(mech.phone || mech.document) && (
                                              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                                {mech.phone && <span>{maskPhone(mech.phone)}</span>}
                                                {mech.phone && mech.document && (
                                                  <span className="text-slate-400 dark:text-slate-600 font-bold">•</span>
                                                )}
                                                {mech.document && <span>{maskCPFCNPJ(mech.document)}</span>}
                                              </div>
                                            )}
                                          </div>
                                          <span className="text-[10px] font-bold tracking-wider bg-[#EFF6FF] text-[#2563EB] dark:bg-sky-950/60 dark:text-sky-400 border border-[#BFDBFE] dark:border-sky-800 rounded-lg px-2.5 py-0.5 uppercase shrink-0">
                                            MECÂNICO
                                          </span>
                                        </button>
                                      );
                                    })
                                  ) : filteredNonMechanicsForOS.length > 0 ? (
                                    <>
                                      <div className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-slate-50 dark:bg-white/5 rounded-lg">
                                        Não marcados como mecânico ainda
                                      </div>
                                      {filteredNonMechanicsForOS.map((client) => {
                                        const clientDisplayName = client.nickname ? `${client.nickname.toUpperCase()} (${client.name})` : client.name;
                                        const isUpdating = isUpdatingMechanicId === client.id;
                                        return (
                                          <div
                                            key={client.id}
                                            className="w-full text-left px-3.5 py-2 text-xs hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl text-foreground font-bold flex items-center justify-between gap-2"
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
                                              className="shrink-0 flex items-center gap-1 px-2.5 py-1 text-[10px] font-extrabold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 dark:hover:bg-sky-900/60 border border-sky-200 dark:border-sky-800 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
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
                            <p className="text-xs text-slate-400 dark:text-slate-500 pt-1 leading-relaxed">
                              Nenhum mecânico vinculado a esta ordem de serviço. Pesquise no campo acima para vincular.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Linha 4: STATUS DO SERVIÇO e Observação do Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">STATUS DO SERVIÇO</label>
                    <Select
                      value={serviceStatus}
                      onValueChange={(v) => {
                        const nextStatus = (v as ServiceStatus) || 'Na Fila';
                        setServiceStatus(nextStatus);
                        if (nextStatus === 'Levou' && !deliveryDate) {
                          setDeliveryDate(new Date().toISOString().split('T')[0]);
                        }
                      }}
                    >
                      <SelectTrigger className="h-12 w-full rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all px-4 group text-[15px] font-semibold text-[#111827] dark:text-slate-200 focus:ring-0 focus:ring-offset-0 focus:outline-none flex items-center justify-between gap-2.5 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-2.5 h-2.5 rounded-full shadow-sm",
                            serviceStatus === 'Na Fila' && "bg-slate-400",
                            serviceStatus === 'Em Andamento' && "bg-blue-500",
                            serviceStatus === 'Aguardando Peça' && "bg-orange-500",
                            serviceStatus === 'Pronto' && "bg-emerald-500",
                            serviceStatus === 'Levou' && "bg-red-500"
                          )} />
                          <SelectValue className="font-semibold text-[15px] text-[#111827] dark:text-slate-200" />
                        </div>
                      </SelectTrigger>
                      <SelectContent className="z-[9999] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl p-1.5 min-w-[220px]">
                        <SelectItem value="Na Fila" className="rounded-lg py-2 pl-3 pr-8 focus:bg-slate-100 dark:focus:bg-zinc-800 cursor-pointer transition-colors group">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-slate-400" />
                            <span className="font-bold text-xs text-slate-700 dark:text-slate-300">Na Fila</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="Em Andamento" className="rounded-lg py-2 pl-3 pr-8 focus:bg-slate-100 dark:focus:bg-zinc-800 cursor-pointer transition-colors group">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                            <span className="font-bold text-xs text-slate-700 dark:text-slate-300">Em Andamento</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="Aguardando Peça" className="rounded-lg py-2 pl-3 pr-8 focus:bg-slate-100 dark:focus:bg-zinc-800 cursor-pointer transition-colors group">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                            <span className="font-bold text-xs text-slate-700 dark:text-slate-300">Aguardando Peça</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="Pronto" className="rounded-lg py-2 pl-3 pr-8 focus:bg-slate-100 dark:focus:bg-zinc-800 cursor-pointer transition-colors group">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                            <span className="font-bold text-xs text-slate-700 dark:text-slate-300">Pronto</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="Levou" className="rounded-lg py-2 pl-3 pr-8 focus:bg-red-50 dark:focus:bg-red-950/30 cursor-pointer transition-colors group text-red-600 dark:text-red-400">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                            <span className="font-bold text-xs">Levou</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    {serviceStatus === 'Levou' && (
                      <div className="space-y-1.5 pt-1.5">
                        <label className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider ml-1 flex items-center gap-1">
                          <CalendarIcon className="w-3 h-3" /> Data em que o cliente levou
                        </label>
                        <DatePicker
                          value={deliveryDate}
                          onChange={(dateStr) => setDeliveryDate(dateStr)}
                          className="h-12 rounded-full border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20 text-red-900 dark:text-red-200 focus:ring-1 focus:ring-red-500"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">
                      Observação do Status <span className="text-[8px] text-muted-foreground/50 dark:text-slate-500 normal-case tracking-normal">(Opcional)</span>
                    </label>
                    <Input
                      placeholder="Ex: Aguardando pistões 0.50"
                      maxLength={80}
                      value={statusObservation}
                      onChange={(e) => setStatusObservation(e.target.value)}
                      className="h-12 w-full rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 px-4 text-xs font-semibold text-[#111827] dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-400 transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 2: MATERIAIS E PEÇAS */}
          <div className="bg-card border border-border/60 dark:border-white/[0.04] rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/50 dark:border-white/[0.03]">
              <div className="flex items-center gap-2.5 text-[11px] uppercase tracking-[0.2em] text-foreground/90 font-black">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                  <Package className="w-4 h-4 text-primary" />
                </div>
                MATERIAIS E PEÇAS
              </div>
            </div>

            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Material Deixado Checkboxes */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between pb-1">
                    <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/50 ml-1">MATERIAL DEIXADO</Label>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 max-h-[140px] overflow-y-auto pr-1">
                    {availablePartsLeft.map(part => {
                      const normalizedPart = part.toUpperCase();
                      const entry = partsLeft.find(p => p === normalizedPart || p.startsWith(normalizedPart + '|'));
                      const isChecked = !!entry;
                      const qty = entry && entry.includes('|') ? parseInt(entry.split('|')[1]) || 1 : 1;

                      const togglePart = () => {
                        if (readOnly) return;
                        if (isChecked) {
                          setPartsLeft(partsLeft.filter(p => p !== normalizedPart && !p.startsWith(normalizedPart + '|')));
                        } else {
                          setPartsLeft([...partsLeft, normalizedPart + '|1']);
                        }
                      };

                      const setQty = (newQty: number) => {
                        if (newQty < 1) return;
                        setPartsLeft(partsLeft.map(p => (p === normalizedPart || p.startsWith(normalizedPart + '|')) ? normalizedPart + '|' + newQty : p));
                      };

                      const partId = `material-${normalizeText(part).replace(/\s+/g, '-')}`;

                      return (
                        <label
                          key={part}
                          htmlFor={partId}
                          className={cn(
                            "group flex items-center justify-between h-11 px-3 rounded-lg border transition-all cursor-pointer select-none",
                            isChecked
                              ? "bg-primary/5 border-primary/30 dark:bg-primary/10 dark:border-primary/25"
                              : "bg-card border-border hover:bg-muted hover:border-foreground/15"
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <Checkbox
                              id={partId}
                              checked={isChecked}
                              onCheckedChange={togglePart}
                              className="w-4 h-4 rounded border-border"
                              disabled={readOnly}
                            />
                            <span className={cn(
                              "text-[10px] font-bold uppercase tracking-wide truncate transition-colors",
                              isChecked ? "text-foreground" : "text-foreground/70"
                            )}>
                              {part}
                            </span>
                          </div>
                          {isChecked ? (
                            <div className="flex items-center gap-1 shrink-0 ml-1">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setQty(qty - 1); }}
                                className="w-5 h-5 flex items-center justify-center rounded bg-muted text-xs hover:bg-muted/80 disabled:opacity-30 disabled:cursor-not-allowed"
                                disabled={qty <= 1 || readOnly}
                              >
                                -
                              </button>
                              <span className="w-4 text-center text-[10px] font-black font-mono text-foreground/80">{qty}</span>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setQty(qty + 1); }}
                                className="w-5 h-5 flex items-center justify-center rounded bg-muted text-xs hover:bg-muted/80"
                                disabled={readOnly}
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            !defaultPartsLeft.includes(part) && !readOnly && (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleRemoveAvailablePartLeft(part); }}
                                className="text-destructive/60 p-1 rounded hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all shrink-0 ml-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )
                          )}
                        </label>
                      );
                    })}
                  </div>

                  {!readOnly && (
                    <div className="flex gap-1.5 mt-2">
                      <Input
                        placeholder="Digite..."
                        value={newPartLeftName}
                        onChange={e => setNewPartLeftName(e.target.value.toUpperCase())}
                        className="h-11 text-xs w-full rounded-lg ref-light-input"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddPartLeft(e as any);
                          }
                        }}
                      />
                      <Button
                        onClick={handleAddPartLeft}
                        size="sm"
                        className="h-11 px-4 bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700 rounded-lg shrink-0 cursor-pointer"
                        type="button"
                      >
                        <Plus className="w-4 h-4 stroke-[2.5]" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Peças Adicionais section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between pb-1">
                    <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/50 ml-1">PEÇAS ADICIONAIS</Label>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 max-h-[140px] overflow-y-auto pr-1">
                    {availableAdditionalParts.map(part => {
                      const isSelected = additionalParts.includes(part);
                      const partId = `additional-${normalizeText(part).replace(/\s+/g, '-')}`;

                      const toggleAdditionalPart = () => {
                        if (readOnly) return;
                        if (isSelected) {
                          setAdditionalParts(additionalParts.filter(p => p !== part));
                        } else {
                          setAdditionalParts([...additionalParts, part]);
                        }
                      };

                      return (
                        <label
                          key={part}
                          htmlFor={partId}
                          className={cn(
                            "group flex items-center justify-between h-11 px-3 rounded-lg border transition-all cursor-pointer select-none",
                            isSelected
                              ? "bg-primary/5 border-primary/30 dark:bg-primary/10 dark:border-primary/25"
                              : "bg-card border-border hover:bg-muted hover:border-foreground/15"
                          )}
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Checkbox
                              id={partId}
                              checked={isSelected}
                              onCheckedChange={toggleAdditionalPart}
                              className="w-4 h-4 rounded border-border"
                              disabled={readOnly}
                            />
                            <span className={cn(
                              "text-[10px] font-bold uppercase tracking-wide truncate transition-colors",
                              isSelected ? "text-foreground" : "text-foreground/70"
                            )}>{part}</span>
                          </div>
                          {!defaultAdditionalParts.includes(part) && !readOnly && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleRemoveAvailableAdditionalPart(part); }}
                              className="text-destructive/60 p-1 rounded hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all shrink-0 ml-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </label>
                      );
                    })}
                  </div>

                  {!readOnly && (
                    <div className="flex gap-1.5 mt-2">
                      <Input
                        placeholder="Digite..."
                        value={newAdditionalPartName}
                        onChange={e => setNewAdditionalPartName(e.target.value.toUpperCase())}
                        className="h-11 text-xs w-full rounded-lg ref-light-input"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddAdditionalPart(e as any);
                          }
                        }}
                      />
                      <Button
                        onClick={handleAddAdditionalPart}
                        size="sm"
                        className="h-11 px-4 bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700 rounded-lg shrink-0 cursor-pointer"
                        type="button"
                      >
                        <Plus className="w-4 h-4 stroke-[2.5]" />
                      </Button>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>

          {/* CARD 3: ESPECIFICAÇÕES DO MOTOR */}
          <div className="bg-card border border-border/60 dark:border-white/[0.04] rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/50 dark:border-white/[0.03]">
              <div className="flex items-center gap-2.5 text-[11px] uppercase tracking-[0.2em] text-foreground/90 font-black">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center border border-border shrink-0">
                  <Settings className="w-4 h-4 text-foreground/70" />
                </div>
                ESPECIFICAÇÕES DO MOTOR
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-1">
              {/* Coluna Esquerda (campos de entrada) */}
              <div className="md:col-span-4 space-y-4">
                {/* Field 1: SELEÇÃO DO MOTOR */}
                <div className="space-y-1.5 relative">
                  <Label className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-[0.15em] ml-1">SELEÇÃO DO MOTOR</Label>
                  <div className="relative">
                    <Input
                      ref={motorTriggerRef}
                      type="text"
                      disabled={readOnly}
                      placeholder="Digite o motor..."
                      value={motorSearchQuery}
                      onChange={(e) => {
                        const val = e.target.value;
                        setMotorSearchQuery(val);
                        setIsMotorDropdownOpen(true);
                        calculateMotorDropdownPosition();
                      }}
                      onFocus={(e) => {
                        if (readOnly) return;
                        e.target.select();
                        setIsMotorDropdownOpen(true);
                        calculateMotorDropdownPosition();
                      }}
                      onClick={() => {
                        if (readOnly) return;
                        if (!isMotorDropdownOpen) {
                          setIsMotorDropdownOpen(true);
                          calculateMotorDropdownPosition();
                        }
                      }}
                      onKeyDown={handleMotorKeyDown}
                      className={cn(
                        "w-full h-11 rounded-lg ref-light-input pl-3 pr-10 font-bold text-xs border border-input bg-background text-foreground transition-all focus:ring-2 focus:ring-primary/30 focus:border-primary/50",
                        isMotorDropdownOpen && "ref-light-input-open",
                        readOnly && "opacity-60 cursor-not-allowed"
                      )}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                      {motorSearchQuery && !readOnly && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMotorSearchQuery('');
                            setIsMotorDropdownOpen(true);
                          }}
                          className="text-muted-foreground/40 hover:text-foreground transition-colors p-1"
                        >
                          <Plus className="w-3.5 h-3.5 rotate-45" />
                        </button>
                      )}
                      <ChevronsUpDown
                        className={cn("h-4 w-4 shrink-0 opacity-50 cursor-pointer", isMotorDropdownOpen && "opacity-100 text-primary")}
                        onClick={(e) => {
                          if (readOnly) return;
                          e.stopPropagation();
                          setIsMotorDropdownOpen(prev => {
                            const next = !prev;
                            if (next) setTimeout(calculateMotorDropdownPosition, 0);
                            return next;
                          });
                        }}
                      />
                    </div>
                  </div>

                  {/* Portal dropdown for Motor Selection */}
                  {isMotorDropdownOpen && typeof window !== 'undefined' && createPortal(
                    <div
                      ref={motorDropdownRef}
                      style={{
                        position: 'fixed',
                        ...(motorDropdownPos.top != null ? { top: motorDropdownPos.top } : {}),
                        ...(motorDropdownPos.bottom != null ? { bottom: motorDropdownPos.bottom } : {}),
                        left: motorDropdownPos.left,
                        width: motorDropdownPos.width,
                        zIndex: 99999,
                      }}
                      className="bg-popover border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150 custom-dropdown-container"
                    >
                      <div className="max-h-[280px] overflow-y-auto">
                        <div className="divide-y divide-border/20">
                          {/* If searching, render the "Nenhum..." option separately at the top */}
                          {!!motorSearchQuery.trim() && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setMotorSearchQuery('');
                                setIsMotorDropdownOpen(false);
                                const cylindersInput = document.getElementById('motor-cylinders-input');
                                cylindersInput?.focus();
                              }}
                              className="w-full flex items-center justify-between py-2.5 px-3 cursor-pointer transition-colors text-left font-bold text-xs dropdown-item dropdown-item-none text-red-500 hover:bg-muted/50 dark:hover:bg-white/5"
                            >
                              <span>Nenhum motor/modelo selecionado</span>
                            </button>
                          )}
                          {motorOptions.map((opt, index) => {
                            const isSelected = (opt.type === 'motor' || opt.type === 'model') && motorSearchQuery.toUpperCase() === opt.value.toUpperCase();
                            const isHighlighted = index === motorHighlightIndex;
                            const isHeader = opt.type === 'header';
                            return (
                              <div
                                key={index}
                                ref={isHighlighted && !isHeader ? motorHighlightedItemRef : null}
                                className={cn(
                                  "w-full flex items-center justify-between py-2 px-3 cursor-pointer transition-colors text-left font-bold text-xs group/item dropdown-item",
                                  isHeader ? "dropdown-item-header text-muted-foreground/60 bg-muted/20 font-black tracking-wider cursor-default select-none pointer-events-none text-center justify-center border-y border-border/10 py-1" :
                                    opt.type === 'none' ? "dropdown-item-none text-red-500" : (opt.type === 'create_motor' || opt.type === 'create_model') ? "dropdown-item-create text-primary" : "dropdown-item-standard text-foreground/90",
                                  isSelected ? "dropdown-item-selected bg-primary/5 dark:bg-primary/10" : "",
                                  isHighlighted && !isHeader ? "dropdown-item-highlighted bg-muted dark:bg-white/10" : "hover:bg-muted/50 dark:hover:bg-white/5"
                                )}
                                onClick={(e) => {
                                  if (isHeader) return;
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (opt.type === 'none') {
                                    setMotorSearchQuery('');
                                    setIsMotorDropdownOpen(false);
                                    const cylindersInput = document.getElementById('motor-cylinders-input');
                                    cylindersInput?.focus();
                                  } else if (opt.type === 'motor' || opt.type === 'model') {
                                    setMotorSearchQuery(opt.value);
                                    setIsMotorDropdownOpen(false);
                                    const cylindersInput = document.getElementById('motor-cylinders-input');
                                    cylindersInput?.focus();
                                  } else if (opt.type === 'create_motor') {
                                    handleAddNewMotor(opt.value);
                                  } else if (opt.type === 'create_model') {
                                    handleAddNewModel(opt.value);
                                  }
                                }}
                              >
                                <span className="truncate pr-2">{opt.label}</span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                                  {(opt.type === 'motor' || opt.type === 'model') && (
                                    <div className="flex items-center gap-1.5 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleStartEditMotor(opt.value);
                                        }}
                                        className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-foreground/60 hover:text-foreground transition-colors"
                                        title="Editar"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleStartDeleteMotor(opt.value);
                                        }}
                                        className="p-1 hover:bg-red-500/10 rounded text-red-500 hover:text-red-600 transition-colors"
                                        title="Excluir"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>,
                    document.body
                  )}
                </div>

                {/* Field 2: QUANTOS CILINDROS */}
                <div className="space-y-1.5 relative">
                  <Label className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-[0.15em] ml-1">QUANTOS CILINDROS</Label>
                  <div className="relative">
                    <Input
                      ref={cylindersTriggerRef}
                      id="motor-cylinders-input"
                      type="text"
                      disabled={readOnly}
                      placeholder="Digite quantos cilindros são..."
                      value={currentCylinders}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCurrentCylinders(val);
                        setIsCylindersDropdownOpen(true);
                        calculateCylindersDropdownPosition();
                      }}
                      onFocus={(e) => {
                        if (readOnly) return;
                        e.target.select();
                        setIsCylindersDropdownOpen(true);
                        calculateCylindersDropdownPosition();
                      }}
                      onClick={() => {
                        if (readOnly) return;
                        if (!isCylindersDropdownOpen) {
                          setIsCylindersDropdownOpen(true);
                          calculateCylindersDropdownPosition();
                        }
                      }}
                      onKeyDown={handleCylindersKeyDown}
                      className={cn(
                        "w-full h-11 rounded-lg ref-light-input pl-3 pr-10 font-bold text-xs border border-input bg-background text-foreground transition-all focus:ring-2 focus:ring-primary/30 focus:border-primary/50",
                        isCylindersDropdownOpen && "ref-light-input-open",
                        readOnly && "opacity-60 cursor-not-allowed"
                      )}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                      {currentCylinders && !readOnly && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentCylinders('');
                            setIsCylindersDropdownOpen(true);
                          }}
                          className="text-muted-foreground/40 hover:text-foreground transition-colors p-1"
                        >
                          <Plus className="w-3.5 h-3.5 rotate-45" />
                        </button>
                      )}
                      <ChevronsUpDown
                        className={cn("h-4 w-4 shrink-0 opacity-50 cursor-pointer", isCylindersDropdownOpen && "opacity-100 text-primary")}
                        onClick={(e) => {
                          if (readOnly) return;
                          e.stopPropagation();
                          setIsCylindersDropdownOpen(prev => {
                            const next = !prev;
                            if (next) setTimeout(calculateCylindersDropdownPosition, 0);
                            return next;
                          });
                        }}
                      />
                    </div>
                  </div>

                  {/* Portal dropdown for Cylinders */}
                  {isCylindersDropdownOpen && typeof window !== 'undefined' && createPortal(
                    <div
                      ref={cylindersDropdownRef}
                      style={{
                        position: 'fixed',
                        ...(cylindersDropdownPos.top != null ? { top: cylindersDropdownPos.top } : {}),
                        ...(cylindersDropdownPos.bottom != null ? { bottom: cylindersDropdownPos.bottom } : {}),
                        left: cylindersDropdownPos.left,
                        width: cylindersDropdownPos.width,
                        zIndex: 99999,
                      }}
                      className="bg-popover border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150 custom-dropdown-container"
                    >
                      <div className="max-h-[280px] overflow-y-auto">
                        <div className="divide-y divide-border/20">
                          {cylindersOptions.map((opt, index) => {
                            const isSelected = opt.type === 'cylinder' && currentCylinders === opt.value;
                            const isHighlighted = index === cylindersHighlightIndex;
                            return (
                              <button
                                key={index}
                                ref={isHighlighted ? cylindersHighlightedItemRef : null}
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (opt.type === 'none') {
                                    setCurrentCylinders('');
                                  } else {
                                    setCurrentCylinders(opt.value);
                                  }
                                  setIsCylindersDropdownOpen(false);
                                  const dispInput = document.getElementById('motor-displacement-input');
                                  dispInput?.focus();
                                }}
                                className={cn(
                                  "w-full flex items-center justify-between py-2.5 px-3 cursor-pointer transition-colors text-left font-bold text-xs dropdown-item",
                                  opt.type === 'none' ? "dropdown-item-none text-red-500" : "dropdown-item-standard text-foreground/90",
                                  isSelected ? "dropdown-item-selected bg-primary/5 dark:bg-primary/10" : "",
                                  isHighlighted ? "dropdown-item-highlighted bg-muted dark:bg-white/10" : "hover:bg-muted/50 dark:hover:bg-white/5"
                                )}
                              >
                                <span>{opt.label}</span>
                                {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>,
                    document.body
                  )}
                </div>

                {/* Field 3: CILINDRADA */}
                <div className="space-y-1.5 relative">
                  <Label className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-[0.15em] ml-1">CILINDRADA</Label>
                  <div className="relative">
                    <Input
                      ref={displacementTriggerRef}
                      id="motor-displacement-input"
                      type="text"
                      disabled={readOnly}
                      placeholder="Digite a cilindrada"
                      value={displacementSearchQuery}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDisplacementSearchQuery(val);
                        setIsDisplacementDropdownOpen(true);
                        calculateDisplacementDropdownPosition();
                      }}
                      onFocus={(e) => {
                        if (readOnly) return;
                        e.target.select();
                        setIsDisplacementDropdownOpen(true);
                        calculateDisplacementDropdownPosition();
                      }}
                      onClick={() => {
                        if (readOnly) return;
                        if (!isDisplacementDropdownOpen) {
                          setIsDisplacementDropdownOpen(true);
                          calculateDisplacementDropdownPosition();
                        }
                      }}
                      onKeyDown={handleDisplacementKeyDown}
                      className={cn(
                        "w-full h-11 rounded-lg ref-light-input pl-3 pr-10 font-bold text-xs border border-input bg-background text-foreground transition-all focus:ring-2 focus:ring-primary/30 focus:border-primary/50",
                        isDisplacementDropdownOpen && "ref-light-input-open"
                      )}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                      {displacementSearchQuery && !readOnly && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDisplacementSearchQuery('');
                            setIsDisplacementDropdownOpen(true);
                          }}
                          className="text-muted-foreground/40 hover:text-foreground transition-colors p-1"
                        >
                          <Plus className="w-3.5 h-3.5 rotate-45" />
                        </button>
                      )}
                      <ChevronsUpDown
                        className={cn("h-4 w-4 shrink-0 opacity-50 cursor-pointer", isDisplacementDropdownOpen && "opacity-100 text-primary")}
                        onClick={(e) => {
                          if (readOnly) return;
                          e.stopPropagation();
                          setIsDisplacementDropdownOpen(prev => {
                            const next = !prev;
                            if (next) setTimeout(calculateDisplacementDropdownPosition, 0);
                            return next;
                          });
                        }}
                      />
                    </div>
                  </div>

                  {/* Portal dropdown for Displacement */}
                  {isDisplacementDropdownOpen && typeof window !== 'undefined' && createPortal(
                    <div
                      ref={displacementDropdownRef}
                      style={{
                        position: 'fixed',
                        ...(displacementDropdownPos.top != null ? { top: displacementDropdownPos.top } : {}),
                        ...(displacementDropdownPos.bottom != null ? { bottom: displacementDropdownPos.bottom } : {}),
                        left: displacementDropdownPos.left,
                        width: displacementDropdownPos.width,
                        zIndex: 99999,
                      }}
                      className="bg-popover border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150 custom-dropdown-container"
                    >
                      <div className="max-h-[280px] overflow-y-auto">
                        <div className="divide-y divide-border/20">
                          {displacementOptions.map((opt, index) => {
                            const isSelected = opt.type === 'displacement' && displacementSearchQuery === opt.value;
                            const isHighlighted = index === displacementHighlightIndex;
                            return (
                              <button
                                key={index}
                                ref={isHighlighted ? displacementHighlightedItemRef : null}
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  let finalDisp = opt.value;
                                  if (opt.type === 'none') {
                                    finalDisp = '';
                                    setDisplacementSearchQuery('');
                                  } else {
                                    setDisplacementSearchQuery(opt.value);
                                  }
                                  setIsDisplacementDropdownOpen(false);

                                  if (finalDisp && !availableDisplacements.includes(finalDisp)) {
                                    const updatedAvail = [...availableDisplacements, finalDisp].sort((a, b) => parseFloat(a) - parseFloat(b));
                                    setAvailableDisplacements(updatedAvail);
                                  }
                                  handleAddOrUpdateMotor(finalDisp);
                                }}
                                className={cn(
                                  "w-full flex items-center justify-between py-2.5 px-3 cursor-pointer transition-colors text-left font-bold text-xs dropdown-item",
                                  opt.type === 'none' ? "dropdown-item-none text-red-500" :
                                    opt.type === 'create_displacement' ? "dropdown-item-create text-primary" : "dropdown-item-standard text-foreground/90",
                                  isSelected ? "dropdown-item-selected bg-primary/5 dark:bg-primary/10" : "",
                                  isHighlighted ? "dropdown-item-highlighted bg-muted dark:bg-white/10" : "hover:bg-muted/50 dark:hover:bg-white/5"
                                )}
                              >
                                <span>{opt.label}</span>
                                {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>,
                    document.body
                  )}
                </div>

                {/* Botão ADD em largura total */}
                {!readOnly && (
                  <Button
                    type="button"
                    onClick={() => handleAddOrUpdateMotor()}
                    className="w-full h-11 bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700 rounded-lg cursor-pointer font-extrabold uppercase text-xs"
                  >
                    {editingIndex !== null ? 'SALVAR' : 'ADD'}
                  </Button>
                )}
              </div>

              {/* Coluna Direita (motores adicionados) */}
              <div className="md:col-span-8 flex flex-col h-full justify-stretch">
                <div className="border-2 border-dashed border-neutral-300 dark:border-neutral-800 rounded-xl p-4 min-h-[220px] flex items-center justify-center bg-secondary/5 h-full">
                  {motorsList.length === 0 ? (
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground italic font-medium">
                        Nenhum motor selecionado • Nenhuma cilindrada selecionada
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2.5 items-start justify-start w-full h-full content-start">
                      {motorsList.map((m, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "flex items-center justify-between bg-[#E5E7EB] dark:bg-[#24272C]/60 border border-border/80 dark:border-white/[0.04] rounded-xl px-4 py-2.5 gap-4 animate-in fade-in-50 duration-200",
                            editingIndex === idx && "border-primary/50 bg-primary/5 ring-1 ring-primary/30"
                          )}
                        >
                          <div className="flex flex-col gap-0.5">
                            <span className="font-black text-xs text-foreground/90 uppercase">
                              {m.model}
                              {m.cylinders ? ` • ${m.cylinders.replace(/\D/g, '')} CIL` : ''}
                            </span>
                            <span className="text-[10px] text-muted-foreground/80 font-bold uppercase tracking-wide">
                              {m.displacement || 'Sem Cilindrada'}
                            </span>
                          </div>
                          {!readOnly && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleEditMotor(idx)}
                                className="h-8 px-2 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 rounded-lg transition-colors cursor-pointer"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveMotor(idx)}
                                className="h-8 px-2 text-[10px] font-black uppercase tracking-widest text-destructive hover:bg-destructive/5 rounded-lg transition-colors cursor-pointer"
                              >
                                Remover
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* CARD 4: CATÁLOGO DE SERVIÇOS */}
          <div className="bg-card border border-border/60 dark:border-white/[0.04] rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/50 dark:border-white/[0.03]">
              <div className="flex items-center gap-2.5 text-[11px] uppercase tracking-[0.2em] text-foreground/90 font-black">
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
          <div className="bg-card border border-border/60 dark:border-white/[0.04] rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/50 dark:border-white/[0.03]">
              <div className="flex items-center gap-2.5 text-[11px] uppercase tracking-[0.2em] text-foreground/90 font-black">
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
                placeholder="OBSERVAÇÕES ADICIONAIS SOBRE O SERVIÇO..."
                className="min-h-[90px] rounded-xl premium-input p-3.5 text-xs resize-none uppercase"
              />
            </div>
          </div>

          {/* CARD 7: FINALIZADO E ENTREGUE */}
          <div className="flex justify-end w-full">
            <div className="bg-card border border-border/60 dark:border-white/[0.04] rounded-xl p-5 shadow-sm flex flex-col gap-4 select-none hover:border-foreground/10 transition-all w-full max-w-[320px]">
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
                <Label className="font-black text-xs uppercase tracking-widest text-foreground/80 cursor-pointer m-0">
                  FINALIZADO E ENTREGUE
                </Label>
              </div>

              <div className="flex flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>
                <Label
                  htmlFor="finishedAtDate"
                  className={cn(
                    "text-[10px] font-black uppercase tracking-[0.15em] ml-1 transition-colors",
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

          {/* Bottom actions bar */}
          <div className="flex justify-between pt-4 pb-10">
            <Button
              type="button"
              size="lg"
              onClick={() => setIsPreviewOpen(true)}
              className="bg-neutral-800 hover:bg-neutral-700 text-white font-extrabold h-11 px-6 rounded-lg text-xs transition-all shadow-md cursor-pointer flex items-center gap-2 border border-neutral-700"
            >
              <Printer className="w-4.5 h-4.5" />
              Imprimir O.S.
            </Button>
            {!readOnly && (
              <Button size="lg" type="submit" className="bg-foreground text-background font-extrabold h-11 px-6 rounded-lg text-xs hover:bg-foreground/90 transition-all shadow-md cursor-pointer">
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
            <DialogTitle className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" /> Status Incompleto
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
              className="premium-input uppercase text-xs h-9 rounded-lg"
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

      {/* Modal: Cadastrar Cliente */}
      {!readOnly && (
        <Dialog open={isClientModalOpen} onOpenChange={setIsClientModalOpen}>
          <DialogContent showCloseButton={false} className="relative z-[1100] bg-card border-border rounded-xl p-6 max-w-md" overlayClassName="z-[1099]">
            <DialogClose render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span className="sr-only">Close</span>
              </Button>
            } />
            <DialogHeader>
              <DialogTitle className="text-lg font-black uppercase tracking-widest text-foreground/90">Cadastrar Cliente</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Nome Completo</Label>
                <Input value={newClientName} onChange={e => setNewClientName(e.target.value)} placeholder="Ex: JOÃO DA SILVA" className="h-9 rounded-lg premium-input text-xs uppercase" />
                {isNewClientDuplicate && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-600 dark:text-amber-400 mt-1 flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <span>⚠️ Cliente já cadastrado</span>
                    <span className="text-[10px] font-normal text-muted-foreground">Não é permitido cadastrar outro cliente com o mesmo nome, telefone ou CPF/CNPJ. Selecione o cliente existente na lista de busca.</span>
                    <div className="flex flex-col gap-1 mt-0.5">
                      {newClientConflicts.map(({ client, fields }) => {
                        const fieldLabel = fields.length === 1
                          ? (fields[0] === 'name' ? 'Nome já usado por' : fields[0] === 'phone' ? 'Telefone já usado por' : 'CPF/CNPJ já usado por')
                          : 'Já cadastrado (' + fields.map(f => f === 'name' ? 'nome' : f === 'phone' ? 'telefone' : 'CPF/CNPJ').join(', ') + ') por';
                        return (
                          <div key={client.id} className="flex flex-wrap items-center gap-1 text-[10px] font-normal">
                            <span className="font-bold text-amber-700 dark:text-amber-400">{fieldLabel}:</span>
                            <button
                              type="button"
                              onClick={() => openEditClientModalFor(client)}
                              className="font-extrabold text-amber-700 dark:text-amber-300 underline decoration-dotted underline-offset-2 hover:text-amber-900 dark:hover:text-amber-200 cursor-pointer"
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
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Apelido / Nome Fantasia <span className="text-[8px] text-muted-foreground/40 normal-case tracking-normal">(Opcional)</span></Label>
                <Input value={newClientNickname} onChange={e => setNewClientNickname(e.target.value)} placeholder="Apelido / Nome Fantasia" className="h-9 rounded-lg premium-input text-xs uppercase" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">CPF/CNPJ <span className="text-[8px] text-muted-foreground/40 normal-case tracking-normal">(Opcional)</span></Label>
                <MaskedInput value={newClientDoc} mask={maskCPFCNPJ} unmask={(v) => normalizeNumber(v).slice(0, 14)} onValueChange={setNewClientDoc} placeholder="000.000.000-00" className="h-9 rounded-lg premium-input text-xs" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Telefone <span className="text-[8px] text-muted-foreground/40 normal-case tracking-normal">(Opcional)</span></Label>
                  <MaskedInput value={newClientPhone} mask={maskPhone} unmask={(v) => normalizeNumber(v).slice(0, 11)} onValueChange={setNewClientPhone} placeholder="(11) 99999-9999" className="h-9 rounded-lg premium-input text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Telefone 2 <span className="text-[8px] text-muted-foreground/40 normal-case tracking-normal">(Opcional)</span></Label>
                  <MaskedInput value={newClientPhone2} mask={maskPhone} unmask={(v) => normalizeNumber(v).slice(0, 11)} onValueChange={setNewClientPhone2} placeholder="(11) 99999-9999" className="h-9 rounded-lg premium-input text-xs" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Endereço <span className="text-[8px] text-muted-foreground/40 normal-case tracking-normal">(Opcional)</span></Label>
                <Input value={newClientAddress} onChange={e => setNewClientAddress(e.target.value)} placeholder="Ex: RUA FLORES, 123 - CENTRO" className="h-9 rounded-lg premium-input text-xs uppercase" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Tipo de Cliente</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNewClientType('regular')}
                    className={cn(
                      "flex-1 h-9 rounded-lg border text-xs font-black uppercase tracking-widest transition-all cursor-pointer",
                      newClientType === 'regular'
                        ? "bg-muted text-foreground border-border"
                        : "bg-transparent text-muted-foreground/60 border-border/40 hover:bg-muted/30"
                    )}
                  >
                    Cliente
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewClientType('mechanic')}
                    className={cn(
                      "flex-1 h-9 rounded-lg border text-xs font-black uppercase tracking-widest transition-all cursor-pointer",
                      newClientType === 'mechanic'
                        ? "bg-[#0EA5E9]/10 text-[#0EA5E9] dark:text-[#38BDF8] border border-[#0EA5E9]/30 dark:border-[#38BDF8]/30"
                        : "bg-transparent text-muted-foreground/60 border-border/40 hover:bg-muted/30"
                    )}
                  >
                    Mecânico
                  </button>
                </div>
              </div>
              {newClientType === 'regular' && (
                <div ref={newClientMechContainerRef} className="space-y-1.5 relative">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Mecânico Padrão <span className="text-[8px] text-muted-foreground/40 normal-case tracking-normal">(Opcional)</span></Label>
                  <div className="relative">
                    <Input
                      placeholder="Pesquisar por nome ou apelido..."
                      value={newClientMechSearch}
                      onChange={(e) => {
                        setNewClientMechSearch(e.target.value);
                        setIsNewClientMechDropdownOpen(true);
                        if (!e.target.value) {
                          setNewClientDefaultMechanicId('');
                        }
                      }}
                      onFocus={() => setIsNewClientMechDropdownOpen(true)}
                      className="h-9 rounded-lg premium-input text-xs w-full"
                    />
                    {isNewClientMechDropdownOpen && (
                      <div className="absolute z-[1200] w-full mt-1 max-h-[160px] overflow-y-auto bg-card border border-border rounded-lg shadow-lg">
                        {filteredNewClientMech.length === 0 ? (
                          <div className="p-2 text-xs text-muted-foreground/60 italic text-center">Nenhum mecânico encontrado</div>
                        ) : (
                          filteredNewClientMech.map((mech) => (
                            <button
                              key={mech.id}
                              type="button"
                              onClick={() => {
                                setNewClientDefaultMechanicId(mech.id);
                                setNewClientMechSearch(mech.name);
                                setIsNewClientMechDropdownOpen(false);
                              }}
                              className="w-full text-left px-3 py-2 text-xs hover:bg-muted text-foreground font-semibold"
                            >
                              {mech.name} {mech.nickname ? `(${mech.nickname})` : ''}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button onClick={handleAddClient} disabled={isNewClientDuplicate} className="w-full h-10 rounded-lg bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                Salvar Cliente
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal: Editar Cliente / Mecânico */}
      {!readOnly && (
        <Dialog open={isEditClientModalOpen} onOpenChange={setIsEditClientModalOpen}>
          <DialogContent showCloseButton={false} className="relative z-[1100] bg-card border-border rounded-xl p-6 max-w-md" overlayClassName="z-[1099]">
            <DialogClose render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span className="sr-only">Close</span>
              </Button>
            } />
            <DialogHeader>
              <DialogTitle className="text-lg font-black uppercase tracking-widest text-foreground/90">
                {editClientType === 'mechanic' ? 'Editar Mecânico' : 'Editar Cliente'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Nome Completo</Label>
                <Input
                  value={editClientName}
                  onChange={e => setEditClientName(e.target.value.toUpperCase())}
                  placeholder="Ex: JOÃO DA SILVA"
                  className="h-9 rounded-lg premium-input text-xs uppercase"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Apelido (Opcional)</Label>
                <Input
                  value={editClientNickname}
                  onChange={e => setEditClientNickname(e.target.value.toUpperCase())}
                  placeholder="Ex: SILVA MOTORES"
                  className="h-9 rounded-lg premium-input text-xs uppercase"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Tipo</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditClientType('regular')}
                    className={cn(
                      "flex-1 h-9 rounded-lg border text-xs font-black uppercase tracking-widest transition-all cursor-pointer",
                      editClientType === 'regular'
                        ? "bg-muted text-foreground border-border"
                        : "bg-transparent text-muted-foreground/60 border-border/40 hover:bg-muted/30"
                    )}
                  >
                    Cliente
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditClientType('mechanic')}
                    className={cn(
                      "flex-1 h-9 rounded-lg border text-xs font-black uppercase tracking-widest transition-all cursor-pointer",
                      editClientType === 'mechanic'
                        ? "bg-[#0EA5E9]/10 text-[#0EA5E9] dark:text-[#38BDF8] border border-[#0EA5E9]/30 dark:border-[#38BDF8]/30"
                        : "bg-transparent text-muted-foreground/60 border-border/40 hover:bg-muted/30"
                    )}
                  >
                    Mecânico
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Telefone <span className="text-[8px] text-muted-foreground/40 normal-case tracking-normal">(Opcional)</span></Label>
                  <Input
                    value={maskPhone(editClientPhone)}
                    onChange={e => setEditClientPhone(normalizeNumber(e.target.value).slice(0, 11))}
                    placeholder="(11) 99999-9999"
                    className="h-9 rounded-lg premium-input text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Telefone 2 <span className="text-[8px] text-muted-foreground/40 normal-case tracking-normal">(Opcional)</span></Label>
                  <Input
                    value={maskPhone(editClientPhone2)}
                    onChange={e => setEditClientPhone2(normalizeNumber(e.target.value).slice(0, 11))}
                    placeholder="(11) 99999-9999"
                    className="h-9 rounded-lg premium-input text-xs"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">CPF/CNPJ <span className="text-[8px] text-muted-foreground/40 normal-case tracking-normal">(Opcional)</span></Label>
                <Input
                  value={maskCPFCNPJ(editClientDoc)}
                  onChange={e => setEditClientDoc(normalizeNumber(e.target.value).slice(0, 14))}
                  placeholder="000.000.000-00"
                  className="h-9 rounded-lg premium-input text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Endereço <span className="text-[8px] text-muted-foreground/40 normal-case tracking-normal">(Opcional)</span></Label>
                <Input
                  value={editClientAddress}
                  onChange={e => setEditClientAddress(e.target.value.toUpperCase())}
                  placeholder="Ex: RUA FLORES, 123 - CENTRO"
                  className="h-9 rounded-lg premium-input text-xs uppercase"
                />
              </div>
            </div>
            <DialogFooter className="flex flex-row items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleDeleteClientModal}
                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 py-1 cursor-pointer transition-colors shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Excluir
              </button>
              <Button
                onClick={handleSaveClientEditModal}
                className="h-10 px-6 rounded-lg bg-[#0B1329] hover:bg-[#1E293B] text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Salvar Alterações
              </Button>
            </DialogFooter>
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
            <CardTitle className="text-destructive font-black text-sm uppercase tracking-widest">
              Erro de Renderização do Formulário
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground font-medium leading-relaxed">
              Ocorreu um erro inesperado ao carregar ou atualizar o formulário. Por favor, tente recarregar a página ou voltar para o painel.
            </p>
            {this.state.error?.message && (
              <pre className="p-3 bg-muted dark:bg-zinc-900 border dark:border-white/[0.04] rounded-lg text-[10px] text-destructive font-mono overflow-auto max-h-[150px]">
                {this.state.error.message}
              </pre>
            )}
          </CardContent>
          <CardFooter className="flex gap-3">
            <Button
              size="sm"
              variant="outline"
              className="text-[10px] font-black uppercase tracking-widest h-9"
              onClick={() => window.location.reload()}
            >
              Recarregar Página
            </Button>
            <Button
              size="sm"
              className="text-[10px] font-black uppercase tracking-widest h-9"
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
  const formKey = props.order ? `edit-${props.order.id}` : 'new';
  return (
    <ErrorBoundary key={formKey}>
      <OSFormImpl {...props} />
    </ErrorBoundary>
  );
}
