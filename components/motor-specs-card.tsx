'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Settings,
  Search,
  X,
  Plus,
  Check,
  ChevronDown,
  Pencil,
  Trash2,
  Car,
  Package,
  Zap,
  EyeOff,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { CatalogMotor } from '@/lib/motors';
import { splitOptionsList } from '@/lib/motors';
import { MOTOR_BRANDS, detectBrandFromName, getBrandLogoSrc } from '@/lib/motor-brands';

// ═══ Tipos ═══

/** Um motor da O.S. (mesma posição usada em motorId dos serviços) */
export interface OsMotor {
  model: string;
  cylinders: string;
  displacement: string;
  valves?: string;
  engineModel?: string;
  cars?: string;
  aspiration?: string;
  brand?: string;
  showExtra?: boolean;
}

interface MotorSpecsCardProps {
  motors: OsMotor[];
  readOnly?: boolean;
  catalog: CatalogMotor[];
  displacementOptions: string[];
  onAddDisplacement: (value: string) => void;
  onAdd: (motor: OsMotor) => void;
  onUpdate: (index: number, motor: OsMotor) => void;
  onRemove: (index: number) => void;
  onSaveCatalogMotor: (motor: { name: string; brand: string; engineModels: string[]; cars: string[] }, originalName?: string) => Promise<boolean>;
  onDeleteCatalogMotor: (name: string) => void;
}

// ═══ Opções fixas ═══

const CYLINDER_OPTIONS = ['2', '3', '4', '5', '6', '8', '10', '12'];
const DEFAULT_DISPLACEMENTS = ['0.8', '1.0', '1.2', '1.3', '1.4', '1.5', '1.6', '1.8', '2.0', '2.2', '2.4', '2.5', '2.8', '3.0', '3.2', '3.6', '4.0', '5.0', '6.0'];
const DEFAULT_VALVES = ['8V', '12V', '16V', '20V', '24V'];
const DEFAULT_ASPIRATIONS = ['Aspirado', 'Turbo', 'Biturbo', 'Supercharger'];

function loadCustomList(key: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string' && v.trim()) : [];
  } catch {
    return [];
  }
}

function saveCustomList(key: string, list: string[]) {
  try { localStorage.setItem(key, JSON.stringify(list)); } catch { /* ignore */ }
}

// ═══ Ícones do SELEÇÃO MT (pistão, válvulas, cilindrada) ═══

const PistonIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <rect x="3" y="2.5" width="18" height="2.2" rx="1.1" />
    <rect x="3" y="6" width="18" height="2.2" rx="1.1" />
    <rect x="3" y="9.5" width="18" height="2.2" rx="1.1" />
    <path fillRule="evenodd" clipRule="evenodd" d="M4.5 12.8C4.5 12.8 4.5 13 4.5 13.5V19.5C4.5 20.6 5.4 21.5 6.5 21.5H17.5C18.6 21.5 19.5 20.6 19.5 19.5V13.5C19.5 13 19.5 12.8 19.5 12.8H4.5ZM7.2 14.5H9.5V18.2H7.2V14.5ZM14.5 14.5H16.8V18.2H14.5V14.5Z" />
  </svg>
);

const ValvesIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <circle cx="5.2" cy="3.5" r="1.8" />
    <rect x="4.2" y="3.5" width="2" height="12" />
    <path d="M4.2 15.5L1.2 19.8C0.9 20.3 1.2 21 1.9 21H8.5C9.2 21 9.5 20.3 9.2 19.8L6.2 15.5H4.2Z" />
    <rect x="11.1" y="2" width="1.8" height="7" rx="0.9" opacity="0.6" />
    <circle cx="18.8" cy="3.5" r="1.8" />
    <rect x="17.8" y="3.5" width="2" height="12" />
    <path d="M17.8 15.5L14.8 19.8C14.5 20.3 14.8 21 15.5 21H22.1C22.8 21 23.1 20.3 22.8 19.8L19.8 15.5H17.8Z" />
  </svg>
);

const GaugeIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
    <path d="M8 4a.5.5 0 0 1 .5.5V6a.5.5 0 0 1-1 0V4.5A.5.5 0 0 1 8 4M3.732 5.732a.5.5 0 0 1 .707 0l.915.914a.5.5 0 1 1-.708.708l-.914-.915a.5.5 0 0 1 0-.707M2 10a.5.5 0 0 1 .5-.5h1.586a.5.5 0 0 1 0 1H2.5A.5.5 0 0 1 2 10m9.5 0a.5.5 0 0 1 .5-.5h1.5a.5.5 0 0 1 0 1H12a.5.5 0 0 1-.5-.5m.754-4.246a.39.39 0 0 0-.527-.02L7.547 9.31a.91.91 0 1 0 1.302 1.258l3.434-4.297a.39.39 0 0 0-.029-.518z" />
    <path fillRule="evenodd" d="M0 10a8 8 0 1 1 15.547 2.661c-.442 1.253-1.845 1.602-2.932 1.25C11.309 13.488 9.475 13 8 13c-1.474 0-3.31.488-4.615.911-1.087.352-2.49.003-2.932-1.25A8 8 0 0 1 0 10m8-7a7 7 0 0 0-6.603 9.329c.203.575.923.876 1.68.63C4.397 12.533 6.358 12 8 12s3.604.532 4.923.96c.757.245 1.477-.056 1.68-.631A7 7 0 0 0 8 3" />
  </svg>
);

// ═══ Logo da montadora ═══

function BrandLogo({ brand, size = 40, className }: { brand?: string; size?: number; className?: string }) {
  const src = getBrandLogoSrc(brand);
  const [failed, setFailed] = useState(false);
  return (
    <span
      className={cn('inline-flex items-center justify-center shrink-0 rounded-lg bg-white border border-border overflow-hidden', className)}
      style={{ width: size, height: size }}
      title={brand || 'Montadora não identificada'}
    >
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={brand} className="w-[78%] h-[78%] object-contain" onError={() => setFailed(true)} />
      ) : (
        <Settings className="w-1/2 h-1/2 text-gray-400" />
      )}
    </span>
  );
}

// ═══ Seletor genérico (botão + lista), no padrão visual do sistema ═══

function useClickOutside(ref: React.RefObject<HTMLElement | null>, onOutside: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, onOutside, active]);
}

function SpecSelect({
  value,
  onChange,
  options,
  placeholder = 'Selecione...',
  disabled,
  formatOption,
  actionLabel,
  onAction,
  emptyLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  formatOption?: (v: string) => string;
  actionLabel?: string;
  onAction?: () => void;
  emptyLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false), open);
  const label = (v: string) => (formatOption ? formatOption(v) : v);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'w-full h-11 flex items-center gap-2 rounded-lg border bg-card px-3 text-sm font-semibold text-left transition-colors cursor-pointer outline-none',
          'hover:border-foreground/25 focus-visible:ring-2 focus-visible:ring-primary/25 disabled:opacity-60 disabled:cursor-not-allowed',
          open ? 'border-primary ring-2 ring-primary/20' : 'border-border'
        )}
      >
        <span className={cn('flex-1 truncate', !value && 'font-normal text-[var(--placeholder,var(--muted-foreground))]')}>
          {value ? label(value) : placeholder}
        </span>
        <ChevronDown className={cn('w-4 h-4 text-muted-foreground shrink-0 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 rounded-xl border border-border bg-popover shadow-lg p-1.5 animate-in fade-in-0 zoom-in-95 duration-100">
          <div className="max-h-60 overflow-y-auto">
            {value && (
              <button
                type="button"
                onClick={() => { onChange(''); setOpen(false); }}
                className="w-full text-left rounded-lg px-2.5 py-2 text-sm text-muted-foreground hover:bg-muted cursor-pointer"
              >
                Limpar seleção
              </button>
            )}
            {options.length === 0 && (
              <div className="px-2.5 py-3 text-center text-xs text-muted-foreground">{emptyLabel || 'Nenhuma opção'}</div>
            )}
            {options.map((o) => {
              const selected = o === value;
              return (
                <button
                  key={o}
                  type="button"
                  onClick={() => { onChange(o); setOpen(false); }}
                  className={cn(
                    'w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-left transition-colors cursor-pointer',
                    selected ? 'bg-primary/10 font-semibold text-foreground' : 'text-foreground/90 hover:bg-muted'
                  )}
                >
                  <span className="flex-1 truncate">{label(o)}</span>
                  {selected && <Check className="w-4 h-4 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>
          {actionLabel && onAction && (
            <button
              type="button"
              onClick={() => { setOpen(false); onAction(); }}
              className="w-full mt-1 pt-2 border-t border-border flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-semibold text-primary hover:bg-muted cursor-pointer"
            >
              <Plus className="w-4 h-4" /> {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ═══ Cartão de campo (ícone + rótulo + controle) ═══

function FieldCard({ icon, label, htmlFor, children, className }: {
  icon: React.ReactNode; label: string; htmlFor?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn('rounded-xl border border-border bg-muted/30 p-4 space-y-2.5', className)}>
      <div className="flex items-center gap-2.5">
        <span className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center text-foreground/80 shrink-0">
          {icon}
        </span>
        <label htmlFor={htmlFor} className="text-sm font-bold text-foreground">{label}</label>
      </div>
      {children}
    </div>
  );
}

// ═══ Destaque dos termos buscados ═══

function Highlight({ text, tokens }: { text: string; tokens: string[] }) {
  const valid = tokens.filter((t) => t.length > 0);
  if (!valid.length) return <>{text}</>;
  const re = new RegExp(`(${valid.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  const parts = text.split(re);
  return (
    <>
      {parts.map((p, i) =>
        re.test(p) && valid.some((t) => p.toLowerCase() === t.toLowerCase())
          ? <mark key={i} className="bg-warning/25 text-foreground rounded px-0.5">{p}</mark>
          : <React.Fragment key={i}>{p}</React.Fragment>
      )}
    </>
  );
}

// ═══ Componente principal ═══

type FormState = {
  model: string;
  brand: string;
  cylinders: string;
  displacement: string;
  valves: string;
  showExtra: boolean;
  engineModel: string;
  cars: string;
  aspiration: string;
};

const EMPTY_FORM: FormState = {
  model: '', brand: '', cylinders: '', displacement: '', valves: '',
  showExtra: false, engineModel: '', cars: '', aspiration: '',
};

export function MotorSpecsCard({
  motors,
  readOnly,
  catalog,
  displacementOptions,
  onAddDisplacement,
  onAdd,
  onUpdate,
  onRemove,
  onSaveCatalogMotor,
  onDeleteCatalogMotor,
}: MotorSpecsCardProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [addingAnother, setAddingAnother] = useState(false);
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  // Listas personalizadas (válvulas / aspiração) guardadas neste computador
  const [customValves, setCustomValves] = useState<string[]>(() => loadCustomList('retifica_custom_valves'));
  const [customAspirations, setCustomAspirations] = useState<string[]>(() => loadCustomList('retifica_custom_aspirations'));
  const [customTarget, setCustomTarget] = useState<null | 'valves' | 'aspiration' | 'displacement'>(null);
  const [customValue, setCustomValue] = useState('');

  const showForm = !readOnly && (motors.length === 0 || editingIndex !== null || addingAnother);

  // Motor escolhido no catálogo (para listar modelos e veículos)
  const selectedCatalog = useMemo(
    () => catalog.find((c) => c.name.toUpperCase() === form.model.trim().toUpperCase()),
    [catalog, form.model]
  );
  const engineModelOptions = useMemo(() => {
    const list = [...(selectedCatalog?.engineModels || [])];
    if (form.engineModel && !list.includes(form.engineModel)) list.unshift(form.engineModel);
    return list;
  }, [selectedCatalog, form.engineModel]);
  const carOptions = useMemo(() => {
    const cars = selectedCatalog?.cars || [];
    const list = cars.length > 1 ? [...cars, cars.join(', ')] : [...cars];
    if (form.cars && !list.includes(form.cars)) list.unshift(form.cars);
    return list;
  }, [selectedCatalog, form.cars]);

  const allDisplacements = useMemo(() => {
    const set = new Set([...DEFAULT_DISPLACEMENTS, ...displacementOptions]);
    if (form.displacement) set.add(form.displacement);
    return Array.from(set).sort((a, b) => parseFloat(a) - parseFloat(b) || a.localeCompare(b));
  }, [displacementOptions, form.displacement]);
  const valveOptions = useMemo(() => Array.from(new Set([...DEFAULT_VALVES, ...customValves, ...(form.valves ? [form.valves] : [])])), [customValves, form.valves]);
  const aspirationOptions = useMemo(() => Array.from(new Set([...DEFAULT_ASPIRATIONS, ...customAspirations, ...(form.aspiration ? [form.aspiration] : [])])), [customAspirations, form.aspiration]);

  // ── Busca de motor (autocomplete) ──
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  useClickOutside(searchRef, () => setSearchOpen(false), searchOpen);
  const tokens = form.model.trim().toLowerCase().split(/\s+/).filter(Boolean);

  const groupedResults = useMemo(() => {
    const ignore = ['e', 'de', 'do', 'da', 'com', 'o', 'a', 'em', 'para'];
    const valid = tokens.filter((t) => !ignore.includes(t));
    const matches = catalog.filter((m) => {
      if (!valid.length) return true;
      const blob = [m.name, m.brand, m.engineModels.join(' '), m.cars.join(' ')].join(' ').toLowerCase();
      return valid.every((t) => blob.includes(t));
    });
    const groups = new Map<string, CatalogMotor[]>();
    matches.forEach((m) => {
      const brand = m.brand || detectBrandFromName(`${m.name} ${m.cars.join(' ')}`) || 'Outros';
      if (!groups.has(brand)) groups.set(brand, []);
      groups.get(brand)!.push(m);
    });
    return Array.from(groups.entries()).sort(([a], [b]) => (a === 'Outros' ? 1 : b === 'Outros' ? -1 : a.localeCompare(b)));
  }, [catalog, form.model]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalResults = groupedResults.reduce((n, [, list]) => n + list.length, 0);
  const exactMatch = catalog.some((c) => c.name.toUpperCase() === form.model.trim().toUpperCase());

  const selectCatalogMotor = (m: CatalogMotor) => {
    const engineModel = m.engineModels[0] || '';
    const cars = m.cars.length === 1 ? m.cars[0] : '';
    const dispFromModel = engineModel.match(/\b(\d\.\d)\b/)?.[1] || '';
    setForm((f) => ({
      ...f,
      model: m.name,
      brand: m.brand || detectBrandFromName(`${m.name} ${m.cars.join(' ')}`),
      engineModel: f.engineModel || engineModel,
      cars: f.cars || cars,
      displacement: f.displacement || dispFromModel,
    }));
    setSearchOpen(false);
  };

  // ── Cadastro de motor no catálogo ──
  const [catalogDialog, setCatalogDialog] = useState<null | { originalName?: string }>(null);
  const [catBrand, setCatBrand] = useState('');
  const [catName, setCatName] = useState('');
  const [catModels, setCatModels] = useState('');
  const [catCars, setCatCars] = useState('');
  const [brandMenuOpen, setBrandMenuOpen] = useState(false);
  const brandRef = useRef<HTMLDivElement>(null);
  useClickOutside(brandRef, () => setBrandMenuOpen(false), brandMenuOpen);
  const [savingCatalog, setSavingCatalog] = useState(false);

  const openCatalogDialog = (existing?: CatalogMotor, prefillName = '') => {
    setCatalogDialog({ originalName: existing?.name });
    setCatBrand(existing?.brand || detectBrandFromName(existing?.name || prefillName));
    setCatName(existing?.name || prefillName.toUpperCase());
    setCatModels(existing?.engineModels.join(', ') || '');
    setCatCars(existing?.cars.join(', ') || '');
    setSearchOpen(false);
  };

  const submitCatalog = async () => {
    if (!catBrand.trim() || !catName.trim()) return;
    setSavingCatalog(true);
    const ok = await onSaveCatalogMotor(
      { name: catName.trim().toUpperCase(), brand: catBrand.trim(), engineModels: splitOptionsList(catModels), cars: splitOptionsList(catCars) },
      catalogDialog?.originalName
    );
    setSavingCatalog(false);
    if (ok) {
      // se o motor estava sendo usado no formulário, atualiza o nome/marca
      if (catalogDialog?.originalName && form.model.toUpperCase() === catalogDialog.originalName.toUpperCase()) {
        setForm((f) => ({ ...f, model: catName.trim().toUpperCase(), brand: catBrand.trim() }));
      } else if (!catalogDialog?.originalName && showForm) {
        setForm((f) => ({ ...f, model: catName.trim().toUpperCase(), brand: catBrand.trim() }));
      }
      setCatalogDialog(null);
    }
  };

  // ── Adicionar / salvar motor na O.S. ──
  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingIndex(null);
    setAddingAnother(false);
  };

  const submitMotor = () => {
    const model = form.model.trim().toUpperCase() || form.cars.trim().toUpperCase() || form.engineModel.trim().toUpperCase();
    if (!model) {
      toast.error('Informe o motor ou veículo.');
      return;
    }
    const motor: OsMotor = {
      model,
      cylinders: form.cylinders,
      displacement: form.displacement,
      valves: form.valves || undefined,
      brand: form.brand || selectedCatalog?.brand || detectBrandFromName(`${model} ${form.cars}`) || undefined,
      showExtra: form.showExtra || undefined,
      engineModel: form.showExtra && form.engineModel ? form.engineModel.toUpperCase() : undefined,
      cars: form.showExtra && form.cars ? form.cars : undefined,
      aspiration: form.showExtra && form.aspiration ? form.aspiration : undefined,
    };
    if (editingIndex !== null) {
      onUpdate(editingIndex, motor);
      toast.success('Motor atualizado na O.S.');
    } else {
      onAdd(motor);
      toast.success('Motor adicionado à O.S.');
    }
    resetForm();
  };

  const startEdit = (index: number) => {
    const m = motors[index];
    if (!m) return;
    setForm({
      model: m.model,
      brand: m.brand || '',
      cylinders: m.cylinders || '',
      displacement: m.displacement || '',
      valves: m.valves || '',
      showExtra: !!(m.showExtra || m.engineModel || m.cars || m.aspiration),
      engineModel: m.engineModel || '',
      cars: m.cars || '',
      aspiration: m.aspiration || '',
    });
    setEditingIndex(index);
    setAddingAnother(false);
  };

  // ── Cadastrar opção personalizada (válvulas / aspiração / cilindrada) ──
  const submitCustom = () => {
    const v = customValue.trim();
    if (!v) return;
    if (customTarget === 'valves') {
      const val = v.toUpperCase();
      const next = Array.from(new Set([...customValves, val]));
      setCustomValves(next); saveCustomList('retifica_custom_valves', next); set('valves', val);
    } else if (customTarget === 'aspiration') {
      const next = Array.from(new Set([...customAspirations, v]));
      setCustomAspirations(next); saveCustomList('retifica_custom_aspirations', next); set('aspiration', v);
    } else if (customTarget === 'displacement') {
      const val = v.replace(',', '.');
      onAddDisplacement(val); set('displacement', val);
    }
    setCustomTarget(null);
    setCustomValue('');
  };

  // ═══ Render ═══
  return (
    <div className="bg-card border border-border/60 dark:border-border rounded-xl p-5 shadow-sm space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-border/60">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-muted border border-border flex items-center justify-center shrink-0">
            <Settings className="w-5 h-5 text-foreground/80" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-extrabold uppercase tracking-wide text-foreground">Especificações do Motor</h3>
            <p className="text-sm text-muted-foreground">
              {readOnly ? 'Motores desta ordem de serviço.' : 'Busque o motor ou veículo e adicione à O.S.'}
            </p>
          </div>
        </div>
        {!readOnly && (
          <Button type="button" onClick={() => openCatalogDialog(undefined, '')} className="solid-btn h-10 px-4 rounded-lg text-sm font-bold gap-1.5 shrink-0">
            <Plus className="w-4 h-4" /> Cadastrar Motor
          </Button>
        )}
      </div>

      {/* ═══ FORMULÁRIO ═══ */}
      {showForm && (
        <div className="space-y-4">
          {/* Motor ou Veículo */}
          <FieldCard icon={<Car className="w-4 h-4 text-info" />} label="Motor ou Veículo" htmlFor="motor-spec-search">
            <div ref={searchRef} className="relative">
              <div className="relative">
                <Input
                  id="motor-spec-search"
                  value={form.model}
                  autoComplete="off"
                  placeholder="Busque por motor ou veículo (ex: Onix, Fire, EA111...)"
                  onChange={(e) => { set('model', e.target.value.toUpperCase()); setSearchOpen(true); }}
                  onFocus={() => setSearchOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setSearchOpen(false);
                    if (e.key === 'Enter') { e.preventDefault(); setSearchOpen(false); }
                  }}
                  className="h-11 pl-3 pr-16 rounded-lg text-sm font-semibold uppercase placeholder:normal-case bg-card"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {form.model && (
                    <button type="button" title="Limpar" onClick={() => setForm((f) => ({ ...f, model: '', brand: '' }))} className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <Search className="w-4 h-4 text-info mr-1.5" />
                </div>
              </div>

              {searchOpen && (
                <div className="absolute z-50 left-0 right-0 mt-1.5 rounded-xl border border-border bg-popover shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100">
                  <div className="px-3 py-2 text-xs text-muted-foreground border-b border-border bg-muted/40">
                    {form.model.trim()
                      ? <>Resultados para “<strong className="text-foreground">{form.model.trim()}</strong>” ({totalResults} encontrado{totalResults === 1 ? '' : 's'})</>
                      : 'Busque por motor, modelo ou veículo (ex: Corolla 2.0, Power 1.0, Onix)…'}
                  </div>
                  <div className="max-h-80 overflow-y-auto p-1.5">
                    {totalResults === 0 && (
                      <div className="px-3 py-5 text-center text-sm text-muted-foreground">
                        Nenhum motor ou veículo encontrado.
                        <div className="text-xs mt-1">Dica: busque pelo carro (ex.: Corolla, Onix, Gol) ou pelo modelo.</div>
                      </div>
                    )}
                    {groupedResults.map(([brand, list]) => (
                      <div key={brand} className="mb-1">
                        <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                          <BrandLogo brand={brand === 'Outros' ? '' : brand} size={22} className="rounded-md" />
                          <span>{brand}</span>
                          <span className="ml-auto px-1.5 rounded-full bg-muted text-[11px] tabular-nums">{list.length}</span>
                        </div>
                        {list.map((m) => (
                          <div
                            key={m.name}
                            role="option"
                            aria-selected={m.name === form.model}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => selectCatalogMotor(m)}
                            className={cn(
                              'group flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer transition-colors',
                              m.name === form.model ? 'bg-primary/10' : 'hover:bg-muted'
                            )}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold uppercase text-foreground truncate"><Highlight text={m.name} tokens={tokens} /></span>
                                {m.engineModels.length > 0 && (
                                  <span className="px-1.5 py-px rounded-md bg-muted border border-border text-[11px] font-semibold text-muted-foreground uppercase truncate">
                                    <Highlight text={m.engineModels.join(', ')} tokens={tokens} />
                                  </span>
                                )}
                              </div>
                              {m.cars.length > 0 && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5 truncate">
                                  <Car className="w-3 h-3 shrink-0" /> Veículos: <span className="text-foreground/80"><Highlight text={m.cars.join(', ')} tokens={tokens} /></span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button type="button" title="Editar motor do catálogo" onClick={(e) => { e.stopPropagation(); openCatalogDialog(m); }} className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background cursor-pointer">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button type="button" title="Excluir motor do catálogo" onClick={(e) => { e.stopPropagation(); setSearchOpen(false); onDeleteCatalogMotor(m.name); }} className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-danger hover:bg-danger/10 cursor-pointer">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                  {form.model.trim() && !exactMatch && (
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => openCatalogDialog(undefined, form.model.trim())}
                      className="w-full flex items-center gap-1.5 px-4 py-2.5 border-t border-border text-sm font-semibold text-primary hover:bg-muted cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> Cadastrar motor “{form.model.trim()}”
                    </button>
                  )}
                </div>
              )}
            </div>
          </FieldCard>

          {/* Cilindros • Cilindrada • Válvulas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FieldCard icon={<PistonIcon className="w-4 h-4" />} label="Cilindros">
              <SpecSelect value={form.cylinders} onChange={(v) => set('cylinders', v)} options={CYLINDER_OPTIONS} formatOption={(v) => `${v} cilindros`} />
            </FieldCard>
            <FieldCard icon={<GaugeIcon className="w-4 h-4" />} label="Cilindrada">
              <SpecSelect value={form.displacement} onChange={(v) => set('displacement', v)} options={allDisplacements} actionLabel="Cadastrar outra..." onAction={() => { setCustomTarget('displacement'); setCustomValue(''); }} />
            </FieldCard>
            <FieldCard icon={<ValvesIcon className="w-4 h-4" />} label="Válvulas">
              <SpecSelect value={form.valves} onChange={(v) => set('valves', v)} options={valveOptions} actionLabel="Cadastrar outra..." onAction={() => { setCustomTarget('valves'); setCustomValue(''); }} />
            </FieldCard>
          </div>

          {/* Campos adicionais */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={form.showExtra}
              onClick={() => set('showExtra', !form.showExtra)}
              className={cn('relative w-11 h-6 rounded-full transition-colors shrink-0 cursor-pointer', form.showExtra ? 'bg-primary' : 'bg-muted-foreground/30')}
            >
              <span className={cn('absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform', form.showExtra && 'translate-x-5')} />
            </button>
            <button type="button" onClick={() => set('showExtra', !form.showExtra)} className="text-left cursor-pointer">
              <div className="text-sm font-semibold text-foreground">Mostrar modelo, veículo compatível e aspiração</div>
              <div className="text-xs text-muted-foreground">Exiba campos adicionais para um cadastro mais completo.</div>
            </button>
          </div>

          {form.showExtra ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in-0 slide-in-from-top-1 duration-150">
              <FieldCard icon={<Package className="w-4 h-4" />} label="Modelo do Motor">
                <SpecSelect
                  value={form.engineModel}
                  onChange={(v) => {
                    set('engineModel', v);
                    const disp = v.match(/\b(\d\.\d)\b/)?.[1];
                    if (disp && !form.displacement) set('displacement', disp);
                  }}
                  options={engineModelOptions}
                  placeholder={engineModelOptions.length ? 'Selecione o modelo...' : 'Sem modelos cadastrados'}
                  emptyLabel="Cadastre modelos no motor (Cadastrar Motor)"
                />
              </FieldCard>
              <FieldCard icon={<Car className="w-4 h-4 text-info" />} label="Veículos Compatíveis">
                <SpecSelect
                  value={form.cars}
                  onChange={(v) => set('cars', v)}
                  options={carOptions}
                  formatOption={(v) => (v.includes(',') && (selectedCatalog?.cars.length || 0) > 1 && v === selectedCatalog?.cars.join(', ') ? `Todos (${v})` : v)}
                  placeholder={carOptions.length ? 'Selecione o veículo...' : 'Sem veículos cadastrados'}
                  emptyLabel="Cadastre veículos no motor (Cadastrar Motor)"
                />
              </FieldCard>
              <FieldCard icon={<Zap className="w-4 h-4 text-orange-500" />} label="Aspiração">
                <SpecSelect value={form.aspiration} onChange={(v) => set('aspiration', v)} options={aspirationOptions} actionLabel="Cadastrar outra..." onAction={() => { setCustomTarget('aspiration'); setCustomValue(''); }} />
              </FieldCard>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border-2 border-dashed border-border px-4 py-3.5 text-muted-foreground">
              <EyeOff className="w-5 h-5 shrink-0" />
              <div>
                <div className="text-sm font-semibold">Opções adicionais ocultas</div>
                <div className="text-xs">Marque a opção acima para exibir mais campos.</div>
              </div>
            </div>
          )}

          {/* Ações */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Button type="button" onClick={submitMotor} disabled={!form.model.trim() && !form.cars.trim() && !form.engineModel.trim()} className="solid-btn flex-1 h-12 rounded-xl text-sm font-bold gap-2 disabled:opacity-50">
              {editingIndex !== null ? <><Check className="w-4 h-4" /> Salvar alterações do motor</> : <><Plus className="w-4 h-4" /> Adicionar Motor à O.S.</>}
            </Button>
            {motors.length > 0 && (
              <Button type="button" variant="outline" onClick={resetForm} className="h-12 px-5 rounded-xl border-border text-sm font-semibold">
                {editingIndex !== null ? 'Cancelar edição' : 'Voltar aos motores'}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ═══ MOTORES ADICIONADOS ═══ */}
      {!showForm && (
        motors.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            Nenhum motor informado nesta O.S.
          </div>
        ) : (
          <div className="space-y-4">
            <div className={cn('grid gap-4', motors.length > 1 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 w-full max-w-xl mx-auto')}>
              {motors.map((m, idx) => {
                const brand = m.brand || detectBrandFromName(`${m.model} ${m.cars || ''}`);
                const tiles: Array<{ key: string; label: string; value: string; icon: React.ReactNode; orange?: boolean }> = [];
                if (m.showExtra && m.engineModel) tiles.push({ key: 'modelo', label: 'Modelo', value: m.engineModel.toUpperCase(), icon: <Package className="w-4 h-4" /> });
                if (m.displacement) tiles.push({ key: 'cilindrada', label: 'Cilindrada', value: m.displacement, icon: <GaugeIcon className="w-4 h-4" /> });
                if (m.cylinders) tiles.push({ key: 'cilindros', label: 'Cilindros', value: `${m.cylinders} CIL`, icon: <PistonIcon className="w-4 h-4" /> });
                if (m.valves) tiles.push({ key: 'valvulas', label: 'Válvulas', value: m.valves.replace(/V$/i, '') + ' VAL', icon: <ValvesIcon className="w-4 h-4" /> });
                if (m.showExtra && m.cars) tiles.push({ key: 'veiculo', label: 'Veículo', value: m.cars.toUpperCase(), icon: <Car className="w-4 h-4" /> });
                if (m.showExtra && m.aspiration) tiles.push({ key: 'aspiracao', label: 'Aspiração', value: m.aspiration.toUpperCase(), icon: <Zap className="w-4 h-4" />, orange: true });
                return (
                  <div key={idx} className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4 animate-in fade-in-50 duration-200">
                    <div className="flex items-start gap-4">
                      <BrandLogo brand={brand} size={60} className="rounded-xl" />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-base font-extrabold uppercase text-foreground truncate" title={m.model}>{m.model}</h4>
                        <div className="text-xs font-semibold uppercase text-muted-foreground truncate">{brand || 'Montadora não identificada'}</div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-bold whitespace-nowrap bg-green-50 text-green-600 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/30">
                            <CheckCircle2 className="w-3 h-3" /> Adicionado à O.S.
                          </span>
                          {motors.length > 1 && (
                            <span className="px-2 py-0.5 rounded-full bg-muted border border-border text-[11px] font-bold text-muted-foreground whitespace-nowrap">Motor {idx + 1}</span>
                          )}
                        </div>
                      </div>
                      {!readOnly && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button type="button" variant="outline" onClick={() => startEdit(idx)} className="h-8 px-2.5 rounded-lg border-border text-xs font-semibold gap-1">
                            <Pencil className="w-3.5 h-3.5" /> Editar
                          </Button>
                          <Button type="button" variant="ghost" title="Excluir motor da O.S." onClick={() => onRemove(idx)} className="h-8 w-8 p-0 rounded-lg text-danger hover:text-danger hover:bg-danger/10">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    {tiles.length > 0 && (
                      <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2">
                        {tiles.map((t) => (
                          <div
                            key={t.key}
                            title={`${t.label}: ${t.value}`}
                            className={cn(
                              'flex items-center gap-2 rounded-lg border px-2.5 py-2 min-w-0',
                              t.orange ? 'bg-orange-50 border-orange-200 dark:bg-orange-500/10 dark:border-orange-500/30' : 'bg-muted/40 border-border'
                            )}
                          >
                            <span className={cn('w-7 h-7 rounded-md flex items-center justify-center shrink-0', t.orange ? 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400' : 'bg-card border border-border text-foreground/70')}>
                              {t.icon}
                            </span>
                            <div className="min-w-0">
                              <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{t.label}</div>
                              <div className={cn('text-sm font-bold truncate', t.orange ? 'text-orange-600 dark:text-orange-400' : 'text-foreground')}>{t.value}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {!readOnly && (
              <button
                type="button"
                onClick={() => { resetForm(); setAddingAnother(true); setTimeout(() => document.getElementById('motor-spec-search')?.focus(), 0); }}
                className="block w-full max-w-md mx-auto rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/40 px-4 py-4 text-center transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-center gap-1.5 text-sm font-bold text-foreground">
                  <Plus className="w-4 h-4" /> Adicionar mais um motor
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">Cadastre outro motor para esta O.S.</div>
              </button>
            )}
          </div>
        )
      )}

      {/* ═══ DIALOG: cadastrar / editar motor no catálogo ═══ */}
      <Dialog open={catalogDialog !== null} onOpenChange={(o) => { if (!o) setCatalogDialog(null); }}>
        <DialogContent className="max-w-lg z-[1100] rounded-2xl p-6" overlayClassName="z-[1099]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{catalogDialog?.originalName ? 'Editar motor cadastrado' : 'Cadastrar novo motor'}</DialogTitle>
            <DialogDescription>Fica disponível na busca de todas as O.S.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5" ref={brandRef}>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Marca / fabricante *</label>
              <div className="relative">
                <div className="absolute left-2 top-1/2 -translate-y-1/2"><BrandLogo brand={catBrand} size={26} className="rounded-md" /></div>
                <Input
                  value={catBrand}
                  placeholder="Selecione ou digite a marca"
                  onChange={(e) => { setCatBrand(e.target.value); setBrandMenuOpen(true); }}
                  onFocus={() => setBrandMenuOpen(true)}
                  className="h-11 pl-11 rounded-lg text-sm"
                />
                {brandMenuOpen && (
                  <div className="absolute z-50 left-0 right-0 mt-1.5 max-h-60 overflow-y-auto rounded-xl border border-border bg-popover shadow-lg p-1.5">
                    {MOTOR_BRANDS.filter((b) => b.toLowerCase().includes(catBrand.toLowerCase())).map((b) => (
                      <button key={b} type="button" onClick={() => { setCatBrand(b); setBrandMenuOpen(false); }} className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm hover:bg-muted cursor-pointer">
                        <BrandLogo brand={b} size={26} className="rounded-md" /> {b}
                      </button>
                    ))}
                    {catBrand.trim() && !MOTOR_BRANDS.some((b) => b.toLowerCase() === catBrand.trim().toLowerCase()) && (
                      <button type="button" onClick={() => setBrandMenuOpen(false)} className="w-full text-left rounded-lg px-2.5 py-2 text-sm italic text-muted-foreground hover:bg-muted cursor-pointer">
                        Usar “{catBrand.trim()}” como nova marca
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Motor (como será pesquisado) *</label>
              <Input value={catName} onChange={(e) => setCatName(e.target.value.toUpperCase())} placeholder="Ex.: POWER, FIRE, COROLLA 2.0" className="h-11 rounded-lg text-sm uppercase placeholder:normal-case" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Modelo do motor</label>
              <Input value={catModels} onChange={(e) => setCatModels(e.target.value)} placeholder="Ex.: EA111 1.0, EA111 1.6" className="h-11 rounded-lg text-sm" />
              <p className="text-xs text-muted-foreground">Separe por vírgula para virarem opções na O.S.</p>
              {splitOptionsList(catModels).length > 0 && (
                <div className="flex flex-wrap gap-1">{splitOptionsList(catModels).map((t) => <span key={t} className="px-2 py-0.5 rounded-md bg-muted border border-border text-xs font-semibold uppercase">{t}</span>)}</div>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Veículos compatíveis</label>
              <Input value={catCars} onChange={(e) => setCatCars(e.target.value)} placeholder="Ex.: Gol, Fox, Polo" className="h-11 rounded-lg text-sm" />
              <p className="text-xs text-muted-foreground">Separe por vírgula. A busca também encontra o motor pelo carro.</p>
              {splitOptionsList(catCars).length > 0 && (
                <div className="flex flex-wrap gap-1">{splitOptionsList(catCars).map((t) => <span key={t} className="px-2 py-0.5 rounded-md bg-muted border border-border text-xs font-semibold">{t}</span>)}</div>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setCatalogDialog(null)} className="h-10 rounded-lg">Cancelar</Button>
            <Button type="button" onClick={submitCatalog} disabled={!catBrand.trim() || !catName.trim() || savingCatalog} className="solid-btn h-10 rounded-lg font-bold">
              {catalogDialog?.originalName ? 'Salvar alterações' : 'Cadastrar Motor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ DIALOG: nova opção (válvulas / aspiração / cilindrada) ═══ */}
      <Dialog open={customTarget !== null} onOpenChange={(o) => { if (!o) setCustomTarget(null); }}>
        <DialogContent className="max-w-sm z-[1100] rounded-2xl p-6" overlayClassName="z-[1099]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {customTarget === 'valves' ? 'Cadastrar quantidade de válvulas' : customTarget === 'aspiration' ? 'Cadastrar tipo de aspiração' : 'Cadastrar cilindrada'}
            </DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitCustom(); } }}
            placeholder={customTarget === 'valves' ? 'Ex.: 10V, 30V, 32V' : customTarget === 'aspiration' ? 'Ex.: Tri-turbo' : 'Ex.: 1.9'}
            className="h-11 rounded-lg text-sm"
          />
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setCustomTarget(null)} className="h-10 rounded-lg">Cancelar</Button>
            <Button type="button" onClick={submitCustom} disabled={!customValue.trim()} className="solid-btn h-10 rounded-lg font-bold">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
