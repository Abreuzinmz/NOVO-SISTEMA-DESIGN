'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { runMotorsMigration } from '@/lib/motors';
import { getLocalDateString, getOrderNetValue } from './utils';


interface ElectronAPI {
  dbQuery: (sql: string, params?: any[]) => Promise<any[]>;
  dbRun: (sql: string, params?: any[]) => Promise<{ changes: number; lastInsertRowid: number }>;
  getAppVersion: () => Promise<string>;
  getDatabasePath?: () => Promise<string>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export type ServiceStatus = 'Na Fila' | 'Em Andamento' | 'Aguardando Peça' | 'Pronto' | 'Levou';
export type PaymentStatus = 'Não Pago' | 'Entrada' | 'Pago';
export type PaymentMethod = 'PIX' | 'Dinheiro' | 'Débito' | 'Crédito à Vista' | 'Crédito 2x' | 'Crédito 3x';

export interface ServiceItem {
  id: string;
  name: string;
  value: number;
  quantity: number;
  measure?: string;
  motorId?: string;
}

export interface MotorPrice {
  id: string;
  motorId: string;
  serviceId: string;
  subName: string;
  price: number;
  observation?: string;
}

export type GroupedPaymentStatus = 'aguardando_pagamento' | 'pagamento_parcial' | 'pago';

export interface EntradaPagamentoAgrupado {
  id: string;
  pagamentoAgrupadoId: string;
  valor: number;
  data: string;
  formaPagamento: string;
  nomePagador?: string;
  observacao?: string;
  createdAt?: string;
}

export interface PagamentoAgrupado {
  id: string;
  clientId: string;
  valorTotal: number;
  valorPago: number;
  status: GroupedPaymentStatus;
  createdAt: string;
  osIds: number[];
  entradas: EntradaPagamentoAgrupado[];
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  phone2?: string;
  document: string;
  whatsapp?: string;
  city?: string;
  clientType?: 'regular' | 'mechanic';
  nickname?: string;
  defaultMechanicId?: string;
}

export interface Order {
  id: number;
  clientId: string;
  mechanicId?: string;
  motorModel: string;
  displacement: string;
  serviceStatus: ServiceStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  paymentDate?: string;
  pixPaidBy?: string;
  secondPaymentMethod?: PaymentMethod;
  secondPaymentDate?: string;
  secondPixPaidBy?: string;
  entryValue?: number;
  balanceValue?: number;
  partsLeft: string[];
  additionalParts: string[];
  services: ServiceItem[];
  discount: number;
  totalValue: number;
  netValue: number;
  finished: boolean;
  deliveryDate?: string;
  arrivalDate?: string;
  observations: string;
  createdAt: string;
  paymentEntries?: any[];
  finishedAt?: string;
  updatedAt?: string;
  osNumber?: number;
  concludedIndex?: number;
  statusObservation?: string;
  clientNickname?: string;
  clientName?: string;
  mechanicName?: string;
  mechanicNickname?: string;
}

// ── Banco local (SQLite via Electron) ──
// Versão LOCAL de testes: o SQLite é a única fonte de dados, sem sincronização.

const LOCAL_DB_UNAVAILABLE = 'Banco de dados local indisponível. Abra o sistema pelo aplicativo desktop.';

const ORDERS_QUERY = "SELECT ordens_servico.*, clientes.nickname AS client_nickname, clientes.name AS client_name, mecanicos.nickname AS mechanic_nickname, mecanicos.name AS mechanic_name FROM ordens_servico LEFT JOIN clientes ON ordens_servico.client_id = clientes.id LEFT JOIN clientes AS mecanicos ON ordens_servico.mechanic_id = mecanicos.id WHERE ordens_servico.deleted_at IS NULL";

function getLocalDb(): ElectronAPI | null {
  return typeof window !== 'undefined' && window.electronAPI ? window.electronAPI : null;
}

function requireLocalDb(): ElectronAPI {
  const db = getLocalDb();
  if (!db) {
    toast.error(LOCAL_DB_UNAVAILABLE);
    throw new Error(LOCAL_DB_UNAVAILABLE);
  }
  return db;
}

function normalizePix(val: string): PaymentMethod | '' {
  return (val && val.toUpperCase() === 'PIX' ? 'PIX' : val) as PaymentMethod | '';
}

function normalizePaymentEntries(entries: any[] | undefined | null, osId?: number): any[] {
  if (!entries || !Array.isArray(entries)) return [];

  // Filter out consecutive duplicates within 2 seconds
  const filtered: any[] = [];
  for (let i = 0; i < entries.length; i++) {
    const current = entries[i];
    let isDuplicate = false;
    if (i > 0) {
      const prev = entries[i - 1];
      const curAmount = current.amount !== undefined ? Number(current.amount) || 0 : 0;
      const prevAmount = prev.amount !== undefined ? Number(prev.amount) || 0 : 0;
      const curMethod = normalizePix(current.method || '');
      const prevMethod = normalizePix(prev.method || '');
      const curDate = current.date || '';
      const prevDate = prev.date || '';
      const curPayer = (current.payer || '').trim().toUpperCase();
      const prevPayer = (prev.payer || '').trim().toUpperCase();

      if (curAmount > 0 && curAmount === prevAmount && curMethod === prevMethod && curDate === prevDate && curPayer === prevPayer) {
        // Compare creation times or default to current time
        const curTime = current.created_at ? new Date(current.created_at).getTime() : Date.now();
        const prevTime = prev.created_at ? new Date(prev.created_at).getTime() : Date.now();
        if (Math.abs(curTime - prevTime) < 2000) {
          isDuplicate = true;
        }
      }
    }
    if (!isDuplicate) {
      filtered.push(current);
    }
  }

  return filtered.map((e: any, index: number) => {
    const now = new Date().toISOString();
    return {
      ...e,
      id: e.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9)),
      os_id: e.os_id || osId || 0,
      amount: e.amount !== undefined ? Number(e.amount) || 0 : 0,
      method: normalizePix(e.method || ''),
      type: e.type || (filtered.length === 1 ? 'integral' : index === 0 ? 'entrada' : 'restante'),
      created_at: e.created_at || now,
      updated_at: e.updated_at || now,
      date: e.date || getLocalDateString(),
      payer: e.payer || '',
    };
  });
}

// ── SQLite mapping helpers ──

function clientFromSqlite(row: any): Client {
  return {
    id: row.id,
    name: row.name || '',
    phone: row.phone || '',
    phone2: row.phone2 || '',
    document: row.document || '',
    whatsapp: row.whatsapp || '',
    city: row.city || '',
    clientType: (row.client_type as 'regular' | 'mechanic') || 'regular',
    nickname: row.nickname || '',
    defaultMechanicId: row.default_mechanic_id || '',
  };
}

function orderFromSqlite(row: any): Order {
  let parsedPartsLeft: string[] = [];
  try {
    if (row.parts_left) parsedPartsLeft = JSON.parse(row.parts_left);
  } catch (e) {
    console.error("Failed to parse parts_left from sqlite", e);
  }

  let parsedAdditionalParts: string[] = [];
  try {
    if (row.additional_parts) parsedAdditionalParts = JSON.parse(row.additional_parts);
  } catch (e) {
    console.error("Failed to parse additional_parts from sqlite", e);
  }

  // Cada serviço mantém seu "motorId" (índice do motor em motor_model, ou 'all')
  let parsedServices: ServiceItem[] = [];
  try {
    if (row.services) parsedServices = JSON.parse(row.services);
  } catch (e) {
    console.error("Failed to parse services from sqlite", e);
  }

  let parsedEntries: any[] | undefined = undefined;
  const raw = row.payment_entries;
  if (raw != null) {
    if (Array.isArray(raw)) {
      parsedEntries = raw;
    } else if (typeof raw === 'string') {
      try { parsedEntries = JSON.parse(raw); } catch (e) { console.error("Failed to parse payment_entries from sqlite", e); }
    }
  }

  let finalEntries = parsedEntries
    ? parsedEntries.map((e: any) => ({
        ...e,
        method: normalizePix(e.method || ''),
      }))
    : undefined;

  if (row.payment_status === 'Não Pago') {
    finalEntries = [];
  } else if (row.payment_status === 'Pago') {
    if (!finalEntries || finalEntries.length === 0) {
      finalEntries = [{
        amount: Number(row.net_value) || 0,
        method: normalizePix(row.payment_method || 'PIX'),
        date: row.payment_date || getLocalDateString(),
        payer: row.pix_paid_by || '',
      }];
    } else if (finalEntries.length === 1) {
      const entryAmt = parseFloat(finalEntries[0].amount?.toString() || '0');
      if (isNaN(entryAmt) || entryAmt === 0) {
        finalEntries[0].amount = Number(row.net_value) || 0;
      }
    }
  }

  return {
    id: Number(row.id),
    clientId: row.client_id || '',
    mechanicId: row.mechanic_id || undefined,
    motorModel: row.motor_model || '',
    displacement: row.displacement || '',
    serviceStatus: (row.service_status as ServiceStatus) || 'Na Fila',
    paymentStatus: (row.payment_status as PaymentStatus) || 'Não Pago',
    paymentMethod: normalizePix(row.payment_method || '') || undefined,
    paymentDate: row.payment_date || undefined,
    pixPaidBy: row.pix_paid_by || '',
    secondPaymentMethod: normalizePix(row.second_payment_method || '') || undefined,
    secondPaymentDate: row.second_payment_date || undefined,
    secondPixPaidBy: row.second_pix_paid_by || '',
    entryValue: Number(row.entry_value) || 0,
    balanceValue: Number(row.balance_value) || 0,
    partsLeft: parsedPartsLeft,
    additionalParts: parsedAdditionalParts,
    services: parsedServices.map((s: any) => ({ ...s, quantity: s.quantity || 1 })),
    discount: Number(row.discount) || 0,
    totalValue: Number(row.total_value) || 0,
    netValue: Number(row.net_value) || 0,
    finished: !!row.finished,
    finishedAt: row.finished_at || undefined,
    deliveryDate: row.delivery_date || undefined,
    arrivalDate: row.arrival_date || undefined,
    observations: row.observations || '',
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || undefined,
    paymentEntries: finalEntries,
    osNumber: row.os_number ? Number(row.os_number) : undefined,
    concludedIndex: row.concluded_index ? Number(row.concluded_index) : undefined,
    statusObservation: row.status_observation || undefined,
    clientNickname: row.client_nickname || undefined,
    clientName: row.client_name || undefined,
    mechanicName: row.mechanic_name || undefined,
    mechanicNickname: row.mechanic_nickname || undefined,
  };
}

function motorPriceFromSqlite(row: any): MotorPrice {
  return {
    id: row.id,
    motorId: (row.motor_id || '').toUpperCase(),
    serviceId: row.service_id,
    subName: row.sub_name || '',
    price: Number(row.price) || 0,
    observation: row.observation || ''
  };
}

async function fetchGroupedPaymentsSqlite(db: ElectronAPI): Promise<PagamentoAgrupado[]> {
  const sqliteP = await db.dbQuery("SELECT * FROM pagamentos_agrupados");
  const sqlitePos = await db.dbQuery("SELECT * FROM pagamento_agrupado_os");
  const sqliteE = await db.dbQuery("SELECT * FROM entradas_pagamento_agrupado ORDER BY created_at ASC");

  return (sqliteP || []).map((row: any) => {
    const osIds = (sqlitePos || [])
      .filter((pos: any) => pos.pagamento_agrupado_id === row.id)
      .map((pos: any) => Number(pos.os_id));

    const entradas: EntradaPagamentoAgrupado[] = (sqliteE || [])
      .filter((e: any) => e.pagamento_agrupado_id === row.id)
      .map((e: any) => ({
        id: e.id,
        pagamentoAgrupadoId: e.pagamento_agrupado_id,
        valor: Number(e.valor) || 0,
        data: e.data || '',
        formaPagamento: e.forma_pagamento || '',
        nomePagador: e.nome_pagador || '',
        observacao: e.observacao || '',
        createdAt: e.created_at,
      }));

    return {
      id: row.id,
      clientId: row.cliente_id,
      valorTotal: Number(row.valor_total) || 0,
      valorPago: Number(row.valor_pago) || 0,
      status: (row.status as GroupedPaymentStatus) || 'aguardando_pagamento',
      createdAt: row.created_at,
      osIds,
      entradas,
    };
  });
}

function placeholders(count: number): string {
  return Array(count).fill('?').join(', ');
}

// ── Store Context ──

interface StoreContextType {
  clients: Client[];
  orders: Order[];
  addClient: (client: Omit<Client, 'id'>) => Promise<Client>;
  updateClient: (id: string, updates: Partial<Omit<Client, 'id'>>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  addOrder: (order: Omit<Order, 'id' | 'createdAt'> & { id?: number }) => Promise<void>;
  updateOrder: (id: number, updates: Partial<Order>) => Promise<void>;
  deleteOrder: (id: number, options?: { dissolveGroupIfOneLeft?: boolean }) => Promise<void>;
  isLoaded: boolean;
  fontSize: number;
  setFontSize: (size: number) => void;
  refreshClients: () => Promise<void>;
  motorPrices: MotorPrice[];
  saveMotorPrice: (motorId: string, serviceId: string, subName: string, price: number, observation?: string) => Promise<void>;
  deleteMotorPrice: (id: string) => Promise<void>;
  copyMotorPrices: (fromMotorId: string, toMotorId: string) => Promise<void>;
  resolveMotorName: (id: string) => string;
  resolveServiceId: (id: string) => string;
  groupedPayments: PagamentoAgrupado[];
  createGroupedPayment: (clientId: string, osIds: number[]) => Promise<PagamentoAgrupado>;
  addEntradaGroupedPayment: (pagamentoAgrupadoId: string, entrada: { valor: number; data: string; formaPagamento: string; nomePagador?: string; observacao?: string }) => Promise<void>;
  updateEntradaGroupedPayment: (pagamentoAgrupadoId: string, entradaId: string, entrada: { valor: number; data: string; formaPagamento: string; nomePagador?: string; observacao?: string }) => Promise<void>;
  deleteEntradaGroupedPayment: (pagamentoAgrupadoId: string, entradaId: string) => Promise<void>;
  getGroupedPaymentForOrder: (orderId: number) => PagamentoAgrupado | undefined;
  getPendingOrdersForClient: (clientId: string) => Order[];
  refreshGroupedPayments: () => Promise<void>;
  deleteGroupedPayment: (id: string) => Promise<void>;
  dissolveGroupedPayment: (id: string, options: { actionOnPaid: 'distribute' | 'discard' }) => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [groupedPayments, setGroupedPayments] = useState<PagamentoAgrupado[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const [fontSize, setFontSizeState] = useState<number>(16);
  const [motorPrices, setMotorPrices] = useState<MotorPrice[]>([]);

  // Load font size from localStorage and apply it on load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedFontSize = localStorage.getItem('retifica_font_size');
      if (savedFontSize) {
        const parsed = parseInt(savedFontSize, 10);
        if (!isNaN(parsed) && parsed >= 12 && parsed <= 20) {
          setFontSizeState(parsed);
          document.documentElement.style.setProperty('--system-font-size', `${parsed}px`);
        }
      } else {
        document.documentElement.style.setProperty('--system-font-size', '16px');
      }
    }
  }, []);

  const setFontSize = (size: number) => {
    setFontSizeState(size);
    if (typeof window !== 'undefined') {
      localStorage.setItem('retifica_font_size', size.toString());
      document.documentElement.style.setProperty('--system-font-size', `${size}px`);
    }
  };

  // ── Carregar dados do SQLite local ──
  useEffect(() => {
    async function loadData() {
      console.time('⏱️ [STORE LOAD] Total loadData() execution');
      const db = getLocalDb();

      if (!db) {
        console.warn(LOCAL_DB_UNAVAILABLE);
        toast.warning(LOCAL_DB_UNAVAILABLE);
        setIsLoaded(true);
        return;
      }

      // Garante motores/modelos padrão no primeiro uso e migra motores para modelos
      runMotorsMigration().catch(err => console.error('Motors migration on startup failed:', err));

      try {
        const sqliteClients = await db.dbQuery("SELECT * FROM clientes");
        const sqliteOrders = await db.dbQuery(ORDERS_QUERY);
        const sqlitePrices = await db.dbQuery("SELECT * FROM motor_services_prices");
        const sqliteGrouped = await fetchGroupedPaymentsSqlite(db);

        setClients(sqliteClients.map(clientFromSqlite));
        setOrders(sqliteOrders.map(orderFromSqlite));
        setMotorPrices(sqlitePrices.map(motorPriceFromSqlite));
        setGroupedPayments(sqliteGrouped);
      } catch (err: any) {
        console.error('Failed loading data from SQLite:', err);
        toast.error(`Erro ao carregar dados do banco local: ${err?.message || err}`);
      }

      setIsLoaded(true);
      console.timeEnd('⏱️ [STORE LOAD] Total loadData() execution');
    }

    loadData();
  }, []);

  // ── CRUD: Clientes ──

  const addClient = async (clientData: Omit<Client, 'id'>): Promise<Client> => {
    const db = requireLocalDb();
    const newId = crypto.randomUUID();

    // Normalize and trim client fields to avoid empty string unique constraint failures
    const normalizedClientData = {
      ...clientData,
      name: clientData.name,
      phone: clientData.phone?.trim() ? clientData.phone.trim() : '',
      phone2: clientData.phone2?.trim() ? clientData.phone2.trim() : '',
      document: clientData.document?.trim() ? clientData.document.trim() : '',
      whatsapp: clientData.whatsapp?.trim() ? clientData.whatsapp.trim() : '',
      city: clientData.city?.trim() ? clientData.city.trim() : '',
      clientType: clientData.clientType || 'regular',
      nickname: clientData.nickname?.trim() ? clientData.nickname.trim() : '',
      defaultMechanicId: clientData.defaultMechanicId || '',
    };
    const newClient: Client = { ...normalizedClientData, id: newId };

    try {
      await db.dbRun(
        `INSERT INTO clientes (id, name, phone, phone2, document, whatsapp, city, client_type, nickname, default_mechanic_id, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newId,
          newClient.name,
          newClient.phone || null,
          newClient.phone2 || null,
          newClient.document || null,
          newClient.whatsapp || null,
          newClient.city || null,
          newClient.clientType,
          newClient.nickname || null,
          newClient.defaultMechanicId || null,
          new Date().toISOString()
        ]
      );
      setClients((prev) => [...prev, newClient]);
      toast.success('Cliente adicionado com sucesso!');
      return newClient;
    } catch (err: any) {
      console.error('Error inserting client into SQLite:', err);
      toast.error('Erro ao salvar cliente.');
      throw err;
    }
  };

  const updateClient = async (id: string, updates: Partial<Omit<Client, 'id'>>): Promise<void> => {
    const db = requireLocalDb();

    // Trim/normalize updates before applying to state and DB
    const normalizedUpdates: Partial<Omit<Client, 'id'>> = { ...updates };
    if (updates.name !== undefined) normalizedUpdates.name = updates.name;
    if (updates.phone !== undefined) normalizedUpdates.phone = updates.phone?.trim() ? updates.phone.trim() : '';
    if (updates.phone2 !== undefined) normalizedUpdates.phone2 = updates.phone2?.trim() ? updates.phone2.trim() : '';
    if (updates.document !== undefined) normalizedUpdates.document = updates.document?.trim() ? updates.document.trim() : '';
    if (updates.whatsapp !== undefined) normalizedUpdates.whatsapp = updates.whatsapp?.trim() ? updates.whatsapp.trim() : '';
    if (updates.city !== undefined) normalizedUpdates.city = updates.city?.trim() ? updates.city.trim() : '';
    if (updates.clientType !== undefined) normalizedUpdates.clientType = updates.clientType || 'regular';
    if (updates.nickname !== undefined) normalizedUpdates.nickname = updates.nickname?.trim() ? updates.nickname.trim() : '';
    if (updates.defaultMechanicId !== undefined) normalizedUpdates.defaultMechanicId = updates.defaultMechanicId || '';

    // Optimistically update local state with normalized values
    setClients((prev) => prev.map((c) => (c.id === id ? { ...c, ...normalizedUpdates } : c)));

    try {
      const setClauses: string[] = [];
      const params: any[] = [];
      if (updates.name !== undefined) { setClauses.push("name = ?"); params.push(updates.name); }
      if (updates.phone !== undefined) { setClauses.push("phone = ?"); params.push(normalizedUpdates.phone || null); }
      if (updates.phone2 !== undefined) { setClauses.push("phone2 = ?"); params.push(normalizedUpdates.phone2 || null); }
      if (updates.document !== undefined) { setClauses.push("document = ?"); params.push(normalizedUpdates.document || null); }
      if (updates.whatsapp !== undefined) { setClauses.push("whatsapp = ?"); params.push(normalizedUpdates.whatsapp || null); }
      if (updates.city !== undefined) { setClauses.push("city = ?"); params.push(normalizedUpdates.city || null); }
      if (updates.clientType !== undefined) { setClauses.push("client_type = ?"); params.push(normalizedUpdates.clientType || 'regular'); }
      if (updates.nickname !== undefined) { setClauses.push("nickname = ?"); params.push(normalizedUpdates.nickname || null); }
      if (updates.defaultMechanicId !== undefined) { setClauses.push("default_mechanic_id = ?"); params.push(normalizedUpdates.defaultMechanicId || null); }

      setClauses.push("updated_at = ?"); params.push(new Date().toISOString());
      params.push(id);

      await db.dbRun(
        `UPDATE clientes SET ${setClauses.join(', ')} WHERE id = ?`,
        params
      );

      toast.info('Cliente atualizado com sucesso.');
    } catch (err: any) {
      console.error('Error updating client in SQLite:', err);
      toast.error('Erro ao atualizar cliente.');
      throw err;
    }
  };

  const deleteClient = async (id: string): Promise<void> => {
    const db = requireLocalDb();

    // 1. BLOQUEIO ESTRITO: Verificar se existem O.S. vinculadas a este cliente
    const res = await db.dbQuery(
      "SELECT COUNT(*) as cnt FROM ordens_servico WHERE client_id = ? AND deleted_at IS NULL",
      [id]
    );
    const osCount = res && res[0] ? Number(res[0].cnt) : 0;

    if (osCount > 0) {
      const targetClient = clients.find(c => c.id === id);
      const clientName = targetClient ? targetClient.name : 'selecionado';
      alert(
        `NÃO É POSSÍVEL EXCLUIR O CLIENTE "${clientName.toUpperCase()}".\n\n` +
        `Existem ${osCount} Ordem(ns) de Serviço vinculada(s) a este cliente no sistema.\n\n` +
        `Para evitar registros órfãos, você deve primeiro excluir ou desvincular as O.S. associadas a este cliente antes de removê-lo.`
      );
      return;
    }

    try {
      await db.dbRun("DELETE FROM clientes WHERE id = ?", [id]);
      setClients((prev) => prev.filter((c) => c.id !== id));
      toast.error('Cliente excluído com sucesso.');
    } catch (err) {
      console.error('Error deleting client in SQLite:', err);
      toast.error('Erro ao excluir cliente.');
      throw err;
    }
  };

  const refreshClients = useCallback(async (): Promise<void> => {
    const db = getLocalDb();
    if (!db) return;

    try {
      const sqliteClients = await db.dbQuery("SELECT * FROM clientes");
      setClients(sqliteClients.map(clientFromSqlite));
    } catch (err: any) {
      console.error('Failed refreshing clients from SQLite:', err);
    }
  }, []);

  // ── CRUD: Ordens de Serviço ──

  const addOrder = async (orderData: Omit<Order, 'id' | 'createdAt'> & { id?: number }): Promise<void> => {
    const db = requireLocalDb();
    let nextId = orderData.id;

    if (!nextId) {
      try {
        const dbMaxRes = await db.dbQuery("SELECT MAX(id) as maxId FROM ordens_servico");
        const maxDbId = dbMaxRes && dbMaxRes[0] && dbMaxRes[0].maxId != null ? Number(dbMaxRes[0].maxId) : 0;
        const maxStateId = orders.length > 0 ? Math.max(...orders.map(o => o.id)) : 0;
        let candidate = Math.max(maxDbId, maxStateId, 1000) + 1;

        let exists = await db.dbQuery("SELECT id FROM ordens_servico WHERE id = ?", [candidate]);
        while (exists && exists.length > 0) {
          candidate++;
          exists = await db.dbQuery("SELECT id FROM ordens_servico WHERE id = ?", [candidate]);
        }
        nextId = candidate;
      } catch (dbErr) {
        console.warn('Erro ao verificar MAX(id) no SQLite:', dbErr);
        nextId = orders.length > 0 ? Math.max(...orders.map(o => o.id)) + 1 : 1001;
      }
    } else {
      const existingDb = await db.dbQuery("SELECT id FROM ordens_servico WHERE id = ? AND deleted_at IS NULL", [nextId]);
      if ((existingDb && existingDb.length > 0) || orders.some(o => o.id === nextId)) {
        toast.error(`Número da O.S. #${nextId} já cadastrado`);
        throw new Error(`O.S. #${nextId} já existe`);
      }
    }

    const finishedAt = orderData.finished === true && !orderData.finishedAt
      ? new Date().toISOString()
      : orderData.finishedAt;

    const concludedIndex = orderData.finished === true
      ? Math.max(0, ...orders.map(o => o.concludedIndex || 0)) + 1
      : undefined;

    const targetClient = clients.find(c => c.id === orderData.clientId);
    const newOrder: Order = {
      ...orderData,
      id: nextId,
      osNumber: orderData.osNumber || nextId,
      createdAt: new Date().toISOString(),
      finishedAt,
      concludedIndex,
      updatedAt: new Date().toISOString(),
      clientNickname: targetClient?.nickname || undefined,
    };

    const columns = [
      'id', 'client_id', 'mechanic_id', 'motor_model', 'displacement', 'service_status', 'payment_status', 'payment_method',
      'payment_date', 'pix_paid_by', 'second_payment_method', 'second_payment_date', 'second_pix_paid_by',
      'entry_value', 'balance_value', 'parts_left', 'additional_parts', 'services', 'discount', 'total_value',
      'net_value', 'finished', 'finished_at', 'delivery_date', 'arrival_date', 'observations', 'payment_entries',
      'created_at', 'updated_at', 'os_number', 'concluded_index', 'status_observation'
    ];
    const values = [
      newOrder.id,
      newOrder.clientId,
      newOrder.mechanicId || null,
      newOrder.motorModel,
      newOrder.displacement,
      newOrder.serviceStatus,
      newOrder.paymentStatus,
      newOrder.paymentMethod || null,
      newOrder.paymentDate || null,
      newOrder.pixPaidBy || null,
      newOrder.secondPaymentMethod || null,
      newOrder.secondPaymentDate || null,
      newOrder.secondPixPaidBy || null,
      newOrder.entryValue || 0,
      newOrder.balanceValue || 0,
      JSON.stringify(newOrder.partsLeft),
      JSON.stringify(newOrder.additionalParts),
      JSON.stringify(newOrder.services),
      newOrder.discount || 0,
      newOrder.totalValue || 0,
      newOrder.netValue || 0,
      newOrder.finished ? 1 : 0,
      newOrder.finishedAt || null,
      newOrder.deliveryDate || null,
      newOrder.arrivalDate || null,
      newOrder.observations || '',
      JSON.stringify(newOrder.paymentEntries || []),
      newOrder.createdAt,
      new Date().toISOString(),
      newOrder.osNumber,
      newOrder.concludedIndex || null,
      newOrder.statusObservation || null
    ];

    try {
      await db.dbRun(
        `INSERT INTO ordens_servico (${columns.join(', ')}) VALUES (${placeholders(columns.length)})`,
        values
      );

      setOrders((prev) => [...prev, newOrder]);
      toast.success(`O.S. #${nextId} criada com sucesso!`);
    } catch (err: any) {
      console.error('Error inserting order into SQLite:', err);
      toast.error('Erro ao salvar O.S.');
      throw err;
    }
  };

  const updateOrder = async (id: number, updates: Partial<Order>): Promise<void> => {
    const db = requireLocalDb();
    const finalUpdates = { ...updates };
    const currentOrder = orders.find(o => o.id === id);

    if (updates.finished === true) {
      if (updates.finishedAt !== undefined) {
        finalUpdates.finishedAt = updates.finishedAt;
      } else if (currentOrder && currentOrder.finished) {
        // If it was already finished, preserve the original finishedAt timestamp
        finalUpdates.finishedAt = currentOrder.finishedAt;
      } else if (!updates.finishedAt) {
        // If it is being finished now, set the finishedAt timestamp
        finalUpdates.finishedAt = new Date().toISOString();
      }

      if (currentOrder && currentOrder.finished && currentOrder.concludedIndex) {
        finalUpdates.concludedIndex = currentOrder.concludedIndex;
      } else {
        finalUpdates.concludedIndex = Math.max(0, ...orders.map(o => o.concludedIndex || 0)) + 1;
      }
    } else if (updates.finished === false) {
      // If it is being moved back to active status, clear finishedAt and concludedIndex
      finalUpdates.finishedAt = null as any;
      finalUpdates.concludedIndex = null as any;
    }

    finalUpdates.updatedAt = new Date().toISOString();

    const updatedClientId = finalUpdates.clientId !== undefined ? finalUpdates.clientId : currentOrder?.clientId;
    if (updatedClientId !== undefined) {
      const targetClient = clients.find(c => c.id === updatedClientId);
      finalUpdates.clientNickname = targetClient?.nickname || undefined;
    }

    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...finalUpdates } : o)));

    try {
      const setClauses: string[] = [];
      const params: any[] = [];

      if (updates.clientId !== undefined) { setClauses.push("client_id = ?"); params.push(updates.clientId); }
      if (updates.mechanicId !== undefined) { setClauses.push("mechanic_id = ?"); params.push(updates.mechanicId || null); }
      if (updates.motorModel !== undefined) { setClauses.push("motor_model = ?"); params.push(updates.motorModel); }
      if (updates.displacement !== undefined) { setClauses.push("displacement = ?"); params.push(updates.displacement); }
      if (updates.serviceStatus !== undefined) { setClauses.push("service_status = ?"); params.push(updates.serviceStatus); }
      if (updates.paymentStatus !== undefined) { setClauses.push("payment_status = ?"); params.push(updates.paymentStatus); }
      if (updates.paymentMethod !== undefined) { setClauses.push("payment_method = ?"); params.push(normalizePix(updates.paymentMethod)); }
      if (updates.paymentDate !== undefined) { setClauses.push("payment_date = ?"); params.push(updates.paymentDate); }
      if (updates.pixPaidBy !== undefined) { setClauses.push("pix_paid_by = ?"); params.push(updates.pixPaidBy); }
      if (updates.secondPaymentMethod !== undefined) { setClauses.push("second_payment_method = ?"); params.push(normalizePix(updates.secondPaymentMethod)); }
      if (updates.secondPaymentDate !== undefined) { setClauses.push("second_payment_date = ?"); params.push(updates.secondPaymentDate); }
      if (updates.secondPixPaidBy !== undefined) { setClauses.push("second_pix_paid_by = ?"); params.push(updates.secondPixPaidBy); }
      if (updates.entryValue !== undefined) { setClauses.push("entry_value = ?"); params.push(updates.entryValue); }
      if (updates.balanceValue !== undefined) { setClauses.push("balance_value = ?"); params.push(updates.balanceValue); }
      if (updates.partsLeft !== undefined) { setClauses.push("parts_left = ?"); params.push(JSON.stringify(updates.partsLeft)); }
      if (updates.additionalParts !== undefined) { setClauses.push("additional_parts = ?"); params.push(JSON.stringify(updates.additionalParts)); }
      if (updates.services !== undefined) { setClauses.push("services = ?"); params.push(JSON.stringify(updates.services)); }
      if (updates.discount !== undefined) { setClauses.push("discount = ?"); params.push(updates.discount); }
      if (updates.totalValue !== undefined) { setClauses.push("total_value = ?"); params.push(updates.totalValue); }
      if (updates.netValue !== undefined) { setClauses.push("net_value = ?"); params.push(updates.netValue); }

      if (updates.finished !== undefined) {
        setClauses.push("finished = ?");
        params.push(updates.finished ? 1 : 0);
      }

      if (finalUpdates.finishedAt !== undefined) { setClauses.push("finished_at = ?"); params.push(finalUpdates.finishedAt); }
      if (finalUpdates.concludedIndex !== undefined) { setClauses.push("concluded_index = ?"); params.push(finalUpdates.concludedIndex); }
      if (updates.deliveryDate !== undefined) { setClauses.push("delivery_date = ?"); params.push(updates.deliveryDate); }
      if (updates.arrivalDate !== undefined) { setClauses.push("arrival_date = ?"); params.push(updates.arrivalDate); }
      if (updates.observations !== undefined) { setClauses.push("observations = ?"); params.push(updates.observations); }
      if (updates.paymentEntries !== undefined) { setClauses.push("payment_entries = ?"); params.push(JSON.stringify(normalizePaymentEntries(updates.paymentEntries, id))); }
      if (updates.osNumber !== undefined) { setClauses.push("os_number = ?"); params.push(updates.osNumber); }
      if (updates.statusObservation !== undefined) { setClauses.push("status_observation = ?"); params.push(updates.statusObservation || null); }

      setClauses.push("updated_at = ?"); params.push(new Date().toISOString());

      params.push(id);

      await db.dbRun(
        `UPDATE ordens_servico SET ${setClauses.join(', ')} WHERE id = ?`,
        params
      );

      toast.info(`O.S. #${id} atualizada.`);
    } catch (err: any) {
      console.error('Error updating order in SQLite:', err);
      toast.error('Erro ao atualizar O.S.');
      throw err;
    }
  };

  const deleteOrder = async (id: number, options?: { dissolveGroupIfOneLeft?: boolean }): Promise<void> => {
    const db = requireLocalDb();

    // 1. Limpeza de vínculo com Pagamento Agrupado (se pertencer a algum grupo)
    const targetGroup = groupedPayments.find(g => g.osIds.includes(id));
    if (targetGroup) {
      const remainingOsIds = targetGroup.osIds.filter(osId => osId !== id);

      if (remainingOsIds.length === 0 || (remainingOsIds.length === 1 && options?.dissolveGroupIfOneLeft)) {
        // Excluir o grupo por completo se 0 O.S. restantes ou se o usuário escolheu desfazer
        await deleteGroupedPayment(targetGroup.id);
      } else {
        // Remover apenas esta O.S. do grupo e recalcular o valor_total e status
        const remainingOrders = orders.filter(o => remainingOsIds.includes(o.id));
        const newValorTotal = remainingOrders.reduce((sum, o) => sum + getOrderNetValue(o), 0);

        let newStatus: GroupedPaymentStatus = 'aguardando_pagamento';
        if (targetGroup.valorPago >= newValorTotal && newValorTotal > 0) {
          newStatus = 'pago';
        } else if (targetGroup.valorPago > 0) {
          newStatus = 'pagamento_parcial';
        }

        const nowIso = new Date().toISOString();

        try {
          await db.dbRun("DELETE FROM pagamento_agrupado_os WHERE pagamento_agrupado_id = ? AND os_id = ?", [targetGroup.id, id]);
          await db.dbRun("UPDATE pagamentos_agrupados SET valor_total = ?, status = ?, updated_at = ? WHERE id = ?", [newValorTotal, newStatus, nowIso, targetGroup.id]);
        } catch (e) {
          console.error('Erro ao atualizar pagamento agrupado no SQLite:', e);
          toast.error('Erro ao atualizar o pagamento agrupado desta O.S.');
          throw e;
        }

        setGroupedPayments(prev => prev.map(g => {
          if (g.id === targetGroup.id) {
            return {
              ...g,
              valorTotal: newValorTotal,
              status: newStatus,
              osIds: remainingOsIds
            };
          }
          return g;
        }));
      }
    }

    // 2. Exclusão da O.S.
    try {
      await db.dbRun("DELETE FROM ordens_servico WHERE id = ?", [id]);

      // Apenas após sucesso no banco local, remove da tela
      setOrders((prev) => prev.filter((o) => o.id !== id));
      toast.error(`O.S. #${id} excluída.`);
    } catch (err) {
      console.error('Error deleting order in SQLite:', err);
      toast.error('Erro ao excluir O.S.');
      throw err;
    }
  };

  // ── Preços por motor ──
  // No banco local, motor_id é o nome do motor e service_id é o id do serviço do catálogo
  // (ou do serviço personalizado), então não há mapeamento de UUIDs a resolver.

  const upsertMotorPrice = async (db: ElectronAPI, item: MotorPrice) => {
    await db.dbRun(
      `INSERT INTO motor_services_prices (id, motor_id, service_id, sub_name, price, observation, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         motor_id = excluded.motor_id,
         service_id = excluded.service_id,
         sub_name = excluded.sub_name,
         price = excluded.price,
         observation = excluded.observation,
         updated_at = excluded.updated_at`,
      [item.id, item.motorId, item.serviceId, item.subName, item.price, item.observation || '', new Date().toISOString()]
    );
  };

  const saveMotorPrice = async (motorId: string, serviceId: string, subName: string, price: number, observation?: string) => {
    if (!motorId || !serviceId) {
      console.warn('[saveMotorPrice] Tentativa de salvar preço com motorId ou serviceId vazios:', { motorId, serviceId });
      toast.error('Dados de preço inválidos.');
      return;
    }
    const db = requireLocalDb();
    const mId = motorId.toUpperCase();
    const existing = motorPrices.find(p => p.motorId === mId && p.serviceId === serviceId && p.subName === subName);
    const priceId = existing ? existing.id : crypto.randomUUID();
    const obs = observation !== undefined ? observation : (existing ? existing.observation : '');
    const newPriceItem: MotorPrice = { id: priceId, motorId: mId, serviceId, subName, price, observation: obs };

    if (existing) {
      setMotorPrices(prev => prev.map(p => p.id === priceId ? newPriceItem : p));
    } else {
      setMotorPrices(prev => [...prev, newPriceItem]);
    }

    try {
      await upsertMotorPrice(db, newPriceItem);
      toast.success('Preço salvo.');
    } catch (err) {
      console.error('Error saving motor price in SQLite:', err);
      toast.error('Erro ao salvar preço.');
    }
  };

  const deleteMotorPrice = async (id: string) => {
    const db = requireLocalDb();
    setMotorPrices(prev => prev.filter(p => p.id !== id));

    try {
      await db.dbRun("DELETE FROM motor_services_prices WHERE id = ?", [id]);
      toast.success('Preço removido.');
    } catch (err) {
      console.error('Error deleting motor price in SQLite:', err);
      toast.error('Erro ao remover preço.');
    }
  };

  const copyMotorPrices = async (fromMotorId: string, toMotorId: string) => {
    const db = requireLocalDb();
    const fromId = fromMotorId.toUpperCase();
    const toId = toMotorId.toUpperCase();

    const sourcePrices = motorPrices.filter(p => p.motorId && p.motorId.toUpperCase() === fromId);
    if (sourcePrices.length === 0) {
      toast.warning(`O motor ${fromId} não possui preços cadastrados.`);
      return;
    }

    const newPrices = [...motorPrices];

    for (const src of sourcePrices) {
      const existing = newPrices.find(p => p.motorId && p.motorId.toUpperCase() === toId && p.serviceId === src.serviceId && p.subName === src.subName);
      const priceId = existing ? existing.id : crypto.randomUUID();
      const newPriceItem: MotorPrice = { id: priceId, motorId: toId, serviceId: src.serviceId, subName: src.subName, price: src.price, observation: src.observation || '' };

      try {
        await upsertMotorPrice(db, newPriceItem);
      } catch (e) {
        console.error('Error copying motor price entry:', e);
        continue;
      }

      if (existing) {
        const idx = newPrices.findIndex(p => p.id === priceId);
        newPrices[idx] = newPriceItem;
      } else {
        newPrices.push(newPriceItem);
      }
    }

    setMotorPrices(newPrices);
    toast.success(`Tabela de preços copiada de ${fromId} para ${toId} com sucesso!`);
  };

  // Mantidos para compatibilidade dos componentes: no banco local os ids já são
  // o nome do motor e o id do serviço, então a resolução é a identidade.
  const resolveMotorName = useCallback((id: string): string => id || '', []);
  const resolveServiceId = useCallback((id: string): string => id || '', []);

  // ── Pagamentos Agrupados ──

  const refreshGroupedPayments = useCallback(async () => {
    const db = getLocalDb();
    if (!db) return;
    try {
      setGroupedPayments(await fetchGroupedPaymentsSqlite(db));
    } catch (e) {
      console.error('Error loading grouped payments from SQLite:', e);
    }
  }, []);

  const createGroupedPayment = useCallback(async (clientId: string, osIds: number[]): Promise<PagamentoAgrupado> => {
    const db = requireLocalDb();
    const includedOrders = orders.filter(o => osIds.includes(o.id));
    const valorTotal = includedOrders.reduce((sum, o) => sum + getOrderNetValue(o), 0);

    const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `gp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const nowIso = new Date().toISOString();

    const newGroup: PagamentoAgrupado = {
      id: newId,
      clientId,
      valorTotal,
      valorPago: 0,
      status: 'aguardando_pagamento',
      createdAt: nowIso,
      osIds,
      entradas: []
    };

    try {
      await db.dbRun(
        "INSERT INTO pagamentos_agrupados (id, cliente_id, valor_total, valor_pago, status, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        [newId, clientId, valorTotal, 0, 'aguardando_pagamento', nowIso]
      );
      for (const osId of osIds) {
        await db.dbRun(
          "INSERT INTO pagamento_agrupado_os (pagamento_agrupado_id, os_id, created_at) VALUES (?, ?, ?)",
          [newId, osId, nowIso]
        );
      }
    } catch (e) {
      console.error('Failed to save grouped payment to SQLite:', e);
      await refreshGroupedPayments();
      throw e;
    }

    setGroupedPayments(prev => [...prev, newGroup]);

    toast.success(`Pagamento Agrupado criado com sucesso (${osIds.length} O.S. incluídas)!`);
    return newGroup;
  }, [orders, refreshGroupedPayments]);

  const addEntradaGroupedPayment = useCallback(async (
    pagamentoAgrupadoId: string,
    entrada: { valor: number; data: string; formaPagamento: string; nomePagador?: string; observacao?: string }
  ): Promise<void> => {
    const db = requireLocalDb();
    const targetGroup = groupedPayments.find(g => g.id === pagamentoAgrupadoId);
    if (!targetGroup) return;

    const entradaId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ent-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const nowIso = new Date().toISOString();

    const newEntrada: EntradaPagamentoAgrupado = {
      id: entradaId,
      pagamentoAgrupadoId,
      valor: Number(entrada.valor) || 0,
      data: entrada.data,
      formaPagamento: entrada.formaPagamento,
      nomePagador: entrada.nomePagador || '',
      observacao: entrada.observacao || '',
      createdAt: nowIso
    };

    const updatedEntradas = [...targetGroup.entradas, newEntrada];
    const newValorPago = updatedEntradas.reduce((acc, curr) => acc + curr.valor, 0);

    let newStatus: GroupedPaymentStatus = 'aguardando_pagamento';
    if (newValorPago >= targetGroup.valorTotal && targetGroup.valorTotal > 0) {
      newStatus = 'pago';
    } else if (newValorPago > 0) {
      newStatus = 'pagamento_parcial';
    }

    // Optimistic update: apply to local state immediately so the UI reflects the
    // new entrada before the IPC round-trip completes (mirrors updateOrder).
    setGroupedPayments(prev => prev.map(g => {
      if (g.id === pagamentoAgrupadoId) {
        return {
          ...g,
          valorPago: newValorPago,
          status: newStatus,
          entradas: updatedEntradas
        };
      }
      return g;
    }));

    try {
      await db.dbRun(
        "INSERT INTO entradas_pagamento_agrupado (id, pagamento_agrupado_id, valor, data, forma_pagamento, nome_pagador, observacao, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [entradaId, pagamentoAgrupadoId, newEntrada.valor, newEntrada.data, newEntrada.formaPagamento, newEntrada.nomePagador || null, newEntrada.observacao, nowIso]
      );
      await db.dbRun(
        "UPDATE pagamentos_agrupados SET valor_pago = ?, status = ?, updated_at = ? WHERE id = ?",
        [newValorPago, newStatus, nowIso, pagamentoAgrupadoId]
      );
    } catch (e) {
      console.error('Failed to save entrada to SQLite:', e);
      await refreshGroupedPayments();
      throw e;
    }

    // Update paymentStatus of all O.S. in this group
    const newOrderPaymentStatus: PaymentStatus = newStatus === 'pago' ? 'Pago' : (newStatus === 'pagamento_parcial' ? 'Entrada' : 'Não Pago');

    for (const osId of targetGroup.osIds) {
      const orderUpdates: Partial<Order> = {
        paymentStatus: newOrderPaymentStatus,
        paymentMethod: entrada.formaPagamento as any,
        paymentDate: entrada.data,
      };
      if (entrada.formaPagamento.toUpperCase() === 'PIX' && entrada.nomePagador) {
        orderUpdates.pixPaidBy = entrada.nomePagador;
      }
      await updateOrder(osId, orderUpdates);
    }

    toast.success(`Entrada de R$ ${newEntrada.valor.toFixed(2)} lançada com sucesso!`);
  }, [groupedPayments, refreshGroupedPayments, updateOrder]);

  const updateEntradaGroupedPayment = useCallback(async (
    pagamentoAgrupadoId: string,
    entradaId: string,
    entrada: { valor: number; data: string; formaPagamento: string; nomePagador?: string; observacao?: string }
  ): Promise<void> => {
    const db = requireLocalDb();
    const targetGroup = groupedPayments.find(g => g.id === pagamentoAgrupadoId);
    if (!targetGroup) return;

    const nowIso = new Date().toISOString();

    const updatedEntradas = targetGroup.entradas.map(e => {
      if (e.id === entradaId) {
        return {
          ...e,
          valor: Number(entrada.valor) || 0,
          data: entrada.data,
          formaPagamento: entrada.formaPagamento,
          nomePagador: entrada.nomePagador || '',
          observacao: entrada.observacao || ''
        };
      }
      return e;
    });

    const newValorPago = updatedEntradas.reduce((acc, curr) => acc + curr.valor, 0);

    let newStatus: GroupedPaymentStatus = 'aguardando_pagamento';
    if (newValorPago >= targetGroup.valorTotal && targetGroup.valorTotal > 0) {
      newStatus = 'pago';
    } else if (newValorPago > 0) {
      newStatus = 'pagamento_parcial';
    }

    // Optimistic update: apply to local state immediately so the UI reflects the
    // edited entrada before the IPC round-trip completes (mirrors updateOrder).
    setGroupedPayments(prev => prev.map(g => {
      if (g.id === pagamentoAgrupadoId) {
        return {
          ...g,
          valorPago: newValorPago,
          status: newStatus,
          entradas: updatedEntradas,
          updatedAt: nowIso
        };
      }
      return g;
    }));

    try {
      await db.dbRun(
        "UPDATE entradas_pagamento_agrupado SET valor = ?, data = ?, forma_pagamento = ?, nome_pagador = ?, observacao = ? WHERE id = ?",
        [Number(entrada.valor) || 0, entrada.data, entrada.formaPagamento, entrada.nomePagador || null, entrada.observacao || '', entradaId]
      );
      await db.dbRun(
        "UPDATE pagamentos_agrupados SET valor_pago = ?, status = ?, updated_at = ? WHERE id = ?",
        [newValorPago, newStatus, nowIso, pagamentoAgrupadoId]
      );
    } catch (e) {
      console.error('Failed to update entrada in SQLite:', e);
      await refreshGroupedPayments();
      throw e;
    }

    const newOrderPaymentStatus: PaymentStatus = newStatus === 'pago' ? 'Pago' : (newStatus === 'pagamento_parcial' ? 'Entrada' : 'Não Pago');

    for (const osId of targetGroup.osIds) {
      const orderUpdates: Partial<Order> = {
        paymentStatus: newOrderPaymentStatus,
        paymentMethod: entrada.formaPagamento as any,
        paymentDate: entrada.data,
      };
      if (entrada.formaPagamento.toUpperCase() === 'PIX' && entrada.nomePagador) {
        orderUpdates.pixPaidBy = entrada.nomePagador;
      }
      await updateOrder(osId, orderUpdates);
    }

    toast.success('Entrada atualizada com sucesso!');
  }, [groupedPayments, refreshGroupedPayments, updateOrder]);

  const deleteEntradaGroupedPayment = useCallback(async (
    pagamentoAgrupadoId: string,
    entradaId: string
  ): Promise<void> => {
    const db = requireLocalDb();
    const targetGroup = groupedPayments.find(g => g.id === pagamentoAgrupadoId);
    if (!targetGroup) return;

    const nowIso = new Date().toISOString();
    const updatedEntradas = targetGroup.entradas.filter(e => e.id !== entradaId);
    const newValorPago = updatedEntradas.reduce((acc, curr) => acc + curr.valor, 0);

    let newStatus: GroupedPaymentStatus = 'aguardando_pagamento';
    if (newValorPago >= targetGroup.valorTotal && targetGroup.valorTotal > 0) {
      newStatus = 'pago';
    } else if (newValorPago > 0) {
      newStatus = 'pagamento_parcial';
    }

    // Optimistic update: apply to local state immediately so the UI reflects the
    // removal before the IPC round-trip completes (mirrors updateOrder).
    setGroupedPayments(prev => prev.map(g => {
      if (g.id === pagamentoAgrupadoId) {
        return {
          ...g,
          valorPago: newValorPago,
          status: newStatus,
          entradas: updatedEntradas,
          updatedAt: nowIso
        };
      }
      return g;
    }));

    try {
      await db.dbRun("DELETE FROM entradas_pagamento_agrupado WHERE id = ?", [entradaId]);
      await db.dbRun(
        "UPDATE pagamentos_agrupados SET valor_pago = ?, status = ?, updated_at = ? WHERE id = ?",
        [newValorPago, newStatus, nowIso, pagamentoAgrupadoId]
      );
    } catch (e) {
      console.error('Failed to delete entrada from SQLite:', e);
      await refreshGroupedPayments();
      throw e;
    }

    const newOrderPaymentStatus: PaymentStatus = newStatus === 'pago' ? 'Pago' : (newStatus === 'pagamento_parcial' ? 'Entrada' : 'Não Pago');
    const lastEntrada = updatedEntradas[updatedEntradas.length - 1];

    for (const osId of targetGroup.osIds) {
      const orderUpdates: Partial<Order> = {
        paymentStatus: newOrderPaymentStatus,
        paymentMethod: (lastEntrada?.formaPagamento as any) || undefined,
        paymentDate: lastEntrada?.data || undefined,
      };
      if (lastEntrada?.formaPagamento.toUpperCase() === 'PIX' && lastEntrada.nomePagador) {
        orderUpdates.pixPaidBy = lastEntrada.nomePagador;
      }
      await updateOrder(osId, orderUpdates);
    }

    toast.success('Lançamento removido!');
  }, [groupedPayments, refreshGroupedPayments, updateOrder]);

  const getGroupedPaymentForOrder = useCallback((orderId: number): PagamentoAgrupado | undefined => {
    return groupedPayments.find(g => g.osIds.includes(orderId));
  }, [groupedPayments]);

  const getPendingOrdersForClient = useCallback((clientId: string): Order[] => {
    if (!clientId) return [];
    return orders.filter(o => {
      if (o.clientId !== clientId) return false;
      if (o.finished) return false;
      if (o.paymentStatus === 'Pago') return false;
      const group = groupedPayments.find(g => g.osIds.includes(o.id));
      if (group && group.status === 'pago') return false;
      return true;
    });
  }, [orders, groupedPayments]);

  const removeGroupedPaymentFromDb = async (db: ElectronAPI, id: string) => {
    await db.dbRun("DELETE FROM entradas_pagamento_agrupado WHERE pagamento_agrupado_id = ?", [id]);
    await db.dbRun("DELETE FROM pagamento_agrupado_os WHERE pagamento_agrupado_id = ?", [id]);
    await db.dbRun("DELETE FROM pagamentos_agrupados WHERE id = ?", [id]);
  };

  const deleteGroupedPayment = useCallback(async (id: string): Promise<void> => {
    const db = requireLocalDb();

    try {
      await removeGroupedPaymentFromDb(db, id);
    } catch (e) {
      console.error('Error deleting grouped payment from SQLite:', e);
      toast.error('Erro ao remover Pagamento Agrupado.');
      throw e;
    }

    setGroupedPayments(prev => prev.filter(g => g.id !== id));
    toast.info('Pagamento Agrupado removido com sucesso.');
  }, []);

  const dissolveGroupedPayment = useCallback(async (
    id: string,
    options: { actionOnPaid: 'distribute' | 'discard' }
  ): Promise<void> => {
    const db = requireLocalDb();
    const targetGroup = groupedPayments.find(g => g.id === id);
    if (!targetGroup) return;

    if (options.actionOnPaid === 'distribute' && targetGroup.valorPago > 0) {
      const ratio = targetGroup.valorPago / (targetGroup.valorTotal || 1);
      const nowIso = new Date().toISOString();

      for (const osId of targetGroup.osIds) {
        const targetOrder = orders.find(o => o.id === osId);
        if (!targetOrder) continue;

        const net = getOrderNetValue(targetOrder);
        const allocatedPaid = Math.round((net * ratio) * 100) / 100;

        let newStatus: PaymentStatus = 'Não Pago';
        if (allocatedPaid >= net && net > 0) {
          newStatus = 'Pago';
        } else if (allocatedPaid > 0) {
          newStatus = 'Entrada';
        }

        await updateOrder(osId, {
          paymentStatus: newStatus,
          entryValue: allocatedPaid,
          balanceValue: Math.max(0, net - allocatedPaid),
          paymentDate: nowIso.split('T')[0]
        });
      }
    } else {
      // Reset all orders in group to 'Não Pago'
      for (const osId of targetGroup.osIds) {
        await updateOrder(osId, {
          paymentStatus: 'Não Pago',
          entryValue: 0
        });
      }
    }

    try {
      await removeGroupedPaymentFromDb(db, id);
    } catch (e) {
      console.error('Error deleting grouped payment from SQLite:', e);
      toast.error('Erro ao desfazer o agrupamento.');
      throw e;
    }

    setGroupedPayments(prev => prev.filter(g => g.id !== id));

    toast.success('Agrupamento desfeito com sucesso!');
  }, [groupedPayments, orders, updateOrder]);

  return (
    <StoreContext.Provider value={{
      clients,
      orders,
      addClient,
      updateClient,
      deleteClient,
      addOrder,
      updateOrder,
      deleteOrder,
      isLoaded,
      fontSize,
      setFontSize,
      refreshClients,
      motorPrices,
      saveMotorPrice,
      deleteMotorPrice,
      copyMotorPrices,
      resolveMotorName,
      resolveServiceId,
      groupedPayments,
      createGroupedPayment,
      addEntradaGroupedPayment,
      updateEntradaGroupedPayment,
      deleteEntradaGroupedPayment,
      getGroupedPaymentForOrder,
      getPendingOrdersForClient,
      refreshGroupedPayments,
      deleteGroupedPayment,
      dissolveGroupedPayment
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
