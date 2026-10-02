'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import type { Order, Client } from '@/lib/store';
import type { FilterValues, SortConfig, SortField, SortDirection } from '@/components/filter-bar';

const DEFAULT_FILTERS: FilterValues = {
  search: '',
  osId: '',
  clientId: '',
  motorModel: '',
  displacement: '',
  paymentMethod: '',
  paymentStatus: '',
  serviceType: '',
  serviceStatus: '',
  dateFrom: '',
  dateTo: '',
  minValue: '',
  maxValue: '',
  clientType: '',
  partsLeft: '',
  payerName: '',
};

const DEFAULT_SORT: SortConfig = { field: 'id', direction: 'desc' };

interface UseOrderFiltersOptions {
  storageKey: string;
  orders: Order[];
  clients: Client[];
  defaultSort?: SortConfig;
}

export function useOrderFilters({ storageKey, orders, clients, defaultSort }: UseOrderFiltersOptions) {
  const [filters, setFilters] = useState<FilterValues>(() => {
    if (typeof window !== 'undefined') {
      try {
        // Os filtros persistidos em sessionStorage (ex: "retifica_filters_dashboard")
        // mantêm os filtros do usuário ativos entre renderizações. Se os dados de OS estiverem
        // inconsistentes, estes filtros podem filtrar/mascarar a contagem de resultados visíveis.
        const saved = sessionStorage.getItem('retifica_filters_' + storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          return { ...DEFAULT_FILTERS, ...parsed, search: '' };
        }
      } catch { /* ignore */ }
    }
    return DEFAULT_FILTERS;
  });

  const [sort, setSort] = useState<SortConfig>(() => {
    return defaultSort || DEFAULT_SORT;
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const debouncedSearch = useDebounce(filters.search, 300);

  const effectiveFilters = useMemo(() => ({
    ...filters,
    search: debouncedSearch,
  }), [filters, debouncedSearch]);

  useEffect(() => {
    try {
      const { search, ...rest } = filters;
      sessionStorage.setItem('retifica_filters_' + storageKey, JSON.stringify(rest));
    } catch { /* ignore */ }
  }, [filters, storageKey]);

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  }, []);

  const clientMap = useMemo(() => {
    const map = new Map<string, Client>();
    (clients || []).forEach((c) => {
      if (c && c.id) map.set(c.id, c);
    });
    return map;
  }, [clients]);

  const clientNameMap = useMemo(() => {
    const map = new Map<string, string>();
    (clients || []).forEach((c) => {
      if (c && c.id) {
        const name = c.name || '';
        map.set(c.id, name.toLowerCase());
        map.set(c.id + '_raw', name);
      }
    });
    return map;
  }, [clients]);

  const allMotors = useMemo(() => {
    const set = new Set<string>();
    (orders || []).forEach((o) => {
      if (o && o.motorModel) {
        o.motorModel.split(', ').forEach((m) => { if (m) set.add(m); });
      }
    });
    return Array.from(set).sort();
  }, [orders]);

  const allDisplacements = useMemo(() => {
    const set = new Set<string>();
    (orders || []).forEach((o) => {
      if (o && o.displacement) {
        o.displacement.split(', ').forEach((val) => {
          if (val) set.add(val);
        });
      }
    });
    return Array.from(set).sort((a, b) => parseFloat(a) - parseFloat(b));
  }, [orders]);

  const allPaymentMethods = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => { if (o.paymentMethod) set.add(o.paymentMethod); });
    return Array.from(set);
  }, [orders]);

  const allPaymentStatuses = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => { if (o.paymentStatus) set.add(o.paymentStatus); });
    return Array.from(set);
  }, [orders]);

  const allServiceStatuses = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => { if (o.serviceStatus) set.add(o.serviceStatus); });
    return Array.from(set);
  }, [orders]);

  const allServiceTypes = useMemo(() => {
    const set = new Set<string>();
    (orders || []).forEach((o) => {
      if (o && o.services) {
        o.services.forEach((s) => { if (s && s.name) set.add(s.name); });
      }
    });
    return Array.from(set).sort();
  }, [orders]);

  const allPartsLeft = useMemo(() => {
    const set = new Set<string>();
    (orders || []).forEach((o) => {
      if (o && o.partsLeft) {
        o.partsLeft.forEach((p) => {
          if (p) {
            const name = p.includes('|') ? p.split('|')[0] : p;
            const trimmed = name.trim().toUpperCase();
            if (trimmed) set.add(trimmed);
          }
        });
      }
    });
    return Array.from(set).sort();
  }, [orders]);

  const clientOptions = useMemo(() => {
    return (clients || []).map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      document: c.document,
    }));
  }, [clients]);

  const filteredOrders = useMemo(() => {
    let result = [...orders];

    if (effectiveFilters.osId) {
      const q = effectiveFilters.osId.trim();
      result = result.filter((o) => {
        if (!o) return false;
        return String(o.osNumber || '').includes(q) || String(o.id || '').includes(q);
      });
    }

    if (effectiveFilters.search) {
      const normalize = (str: string) => {
        if (!str) return '';
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      };
      const q = normalize(effectiveFilters.search || '').trim().replace(/\s+/g, ' ');
      const qDigits = q.replace(/\D/g, '');

      result = result.filter((o) => {
        if (!o) return false;
        const client = clientMap.get(o.clientId);
        const mechanic = o.mechanicId ? clientMap.get(o.mechanicId) : null;
        const searchInId = normalize(String(o.id || '')).includes(q) || 
                           normalize(String(o.osNumber || '')).includes(q);
        
        const searchInMotor = normalize(o.motorModel || '').includes(q) ||
                              normalize(o.displacement || '').includes(q);

        const searchInClient = client ? (
          normalize(client.name || '').includes(q) || 
          normalize(client.nickname || '').includes(q) || 
          normalize(client.phone || '').includes(q) || 
          normalize(client.phone2 || '').includes(q) || 
          normalize(client.whatsapp || '').includes(q) || 
          normalize(client.document || '').includes(q) ||
          (qDigits !== '' && (
            (client.phone || '').replace(/\D/g, '').includes(qDigits) ||
            (client.phone2 || '').replace(/\D/g, '').includes(qDigits) ||
            (client.whatsapp || '').replace(/\D/g, '').includes(qDigits) ||
            (client.document || '').replace(/\D/g, '').includes(qDigits)
          ))
        ) : false;

        const searchInMechanic = (mechanic ? (
          normalize(mechanic.name || '').includes(q) || 
          normalize(mechanic.nickname || '').includes(q)
        ) : false) || (
          o.mechanicName ? normalize(o.mechanicName).includes(q) : false
        ) || (
          o.mechanicNickname ? normalize(o.mechanicNickname).includes(q) : false
        );

        const searchInStatusObservation = o.statusObservation ? normalize(o.statusObservation).includes(q) : false;

        const searchInPayer = (
          normalize(o.pixPaidBy || '').includes(q) ||
          normalize(o.secondPixPaidBy || '').includes(q) ||
          (Array.isArray(o.paymentEntries) && o.paymentEntries.some((entry: any) => {
            if (!entry) return false;
            const p = entry.payer || entry.pixPaidBy || entry.payer_name || entry.pagador || '';
            return normalize(String(p)).includes(q);
          }))
        );

        return searchInId || searchInMotor || searchInClient || searchInMechanic || searchInStatusObservation || searchInPayer;
      });
    }

    if (effectiveFilters.clientId) {
      result = result.filter((o) => o.clientId === effectiveFilters.clientId);
    }

    if (effectiveFilters.motorModel) {
      const motorQ = (effectiveFilters.motorModel || '').toLowerCase();
      result = result.filter((o) => (o.motorModel || '').toLowerCase().includes(motorQ));
    }

    if (effectiveFilters.displacement) {
      result = result.filter((o) => 
        o.displacement && o.displacement.split(', ').includes(effectiveFilters.displacement)
      );
    }

    if (effectiveFilters.paymentMethod) {
      result = result.filter((o) => o.paymentMethod === effectiveFilters.paymentMethod);
    }

    if (effectiveFilters.paymentStatus) {
      result = result.filter((o) => o.paymentStatus === effectiveFilters.paymentStatus);
    }

    if (effectiveFilters.payerName) {
      const normalizeStr = (str: string) => {
        if (!str) return '';
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      };
      const payerQ = normalizeStr(effectiveFilters.payerName).trim();
      result = result.filter((o) => {
        if (!o) return false;
        const matchPix1 = normalizeStr(o.pixPaidBy || '').includes(payerQ);
        const matchPix2 = normalizeStr(o.secondPixPaidBy || '').includes(payerQ);
        const matchEntries = Array.isArray(o.paymentEntries) && o.paymentEntries.some((entry: any) => {
          if (!entry) return false;
          const p = entry.payer || entry.pixPaidBy || entry.payer_name || entry.pagador || '';
          return normalizeStr(String(p)).includes(payerQ);
        });
        return matchPix1 || matchPix2 || matchEntries;
      });
    }

    if (effectiveFilters.serviceStatus) {
      result = result.filter((o) => o.serviceStatus === effectiveFilters.serviceStatus);
    }

    if (effectiveFilters.serviceType) {
      const q = (effectiveFilters.serviceType || '').toLowerCase();
      result = result.filter((o) =>
        (o.services || []).some((s) => (s.name || '').toLowerCase().includes(q))
      );
    }

    if (effectiveFilters.dateFrom) {
      const from = new Date(effectiveFilters.dateFrom + 'T00:00:00');
      result = result.filter((o) => {
        const dateStr = storageKey === 'history' ? (o.finishedAt || o.updatedAt || '') : o.createdAt;
        if (!dateStr) return false;
        const d = new Date(dateStr);
        return d >= from;
      });
    }

    if (effectiveFilters.dateTo) {
      const to = new Date(effectiveFilters.dateTo + 'T23:59:59');
      result = result.filter((o) => {
        const dateStr = storageKey === 'history' ? (o.finishedAt || o.updatedAt || '') : o.createdAt;
        if (!dateStr) return false;
        const d = new Date(dateStr);
        return d <= to;
      });
    }

    if (effectiveFilters.minValue) {
      const min = parseFloat(effectiveFilters.minValue);
      if (!isNaN(min)) {
        result = result.filter((o) => o.netValue >= min);
      }
    }

    if (effectiveFilters.maxValue) {
      const max = parseFloat(effectiveFilters.maxValue);
      if (!isNaN(max)) {
        result = result.filter((o) => o.netValue <= max);
      }
    }

    if (effectiveFilters.clientType) {
      result = result.filter((o) => {
        const client = clientMap.get(o.clientId);
        return client ? client.clientType === effectiveFilters.clientType : false;
      });
    }

    if (effectiveFilters.partsLeft) {
      const q = (effectiveFilters.partsLeft || '').toUpperCase();
      result = result.filter((o) =>
        (o.partsLeft || []).some((p) => {
          const name = p.includes('|') ? p.split('|')[0] : p;
          return name.trim().toUpperCase() === q;
        })
      );
    }

    result.sort((a, b) => {
      let cmp = 0;
      switch (sort.field) {
        case 'id':
          cmp = (a.osNumber || a.id) - (b.osNumber || b.id);
          break;
        case 'date': {
          const dateA = storageKey === 'history' ? (a.finishedAt || a.updatedAt || '') : a.createdAt;
          const dateB = storageKey === 'history' ? (b.finishedAt || b.updatedAt || '') : b.createdAt;
          
          if (storageKey === 'history') {
            const idxA = a.concludedIndex;
            const idxB = b.concludedIndex;
            
            if (idxA != null && idxB != null) {
              cmp = idxA - idxB;
            } else if (idxA != null) {
              cmp = 1;
            } else if (idxB != null) {
              cmp = -1;
            } else {
              cmp = dateA.localeCompare(dateB);
            }
            
            if (cmp === 0) {
              const idA = a.osNumber || a.id || 0;
              const idB = b.osNumber || b.id || 0;
              cmp = idA - idB;
            }
          } else {
            const timeA = dateA ? new Date(dateA).getTime() : 0;
            const timeB = dateB ? new Date(dateB).getTime() : 0;
            
            if (timeA !== timeB) {
              cmp = timeA - timeB;
            } else {
              const updateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
              const updateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
              cmp = updateA - updateB;
            }
          }
          break;
        }
        case 'value':
          cmp = a.netValue - b.netValue;
          break;
        case 'client': {
          const nameA = (clientMap.get(a.clientId)?.name || '').toLowerCase();
          const nameB = (clientMap.get(b.clientId)?.name || '').toLowerCase();
          cmp = nameA.localeCompare(nameB);
          break;
        }
        case 'status':
          cmp = (a.serviceStatus || '').localeCompare(b.serviceStatus || '');
          break;
      }
      return sort.direction === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [orders, effectiveFilters, sort, clientMap, storageKey]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredOrders.length / pageSize)), [filteredOrders.length, pageSize]);

  const safePage = Math.min(page, totalPages);
  const paginatedOrders = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, safePage, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const updateFilter = useCallback((newFilters: FilterValues) => {
    setFilters(newFilters);
    setPage(1);
  }, []);

  const handleSortChange = useCallback((newSort: SortConfig) => {
    setSort(newSort);
  }, []);

  return {
    filters,
    setFilters: updateFilter,
    clearFilters,
    sort,
    setSort: handleSortChange,
    page: safePage,
    setPage,
    pageSize,
    setPageSize,
    filteredOrders: paginatedOrders,
    totalFilteredCount: filteredOrders.length,
    totalCount: orders.length,
    allMotors,
    allDisplacements,
    allPaymentMethods,
    allPaymentStatuses,
    allServiceStatuses,
    allServiceTypes,
    clientOptions,
    allPartsLeft,
  };
}
