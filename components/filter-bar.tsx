'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import {
  Search,
  X,
  RotateCcw,
  Calendar,
  DollarSign,
  User,
  Users,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  Check,
  Loader2,
  Hash,
  Filter,
  CreditCard,
  CircleDollarSign,
  Package,
  Cog,
  Gauge,
  Wrench,
  ArrowUpDown,
} from 'lucide-react';

export interface FilterValues {
  search: string;
  osId: string;
  clientId: string;
  motorModel: string;
  displacement: string;
  paymentMethod: string;
  paymentStatus: string;
  serviceType: string;
  serviceStatus: string;
  dateFrom: string;
  dateTo: string;
  minValue: string;
  maxValue: string;
  clientType: string;
  partsLeft: string;
  payerName: string;
}

export type SortField = 'date' | 'value' | 'client' | 'status' | 'id';
export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

export interface ClientOption {
  id: string;
  name: string;
  phone: string;
  document: string;
}

export interface FilterBarProps {
  filters: FilterValues;
  onFilterChange: (filters: FilterValues) => void;
  onClear: () => void;
  resultCount: number;
  totalCount: number;
  loading?: boolean;
  clients: ClientOption[];
  motors: string[];
  displacements: string[];
  paymentMethods: string[];
  paymentStatuses: string[];
  serviceStatuses: string[];
  serviceTypes?: string[];
  partsLeft?: string[];
  sort: SortConfig;
  onSortChange: (sort: SortConfig) => void;
  className?: string;
  showSearch?: boolean;
  showClient?: boolean;
  showMotor?: boolean;
  showDisplacement?: boolean;
  showPaymentMethod?: boolean;
  showPaymentStatus?: boolean;
  showServiceType?: boolean;
  showServiceStatus?: boolean;
  showDates?: boolean;
  showValues?: boolean;
  showClientType?: boolean;
  showPartsLeft?: boolean;
  showPayerName?: boolean;
  /** Mantido por compatibilidade: o status da O.S. agora fica sempre nos chips */
  showStatusInBar?: boolean;
  /** Quando informado, mostra "Exibir N" na barra */
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
}

// ═══ Status da O.S.: ordem e nomes usados nos chips ═══
const STATUS_ORDER = ['Na Fila', 'Em Andamento', 'Aguardando Peça', 'Pronto', 'Levou'];
const STATUS_LABEL: Record<string, string> = {
  'Na Fila': 'Na fila',
  'Em Andamento': 'Em andamento',
  'Aguardando Peça': 'Aguardando peça',
  'Pronto': 'Prontas',
  'Levou': 'Levou',
};

// ═══ Dropdown padrão do sistema (substitui o <select> nativo) ═══
type DropdownOption = { value: string; label: string; hint?: string };

const triggerBase =
  'h-9 w-full flex items-center gap-2 rounded-lg border bg-card px-3 text-sm font-medium text-foreground outline-none transition-colors cursor-pointer hover:border-foreground/25 focus-visible:ring-2 focus-visible:ring-primary/25 data-[popup-open]:border-primary data-[popup-open]:ring-2 data-[popup-open]:ring-primary/20';
const triggerActive = 'border-primary/70 bg-primary/5';

export function FilterDropdown({
  icon: Icon,
  value,
  onChange,
  allLabel,
  options,
  searchable,
  searchPlaceholder = 'Buscar...',
  align = 'start',
  className,
  title,
}: {
  icon?: React.ElementType;
  value: string;
  onChange: (value: string) => void;
  /** Texto da opção "sem filtro" (ex.: Todos). Sem ele, não há opção vazia. */
  allLabel?: string;
  options: DropdownOption[];
  searchable?: boolean;
  searchPlaceholder?: string;
  align?: 'start' | 'center' | 'end';
  className?: string;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const current = options.find((o) => o.value === value);
  const all: DropdownOption[] = allLabel !== undefined ? [{ value: '', label: allLabel }, ...options] : options;
  const q = query.trim().toLowerCase();
  const visible = q ? all.filter((o) => o.value === '' || (o.label + ' ' + (o.hint || '')).toLowerCase().includes(q)) : all;

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQuery(''); }}>
      <PopoverTrigger
        render={
          <button type='button' title={title} className={cn(triggerBase, value && allLabel !== undefined ? triggerActive : 'border-border', className)}>
            {Icon && <Icon className='w-4 h-4 text-muted-foreground shrink-0' />}
            <span className='truncate'>{current ? current.label : (allLabel ?? '')}</span>
            <ChevronDown className={cn('ml-auto w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-150', open && 'rotate-180')} />
          </button>
        }
      />
      <PopoverContent align={align} sideOffset={6} className='w-auto min-w-[max(var(--anchor-width),180px)] max-w-[340px] p-1.5 gap-1 rounded-xl border border-border shadow-lg'>
        {searchable && (
          <div className='relative px-0.5 pt-0.5'>
            <Search className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground' />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className='h-8 w-full rounded-lg border border-border bg-background pl-8 pr-2 text-sm outline-none focus:border-primary'
            />
          </div>
        )}
        <div className='max-h-64 overflow-y-auto' role='listbox'>
          {visible.length === 0 && (
            <div className='px-2.5 py-3 text-center text-xs text-muted-foreground'>Nada encontrado</div>
          )}
          {visible.map((o) => {
            const selected = o.value === value;
            return (
              <button
                key={o.value || '__all'}
                type='button'
                role='option'
                aria-selected={selected}
                onClick={() => { onChange(o.value); setOpen(false); setQuery(''); }}
                className={cn(
                  'w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-left transition-colors cursor-pointer',
                  selected ? 'bg-primary/10 font-semibold text-foreground' : 'text-foreground/90 hover:bg-muted'
                )}
              >
                <span className='flex-1 min-w-0'>
                  <span className='block truncate'>{o.label}</span>
                  {o.hint && <span className='block truncate text-xs text-muted-foreground font-normal'>{o.hint}</span>}
                </span>
                {selected && <Check className='w-4 h-4 text-primary shrink-0' />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-1 min-w-0', className)}>
      <span className='text-xs font-medium text-muted-foreground truncate'>{label}</span>
      {children}
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className='space-y-2.5 min-w-0'>
      <div className='flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
        <Icon className='w-3.5 h-3.5' /> {title}
      </div>
      <div className='grid grid-cols-2 gap-2.5'>{children}</div>
    </div>
  );
}

function parseDateValue(value: string): Date | undefined {
  if (!value) return undefined;
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

function formatDateValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function DateField({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  const [open, setOpen] = useState(false);
  const selected = parseDateValue(value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button type='button' className={cn(triggerBase, selected ? triggerActive : 'border-border')}>
            <Calendar className='h-4 w-4 text-muted-foreground shrink-0' />
            <span className={cn('truncate', !selected && 'font-normal text-[var(--placeholder,var(--muted-foreground))]')}>
              {selected ? selected.toLocaleDateString('pt-BR') : placeholder}
            </span>
          </button>
        }
      />
      <PopoverContent className='z-50 w-auto p-0 shadow-lg border border-border rounded-xl overflow-hidden bg-popover' align='start'>
        <CalendarPicker
          mode='single'
          selected={selected}
          onSelect={(date) => {
            onChange(date ? formatDateValue(date) : '');
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

function TextField({ icon: Icon, value, onChange, placeholder, type = 'text', className }: {
  icon: React.ElementType; value: string; onChange: (v: string) => void; placeholder: string; type?: string; className?: string;
}) {
  return (
    <div className='relative'>
      <Icon className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
      <input
        type={type}
        step={type === 'number' ? '0.01' : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'h-9 w-full rounded-lg border bg-card pl-9 pr-3 text-sm font-medium text-foreground outline-none transition-colors hover:border-foreground/25 focus:border-primary focus:ring-2 focus:ring-primary/20',
          value ? triggerActive : 'border-border',
          className
        )}
      />
    </div>
  );
}

function FilterTag({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className='inline-flex items-center gap-1 pl-2.5 pr-1 h-7 rounded-lg text-xs font-medium bg-muted text-foreground border border-border'>
      {label}
      <button onClick={onRemove} title='Remover filtro' className='w-5 h-5 rounded-md inline-flex items-center justify-center text-muted-foreground hover:bg-destructive/15 hover:text-destructive transition-colors'>
        <X className='w-3 h-3' />
      </button>
    </span>
  );
}

const SORT_OPTIONS: { label: string; field: SortField }[] = [
  { label: 'Nº O.S.', field: 'id' },
  { label: 'Data', field: 'date' },
  { label: 'Cliente', field: 'client' },
  { label: 'Valor', field: 'value' },
  { label: 'Status', field: 'status' },
];

export function FilterBar({
  filters,
  onFilterChange,
  onClear,
  resultCount,
  totalCount,
  loading,
  clients,
  motors,
  displacements,
  serviceStatuses,
  serviceTypes = [],
  partsLeft = [],
  sort,
  onSortChange,
  className,
  showSearch = true,
  showClient = true,
  showMotor = true,
  showDisplacement = true,
  showPaymentMethod = true,
  showPaymentStatus = true,
  showServiceType = true,
  showServiceStatus = true,
  showDates = true,
  showValues = true,
  showClientType = true,
  showPartsLeft = true,
  showPayerName = true,
  pageSize,
  onPageSizeChange,
}: FilterBarProps) {
  const [panelOpen, setPanelOpen] = useState(false);

  // Campos de texto aplicam o filtro 300ms depois de parar de digitar
  const [localSearch, setLocalSearch] = useState(filters.search);
  const [localOsId, setLocalOsId] = useState(filters.osId || '');
  const [localMinValue, setLocalMinValue] = useState(filters.minValue);
  const [localMaxValue, setLocalMaxValue] = useState(filters.maxValue);
  const [localPayerName, setLocalPayerName] = useState(filters.payerName || '');

  useEffect(() => { setLocalSearch(filters.search); }, [filters.search]);
  useEffect(() => { setLocalOsId(filters.osId || ''); }, [filters.osId]);
  useEffect(() => { setLocalMinValue(filters.minValue); }, [filters.minValue]);
  useEffect(() => { setLocalMaxValue(filters.maxValue); }, [filters.maxValue]);
  useEffect(() => { setLocalPayerName(filters.payerName || ''); }, [filters.payerName]);

  useEffect(() => {
    const pending: [string, keyof FilterValues][] = [
      [localSearch, 'search'],
      [localOsId, 'osId'],
      [localMinValue, 'minValue'],
      [localMaxValue, 'maxValue'],
      [localPayerName, 'payerName'],
    ];
    const timer = setTimeout(() => {
      const changed = pending.filter(([v, k]) => v !== (filters[k] || ''));
      if (changed.length > 0) {
        const next = { ...filters };
        changed.forEach(([v, k]) => { next[k] = v; });
        onFilterChange(next);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, localOsId, localMinValue, localMaxValue, localPayerName, filters, onFilterChange]);

  const updateFilter = (key: keyof FilterValues, value: string | null) => {
    onFilterChange({ ...filters, [key]: value ?? '' });
  };

  // Filtros do painel (tudo menos busca e status, que ficam visíveis na barra)
  const panelKeys: (keyof FilterValues)[] = ['paymentMethod', 'paymentStatus', 'payerName', 'motorModel', 'displacement', 'serviceType', 'partsLeft', 'clientId', 'clientType', 'osId', 'dateFrom', 'dateTo', 'minValue', 'maxValue'];
  const panelCount = panelKeys.filter((k) => filters[k] !== '').length;
  const hasActiveFilters = useMemo(() => Object.values(filters).some((v) => v !== ''), [filters]);

  // Chips de status: na ordem do fluxo da oficina + qualquer status extra que exista
  const statusChips = useMemo(() => {
    const list = [...STATUS_ORDER];
    serviceStatuses.forEach((s) => { if (s && !list.includes(s)) list.push(s); });
    if (filters.serviceStatus && !list.includes(filters.serviceStatus)) list.push(filters.serviceStatus);
    return list;
  }, [serviceStatuses, filters.serviceStatus]);

  const clientName = clients.find((c) => c.id === filters.clientId)?.name || 'Cliente selecionado';
  const brDate = (v: string) => v.split('-').reverse().join('/');
  const tags: { key: keyof FilterValues; label: string }[] = [];
  if (filters.paymentMethod) tags.push({ key: 'paymentMethod', label: 'Forma: ' + filters.paymentMethod });
  if (filters.paymentStatus) tags.push({ key: 'paymentStatus', label: 'Pagamento: ' + (filters.paymentStatus === 'Não Pago' ? 'Não pago' : filters.paymentStatus) });
  if (filters.payerName) tags.push({ key: 'payerName', label: 'Pagador: ' + filters.payerName });
  if (filters.motorModel) tags.push({ key: 'motorModel', label: 'Motor: ' + filters.motorModel });
  if (filters.displacement) tags.push({ key: 'displacement', label: 'Cilindrada: ' + filters.displacement });
  if (filters.serviceType) tags.push({ key: 'serviceType', label: 'Serviço: ' + filters.serviceType });
  if (filters.partsLeft) tags.push({ key: 'partsLeft', label: 'Material: ' + filters.partsLeft });
  if (filters.clientId) tags.push({ key: 'clientId', label: 'Cliente: ' + clientName });
  if (filters.clientType) tags.push({ key: 'clientType', label: filters.clientType === 'mechanic' ? 'Tipo: mecânico' : 'Tipo: cliente' });
  if (filters.osId) tags.push({ key: 'osId', label: 'Nº O.S.: ' + filters.osId });
  if (filters.dateFrom) tags.push({ key: 'dateFrom', label: 'De ' + brDate(filters.dateFrom) });
  if (filters.dateTo) tags.push({ key: 'dateTo', label: 'Até ' + brDate(filters.dateTo) });
  if (filters.minValue) tags.push({ key: 'minValue', label: 'Mín. R$ ' + filters.minValue });
  if (filters.maxValue) tags.push({ key: 'maxValue', label: 'Máx. R$ ' + filters.maxValue });

  const chipClass = (active: boolean) =>
    cn(
      'inline-flex items-center gap-1.5 h-9 px-4 rounded-xl border text-sm font-medium whitespace-nowrap transition-all cursor-pointer',
      active
        ? 'bg-foreground text-background border-foreground shadow-sm'
        : 'bg-card text-foreground border-border/70 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:bg-muted/60 hover:border-border'
    );

  const filterButtons = (
    <>
      <button
        type='button'
        onClick={() => setPanelOpen((v) => !v)}
        aria-expanded={panelOpen}
        className={cn(
          'inline-flex items-center gap-2 h-9 px-4 rounded-xl border text-sm font-medium transition-all cursor-pointer',
          panelOpen || panelCount > 0 ? 'border-primary/60 bg-primary/5 text-foreground' : 'bg-card text-foreground border-border/70 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:bg-muted/60 hover:border-border'
        )}
      >
        <Filter className='w-4 h-4' />
        Filtros
        {panelCount > 0 && (
          <span className='min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center px-1'>{panelCount}</span>
        )}
        <ChevronDown className={cn('w-3.5 h-3.5 text-muted-foreground transition-transform', panelOpen && 'rotate-180')} />
      </button>

      {hasActiveFilters && (
        <button
          type='button'
          onClick={() => { onClear(); setLocalSearch(''); }}
          className='inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer'
        >
          <RotateCcw className='w-3.5 h-3.5' /> Limpar
        </button>
      )}
    </>
  );

  const rightControls = (
    <>
      {showSearch && (
        <div className='relative w-64 max-w-full'>
          <Search className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
          <input
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder='Buscar O.S., cliente, telefone...'
            className={cn('h-9 w-full rounded-xl border bg-card pl-9 pr-8 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20', localSearch ? triggerActive : 'border-border')}
          />
          {localSearch && (
            <button type='button' onClick={() => setLocalSearch('')} className='absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground'>
              <X className='w-3.5 h-3.5' />
            </button>
          )}
        </div>
      )}

      <FilterDropdown
        icon={ArrowUpDown}
        value={sort.field}
        onChange={(v) => onSortChange({ field: (v || 'id') as SortField, direction: sort.direction })}
        options={SORT_OPTIONS.map((o) => ({ value: o.field, label: o.label }))}
        align='end'
        title='Ordenar por'
        className='h-9 w-auto rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
      />
      <button
        type='button'
        title={sort.direction === 'desc' ? 'Decrescente (clique para inverter)' : 'Crescente (clique para inverter)'}
        onClick={() => onSortChange({ field: sort.field, direction: sort.direction === 'desc' ? 'asc' : 'desc' })}
        className='h-9 w-9 shrink-0 flex items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:text-foreground hover:bg-muted cursor-pointer'
      >
        {sort.direction === 'desc' ? <ArrowDown className='w-4 h-4' /> : <ArrowUp className='w-4 h-4' />}
      </button>

      {onPageSizeChange && pageSize !== undefined && (
        <FilterDropdown
          value={String(pageSize)}
          onChange={(v) => onPageSizeChange(Number(v))}
          options={[10, 20, 50, 100].map((n) => ({ value: String(n), label: `Exibir ${n}` }))}
          align='end'
          title='O.S. por página'
          className='h-9 w-auto rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
        />
      )}

      {/* Contagem só aparece quando não há chips de status */}
      {(loading || !showServiceStatus) && (
        <span className='text-sm text-muted-foreground whitespace-nowrap pl-1'>
          {loading && <Loader2 className='inline w-3.5 h-3.5 mr-1 animate-spin' />}
          {resultCount === totalCount
            ? <><span className='font-semibold text-foreground tabular-nums'>{totalCount}</span> O.S.</>
            : <><span className='font-semibold text-foreground tabular-nums'>{resultCount}</span> de <span className='tabular-nums'>{totalCount}</span> O.S.</>}
        </span>
      )}
    </>
  );

  return (
    <div className={cn('w-full space-y-3', className)}>
      {showServiceStatus ? (
        /* ═══ Status da O.S. + Filtros à esquerda; ordenação e quantidade à direita ═══ */
        <div>
          <div className='flex items-center gap-2 flex-wrap'>
            <div className='contents' role='tablist' aria-label='Status da O.S.'>
              <button type='button' role='tab' aria-selected={!filters.serviceStatus} onClick={() => updateFilter('serviceStatus', '')} className={chipClass(!filters.serviceStatus)}>
                Todas
              </button>
              {statusChips.map((s) => {
                const active = filters.serviceStatus === s;
                return (
                  <button key={s} type='button' role='tab' aria-selected={active} onClick={() => updateFilter('serviceStatus', active ? '' : s)} className={chipClass(active)}>
                    {STATUS_LABEL[s] || s}
                  </button>
                );
              })}
            </div>
            <span className='w-px h-6 bg-border mx-1' aria-hidden />
            {filterButtons}
            <div className='ml-auto flex items-center gap-2 flex-wrap'>
              <span className='hidden xl:block w-px h-6 bg-border mx-1' aria-hidden />
              {rightControls}
            </div>
          </div>
        </div>
      ) : (
        /* ═══ Filtros / Limpar à esquerda; busca, ordenação e quantidade à direita ═══ */
        <div className='flex items-center gap-2 flex-wrap'>
          {filterButtons}
          <div className='ml-auto flex items-center gap-2 flex-wrap'>
            {rightControls}
          </div>
        </div>
      )}

      {/* ═══ Painel de filtros (compacto, por grupos) ═══ */}
      {panelOpen && (
        <div className='rounded-xl border border-border bg-card p-4 shadow-sm animate-in fade-in-0 slide-in-from-top-1 duration-150'>
          <div className='grid gap-5 grid-cols-1 md:grid-cols-2 xl:grid-cols-3'>
            {(showPaymentMethod || showPaymentStatus || showPayerName) && (
              <Section icon={CircleDollarSign} title='Pagamento'>
                {showPaymentStatus && (
                  <Field label='Situação'>
                    <FilterDropdown
                      icon={CircleDollarSign}
                      value={filters.paymentStatus}
                      onChange={(v) => updateFilter('paymentStatus', v)}
                      allLabel='Todas'
                      options={[{ value: 'Não Pago', label: 'Não pago' }, { value: 'Entrada', label: 'Entrada' }, { value: 'Pago', label: 'Pago' }]}
                    />
                  </Field>
                )}
                {showPaymentMethod && (
                  <Field label='Forma'>
                    <FilterDropdown
                      icon={CreditCard}
                      value={filters.paymentMethod}
                      onChange={(v) => updateFilter('paymentMethod', v)}
                      allLabel='Todas'
                      options={['PIX', 'Dinheiro', 'Débito', 'Crédito à Vista', 'Crédito 2x', 'Crédito 3x'].map((m) => ({ value: m, label: m }))}
                    />
                  </Field>
                )}
                {showPayerName && (
                  <Field label='Pagador' className='col-span-2'>
                    <TextField icon={User} value={localPayerName} onChange={setLocalPayerName} placeholder='Nome de quem pagou' />
                  </Field>
                )}
              </Section>
            )}

            {(showMotor || showDisplacement || showServiceType || showPartsLeft) && (
              <Section icon={Cog} title='Motor e serviço'>
                {showMotor && (
                  <Field label='Motor'>
                    <FilterDropdown icon={Cog} value={filters.motorModel} onChange={(v) => updateFilter('motorModel', v)} allLabel='Todos' options={motors.map((m) => ({ value: m, label: m }))} searchable searchPlaceholder='Buscar motor...' />
                  </Field>
                )}
                {showDisplacement && (
                  <Field label='Cilindrada'>
                    <FilterDropdown icon={Gauge} value={filters.displacement} onChange={(v) => updateFilter('displacement', v)} allLabel='Todas' options={displacements.map((d) => ({ value: d, label: d }))} />
                  </Field>
                )}
                {showServiceType && (
                  <Field label='Serviço'>
                    <FilterDropdown icon={Wrench} value={filters.serviceType} onChange={(v) => updateFilter('serviceType', v)} allLabel='Todos' options={serviceTypes.map((t) => ({ value: t, label: t }))} searchable searchPlaceholder='Buscar serviço...' />
                  </Field>
                )}
                {showPartsLeft && (
                  <Field label='Material deixado'>
                    <FilterDropdown icon={Package} value={filters.partsLeft} onChange={(v) => updateFilter('partsLeft', v)} allLabel='Todos' options={partsLeft.map((p) => ({ value: p, label: p }))} />
                  </Field>
                )}
              </Section>
            )}

            {(showClient || showClientType || showDates || showValues || showSearch) && (
              <Section icon={User} title='Cliente, período e valor'>
                {showClient && (
                  <Field label='Cliente'>
                    <FilterDropdown
                      icon={User}
                      value={filters.clientId}
                      onChange={(v) => updateFilter('clientId', v)}
                      allLabel='Todos'
                      options={clients.map((c) => ({ value: c.id, label: c.name, hint: c.phone }))}
                      searchable
                      searchPlaceholder='Nome, telefone ou documento...'
                    />
                  </Field>
                )}
                {showClientType && (
                  <Field label='Tipo'>
                    <FilterDropdown icon={Users} value={filters.clientType} onChange={(v) => updateFilter('clientType', v)} allLabel='Todos' options={[{ value: 'regular', label: 'Cliente' }, { value: 'mechanic', label: 'Mecânico' }]} />
                  </Field>
                )}
                {showDates && (
                  <>
                    <Field label='De'>
                      <DateField value={filters.dateFrom} onChange={(v) => updateFilter('dateFrom', v)} placeholder='dd/mm/aaaa' />
                    </Field>
                    <Field label='Até'>
                      <DateField value={filters.dateTo} onChange={(v) => updateFilter('dateTo', v)} placeholder='dd/mm/aaaa' />
                    </Field>
                  </>
                )}
                {showValues && (
                  <>
                    <Field label='Valor mínimo'>
                      <TextField icon={DollarSign} type='number' value={localMinValue} onChange={setLocalMinValue} placeholder='0,00' className='tabular-nums' />
                    </Field>
                    <Field label='Valor máximo'>
                      <TextField icon={DollarSign} type='number' value={localMaxValue} onChange={setLocalMaxValue} placeholder='0,00' className='tabular-nums' />
                    </Field>
                  </>
                )}
                {showSearch && (
                  <Field label='Nº da O.S.'>
                    <TextField icon={Hash} value={localOsId} onChange={setLocalOsId} placeholder='Ex.: 8454' className='tabular-nums' />
                  </Field>
                )}
              </Section>
            )}
          </div>

          <div className='flex items-center justify-between gap-3 mt-4 pt-3 border-t border-border'>
            <button
              type='button'
              onClick={() => onFilterChange({ ...filters, ...Object.fromEntries(panelKeys.map((k) => [k, ''])) })}
              disabled={panelCount === 0}
              className='inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer'
            >
              <RotateCcw className='w-3.5 h-3.5' /> Limpar estes filtros
            </button>
            <button type='button' onClick={() => setPanelOpen(false)} className='solid-btn h-8 px-4 rounded-lg text-sm font-semibold cursor-pointer'>
              Ver {resultCount} O.S.
            </button>
          </div>
        </div>
      )}

      {/* ═══ Filtros aplicados (com o painel fechado) ═══ */}
      {!panelOpen && tags.length > 0 && (
        <div className='flex flex-wrap items-center gap-1.5'>
          {tags.map((t) => (
            <FilterTag key={t.key} label={t.label} onRemove={() => updateFilter(t.key, '')} />
          ))}
        </div>
      )}
    </div>
  );
}
