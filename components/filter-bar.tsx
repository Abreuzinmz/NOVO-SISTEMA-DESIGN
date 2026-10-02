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
  /** Mantém Status Pagamento / Status Ordem na barra principal em vez de dentro de Filtros Avançados */
  showStatusInBar?: boolean;
}

function FilterField({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <span className='text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50 px-0.5'>{label}</span>
      {children}
    </div>
  );
}

function FilterTag({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 transition-all hover:bg-primary/15 group">
      {label}
      <button onClick={onRemove} className="ml-1 w-3.5 h-3.5 rounded-md inline-flex items-center justify-center hover:bg-destructive/20 hover:text-destructive transition-colors">
        <X className="w-2.5 h-2.5" />
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
          <Button variant='outline' className={cn('w-full justify-start font-semibold h-8 rounded-lg px-2.5 text-xs border border-border bg-card shadow-xs', className)}>
            <Calendar className='mr-1.5 h-3.5 w-3.5 text-muted-foreground/60 shrink-0' />
            <span className="truncate">{selected ? selected.toLocaleDateString('pt-BR') : placeholder}</span>
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
        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all duration-200',
        isActive ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground/60 hover:text-foreground hover:bg-secondary/45'
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
  if (filters.paymentMethod) tags.push({ key: 'paymentMethod', label: 'Forma Pagto: ' + filters.paymentMethod });
  if (filters.paymentStatus) tags.push({ key: 'paymentStatus', label: 'Status Pagto: ' + filters.paymentStatus });
  if (filters.serviceType) tags.push({ key: 'serviceType', label: 'Serviço: ' + filters.serviceType });
  if (filters.serviceStatus) tags.push({ key: 'serviceStatus', label: 'Status Serviço: ' + filters.serviceStatus });
  if (filters.dateFrom) tags.push({ key: 'dateFrom', label: 'De: ' + filters.dateFrom });
  if (filters.dateTo) tags.push({ key: 'dateTo', label: 'Até: ' + filters.dateTo });
  if (filters.minValue) tags.push({ key: 'minValue', label: 'Min: R$ ' + filters.minValue });
  if (filters.maxValue) tags.push({ key: 'maxValue', label: 'Max: R$ ' + filters.maxValue });
  if (filters.clientType) tags.push({ key: 'clientType', label: filters.clientType === 'mechanic' ? 'Tipo: MECÂNICO' : 'Tipo: CLIENTE' });
  if (filters.partsLeft) tags.push({ key: 'partsLeft', label: 'Material: ' + filters.partsLeft });
  if (filters.payerName) tags.push({ key: 'payerName', label: 'Pagador: ' + filters.payerName });

  if (tags.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      <div className="flex items-center gap-1.5 mr-1">
        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
        <span className="text-[10px] text-muted-foreground/70 font-bold uppercase tracking-wider">Filtros Ativos:</span>
      </div>
      {tags.map((t) => <FilterTag key={t.key} label={t.label} onRemove={() => onRemoveFilter(t.key)} />)}
      {tags.length > 1 && (
        <button onClick={onClear} className="text-[10px] text-muted-foreground hover:text-destructive transition-colors font-bold uppercase tracking-wider ml-1">
          Limpar Tudo
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
  showStatusInBar = false,
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

  return (
    <div className={cn('space-y-3 w-full', className)}>
      <div className='flex items-center justify-between gap-3 flex-wrap'>
        <div className='flex items-end gap-2 flex-wrap flex-1 min-w-0'>
          {showSearch && (
            <div className='flex items-end gap-2 flex-wrap'>
              <FilterField label='Buscar' className='flex-1 min-w-[180px] max-w-[240px]'>
                <div className='relative'>
                  <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60' />
                  <Input
                    placeholder='O.S., nome, telefone...'
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                    className='h-8 pl-9 pr-3 text-xs rounded-lg bg-card border-border w-full shadow-xs'
                  />
                </div>
              </FilterField>
              <FilterField label='Nº O.S.' className='w-[110px]'>
                <div className='relative'>
                  <Hash className='absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60' />
                  <Input
                    placeholder='Ex: 8454'
                    value={localOsId}
                    onChange={(e) => setLocalOsId(e.target.value)}
                    className='h-8 pl-8 pr-3 text-xs font-mono font-bold rounded-lg bg-card border-border w-full shadow-xs'
                  />
                </div>
              </FilterField>
            </div>
          )}

          {/* Controls do Grupo Financeiro sempre visíveis */}
          {showPaymentMethod && (
            <FilterField label='Forma Pagto'>
              <select
                value={filters.paymentMethod}
                onChange={(e) => updateFilter('paymentMethod', e.target.value)}
                className='h-8 text-xs font-semibold rounded-lg bg-card border border-border px-2 text-foreground outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer max-w-[135px]'
                title='Forma de Pagamento'
              >
                <option value=''>Todas</option>
                <option value='PIX'>PIX</option>
                <option value='Dinheiro'>Dinheiro</option>
                <option value='Débito'>Débito</option>
                <option value='Crédito à Vista'>Crédito à Vista</option>
                <option value='Crédito 2x'>Crédito 2x</option>
                <option value='Crédito 3x'>Crédito 3x</option>
              </select>
            </FilterField>
          )}

          {showStatusInBar && showPaymentStatus && (
            <FilterField label='Status Pagto'>
              <select
                value={filters.paymentStatus}
                onChange={(e) => updateFilter('paymentStatus', e.target.value)}
                className='h-8 text-xs font-semibold rounded-lg bg-card border border-border px-2 text-foreground outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer max-w-[135px]'
                title='Status de Pagamento'
              >
                <option value=''>Todos</option>
                <option value='Não Pago'>Não Pago</option>
                <option value='Entrada'>Entrada</option>
                <option value='Pago'>Pago</option>
              </select>
            </FilterField>
          )}

          {showStatusInBar && showServiceStatus && (
            <FilterField label='Status Ordem'>
              <select
                value={filters.serviceStatus}
                onChange={(e) => updateFilter('serviceStatus', e.target.value)}
                className='h-8 text-xs font-semibold rounded-lg bg-card border border-border px-2 text-foreground outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer max-w-[135px]'
                title='Status Ordem'
              >
                <option value=''>Todos</option>
                {serviceStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </FilterField>
          )}

          {showPayerName && (
            <FilterField label='Pagador' className='w-[130px]'>
              <div className='relative'>
                <User className='absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60' />
                <Input
                  placeholder='Pagador...'
                  value={localPayerName}
                  onChange={(e) => setLocalPayerName(e.target.value)}
                  className='h-8 pl-8 pr-2.5 text-xs rounded-lg bg-card border border-border w-full shadow-xs'
                />
              </div>
            </FilterField>
          )}

          {showPartsLeft && (
            <FilterField label='Material Deixado'>
              <select
                value={filters.partsLeft}
                onChange={(e) => updateFilter('partsLeft', e.target.value)}
                className='h-8 text-xs font-semibold rounded-lg bg-card border border-border px-2 text-foreground outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer max-w-[135px]'
                title='Material Deixado'
              >
                <option value=''>Todos</option>
                {partsLeft.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </FilterField>
          )}

          {showMotor && (
            <FilterField label='Motor'>
            <Popover open={motorOpen} onOpenChange={setMotorOpen}>
              <PopoverTrigger
                render={
                  <Button variant='outline' role='combobox' className='h-8 px-2.5 text-xs font-semibold rounded-lg bg-card border border-border justify-between max-w-[135px] shrink-0'>
                    <span className="truncate">{filters.motorModel || 'Todos'}</span>
                    <ChevronsUpDown className='ml-1 h-3 w-3 shrink-0 opacity-40' />
                  </Button>
                }
              />
              <PopoverContent className='z-[10000] w-[260px] p-0 shadow-lg border border-border rounded-lg overflow-hidden bg-popover' align='start'>
                <Command className="bg-transparent">
                  <CommandInput placeholder='Buscar motor...' className="h-8 text-xs" />
                  <CommandList className="max-h-[220px]">
                    <CommandEmpty className="py-3 text-center text-[10px] text-muted-foreground/60 font-bold uppercase tracking-wider">Nenhum motor encontrado</CommandEmpty>
                    <CommandGroup heading="Motores Cadastrados" className="px-2 pb-2">
                      <CommandItem
                        value="todos-os-motores"
                        onSelect={() => { updateFilter('motorModel', ''); setMotorOpen(false); }}
                        className='flex items-center justify-between rounded-lg py-1.5 px-2.5 hover:bg-secondary cursor-pointer'
                      >
                        <span className='text-xs font-bold uppercase tracking-tight'>Todos</span>
                        {!filters.motorModel && <Check className='h-3.5 w-3.5 text-foreground' />}
                      </CommandItem>
                      {motors.map((m) => (
                        <CommandItem
                          key={m}
                          value={m}
                          onSelect={() => { updateFilter('motorModel', filters.motorModel === m ? '' : m); setMotorOpen(false); }}
                          className='flex items-center justify-between rounded-lg py-1.5 px-2.5 hover:bg-secondary cursor-pointer'
                        >
                          <span className='text-xs font-bold uppercase tracking-tight truncate'>{m}</span>
                          {filters.motorModel === m && <Check className='h-3.5 w-3.5 text-foreground shrink-0' />}
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
              <select
                value={filters.displacement}
                onChange={(e) => updateFilter('displacement', e.target.value)}
                className='h-8 text-xs font-semibold rounded-lg bg-card border border-border px-2 text-foreground outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer max-w-[135px]'
                title='Cilindrada'
              >
                <option value=''>Todas</option>
                {displacements.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </FilterField>
          )}

          {showServiceType && (
            <FilterField label='Tipo Serviço'>
            <Popover open={serviceTypeOpen} onOpenChange={setServiceTypeOpen}>
              <PopoverTrigger
                render={
                  <Button variant='outline' role='combobox' className='h-8 px-2.5 text-xs font-semibold rounded-lg bg-card border border-border justify-between max-w-[135px] shrink-0'>
                    <span className="truncate">{filters.serviceType || 'Todos'}</span>
                    <ChevronsUpDown className='ml-1 h-3 w-3 shrink-0 opacity-40' />
                  </Button>
                }
              />
              <PopoverContent className='z-[10000] w-[260px] p-0 shadow-lg border border-border rounded-lg overflow-hidden bg-popover' align='start'>
                <Command className="bg-transparent">
                  <CommandInput placeholder='Buscar serviço...' className="h-8 text-xs" />
                  <CommandList className="max-h-[220px]">
                    <CommandEmpty className="py-3 text-center text-[10px] text-muted-foreground/60 font-bold uppercase tracking-wider">Nenhum serviço encontrado</CommandEmpty>
                    <CommandGroup heading="Serviços Cadastrados" className="px-2 pb-2">
                      <CommandItem
                        value="todos-os-servicos"
                        onSelect={() => { updateFilter('serviceType', ''); setServiceTypeOpen(false); }}
                        className='flex items-center justify-between rounded-lg py-1.5 px-2.5 hover:bg-secondary cursor-pointer'
                      >
                        <span className='text-xs font-bold uppercase tracking-tight'>Todos</span>
                        {!filters.serviceType && <Check className='h-3.5 w-3.5 text-foreground' />}
                      </CommandItem>
                      {serviceTypes.map((t) => (
                        <CommandItem
                          key={t}
                          value={t}
                          onSelect={() => { updateFilter('serviceType', filters.serviceType === t ? '' : t); setServiceTypeOpen(false); }}
                          className='flex items-center justify-between rounded-lg py-1.5 px-2.5 hover:bg-secondary cursor-pointer'
                        >
                          <span className='text-xs font-bold uppercase tracking-tight truncate'>{t}</span>
                          {filters.serviceType === t && <Check className='h-3.5 w-3.5 text-foreground shrink-0' />}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            </FilterField>
          )}

          <Button
            variant='outline' 
            onClick={() => setShowAdvancedFilters((prev) => !prev)}
            className={cn(
              'h-8 px-3 gap-2 font-bold uppercase tracking-wider text-[10px] rounded-lg transition-all border-border relative overflow-hidden shrink-0',
              showAdvancedFilters ? 'bg-secondary text-foreground' : 'bg-card hover:bg-secondary/40 text-muted-foreground'
            )}
          >
            <SlidersHorizontal className='w-3.5 h-3.5 stroke-[1.5]' />
            FILTROS AVANÇADOS
            {activeFilterCount > 0 && (
              <span className='min-w-[18px] h-4 rounded-md bg-foreground text-background text-[9px] font-bold flex items-center justify-center shadow-xs px-1'>
                {activeFilterCount}
              </span>
            )}
            <ChevronDown className={cn('w-3 h-3 transition-transform duration-200', showAdvancedFilters && 'rotate-180')} />
          </Button>

          {hasActiveFilters && (
            <Button 
              variant='ghost' 
              size='sm' 
              onClick={onClear} 
              className='h-8 px-2.5 gap-1.5 text-muted-foreground/70 hover:text-destructive hover:bg-destructive/10 font-bold uppercase tracking-wider text-[10px] rounded-lg transition-all shrink-0'
            >
              <RotateCcw className='w-3 h-3 stroke-[1.5]' /> Resetar
            </Button>
          )}
        </div>

        <div className='flex items-center gap-3 shrink-0'>
          {loading && <Loader2 className='w-3.5 h-3.5 animate-spin text-foreground' />}
          <div className='bg-secondary/35 px-2.5 py-0.5 rounded-lg border border-border'>
            <span className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60'>
              <span className='text-foreground font-mono text-xs font-bold'>{resultCount}</span>
              <span className='mx-1 opacity-30'>/</span>
              <span className='font-mono text-xs font-bold'>{totalCount}</span>
            </span>
          </div>
        </div>
      </div>

      {showAdvancedFilters && (
        <div className="fixed inset-0 z-[9999] flex justify-end overflow-hidden">
          {/* Backdrop Overlay */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity duration-200" 
            onClick={() => setShowAdvancedFilters(false)}
          />

          {/* Slide-over Drawer Panel */}
          <div className="relative z-10 w-full max-w-md sm:max-w-lg h-full bg-card border-l border-border shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-border/80 flex items-center justify-between bg-muted/30 shrink-0">
              <div className="flex items-center gap-2.5">
                <SlidersHorizontal className="w-4 h-4 text-primary stroke-[2]" />
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-foreground">Filtros Avançados</h3>
                {activeFilterCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-foreground text-background text-[10px] font-bold">
                    {activeFilterCount} ativo(s)
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                onClick={() => setShowAdvancedFilters(false)}
                className="w-8 h-8 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground p-0 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Drawer Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                {/* Ordenação */}
                <div className='border border-border/50 bg-muted/20 p-3 rounded-xl space-y-2 col-span-1 sm:col-span-2'>
                  <div className='flex items-center gap-1.5 pb-1 border-b border-border/30'>
                    <ArrowUpDown className='w-3.5 h-3.5 text-foreground/70' />
                    <span className='text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/80'>Ordenar Resultados Por</span>
                  </div>
                  <div className='flex flex-wrap items-center gap-1.5 pt-1'>
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
                </div>

                {/* Cliente */}
                {(showClient || showClientType) && (
                  <div className='border border-border/50 bg-muted/20 p-3 rounded-xl space-y-2'>
                    <div className='flex items-center gap-1.5 pb-1 border-b border-border/30'>
                      <User className='w-3.5 h-3.5 text-foreground/70' />
                      <span className='text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/80'>Cliente</span>
                    </div>
                    <div className='space-y-2'>
                      {showClient && (
                        <div className='space-y-1'>
                          <Label className='text-[9px] font-bold text-muted-foreground/75 uppercase tracking-wider flex items-center gap-1'>
                            <User className='w-2.5 h-2.5 text-muted-foreground/50' /> Cliente
                          </Label>
                          <Popover open={clientOpen} onOpenChange={setClientOpen}>
                            <PopoverTrigger
                              render={
                                <Button variant='outline' role='combobox' className='w-full justify-between font-semibold h-8 rounded-lg px-2.5 text-xs border border-border bg-background'>
                                  <span className="truncate">{selectedClientName || 'Todos os clientes'}</span>
                                  <ChevronsUpDown className='ml-1 h-3 w-3 shrink-0 opacity-40' />
                                </Button>
                              }
                            />
                            <PopoverContent className='z-[10000] w-[280px] p-0 shadow-lg border border-border rounded-lg overflow-hidden bg-popover' align='start'>
                              <Command className="bg-transparent">
                                <CommandInput placeholder='Buscar por nome ou documento...' className="h-8 text-xs" />
                                <CommandList className="max-h-[200px]">
                                  <CommandEmpty className="py-3 text-center text-[10px] text-muted-foreground/60 font-bold uppercase tracking-wider">Nenhum cliente encontrado</CommandEmpty>
                                  <CommandGroup heading="Clientes Cadastrados" className="px-2 pb-2">
                                    <CommandItem
                                      value="todos-os-clientes"
                                      onSelect={() => { updateFilter('clientId', ''); setClientOpen(false); }}
                                      className='flex items-center justify-between rounded-lg py-1.5 px-2.5 hover:bg-secondary cursor-pointer'
                                    >
                                      <span className='text-xs font-bold uppercase tracking-tight'>Todos os clientes</span>
                                      {!filters.clientId && <Check className='h-3.5 w-3.5 text-foreground' />}
                                    </CommandItem>
                                    {clients.map((c) => (
                                      <CommandItem
                                        key={c.id}
                                        value={c.name + ' ' + c.phone + ' ' + c.document}
                                        onSelect={() => { updateFilter('clientId', filters.clientId === c.id ? '' : c.id); setClientOpen(false); }}
                                        className='flex items-center justify-between rounded-lg py-1.5 px-2.5 hover:bg-secondary cursor-pointer'
                                      >
                                        <div className="flex flex-col">
                                          <span className='text-xs font-bold uppercase tracking-tight'>{c.name}</span>
                                          <span className='text-[9px] text-muted-foreground/60 font-bold font-mono'>{c.phone}</span>
                                        </div>
                                        {filters.clientId === c.id && <Check className='h-3.5 w-3.5 text-foreground' />}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>
                      )}
                      {showClientType && (
                        <div className='space-y-1'>
                          <Label className='text-[9px] font-bold text-muted-foreground/75 uppercase tracking-wider flex items-center gap-1'>
                            <User className='w-2.5 h-2.5 text-muted-foreground/50' /> Tipo de Cliente
                          </Label>
                          <select
                            value={filters.clientType}
                            onChange={(e) => updateFilter('clientType', e.target.value)}
                            className='h-8 text-xs font-semibold rounded-lg bg-background border border-border px-2 w-full text-foreground outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer'
                          >
                            <option value=''>Todos</option>
                            <option value='regular'>Cliente</option>
                            <option value='mechanic'>Mecânico</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Status */}
                {!showStatusInBar && (showPaymentStatus || showServiceStatus) && (
                  <div className='border border-border/50 bg-muted/20 p-3 rounded-xl space-y-2'>
                    <div className='flex items-center gap-1.5 pb-1 border-b border-border/30'>
                      <Check className='w-3.5 h-3.5 text-foreground/70' />
                      <span className='text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/80'>Status</span>
                    </div>
                    <div className='space-y-2'>
                      {showPaymentStatus && (
                        <div className='space-y-1'>
                          <Label className='text-[9px] font-bold text-muted-foreground/75 uppercase tracking-wider flex items-center gap-1'>
                            <Check className='w-2.5 h-2.5 text-muted-foreground/50' /> Status Pagamento
                          </Label>
                          <select
                            value={filters.paymentStatus}
                            onChange={(e) => updateFilter('paymentStatus', e.target.value)}
                            className='h-8 text-xs font-semibold rounded-lg bg-background border border-border px-2 w-full text-foreground outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer'
                          >
                            <option value=''>Todos</option>
                            <option value='Não Pago'>Não Pago</option>
                            <option value='Entrada'>Entrada</option>
                            <option value='Pago'>Pago</option>
                          </select>
                        </div>
                      )}
                      {showServiceStatus && (
                        <div className='space-y-1'>
                          <Label className='text-[9px] font-bold text-muted-foreground/75 uppercase tracking-wider flex items-center gap-1'>
                            <Check className='w-2.5 h-2.5 text-muted-foreground/50' /> Status Ordem
                          </Label>
                          <select
                            value={filters.serviceStatus}
                            onChange={(e) => updateFilter('serviceStatus', e.target.value)}
                            className='h-8 text-xs font-semibold rounded-lg bg-background border border-border px-2 w-full text-foreground outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer'
                          >
                            <option value=''>Todos</option>
                            {serviceStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Período */}
                {showDates && (
                  <div className='border border-border/50 bg-muted/20 p-3 rounded-xl space-y-2'>
                    <div className='flex items-center gap-1.5 pb-1 border-b border-border/30'>
                      <Calendar className='w-3.5 h-3.5 text-foreground/70' />
                      <span className='text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/80'>Período</span>
                    </div>
                    <div className='space-y-2'>
                      <div className='space-y-1'>
                        <Label className='text-[9px] font-bold text-muted-foreground/75 uppercase tracking-wider flex items-center gap-1'>
                          <Calendar className='w-2.5 h-2.5 text-muted-foreground/50' /> De
                        </Label>
                        <DateField value={filters.dateFrom} onChange={(v) => updateFilter('dateFrom', v)} placeholder='De (dd/mm)' className='bg-background' />
                      </div>
                      <div className='space-y-1'>
                        <Label className='text-[9px] font-bold text-muted-foreground/75 uppercase tracking-wider flex items-center gap-1'>
                          <Calendar className='w-2.5 h-2.5 text-muted-foreground/50' /> Até
                        </Label>
                        <DateField value={filters.dateTo} onChange={(v) => updateFilter('dateTo', v)} placeholder='Até (dd/mm)' className='bg-background' />
                      </div>
                    </div>
                  </div>
                )}

                {/* Valor */}
                {showValues && (
                  <div className='border border-border/50 bg-muted/20 p-3 rounded-xl space-y-2'>
                    <div className='flex items-center gap-1.5 pb-1 border-b border-border/30'>
                      <DollarSign className='w-3.5 h-3.5 text-foreground/70' />
                      <span className='text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/80'>Valor</span>
                    </div>
                    <div className='space-y-2'>
                      <div className='space-y-1'>
                        <Label className='text-[9px] font-bold text-muted-foreground/75 uppercase tracking-wider flex items-center gap-1'>
                          <DollarSign className='w-2.5 h-2.5 text-muted-foreground/50' /> Valor Mínimo
                        </Label>
                        <div className='relative'>
                          <DollarSign className='absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60' />
                          <Input
                            type='number'
                            step='0.01'
                            placeholder='Min R$'
                            value={localMinValue}
                            onChange={(e) => setLocalMinValue(e.target.value)}
                            className='h-8 pl-7 pr-2 text-xs font-mono font-bold rounded-lg bg-background border border-border w-full'
                          />
                        </div>
                      </div>
                      <div className='space-y-1'>
                        <Label className='text-[9px] font-bold text-muted-foreground/75 uppercase tracking-wider flex items-center gap-1'>
                          <DollarSign className='w-2.5 h-2.5 text-muted-foreground/50' /> Valor Máximo
                        </Label>
                        <div className='relative'>
                          <DollarSign className='absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60' />
                          <Input
                            type='number'
                            step='0.01'
                            placeholder='Max R$'
                            value={localMaxValue}
                            onChange={(e) => setLocalMaxValue(e.target.value)}
                            className='h-8 pl-7 pr-2 text-xs font-mono font-bold rounded-lg bg-background border border-border w-full'
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-border/80 bg-muted/30 flex items-center justify-between gap-3 shrink-0">
              {hasActiveFilters ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClear}
                  className="text-xs font-bold uppercase text-muted-foreground hover:text-destructive border-border h-9"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Limpar Filtros
                </Button>
              ) : (
                <div />
              )}
              <Button
                onClick={() => setShowAdvancedFilters(false)}
                className="text-xs font-bold uppercase tracking-wider bg-foreground text-background hover:bg-foreground/90 px-6 h-9"
              >
                Ver Resultados ({resultCount})
              </Button>
            </div>
          </div>
        </div>
      )}

      <ActiveFilters filters={filters} clients={clients} onRemoveFilter={removeFilter} onClear={onClear} count={resultCount} />
    </div>
  );
}
