'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import {
  Search,
  X,
  SlidersHorizontal,
  RotateCcw,
  Calendar,
  DollarSign,
  User,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronsUpDown,
  Check,
  Loader2,
  Hash,
  Filter,
  CreditCard,
  CircleDollarSign,
  ListChecks,
  Package,
  Cog,
  Gauge,
  Wrench,
  Users,
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
  /** Mantido por compatibilidade: o status da O.S. agora fica sempre nos campos principais */
  showStatusInBar?: boolean;
  /** Quando informado, mostra "Exibir N por página" no cabeçalho dos filtros */
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
}

function FilterField({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-1.5 min-w-0', className)}>
      <span className='text-xs font-semibold uppercase tracking-wide text-muted-foreground px-0.5 truncate'>{label}</span>
      {children}
    </div>
  );
}

// Padrão visual dos campos de filtro: altura 40px, ícone à esquerda, seta à direita
const controlBase = 'h-10 w-full rounded-xl border bg-card pl-9 pr-8 text-sm font-semibold text-foreground outline-none transition-colors cursor-pointer appearance-none hover:border-foreground/25 focus:border-primary focus:ring-2 focus:ring-primary/20';
const controlActive = 'border-primary/70 bg-primary/5';
const comboBase = 'h-10 w-full justify-start gap-2 rounded-xl bg-card px-3 text-sm font-semibold text-foreground hover:bg-card hover:border-foreground/25';

function FilterSelect({ icon: Icon, value, onChange, allLabel, options, title }: {
  icon: React.ElementType; value: string; onChange: (value: string) => void; allLabel: string;
  options: { value: string; label: string }[]; title?: string;
}) {
  return (
    <div className='relative'>
      <Icon className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        title={title}
        className={cn(controlBase, 'truncate', value ? controlActive : 'border-border')}
      >
        <option value=''>{allLabel}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
    </div>
  );
}

function AdvancedSection({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className='rounded-xl border border-border bg-card p-4 space-y-3'>
      <div className='flex items-center gap-2'>
        <Icon className='w-4 h-4 text-muted-foreground' />
        <span className='text-sm font-semibold text-foreground'>{title}</span>
      </div>
      {children}
    </div>
  );
}

function FilterTag({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-full text-xs font-semibold bg-primary/10 text-foreground border border-primary/25 transition-all hover:bg-primary/15 group">
      {label}
      <button onClick={onRemove} title="Remover filtro" className="w-4 h-4 rounded-full inline-flex items-center justify-center hover:bg-destructive/20 hover:text-destructive transition-colors">
        <X className="w-3 h-3" />
      </button>
    </span>
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

function DateField({ value, onChange, placeholder, className }: { value: string; onChange: (value: string) => void; placeholder: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const selected = parseDateValue(value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button variant='outline' className={cn('w-full justify-start gap-2 font-semibold h-10 rounded-xl px-3 text-sm border border-border bg-card', className)}>
            <Calendar className='h-4 w-4 text-muted-foreground shrink-0' />
            <span className={cn('truncate', !selected && 'font-normal text-[var(--placeholder,var(--muted-foreground))]')}>{selected ? selected.toLocaleDateString('pt-BR') : placeholder}</span>
          </Button>
        }
      />
      <PopoverContent className='z-50 w-auto p-0 shadow-lg border border-border rounded-lg overflow-hidden bg-popover' align='start'>
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

function SortButton({ label, field, currentField, direction, onSort }: {
  label: string; field: SortField; currentField: SortField; direction: SortDirection; onSort: (field: SortField, dir: SortDirection) => void;
}) {
  const isActive = currentField === field;
  return (
    <button
      onClick={() => { onSort(field, isActive && direction === 'desc' ? 'asc' : 'desc'); }}
      className={cn(
        'flex items-center gap-1.5 px-3 h-9 rounded-xl text-sm font-semibold border transition-all duration-200',
        isActive ? 'solid-btn border-transparent shadow-sm' : 'border-border text-muted-foreground hover:text-foreground hover:bg-secondary/60'
      )}
    >
      {label}
      {isActive && (
        direction === 'desc' 
          ? <ArrowDown className="w-3 h-3 stroke-[2]" /> 
          : <ArrowUp className="w-3 h-3 stroke-[2]" />
      )}
    </button>
  );
}

function ActiveFilters({ filters, clients, onRemoveFilter, onClear, count }: {
  filters: FilterValues; clients: ClientOption[]; onRemoveFilter: (key: keyof FilterValues) => void; onClear: () => void; count: number;
}) {
  const tags: { key: keyof FilterValues; label: string }[] = [];
  if (filters.search) tags.push({ key: 'search', label: 'Busca: ' + filters.search });
  if (filters.osId) tags.push({ key: 'osId', label: 'Nº O.S.: ' + filters.osId });
  if (filters.clientId) {
    const clientName = clients.find(c => c.id === filters.clientId)?.name || 'Cliente selecionado';
    tags.push({ key: 'clientId', label: 'Cliente: ' + clientName });
  }
  if (filters.motorModel) tags.push({ key: 'motorModel', label: 'Motor: ' + filters.motorModel });
  if (filters.displacement) tags.push({ key: 'displacement', label: 'Cilindrada: ' + filters.displacement });
  if (filters.paymentMethod) tags.push({ key: 'paymentMethod', label: 'Forma de pagamento: ' + filters.paymentMethod });
  if (filters.paymentStatus) tags.push({ key: 'paymentStatus', label: 'Pagamento: ' + filters.paymentStatus });
  if (filters.serviceType) tags.push({ key: 'serviceType', label: 'Serviço: ' + filters.serviceType });
  if (filters.serviceStatus) tags.push({ key: 'serviceStatus', label: 'Status: ' + filters.serviceStatus });
  if (filters.dateFrom) tags.push({ key: 'dateFrom', label: 'De: ' + filters.dateFrom });
  if (filters.dateTo) tags.push({ key: 'dateTo', label: 'Até: ' + filters.dateTo });
  if (filters.minValue) tags.push({ key: 'minValue', label: 'Min: R$ ' + filters.minValue });
  if (filters.maxValue) tags.push({ key: 'maxValue', label: 'Max: R$ ' + filters.maxValue });
  if (filters.clientType) tags.push({ key: 'clientType', label: filters.clientType === 'mechanic' ? 'Tipo: MECÂNICO' : 'Tipo: CLIENTE' });
  if (filters.partsLeft) tags.push({ key: 'partsLeft', label: 'Material: ' + filters.partsLeft });
  if (filters.payerName) tags.push({ key: 'payerName', label: 'Pagador: ' + filters.payerName });

  if (tags.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border">
      <div className="flex items-center gap-1.5 mr-1">
        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
        <span className="text-xs text-muted-foreground font-semibold">Filtros ativos:</span>
      </div>
      {tags.map((t) => <FilterTag key={t.key} label={t.label} onRemove={() => onRemoveFilter(t.key)} />)}
      {tags.length > 1 && (
        <button onClick={onClear} className="text-xs text-muted-foreground hover:text-destructive transition-colors font-semibold ml-1">
          Limpar tudo
        </button>
      )}
    </div>
  );
}

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
  paymentMethods,
  paymentStatuses,
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
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [clientOpen, setClientOpen] = useState(false);
  const [motorOpen, setMotorOpen] = useState(false);
  const [serviceTypeOpen, setServiceTypeOpen] = useState(false);

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
    const timer = setTimeout(() => {
      if (localSearch !== filters.search) {
        onFilterChange({ ...filters, search: localSearch });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, filters, onFilterChange]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localOsId !== filters.osId) {
        onFilterChange({ ...filters, osId: localOsId });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localOsId, filters, onFilterChange]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localMinValue !== filters.minValue) {
        onFilterChange({ ...filters, minValue: localMinValue });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localMinValue, filters, onFilterChange]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localMaxValue !== filters.maxValue) {
        onFilterChange({ ...filters, maxValue: localMaxValue });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localMaxValue, filters, onFilterChange]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localPayerName !== (filters.payerName || '')) {
        onFilterChange({ ...filters, payerName: localPayerName });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localPayerName, filters, onFilterChange]);

  const hasActiveFilters = useMemo(() => Object.values(filters).some((v) => v !== ''), [filters]);
  const activeFilterCount = useMemo(() => Object.values(filters).filter((v) => v !== '').length, [filters]);
  const selectedClientName = useMemo(() => clients.find((c) => c.id === filters.clientId)?.name || '', [clients, filters.clientId]);

  const updateFilter = (key: keyof FilterValues, value: string | null) => {
    onFilterChange({ ...filters, [key]: value ?? '' });
  };
  const removeFilter = (key: keyof FilterValues) => { updateFilter(key, ''); };

  const sortOptions: { label: string; field: SortField }[] = [
    { label: 'Nº O.S.', field: 'id' },
    { label: 'Data', field: 'date' },
    { label: 'Cliente', field: 'client' },
    { label: 'Valor', field: 'value' },
    { label: 'Status', field: 'status' },
  ];

  const advancedFilterCount = useMemo(
    () => (['osId', 'clientId', 'clientType', 'dateFrom', 'dateTo', 'minValue', 'maxValue'] as (keyof FilterValues)[])
      .filter((k) => filters[k] !== '').length,
    [filters]
  );

  const paymentMethodOptions = ['PIX', 'Dinheiro', 'Débito', 'Crédito à Vista', 'Crédito 2x', 'Crédito 3x'].map((m) => ({ value: m, label: m }));
  const paymentStatusOptions = [
    { value: 'Não Pago', label: 'Não pago' },
    { value: 'Entrada', label: 'Entrada' },
    { value: 'Pago', label: 'Pago' },
  ];

  return (
    <div className={cn('w-full rounded-2xl border border-border bg-card shadow-sm overflow-hidden', className)}>
      {/* ═══ Cabeçalho: título, contagem e ações ═══ */}
      <div className='flex items-center justify-between gap-4 flex-wrap px-5 py-4 bg-muted/40 border-b border-border'>
        <div className='flex items-center gap-3 min-w-0 flex-1 basis-[280px]'>
          <div className='w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0'>
            <Filter className='w-5 h-5 stroke-[1.75]' />
          </div>
          <div className='min-w-0'>
            <div className='flex items-center gap-2'>
              <h3 className='text-base font-bold text-foreground'>Filtros</h3>
              <span className='px-2 py-0.5 rounded-full bg-card border border-border text-xs text-muted-foreground whitespace-nowrap'>
                {resultCount === totalCount
                  ? <><span className='font-bold text-foreground tabular-nums'>{totalCount}</span> O.S.</>
                  : <><span className='font-bold text-foreground tabular-nums'>{resultCount}</span> de <span className='tabular-nums'>{totalCount}</span> O.S.</>}
              </span>
              {loading && <Loader2 className='w-3.5 h-3.5 animate-spin text-muted-foreground' />}
            </div>
            <p className='text-sm text-muted-foreground truncate'>Refine sua busca e encontre as ordens de serviço rapidamente.</p>
          </div>
        </div>

        <div className='flex items-center gap-2 flex-wrap shrink-0'>
          <Button
            variant='outline'
            onClick={onClear}
            disabled={!hasActiveFilters}
            className='h-10 px-4 gap-2 rounded-xl border-border bg-card text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-50'
          >
            <RotateCcw className='w-4 h-4' /> Limpar filtros
          </Button>
          <Button
            onClick={() => setShowAdvancedFilters(true)}
            className='solid-btn h-10 px-4 gap-2 rounded-xl text-sm font-bold'
          >
            <SlidersHorizontal className='w-4 h-4' />
            Filtros avançados
            {advancedFilterCount > 0 && (
              <span className='min-w-[20px] h-5 rounded-full bg-primary-foreground text-primary text-xs font-bold flex items-center justify-center px-1.5'>
                {advancedFilterCount}
              </span>
            )}
            <ChevronDown className='w-4 h-4 opacity-80' />
          </Button>
          {onPageSizeChange && pageSize !== undefined && (
            <>
              <div className='hidden sm:block w-px h-8 bg-border mx-2' />
              <label className='flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap'>
                Exibir
                <span className='relative'>
                  <select
                    value={pageSize}
                    onChange={(e) => onPageSizeChange(Number(e.target.value))}
                    className='h-10 pl-3 pr-8 rounded-xl border border-border bg-card text-sm font-semibold text-foreground outline-none appearance-none cursor-pointer focus:border-primary focus:ring-2 focus:ring-primary/20'
                  >
                    {[10, 20, 50, 100].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <ChevronDown className='pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
                </span>
                por página
              </label>
            </>
          )}
        </div>
      </div>

      {/* ═══ Campos ═══ */}
      <div className='px-5 py-4 space-y-3'>
        <div className='grid gap-3 grid-cols-2 md:grid-cols-4 min-[1600px]:grid-cols-8'>
          {showSearch && (
            <FilterField label='Buscar' className='col-span-2'>
              <div className='relative'>
                <Search className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
                <Input
                  placeholder='Nº da O.S., cliente, telefone ou motor'
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  className={cn(controlBase, 'pr-3 cursor-text', localSearch ? controlActive : 'border-border')}
                />
              </div>
            </FilterField>
          )}

          {showPaymentMethod && (
            <FilterField label='Forma pagto'>
              <FilterSelect icon={CreditCard} value={filters.paymentMethod} onChange={(v) => updateFilter('paymentMethod', v)} allLabel='Todas' options={paymentMethodOptions} title='Forma de pagamento' />
            </FilterField>
          )}

          {showPaymentStatus && (
            <FilterField label='Status pagto'>
              <FilterSelect icon={CircleDollarSign} value={filters.paymentStatus} onChange={(v) => updateFilter('paymentStatus', v)} allLabel='Todos' options={paymentStatusOptions} title='Situação do pagamento' />
            </FilterField>
          )}

          {showServiceStatus && (
            <FilterField label='Status ordem'>
              <FilterSelect icon={ListChecks} value={filters.serviceStatus} onChange={(v) => updateFilter('serviceStatus', v)} allLabel='Todos' options={serviceStatuses.map((s) => ({ value: s, label: s }))} title='Status da O.S.' />
            </FilterField>
          )}

          {showPayerName && (
            <FilterField label='Pagador'>
              <div className='relative'>
                <User className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
                <Input
                  placeholder='Pagador...'
                  value={localPayerName}
                  onChange={(e) => setLocalPayerName(e.target.value)}
                  className={cn(controlBase, 'pr-3 cursor-text', localPayerName ? controlActive : 'border-border')}
                />
              </div>
            </FilterField>
          )}

          {showPartsLeft && (
            <FilterField label='Material deixado'>
              <FilterSelect icon={Package} value={filters.partsLeft} onChange={(v) => updateFilter('partsLeft', v)} allLabel='Todos' options={partsLeft.map((p) => ({ value: p, label: p }))} title='Material deixado' />
            </FilterField>
          )}

          {showMotor && (
            <FilterField label='Motor'>
              <Popover open={motorOpen} onOpenChange={setMotorOpen}>
                <PopoverTrigger
                  render={
                    <Button variant='outline' role='combobox' className={cn(comboBase, filters.motorModel ? controlActive : 'border-border')}>
                      <Cog className='w-4 h-4 text-muted-foreground shrink-0' />
                      <span className='truncate'>{filters.motorModel || 'Todos'}</span>
                      <ChevronDown className='ml-auto w-4 h-4 text-muted-foreground shrink-0' />
                    </Button>
                  }
                />
                <PopoverContent className='z-[10000] w-[260px] p-0 shadow-lg border border-border rounded-xl overflow-hidden bg-popover' align='start'>
                  <Command className='bg-transparent'>
                    <CommandInput placeholder='Buscar motor...' className='h-9 text-sm' />
                    <CommandList className='max-h-[240px]'>
                      <CommandEmpty className='py-3 text-center text-xs text-muted-foreground'>Nenhum motor encontrado</CommandEmpty>
                      <CommandGroup heading='Motores cadastrados' className='px-2 pb-2'>
                        <CommandItem
                          value='todos-os-motores'
                          onSelect={() => { updateFilter('motorModel', ''); setMotorOpen(false); }}
                          className='flex items-center justify-between rounded-lg py-1.5 px-2.5 hover:bg-secondary cursor-pointer'
                        >
                          <span className='text-sm font-medium'>Todos</span>
                          {!filters.motorModel && <Check className='h-4 w-4 text-primary' />}
                        </CommandItem>
                        {motors.map((m) => (
                          <CommandItem
                            key={m}
                            value={m}
                            onSelect={() => { updateFilter('motorModel', filters.motorModel === m ? '' : m); setMotorOpen(false); }}
                            className='flex items-center justify-between rounded-lg py-1.5 px-2.5 hover:bg-secondary cursor-pointer'
                          >
                            <span className='text-sm font-medium uppercase truncate'>{m}</span>
                            {filters.motorModel === m && <Check className='h-4 w-4 text-primary shrink-0' />}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </FilterField>
          )}

          {showDisplacement && (
            <FilterField label='Cilindrada'>
              <FilterSelect icon={Gauge} value={filters.displacement} onChange={(v) => updateFilter('displacement', v)} allLabel='Todas' options={displacements.map((d) => ({ value: d, label: d }))} title='Cilindrada' />
            </FilterField>
          )}

          {showServiceType && (
            <FilterField label='Tipo serviço'>
              <Popover open={serviceTypeOpen} onOpenChange={setServiceTypeOpen}>
                <PopoverTrigger
                  render={
                    <Button variant='outline' role='combobox' className={cn(comboBase, filters.serviceType ? controlActive : 'border-border')}>
                      <Wrench className='w-4 h-4 text-muted-foreground shrink-0' />
                      <span className='truncate'>{filters.serviceType || 'Todos'}</span>
                      <ChevronDown className='ml-auto w-4 h-4 text-muted-foreground shrink-0' />
                    </Button>
                  }
                />
                <PopoverContent className='z-[10000] w-[280px] p-0 shadow-lg border border-border rounded-xl overflow-hidden bg-popover' align='end'>
                  <Command className='bg-transparent'>
                    <CommandInput placeholder='Buscar serviço...' className='h-9 text-sm' />
                    <CommandList className='max-h-[240px]'>
                      <CommandEmpty className='py-3 text-center text-xs text-muted-foreground'>Nenhum serviço encontrado</CommandEmpty>
                      <CommandGroup heading='Serviços cadastrados' className='px-2 pb-2'>
                        <CommandItem
                          value='todos-os-servicos'
                          onSelect={() => { updateFilter('serviceType', ''); setServiceTypeOpen(false); }}
                          className='flex items-center justify-between rounded-lg py-1.5 px-2.5 hover:bg-secondary cursor-pointer'
                        >
                          <span className='text-sm font-medium'>Todos</span>
                          {!filters.serviceType && <Check className='h-4 w-4 text-primary' />}
                        </CommandItem>
                        {serviceTypes.map((t) => (
                          <CommandItem
                            key={t}
                            value={t}
                            onSelect={() => { updateFilter('serviceType', filters.serviceType === t ? '' : t); setServiceTypeOpen(false); }}
                            className='flex items-center justify-between rounded-lg py-1.5 px-2.5 hover:bg-secondary cursor-pointer'
                          >
                            <span className='text-sm font-medium uppercase truncate'>{t}</span>
                            {filters.serviceType === t && <Check className='h-4 w-4 text-primary shrink-0' />}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </FilterField>
          )}
        </div>

        <ActiveFilters filters={filters} clients={clients} onRemoveFilter={removeFilter} onClear={onClear} count={resultCount} />
      </div>

      {/* ═══ Filtros avançados (painel lateral) ═══ */}
      {showAdvancedFilters && (
        <div className='fixed inset-0 z-[9999] flex justify-end overflow-hidden'>
          <div
            className='fixed inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity duration-200'
            onClick={() => setShowAdvancedFilters(false)}
          />

          <div className='relative z-10 w-full max-w-md sm:max-w-lg h-full bg-card border-l border-border shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200'>
            <div className='px-5 py-4 border-b border-border flex items-center justify-between bg-muted/40 shrink-0'>
              <div className='flex items-center gap-3'>
                <div className='w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center'>
                  <SlidersHorizontal className='w-4 h-4' />
                </div>
                <div>
                  <h3 className='text-base font-bold text-foreground'>Filtros avançados</h3>
                  <p className='text-xs text-muted-foreground'>Ordenação, cliente, período e valor.</p>
                </div>
              </div>
              <Button
                variant='ghost'
                onClick={() => setShowAdvancedFilters(false)}
                className='w-9 h-9 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground p-0 flex items-center justify-center'
              >
                <X className='w-4 h-4' />
              </Button>
            </div>

            <div className='flex-1 overflow-y-auto p-5 space-y-4 min-h-0'>
              {/* Ordenação */}
              <AdvancedSection icon={ArrowUpDown} title='Ordenar resultados por'>
                <div className='flex flex-wrap items-center gap-1.5'>
                  {sortOptions.map((opt) => (
                    <SortButton
                      key={opt.field}
                      label={opt.label}
                      field={opt.field}
                      currentField={sort.field}
                      direction={sort.direction}
                      onSort={(f, d) => onSortChange({ field: f, direction: d })}
                    />
                  ))}
                </div>
              </AdvancedSection>

              {/* Nº da O.S. */}
              {showSearch && (
                <AdvancedSection icon={Hash} title='Nº da O.S.'>
                  <div className='relative'>
                    <Hash className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
                    <Input
                      placeholder='Ex: 8454'
                      value={localOsId}
                      onChange={(e) => setLocalOsId(e.target.value)}
                      className={cn(controlBase, 'pr-3 cursor-text font-mono', localOsId ? controlActive : 'border-border')}
                    />
                  </div>
                </AdvancedSection>
              )}

              {/* Cliente */}
              {(showClient || showClientType) && (
                <AdvancedSection icon={User} title='Cliente'>
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                    {showClient && (
                      <FilterField label='Cliente'>
                        <Popover open={clientOpen} onOpenChange={setClientOpen}>
                          <PopoverTrigger
                            render={
                              <Button variant='outline' role='combobox' className={cn(comboBase, filters.clientId ? controlActive : 'border-border')}>
                                <User className='w-4 h-4 text-muted-foreground shrink-0' />
                                <span className='truncate'>{selectedClientName || 'Todos os clientes'}</span>
                                <ChevronDown className='ml-auto w-4 h-4 text-muted-foreground shrink-0' />
                              </Button>
                            }
                          />
                          <PopoverContent className='z-[10000] w-[300px] p-0 shadow-lg border border-border rounded-xl overflow-hidden bg-popover' align='start'>
                            <Command className='bg-transparent'>
                              <CommandInput placeholder='Buscar por nome ou documento...' className='h-9 text-sm' />
                              <CommandList className='max-h-[220px]'>
                                <CommandEmpty className='py-3 text-center text-xs text-muted-foreground'>Nenhum cliente encontrado</CommandEmpty>
                                <CommandGroup heading='Clientes cadastrados' className='px-2 pb-2'>
                                  <CommandItem
                                    value='todos-os-clientes'
                                    onSelect={() => { updateFilter('clientId', ''); setClientOpen(false); }}
                                    className='flex items-center justify-between rounded-lg py-1.5 px-2.5 hover:bg-secondary cursor-pointer'
                                  >
                                    <span className='text-sm font-medium'>Todos os clientes</span>
                                    {!filters.clientId && <Check className='h-4 w-4 text-primary' />}
                                  </CommandItem>
                                  {clients.map((c) => (
                                    <CommandItem
                                      key={c.id}
                                      value={c.name + ' ' + c.phone + ' ' + c.document}
                                      onSelect={() => { updateFilter('clientId', filters.clientId === c.id ? '' : c.id); setClientOpen(false); }}
                                      className='flex items-center justify-between rounded-lg py-1.5 px-2.5 hover:bg-secondary cursor-pointer'
                                    >
                                      <div className='flex flex-col min-w-0'>
                                        <span className='text-sm font-medium uppercase truncate'>{c.name}</span>
                                        <span className='text-xs text-muted-foreground tabular-nums'>{c.phone}</span>
                                      </div>
                                      {filters.clientId === c.id && <Check className='h-4 w-4 text-primary shrink-0' />}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </FilterField>
                    )}
                    {showClientType && (
                      <FilterField label='Tipo de cliente'>
                        <FilterSelect
                          icon={Users}
                          value={filters.clientType}
                          onChange={(v) => updateFilter('clientType', v)}
                          allLabel='Todos'
                          options={[{ value: 'regular', label: 'Cliente' }, { value: 'mechanic', label: 'Mecânico' }]}
                          title='Tipo de cliente'
                        />
                      </FilterField>
                    )}
                  </div>
                </AdvancedSection>
              )}

              {/* Período */}
              {showDates && (
                <AdvancedSection icon={Calendar} title='Período'>
                  <div className='grid grid-cols-2 gap-3'>
                    <FilterField label='De'>
                      <DateField value={filters.dateFrom} onChange={(v) => updateFilter('dateFrom', v)} placeholder='dd/mm/aaaa' className={filters.dateFrom ? controlActive : undefined} />
                    </FilterField>
                    <FilterField label='Até'>
                      <DateField value={filters.dateTo} onChange={(v) => updateFilter('dateTo', v)} placeholder='dd/mm/aaaa' className={filters.dateTo ? controlActive : undefined} />
                    </FilterField>
                  </div>
                </AdvancedSection>
              )}

              {/* Valor */}
              {showValues && (
                <AdvancedSection icon={DollarSign} title='Valor'>
                  <div className='grid grid-cols-2 gap-3'>
                    <FilterField label='Mínimo'>
                      <div className='relative'>
                        <DollarSign className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
                        <Input
                          type='number'
                          step='0.01'
                          placeholder='R$ mínimo'
                          value={localMinValue}
                          onChange={(e) => setLocalMinValue(e.target.value)}
                          className={cn(controlBase, 'pr-3 cursor-text tabular-nums', localMinValue ? controlActive : 'border-border')}
                        />
                      </div>
                    </FilterField>
                    <FilterField label='Máximo'>
                      <div className='relative'>
                        <DollarSign className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
                        <Input
                          type='number'
                          step='0.01'
                          placeholder='R$ máximo'
                          value={localMaxValue}
                          onChange={(e) => setLocalMaxValue(e.target.value)}
                          className={cn(controlBase, 'pr-3 cursor-text tabular-nums', localMaxValue ? controlActive : 'border-border')}
                        />
                      </div>
                    </FilterField>
                  </div>
                </AdvancedSection>
              )}
            </div>

            <div className='px-5 py-4 border-t border-border bg-muted/40 flex items-center justify-between gap-3 shrink-0'>
              <Button
                variant='outline'
                onClick={onClear}
                disabled={!hasActiveFilters}
                className='h-10 px-4 gap-2 rounded-xl border-border bg-card text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-50'
              >
                <RotateCcw className='w-4 h-4' /> Limpar filtros
              </Button>
              <Button
                onClick={() => setShowAdvancedFilters(false)}
                className='solid-btn h-10 px-6 rounded-xl text-sm font-bold'
              >
                Ver resultados ({resultCount})
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
