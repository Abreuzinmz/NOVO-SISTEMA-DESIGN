'use client';

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { List } from 'react-window';
import { useStore, Client, Order, PagamentoAgrupado } from '@/lib/store';
import { ServiceStatusBadge, PaymentBadge } from '@/components/ui/status-badges';
import { getOrderPaymentSummary, formatBRL } from '@/lib/payment';
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
import { Input } from '@/components/ui/input';
import { MaskedInput } from '@/components/ui/masked-input';
import { 
  Search, 
  User, 
  Phone, 
  CreditCard, 
  ChevronRight,
  TrendingUp,
  Wallet,
  History as HistoryIcon,
  Plus,
  MapPin,
  MessageCircle,
  Pencil,
  Trash2,
  AlertTriangle,
  X,
  Tag,
  FileText,
  Users,
  Wrench
} from 'lucide-react';
import { cn, formatMotorDisplay, formatMotorModelAndCylinders } from '@/lib/utils';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription,
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { FormSection, FieldLabel, IconField, ClientTypeToggle, ClientDialogHeader, ClientDialogFooter, iconInputClass, clientDialogClass } from '@/components/client-form';
import { OSViewModal } from '@/components/os-view-modal';

// ═══ FORMATTING HELPERS ═══

const maskCPFCNPJ = (v: string) => {
  v = v.replace(/\D/g, "");
  if (v.length <= 11) {
    return v.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  } else {
    return v.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
  }
};

const maskPhone = (v: string) => {
  v = v.replace(/\D/g, "");
  if (v.length <= 10) {
    return v.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  } else {
    return v.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
  }
};

// ═══ CUSTOM HOOK FOR MEASURING CONTAINER SIZE ═══

function useElementSize<T extends HTMLElement>() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [element, setRef] = useState<T | null>(null);

  useEffect(() => {
    if (!element) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      if (!Array.isArray(entries) || !entries.length) return;
      const entry = entries[0];
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });

    resizeObserver.observe(element);
    return () => resizeObserver.disconnect();
  }, [element]);

  return [setRef, size] as const;
}

// ═══ SALDO EM ABERTO POR CLIENTE ═══

export interface ClientBalance {
  openOrders: number;
  balance: number;
}

function buildClientBalances(
  orders: Order[],
  getGroup: (orderId: number) => PagamentoAgrupado | undefined
): Map<string, ClientBalance> {
  const map = new Map<string, ClientBalance>();
  const countedGroups = new Set<string>();
  for (const o of orders) {
    if (!o || !o.clientId) continue;
    const entry = map.get(o.clientId) || { openOrders: 0, balance: 0 };
    if (!o.finished) entry.openOrders += 1;
    const group = getGroup(o.id);
    if (group) {
      if (!countedGroups.has(group.id)) {
        countedGroups.add(group.id);
        entry.balance += Math.max(0, group.valorTotal - group.valorPago);
      }
    } else {
      entry.balance += getOrderPaymentSummary(o).balance;
    }
    map.set(o.clientId, entry);
  }
  return map;
}

// ═══ CLIENT ROW (LIST ITEM) COMPONENT ═══

interface ClientRowData {
  filteredClients: Client[];
  balances: Map<string, ClientBalance>;
  selectedClientId: string | null;
  onSelectClient: (id: string) => void;
}

interface ClientRowProps extends ClientRowData {
  index: number;
  style: React.CSSProperties;
}

const ClientRow = React.memo(({ index, style, filteredClients, balances, selectedClientId, onSelectClient }: ClientRowProps): React.ReactElement | null => {
  const client = filteredClients[index];
  if (!client) return null;

  const isSelected = selectedClientId === client.id;
  const bal = balances.get(client.id);

  return (
    <div 
      style={{
        ...style,
        willChange: 'transform',
        contain: 'content',
      }}
      className="border-b border-border last:border-b-0"
    >
      <button
        onClick={() => onSelectClient(client.id)}
        className={cn(
          "w-full h-full text-left px-3.5 transition-all duration-200 group flex items-center justify-between",
          "hover:bg-secondary/20",
          isSelected && "bg-secondary/50 border-l-[3px] border-foreground"
        )}
      >
        <div className="space-y-0.5 flex flex-col justify-center h-full min-w-0">
          {client.nickname ? (
            <span className="text-xs font-bold text-muted-foreground tracking-wide uppercase truncate block min-w-0">
              {client.nickname}
            </span>
          ) : null}
          <div className="flex items-center gap-2 min-w-0">
            <span className={cn(
              "font-bold text-sm transition-colors truncate block min-w-0",
              isSelected ? "text-foreground" : "text-foreground/80 group-hover:text-foreground"
            )}>
              {client.name}
            </span>
            {client.clientType === 'mechanic' ? (
              <span className="h-[20px] text-xs font-bold bg-info/10 text-info border border-info/20 rounded px-1.5 flex items-center justify-center flex-shrink-0">
                MECÂNICO
              </span>
            ) : (
              <span className="h-[20px] text-xs font-bold bg-secondary text-secondary-foreground border border-border rounded px-1.5 flex items-center justify-center flex-shrink-0">
                CLIENTE
              </span>
            )}
          </div>
          {(client.document || client.phone) && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono truncate">
              {client.document && (
                <span className="flex items-center gap-1 flex-shrink-0">
                  <CreditCard className="w-3.5 h-3.5 stroke-[1.5]" /> {maskCPFCNPJ(client.document)}
                </span>
              )}
              {client.phone && (
                <span className="flex items-center gap-1 flex-shrink-0">
                  <Phone className="w-3.5 h-3.5 stroke-[1.5]" /> {maskPhone(client.phone)}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 pl-2">
          {bal && bal.balance > 0 && (
            <span className="text-right leading-tight">
              <span className="block text-xs text-muted-foreground">deve</span>
              <span className="block text-sm font-bold text-danger tabular-nums">{formatBRL(bal.balance)}</span>
            </span>
          )}
          <ChevronRight className={cn(
            "w-4 h-4 transition-transform flex-shrink-0",
            isSelected ? "rotate-90 text-foreground" : "text-muted-foreground/30"
          )} />
        </div>
      </button>
    </div>
  );
});

ClientRow.displayName = 'ClientRow';

// ═══ CLIENT LIST COMPONENT ═══

interface ClientListProps {
  clients: Client[];
  balances: Map<string, ClientBalance>;
  selectedClientId: string | null;
  onSelectClient: (id: string) => void;
  addClient: (client: Omit<Client, 'id'>) => Promise<Client>;
}

const ClientList = React.memo(({ clients, balances, selectedClientId, onSelectClient, addClient }: ClientListProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'regular' | 'mechanic' | 'debtors'>('all');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [newName, setNewName] = useState('');
  const [newDocument, setNewDocument] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPhone2, setNewPhone2] = useState('');
  const [newWhatsapp, setNewWhatsapp] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newClientType, setNewClientType] = useState<'regular' | 'mechanic'>('regular');
  const [newNickname, setNewNickname] = useState('');
  const [newDefaultMechanicId, setNewDefaultMechanicId] = useState('');
  const [newMechSearch, setNewMechSearch] = useState('');
  const [isNewMechDropdownOpen, setIsNewMechDropdownOpen] = useState(false);

  const mechanics = useMemo(() => {
    return (clients || []).filter(c => c && c.clientType === 'mechanic');
  }, [clients]);

  const filteredNewMech = useMemo(() => {
    const q = newMechSearch.toLowerCase().trim();
    if (!q) return mechanics;
    return mechanics.filter(m => 
      (m.name || '').toLowerCase().includes(q) || 
      (m.nickname || '').toLowerCase().includes(q)
    );
  }, [mechanics, newMechSearch]);

  const newMechContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (newMechContainerRef.current && !newMechContainerRef.current.contains(event.target as Node)) {
        setIsNewMechDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [containerRef, { height }] = useElementSize<HTMLDivElement>();

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const cleanNumeric = (v: string) => v.replace(/\D/g, "").slice(0, 14);
  const cleanPhone = (v: string) => v.replace(/\D/g, "").slice(0, 11);

  const resetForm = () => {
    setNewName('');
    setNewDocument('');
    setNewPhone('');
    setNewPhone2('');
    setNewWhatsapp('');
    setNewCity('');
    setNewClientType('regular');
    setNewNickname('');
    setNewDefaultMechanicId('');
    setNewMechSearch('');
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) { toast.error('O nome do cliente é obrigatório.'); return; }
    if (newPhone && newPhone.length < 10) { toast.error('Telefone inválido. Digite no mínimo 10 números (com DDD).'); return; }
    if (newWhatsapp && newWhatsapp.length < 10) { toast.error('WhatsApp inválido. Digite no mínimo 10 números (com DDD).'); return; }
    if (newDocument && newDocument.length !== 11 && newDocument.length !== 14) { toast.error('CPF ou CNPJ inválido.'); return; }
    if (newDocument && clients.some(c => c.document === newDocument)) { toast.error('Este CPF/CNPJ já está cadastrado.'); return; }
    if (newPhone) {
      const cleanNewPhone = cleanPhone(newPhone);
      if (clients.some(c => c.phone && cleanPhone(c.phone) === cleanNewPhone)) {
        toast.error('Este número de telefone já está cadastrado.');
        return;
      }
    }
    const client = await addClient({
      name: newName.toUpperCase(),
      document: newDocument ? maskCPFCNPJ(newDocument) : '',
      phone: newPhone ? maskPhone(newPhone) : '',
      phone2: newPhone2 ? maskPhone(newPhone2) : '',
      whatsapp: newWhatsapp ? maskPhone(newWhatsapp) : '',
      city: newCity,
      clientType: newClientType,
      nickname: newNickname.trim().toUpperCase(),
      defaultMechanicId: newClientType === 'regular' ? newDefaultMechanicId : '',
    });
    toast.success('Cliente cadastrado com sucesso!');
    setIsModalOpen(false);
    onSelectClient(client.id);
    resetForm();
  };

  const filteredClients = useMemo(() => {
    const onlyNumbers = (value = "") => String(value).replace(/\D/g, "");
    const normalizeText = (value = "") =>
      String(value)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();

    const queryText = normalizeText(debouncedSearchTerm);
    const queryNumbers = onlyNumbers(debouncedSearchTerm);

    return (clients || [])
      .filter(c => {
        if (!c) return false;
        if (typeFilter === 'regular' && c.clientType === 'mechanic') return false;
        if (typeFilter === 'mechanic' && c.clientType !== 'mechanic') return false;
        if (typeFilter === 'debtors' && !((balances.get(c.id)?.balance || 0) > 0)) return false;
        const name = normalizeText(c.name || "");
        const nickname = normalizeText(c.nickname || "");
        const doc = onlyNumbers(c.document || "");
        const phone = onlyNumbers(c.phone || "");
        const whatsapp = onlyNumbers(c.whatsapp || "");

        const matchesName = name.includes(queryText) || nickname.includes(queryText);
        const matchesDoc = queryNumbers !== "" && doc.includes(queryNumbers);
        const matchesPhone = queryNumbers !== "" && (phone.includes(queryNumbers) || whatsapp.includes(queryNumbers));

        return matchesName || matchesDoc || matchesPhone;
      })
      .sort((a, b) => {
        const nameA = a?.name || '';
        const nameB = b?.name || '';

        if (queryText) {
          const normNameA = normalizeText(nameA);
          const normNickA = normalizeText(a?.nickname || '');
          const normNameB = normalizeText(nameB);
          const normNickB = normalizeText(b?.nickname || '');

          const startsA = normNameA.startsWith(queryText) || normNickA.startsWith(queryText);
          const startsB = normNameB.startsWith(queryText) || normNickB.startsWith(queryText);

          if (startsA && !startsB) return -1;
          if (!startsA && startsB) return 1;
        }

        return nameA.localeCompare(nameB, 'pt-BR');
      });
  }, [clients, debouncedSearchTerm, typeFilter, balances]);

  const itemData = useMemo(() => ({
    filteredClients,
    balances,
    selectedClientId,
    onSelectClient,
  }), [filteredClients, balances, selectedClientId, onSelectClient]);

  return (
    <div className="lg:col-span-2 flex flex-col gap-4 min-w-0">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Clientes</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground"><span className="font-bold text-foreground tabular-nums">{clients.length}</span> cadastrados</span>
          <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger render={
              <Button size="sm" className="font-bold gap-2 solid-btn rounded-lg text-xs h-8">
                <Plus className="w-4 h-4" />
                Adicionar Cliente
              </Button>
            } />
            <DialogContent showCloseButton={false} className={clientDialogClass}>
              <ClientDialogHeader title="Novo Cliente" subtitle="Cadastre um novo cliente no sistema." onClose={() => setIsModalOpen(false)} />
              <form onSubmit={handleAddClient} className="flex flex-col min-h-0 flex-1">
                <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-4 space-y-3">
                  <FormSection icon={User} title="Dados principais" hint="Informações básicas do cliente.">
                    <div className="space-y-1.5">
                      <FieldLabel htmlFor="name" required>Nome completo</FieldLabel>
                      <IconField icon={User}>
                        <Input id="name" placeholder="Digite o nome completo do cliente" value={newName} onChange={e => setNewName(e.target.value.toUpperCase())} className={cn(iconInputClass, 'uppercase placeholder:normal-case')} autoFocus />
                      </IconField>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <FieldLabel htmlFor="nickname" optional>Apelido / Nome fantasia</FieldLabel>
                        <IconField icon={Tag}>
                          <Input id="nickname" placeholder="Apelido ou nome fantasia" value={newNickname} onChange={e => setNewNickname(e.target.value.toUpperCase())} className={cn(iconInputClass, 'uppercase placeholder:normal-case')} />
                        </IconField>
                      </div>
                      <div className="space-y-1.5">
                        <FieldLabel htmlFor="document" optional>CPF/CNPJ</FieldLabel>
                        <IconField icon={FileText}>
                          <MaskedInput id="document" placeholder="000.000.000-00" value={newDocument} mask={maskCPFCNPJ} unmask={cleanNumeric} onValueChange={setNewDocument} className={iconInputClass} />
                        </IconField>
                      </div>
                    </div>
                  </FormSection>

                  <FormSection icon={Phone} title="Contatos" hint="Pelo menos um telefone facilita o atendimento.">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <FieldLabel htmlFor="phone" optional>Telefone</FieldLabel>
                        <IconField icon={Phone}>
                          <MaskedInput id="phone" placeholder="(00) 00000-0000" value={newPhone} mask={maskPhone} unmask={cleanPhone} onValueChange={setNewPhone} className={iconInputClass} />
                        </IconField>
                      </div>
                      <div className="space-y-1.5">
                        <FieldLabel htmlFor="phone2" optional>Telefone 2</FieldLabel>
                        <IconField icon={Phone}>
                          <MaskedInput id="phone2" placeholder="(11) 99999-9999" value={newPhone2} mask={maskPhone} unmask={cleanPhone} onValueChange={setNewPhone2} className={iconInputClass} />
                        </IconField>
                      </div>
                      <div className="space-y-1.5">
                        <FieldLabel htmlFor="whatsapp" optional>WhatsApp</FieldLabel>
                        <IconField icon={MessageCircle}>
                          <MaskedInput id="whatsapp" placeholder="(00) 00000-0000" value={newWhatsapp} mask={maskPhone} unmask={cleanPhone} onValueChange={setNewWhatsapp} className={iconInputClass} />
                        </IconField>
                      </div>
                    </div>
                  </FormSection>

                  <FormSection icon={MapPin} title="Localização" hint="Cidade do cliente.">
                    <div className="space-y-1.5">
                      <FieldLabel htmlFor="city" optional>Cidade</FieldLabel>
                      <IconField icon={MapPin}>
                        <Input id="city" placeholder="Ex: Curitiba - PR" value={newCity} onChange={e => setNewCity(e.target.value)} className={iconInputClass} />
                      </IconField>
                    </div>
                  </FormSection>

                  <FormSection icon={Users} title="Tipo de cliente" description="Selecione o tipo para aplicar as configurações corretas.">
                    <ClientTypeToggle value={newClientType} onChange={setNewClientType} />
                  </FormSection>
                </div>
                <ClientDialogFooter onCancel={() => setIsModalOpen(false)} />
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="relative flex items-center">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/50 pointer-events-none" />
        <Input 
          placeholder="Buscar nome, apelido, telefone ou CPF/CNPJ" 
          className="pl-9 pr-9 premium-input rounded-lg h-9 text-sm w-full" 
          value={searchTerm} 
          onChange={e => setSearchTerm(e.target.value)} 
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground/50 hover:text-foreground transition-colors flex items-center justify-center"
            aria-label="Limpar pesquisa"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar clientes">
        {([
          ['all', 'Todos'],
          ['regular', 'Clientes'],
          ['mechanic', 'Mecânicos'],
          ['debtors', 'Devendo'],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTypeFilter(value)}
            aria-pressed={typeFilter === value}
            className={cn(
              "h-8 px-3 rounded-lg text-sm font-semibold border transition-colors",
              typeFilter === value
                ? "bg-foreground text-background border-foreground"
                : "bg-card text-muted-foreground border-border hover:text-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div ref={containerRef} className="flex-1 rounded-lg border bg-card border-border shadow-sm min-h-0">
        {filteredClients.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground/50 italic text-xs">Nenhum cliente encontrado.</div>
        ) : (
          height > 0 && (
            <List<ClientRowData>
              rowCount={filteredClients.length}
              rowHeight={70}
              rowComponent={ClientRow as any}
              rowProps={itemData}
              style={{ height, width: '100%', overscrollBehavior: 'contain' }}
            />
          )
        )}
      </div>
    </div>
  );
});

ClientList.displayName = 'ClientList';

// ═══ CLIENT DETAILS COMPONENT ═══

interface ClientDetailsContentProps {
  balances: Map<string, ClientBalance>;
  onNewOrder?: (clientId: string) => void;
  selectedClientId: string;
  clients: Client[];
  orders: Order[];
  deleteClient: (id: string) => Promise<void>;
  updateClient: (id: string, updates: Partial<Omit<Client, 'id'>>) => Promise<void>;
  deleteOrder: (id: number) => Promise<void>;
  updateOrder: (id: number, updates: Partial<Order>) => Promise<void>;
  onEdit?: (order: Order) => void;
}

const ClientDetailsContent = React.memo(({
  selectedClientId,
  clients,
  orders,
  deleteClient,
  updateClient,
  deleteOrder,
  updateOrder,
  onEdit,
  balances,
  onNewOrder
}: ClientDetailsContentProps) => {

  // ═══ 2. CLIENT LOOKUP ═══
  const selectedClient = clients.find(c => c.id === selectedClientId);

  // ═══ 3. ORDER FILTERING & CALCULATIONS (Memoized to prevent scroll recalculation) ═══
  const clientOrders = useMemo(() => {
    if (selectedClient?.clientType === 'mechanic') {
      return orders.filter(o => o.clientId === selectedClientId || o.mechanicId === selectedClientId);
    }
    return orders.filter(o => o.clientId === selectedClientId);
  }, [orders, selectedClientId, selectedClient?.clientType]);

  const activeOrdersCount = useMemo(() => {
    return clientOrders.filter(o => !o.finished).length;
  }, [clientOrders]);

  const totalInvestment = useMemo(() => {
    return clientOrders.reduce((acc, o) => acc + o.netValue, 0);
  }, [clientOrders]);

  const openBalance = balances.get(selectedClientId)?.balance || 0;

  // ═══ 4. STATES & REFS ═══
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDocument, setEditDocument] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPhone2, setEditPhone2] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editClientType, setEditClientType] = useState<'regular' | 'mechanic'>('regular');
  const [editNickname, setEditNickname] = useState('');
  const [editDefaultMechanicId, setEditDefaultMechanicId] = useState('');
  const [editMechSearch, setEditMechSearch] = useState('');
  const [isEditMechDropdownOpen, setIsEditMechDropdownOpen] = useState(false);

  const mechanics = useMemo(() => {
    return (clients || []).filter(c => c && c.clientType === 'mechanic');
  }, [clients]);

  const filteredEditMech = useMemo(() => {
    const q = editMechSearch.toLowerCase().trim();
    if (!q) return mechanics;
    return mechanics.filter(m => 
      (m.name || '').toLowerCase().includes(q) || 
      (m.nickname || '').toLowerCase().includes(q)
    );
  }, [mechanics, editMechSearch]);

  const editMechContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (editMechContainerRef.current && !editMechContainerRef.current.contains(event.target as Node)) {
        setIsEditMechDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const detailsRef = useRef<HTMLDivElement>(null);

  // Scroll to top on client change
  useEffect(() => {
    if (selectedClientId && detailsRef.current) {
      detailsRef.current.scrollTo({ top: 0 });
    }
  }, [selectedClientId]);

  if (!selectedClient) {
    return (
      <div className="lg:col-span-3 flex items-center justify-center text-muted-foreground/50 border border-dashed border-border rounded-lg p-12 text-center bg-card/50">
        <div className="client-empty-state">
          Selecione um cliente para ver os detalhes
        </div>
      </div>
    );
  }

  const handleOpenViewModal = (order: Order) => {
    setSelectedOrder(order);
    setIsViewModalOpen(true);
  };

  const { getGroupedPaymentForOrder } = useStore();
  const { confirm } = useConfirmDialog();

  const handleDeleteOrder = async (id: number) => {
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

  const cleanNumeric = (v: string) => v.replace(/\D/g, "").slice(0, 14);
  const cleanPhone = (v: string) => v.replace(/\D/g, "").slice(0, 11);

  const openEditModal = (client: Client) => {
    setEditName(client.name);
    setEditDocument(client.document ? client.document.replace(/\D/g, '') : '');
    setEditPhone(client.phone ? client.phone.replace(/\D/g, '') : '');
    setEditPhone2(client.phone2 ? client.phone2.replace(/\D/g, '') : '');
    setEditWhatsapp(client.whatsapp ? client.whatsapp.replace(/\D/g, '') : '');
    setEditCity(client.city || '');
    setEditClientType(client.clientType || 'regular');
    setEditNickname(client.nickname || '');
    setEditDefaultMechanicId(client.defaultMechanicId || '');
    const mech = clients.find(c => c.id === client.defaultMechanicId);
    setEditMechSearch(mech ? mech.name : '');
    setIsEditModalOpen(true);
  };

  const handleEditClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName) { toast.error('O nome do cliente é obrigatório.'); return; }
    if (editPhone && editPhone.length < 10) { toast.error('Telefone inválido. Digite no mínimo 10 números (com DDD).'); return; }
    if (editWhatsapp && editWhatsapp.length < 10) { toast.error('WhatsApp inválido. Digite no mínimo 10 números (com DDD).'); return; }
    if (editDocument && editDocument.length !== 11 && editDocument.length !== 14) { toast.error('CPF ou CNPJ inválido.'); return; }
    if (editDocument && clients.some(c => c.id !== selectedClient.id && c.document === maskCPFCNPJ(editDocument))) { toast.error('Este CPF/CNPJ já está cadastrado para outro cliente.'); return; }
    if (editPhone) {
      const cleanEditPhone = cleanPhone(editPhone);
      if (clients.some(c => c.id !== selectedClient.id && c.phone && cleanPhone(c.phone) === cleanEditPhone)) {
        toast.error('Este número de telefone já está cadastrado para outro cliente.');
        return;
      }
    }

    await updateClient(selectedClient.id, {
      name: editName.toUpperCase(),
      document: editDocument ? maskCPFCNPJ(editDocument) : '',
      phone: editPhone ? maskPhone(editPhone) : '',
      phone2: editPhone2 ? maskPhone(editPhone2) : '',
      whatsapp: editWhatsapp ? maskPhone(editWhatsapp) : '',
      city: editCity,
      clientType: editClientType,
      nickname: editNickname.trim().toUpperCase(),
      defaultMechanicId: editClientType === 'regular' ? editDefaultMechanicId : '',
    });
    setIsEditModalOpen(false);
  };

  return (
    <div ref={detailsRef} className="lg:col-span-3 space-y-6 overflow-y-auto pr-2 custom-scrollbar min-w-0">
      {/* Client Card */}
      <div className="rounded-lg border bg-card border-border shadow-sm overflow-hidden">
        <div className="bg-secondary/10 p-5 border-b border-border">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-secondary border border-border flex items-center justify-center text-foreground text-xl font-bold flex-shrink-0">
                {selectedClient.name.charAt(0)}
              </div>
              <div>
                {selectedClient.nickname && (
                  <p className="text-[13.5px] font-bold text-muted-foreground uppercase tracking-wide mb-0.5">{selectedClient.nickname}</p>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-extrabold text-foreground">{selectedClient.name}</h3>
                  {selectedClient.clientType === 'mechanic' ? (
                    <span className="h-[22px] text-xs font-extrabold tracking-wider bg-info/10 text-info border border-info/20 rounded-md px-2 flex items-center justify-center">MECÂNICO</span>
                  ) : (
                    <span className="h-[22px] text-xs font-extrabold tracking-wider bg-secondary text-secondary-foreground border border-border rounded-md px-2 flex items-center justify-center">CLIENTE</span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3.5 mt-2.5">
                  {selectedClient.document && (
                    <span className="flex items-center gap-1.5 font-mono text-xs border border-border rounded-md px-2.5 py-1 bg-background text-muted-foreground shadow-sm">
                      <CreditCard className="w-3.5 h-3.5 text-muted-foreground stroke-[1.5]" /> {maskCPFCNPJ(selectedClient.document)}
                    </span>
                  )}
                  {selectedClient.phone && <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground/90"><Phone className="w-3.5 h-3.5 text-muted-foreground stroke-[1.5]" /> {maskPhone(selectedClient.phone)}</span>}
                  {selectedClient.whatsapp && <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground/90"><MessageCircle className="w-3.5 h-3.5 text-success stroke-[1.5]" /> {maskPhone(selectedClient.whatsapp)}</span>}
                  {selectedClient.city && <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground/90"><MapPin className="w-3.5 h-3.5 text-muted-foreground stroke-[1.5]" /> {selectedClient.city}</span>}
                  {selectedClient.clientType === 'regular' && selectedClient.defaultMechanicId && (
                    (() => {
                      const m = clients.find(c => c.id === selectedClient.defaultMechanicId);
                      return m ? (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground border border-info/20 rounded-md px-2.5 py-1 bg-info/5 text-info">
                          <User className="w-3.5 h-3.5 stroke-[1.5]" /> Mecânico Padrão: {m.name}
                        </span>
                      ) : null;
                    })()
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <Button
                variant="ghost"
                onClick={() => setIsDeleteDialogOpen(true)}
                className="h-9 px-3 rounded-lg text-sm text-danger hover:bg-danger/10 gap-1.5"
              >
                <Trash2 className="w-4 h-4 stroke-[1.5]" /> Excluir
              </Button>
              <Button
                variant="outline"
                onClick={() => openEditModal(selectedClient)}
                className="h-9 px-3 rounded-lg text-sm gap-1.5"
              >
                <Pencil className="w-4 h-4 stroke-[1.5]" /> Editar
              </Button>
              {onNewOrder && (
                <Button
                  onClick={() => onNewOrder(selectedClient.id)}
                  className="solid-btn h-9 px-3 rounded-lg text-sm font-bold gap-1.5"
                >
                  <Plus className="w-4 h-4 stroke-[2]" /> Nova O.S.
                </Button>
              )}
            </div>
          </div>
        </div>
        <div className="p-5 grid grid-cols-2 xl:grid-cols-4 gap-3">
          <div className={cn("p-3 rounded-lg border", openBalance > 0 ? "bg-danger/5 border-danger/30" : "bg-secondary/15 border-border/80")}>
            <p className="text-xs font-semibold text-muted-foreground mb-0.5">Em aberto</p>
            <p className={cn("text-lg font-extrabold flex items-center gap-1.5 tabular-nums", openBalance > 0 ? "text-danger" : "text-foreground")}>
              <Wallet className="w-4 h-4 stroke-[1.5]" />
              {formatBRL(openBalance)}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-secondary/15 border border-border/80">
            <p className="text-xs font-semibold text-muted-foreground mb-0.5">Total de O.S.</p>
            <p className="text-lg font-extrabold text-foreground flex items-center gap-1.5">
              <HistoryIcon className="w-4 h-4 text-muted-foreground stroke-[1.5]" />
              {clientOrders.length}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-secondary/15 border border-border/80">
            <p className="text-xs font-semibold text-muted-foreground mb-0.5">Total em serviços</p>
            <p className="text-lg font-extrabold text-success flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 stroke-[1.5]" />
              {totalInvestment.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-secondary/15 border border-border/80">
            <p className="text-xs font-semibold text-muted-foreground mb-0.5">O.S. abertas</p>
            <p className="text-lg font-extrabold text-warning">
              {activeOrdersCount}
            </p>
          </div>
        </div>
      </div>

      {/* Client Orders */}
      <div className="space-y-3">
        <h3 className="text-sm font-extrabold flex items-center gap-1.5 text-foreground">
          <HistoryIcon className="w-4 h-4 text-muted-foreground stroke-[1.5]" />
          Ordens de serviço
        </h3>
        <div className="rounded-lg border bg-card border-border shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-secondary/10">
              <TableRow className="border-border">
                <TableHead className="w-[100px] font-semibold text-xs uppercase tracking-wide text-muted-foreground">Nº O.S.</TableHead>
                {selectedClient?.clientType === 'mechanic' ? (
                  <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Cliente / Motor</TableHead>
                ) : (
                  <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Motor / Mecânico</TableHead>
                )}
                <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Data</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Status</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Pagamento</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientOrders.length === 0 ? (
                <TableRow>
                  <TableCell 
                    colSpan={6} 
                    className="h-32 text-center text-muted-foreground/50 italic text-xs"
                  >
                    Este cliente ainda não possui ordens de serviço.
                  </TableCell>
                </TableRow>
              ) : (
                clientOrders.map((order) => (
                  <TableRow 
                    key={order.id} 
                    className="border-border hover:bg-secondary/10 cursor-pointer transition-all"
                    onClick={() => handleOpenViewModal(order)}
                  >
                    <TableCell className="font-mono font-bold text-foreground text-sm">#{order.osNumber || order.id}</TableCell>
                    {selectedClient?.clientType === 'mechanic' ? (
                      <TableCell className="text-xs text-foreground/80 font-semibold">
                        {order.clientId !== selectedClientId ? (
                          <>
                            <div className="font-extrabold text-foreground text-xs uppercase tracking-wide truncate">
                              {(() => {
                                const oClient = clients.find(c => c.id === order.clientId);
                                if (oClient) {
                                  return oClient.nickname 
                                    ? `${oClient.nickname.toUpperCase()} (${oClient.name})` 
                                    : oClient.name;
                                }
                                return order.clientNickname || 'Cliente Removido';
                              })()}
                            </div>
                            <div className="text-xs text-muted-foreground font-semibold truncate uppercase mt-0.5">
                              {formatMotorModelAndCylinders(order.motorModel)}
                              {order.displacement && order.displacement.trim() && (
                                <span className="text-muted-foreground/60 font-normal ml-1">
                                  ({order.displacement})
                                </span>
                              )}
                            </div>
                          </>
                        ) : (
                          <>
                            {formatMotorModelAndCylinders(order.motorModel)}
                            {order.displacement && order.displacement.trim() && (
                              <span className="text-muted-foreground/60 font-normal ml-1">
                                  ({order.displacement})
                              </span>
                            )}
                          </>
                        )}
                      </TableCell>
                    ) : (
                      <TableCell className="text-sm text-foreground/90 font-semibold whitespace-normal">
                        <div>
                          {formatMotorModelAndCylinders(order.motorModel)}
                          {order.displacement && order.displacement.trim() && (
                            <span className="text-muted-foreground font-normal ml-1">({order.displacement})</span>
                          )}
                        </div>
                        {(() => {
                          if (!order.mechanicId) return null;
                          const mech = clients.find(c => c.id === order.mechanicId);
                          const label = mech ? (mech.nickname || mech.name) : (order.mechanicNickname || order.mechanicName);
                          return label ? <div className="text-xs text-muted-foreground font-normal">Mecânico: {label}</div> : null;
                        })()}
                      </TableCell>
                    )}
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{(order.arrivalDate || order.createdAt.slice(0, 10)).split('-').reverse().join('/')}</TableCell>
                    <TableCell>
                      <ServiceStatusBadge status={order.serviceStatus} finished={order.finished} />
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const group = getGroupedPaymentForOrder(order.id);
                        const p = getOrderPaymentSummary(order, group);
                        return (
                          <div className="flex flex-col items-start gap-0.5">
                            <PaymentBadge situation={p.situation} grouped={!!group} />
                            {p.situation !== 'pago' && (
                              <span className="text-xs font-semibold text-danger whitespace-nowrap">falta {formatBRL(p.balance)}{group ? ' (grupo)' : ''}</span>
                            )}
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-foreground/80 text-sm whitespace-nowrap">
                      {order.netValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ═══ DELETE CONFIRMATION DIALOG ═══ */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-lg bg-popover border-border">
          <DialogHeader>
            <DialogTitle className="text-md font-extrabold flex items-center gap-2 text-foreground">
              <AlertTriangle className="w-5 h-5 text-danger" />
              Excluir Cliente
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-xs text-muted-foreground">
              Tem certeza que deseja excluir o cliente <span className="font-bold text-foreground">{selectedClient?.name}</span>?
            </p>
            {clientOrders.length > 0 && (
              <div className="p-3 rounded-lg bg-danger/5 border border-danger/20 space-y-1">
                <div className="flex items-center gap-1.5 text-danger font-bold text-xs">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Cliente possui {clientOrders.length} O.S. vinculada(s)
                </div>
                <p className="text-xs text-muted-foreground">
                  Remova ou transfira as ordens de serviço antes de excluir este cliente.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDeleteDialogOpen(false)} className="border-border text-muted-foreground hover:bg-secondary/40 rounded-lg text-xs h-9">
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={clientOrders.length > 0}
              onClick={async () => {
                await deleteClient(selectedClient.id);
                setIsDeleteDialogOpen(false);
              }}
              className="bg-danger hover:bg-danger/90 text-danger-foreground font-bold rounded-lg text-xs h-9 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {clientOrders.length > 0 ? 'Impossível Excluir' : 'Excluir Cliente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-lg bg-popover border-border">
          <DialogHeader>
            <DialogTitle className="text-md font-extrabold flex items-center gap-2 text-foreground">
              <Pencil className="w-5 h-5 text-foreground stroke-[1.5]" />
              Editar Cliente
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditClient} className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="edit-name" className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Nome completo</Label>
                <Input id="edit-name" placeholder="Nome completo" value={editName} onChange={e => setEditName(e.target.value.toUpperCase())} className="premium-input uppercase placeholder:normal-case text-xs h-9 rounded-lg" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="edit-nickname" className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Apelido / Nome Fantasia (Opcional)</Label>
                <Input id="edit-nickname" placeholder="Apelido ou nome fantasia" value={editNickname} onChange={e => setEditNickname(e.target.value.toUpperCase())} className="premium-input uppercase placeholder:normal-case text-xs h-9 rounded-lg" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="edit-document" className="text-muted-foreground text-xs font-bold uppercase tracking-wider">CPF/CNPJ (Opcional)</Label>
                <MaskedInput id="edit-document" placeholder="000.000.000-00" value={editDocument} mask={maskCPFCNPJ} unmask={cleanNumeric} onValueChange={setEditDocument} className="premium-input text-xs h-9 rounded-lg" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone" className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Telefone (Opcional)</Label>
                <MaskedInput id="edit-phone" placeholder="(00) 00000-0000" value={editPhone} mask={maskPhone} unmask={cleanPhone} onValueChange={setEditPhone} className="premium-input text-xs h-9 rounded-lg" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone2" className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Telefone 2 (Opcional)</Label>
                <MaskedInput id="edit-phone2" placeholder="(11) 99999-9999" value={editPhone2} mask={maskPhone} unmask={cleanPhone} onValueChange={setEditPhone2} className="premium-input text-xs h-9 rounded-lg" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-whatsapp" className="text-muted-foreground text-xs font-bold uppercase tracking-wider">WhatsApp (Opcional)</Label>
                <MaskedInput id="edit-whatsapp" placeholder="(00) 00000-0000" value={editWhatsapp} mask={maskPhone} unmask={cleanPhone} onValueChange={setEditWhatsapp} className="premium-input text-xs h-9 rounded-lg" />
              </div>
              <div className="space-y-2 col-span-1 md:col-span-2">
                <Label htmlFor="edit-city" className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Cidade (Opcional)</Label>
                <Input id="edit-city" placeholder="Ex: Curitiba - PR" value={editCity} onChange={e => setEditCity(e.target.value)} className="premium-input text-xs h-9 rounded-lg" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Tipo de Cliente</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditClientType('regular')}
                    className={cn(
                      "flex-1 h-9 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all",
                      editClientType === 'regular'
                        ? "bg-secondary text-foreground border-border"
                        : "bg-transparent text-muted-foreground/60 border-border/40 hover:bg-secondary/40"
                    )}
                  >
                    CLIENTE
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditClientType('mechanic')}
                    className={cn(
                      "flex-1 h-9 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all",
                      editClientType === 'mechanic'
                        ? "bg-info/10 text-info border-info/30"
                        : "bg-transparent text-muted-foreground/60 border-border/40 hover:bg-secondary/40"
                    )}
                  >
                    MECÂNICO
                  </button>
                </div>
              </div>
              {editClientType === 'regular' && (
                <div ref={editMechContainerRef} className="space-y-2 md:col-span-2 relative">
                  <Label htmlFor="edit-default-mechanic" className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Mecânico Padrão (Opcional)</Label>
                  <div className="relative">
                    <Input
                      id="edit-default-mechanic"
                      placeholder="Pesquisar por nome ou apelido..."
                      value={editMechSearch}
                      onChange={(e) => {
                        setEditMechSearch(e.target.value);
                        setIsEditMechDropdownOpen(true);
                        if (!e.target.value) {
                          setEditDefaultMechanicId('');
                        }
                      }}
                      onFocus={() => setIsEditMechDropdownOpen(true)}
                      onBlur={() => {
                        setTimeout(() => {
                          setIsEditMechDropdownOpen(false);
                          if (editDefaultMechanicId) {
                            const foundMech = clients.find(c => c.id === editDefaultMechanicId);
                            if (foundMech) {
                              setEditMechSearch(foundMech.nickname ? `${foundMech.nickname.toUpperCase()} (${foundMech.name})` : foundMech.name);
                            }
                          }
                        }, 150);
                      }}
                      className="premium-input text-xs h-9 rounded-lg w-full"
                    />
                    {isEditMechDropdownOpen && (
                      <div className="absolute z-[1200] w-full mt-1 max-h-[160px] overflow-y-auto bg-card border border-border rounded-lg shadow-lg">
                        {filteredEditMech.length === 0 ? (
                          <div className="p-2 text-xs text-muted-foreground/60 italic text-center">Nenhum mecânico encontrado</div>
                        ) : (
                          filteredEditMech.map((mech) => {
                            const selectedName = mech.nickname ? `${mech.nickname.toUpperCase()} (${mech.name})` : mech.name;
                            const handleSelect = () => {
                              setEditDefaultMechanicId(mech.id);
                              setEditMechSearch(selectedName);
                              setIsEditMechDropdownOpen(false);
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
                                className="w-full text-left px-3 py-2 text-xs hover:bg-secondary text-foreground font-semibold"
                              >
                                {mech.name} {mech.nickname ? `(${mech.nickname})` : ''}
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter className="pt-4 flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setIsDeleteDialogOpen(true);
                }}
                className="text-danger hover:text-danger/90 hover:bg-danger/10 rounded-lg text-xs h-9 font-bold gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5 stroke-[1.5]" />
                Excluir Cliente
              </Button>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)} className="border-border text-muted-foreground hover:bg-secondary/40 rounded-lg text-xs h-9">Cancelar</Button>
                <Button type="submit" className="solid-btn font-bold rounded-lg text-xs h-9">Salvar Alterações</Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ═══ CONFIRM DELETE CLIENT DIALOG ═══ */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-lg bg-popover border-border">
          <DialogHeader>
            <DialogTitle className="text-md font-extrabold flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5 stroke-[1.5]" />
              Confirmar Exclusão de Cliente
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 text-xs space-y-2 text-muted-foreground">
            <p>Deseja realmente excluir o cliente <strong className="text-foreground">{selectedClient.name}</strong>?</p>
            <p className="font-bold text-destructive">Esta ação é permanente e não poderá ser desfeita.</p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              className="border-border text-muted-foreground hover:bg-secondary/40 rounded-lg text-xs h-9"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={async () => {
                setIsDeleteDialogOpen(false);
                await deleteClient(selectedClient.id);
              }}
              className="font-bold rounded-lg text-xs h-9"
            >
              Confirmar Exclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ SERVICE ORDER VIEW MODAL ═══ */}
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
            handleDeleteOrder(id);
          }}
        />
      )}
    </div>
  );
});

ClientDetailsContent.displayName = 'ClientDetailsContent';

interface ClientDetailsProps {
  selectedClientId: string | null;
  balances: Map<string, ClientBalance>;
  onNewOrder?: (clientId: string) => void;
  clients: Client[];
  orders: Order[];
  deleteClient: (id: string) => Promise<void>;
  updateClient: (id: string, updates: Partial<Omit<Client, 'id'>>) => Promise<void>;
  deleteOrder: (id: number) => Promise<void>;
  updateOrder: (id: number, updates: Partial<Order>) => Promise<void>;
  onEdit?: (order: Order) => void;
}

const ClientDetails = React.memo((props: ClientDetailsProps) => {
  if (!props.selectedClientId) {
    return (
      <div className="lg:col-span-3 flex items-center justify-center text-muted-foreground/50 border border-dashed border-border rounded-lg p-12 text-center bg-card/50">
        <div className="client-empty-state">
          Selecione um cliente para ver os detalhes
        </div>
      </div>
    );
  }

  return (
    <ClientDetailsContent
      {...props}
      selectedClientId={props.selectedClientId}
    />
  );
});

ClientDetails.displayName = 'ClientDetails';

// ═══ MAIN BASE COMPONENT ═══

interface ClientsProps {
  onEdit?: (order: Order) => void;
  onView?: (order: Order) => void;
  onNewOrder?: (clientId: string) => void;
}

export function Clients({ onEdit, onView, onNewOrder }: ClientsProps = {}) {
  const { 
    clients, 
    orders, 
    addClient, 
    updateClient, 
    deleteClient, 
    updateOrder,
    deleteOrder,
    groupedPayments,
    getGroupedPaymentForOrder
  } = useStore();

  const balances = useMemo(
    () => buildClientBalances(orders, getGroupedPaymentForOrder),
    // groupedPayments muda quando um pagamento agrupado é lançado
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orders, groupedPayments, getGroupedPaymentForOrder]
  );

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const handleSelectClient = useCallback((id: string) => {
    setSelectedClientId(id);
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-[calc(100vh-120px)] relative z-10">
      <ClientList
        clients={clients}
        balances={balances}
        selectedClientId={selectedClientId}
        onSelectClient={handleSelectClient}
        addClient={addClient}
      />
      <ClientDetails
        selectedClientId={selectedClientId}
        clients={clients}
        orders={orders}
        deleteClient={deleteClient}
        updateClient={updateClient}
        deleteOrder={deleteOrder}
        updateOrder={updateOrder}
        onEdit={onEdit}
        balances={balances}
        onNewOrder={onNewOrder}
      />
    </div>
  );
}
