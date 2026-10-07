import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useStore, type MotorPrice } from '@/lib/store';
import { fetchMotorsWithFavorites, addMotor, deleteMotor, toggleModelFavorite, normalizeForComparison, type MotorModel } from '@/lib/motors';
import { SERVICE_CATEGORIES, type CatalogService } from '@/lib/service-catalog';
import { 
  fetchCustomServices, 
  addCustomService, 
  updateCustomService, 
  deleteCustomService, 
  type CustomService 
} from '@/lib/custom-services';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Search, 
  Plus, 
  Trash2, 
  Pencil, 
  Copy, 
  Check,
  Tag,
  DollarSign, 
  AlertCircle,
  Wrench,
  Layers,
  Coins,
  X,
  Star,
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { List } from 'react-window';

// ═══ Lista de motores (virtualizada: são ~160 motores) ═══
interface MotorRowPropsData {
  filteredMotors: MotorModel[];
  motorPrices: MotorPrice[];
  selectedMotor: string;
  setSelectedMotor: (motor: string) => void;
  handleDeleteMotorClick: (name: string, e: React.MouseEvent) => void;
  handleToggleFavorite: (name: string, isFav: boolean, e: React.MouseEvent) => void;
}

interface MotorRowWrapperProps extends MotorRowPropsData {
  index: number;
  style: React.CSSProperties;
}

const MotorRowWrapper = React.memo(({
  index,
  style,
  filteredMotors,
  motorPrices,
  selectedMotor,
  setSelectedMotor,
  handleDeleteMotorClick,
  handleToggleFavorite
}: MotorRowWrapperProps) => {
  const { resolveMotorName } = useStore();
  const m = filteredMotors[index];
  if (!m) return null;
  const count = motorPrices.filter(p => (p.motorId === m.id || resolveMotorName(p.motorId).toUpperCase() === m.id.toUpperCase()) && p.price > 0).length;
  const isSelected = selectedMotor.toUpperCase() === m.id.toUpperCase() || selectedMotor === m.id;
  return (
    <div style={style} className="pr-1.5 pb-1">
      <MotorRow
        motor={m}
        isSelected={isSelected}
        count={count}
        onSelect={setSelectedMotor}
        onDelete={handleDeleteMotorClick}
        onToggleFavorite={handleToggleFavorite}
      />
    </div>
  );
});
MotorRowWrapper.displayName = 'MotorRowWrapper';

// Custom hook to observe container dimensions
function useContainerHeight(ref: React.RefObject<HTMLDivElement | null>) {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setHeight(entry.contentRect.height);
      }
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);

  return height;
}

interface MotorRowProps {
  motor: MotorModel;
  isSelected: boolean;
  count: number;
  onSelect: (id: string) => void;
  onDelete: (name: string, e: React.MouseEvent) => void;
  onToggleFavorite: (name: string, isFav: boolean, e: React.MouseEvent) => void;
}

const MotorRow = React.memo(({ motor, isSelected, count, onSelect, onDelete, onToggleFavorite }: MotorRowProps) => {
  return (
    <div
      onClick={() => onSelect(motor.id)}
      className={cn(
        'group h-full flex items-center gap-2 px-3 rounded-lg cursor-pointer transition-colors',
        isSelected ? 'bg-muted' : 'hover:bg-muted/60'
      )}
    >
      <span className={cn('flex-1 min-w-0 truncate text-sm uppercase', isSelected ? 'font-bold text-foreground' : 'font-medium text-foreground/90')}>
        {motor.id}
      </span>
      <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
        {count} {count === 1 ? 'preço' : 'preços'}
      </span>
      <button
        type="button"
        title={motor.is_favorite ? 'Tirar dos favoritos' : 'Marcar como favorito'}
        onClick={(e) => onToggleFavorite(motor.id, motor.is_favorite, e)}
        className={cn(
          'w-6 h-6 flex items-center justify-center rounded-md shrink-0 transition-opacity',
          motor.is_favorite ? 'text-warning' : 'hidden group-hover:flex text-muted-foreground hover:text-warning'
        )}
      >
        <Star className={cn('w-4 h-4', motor.is_favorite && 'fill-warning')} />
      </button>
      <button
        type="button"
        title="Remover motor"
        onClick={(e) => onDelete(motor.id, e)}
        className="w-6 h-6 hidden group-hover:flex items-center justify-center rounded-md shrink-0 text-muted-foreground hover:text-danger hover:bg-danger/10"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
});
MotorRow.displayName = 'MotorRow';

// ═══ Campo de preço editável direto na tabela ═══
const formatPriceInput = (n?: number) =>
  n && n > 0 ? n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';

/** "1.250,50", "250,5", "250.50" ou "40" → número; vazio → null; inválido → NaN */
function parsePriceInput(s: string): number | null {
  let c = s.trim().replace(/R\$|\s/g, '');
  if (!c) return null;
  if (c.includes(',')) c = c.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(c)) c = c.replace(/\./g, '');
  const n = Number(c);
  if (!isFinite(n) || n < 0) return NaN;
  return Math.round(n * 100) / 100;
}

function PriceInput({ value, onCommit, label }: { value?: number; onCommit: (v: number | null) => void; label: string }) {
  const [text, setText] = useState(formatPriceInput(value));
  const focused = useRef(false);
  const skipCommit = useRef(false);

  useEffect(() => { if (!focused.current) setText(formatPriceInput(value)); }, [value]);

  const commit = () => {
    if (skipCommit.current) { skipCommit.current = false; setText(formatPriceInput(value)); return; }
    const n = parsePriceInput(text);
    if (Number.isNaN(n)) {
      toast.error('Preço inválido. Use números, por exemplo 250,00.');
      setText(formatPriceInput(value));
      return;
    }
    const next = n && n > 0 ? n : null;
    const current = value && value > 0 ? value : null;
    setText(formatPriceInput(next ?? undefined));
    if (next !== current) {
      onCommit(next);
      // Ao apagar, volta a mostrar o valor atual até a remoção acontecer (ou ser cancelada na confirmação)
      if (next === null) setText(formatPriceInput(value));
    }
  };

  return (
    <div className="flex items-center h-9 gap-2 rounded-lg border border-border bg-card px-3 transition-colors hover:border-foreground/25 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
      <span className="text-xs text-muted-foreground">R$</span>
      <input
        inputMode="decimal"
        aria-label={label}
        value={text}
        placeholder="—"
        onFocus={(e) => { focused.current = true; e.currentTarget.select(); }}
        onBlur={() => { focused.current = false; commit(); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          if (e.key === 'Escape') { skipCommit.current = true; e.currentTarget.blur(); }
        }}
        onChange={(e) => setText(e.target.value)}
        className="w-full min-w-0 bg-transparent text-right text-sm font-semibold tabular-nums text-foreground outline-none"
      />
    </div>
  );
}

type PricingItem = {
  id: string;
  name: string;
  category: string;
  prices: MotorPrice[];
  isCustom: boolean;
  defaultPrice: number;
};

// Nome em caixa normal para leitura (os dados ficam em maiúsculas)
const sentenceCase = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s);

const CUSTOM_CATEGORY = 'SERVIÇOS PERSONALIZADOS';

export function PriceManager() {
  const { 
    motorPrices, 
    saveMotorPrice, 
    deleteMotorPrice, 
    copyMotorPrices,
    resolveMotorName,
    resolveServiceId
  } = useStore();

  // State lists
  const [motors, setMotors] = useState<MotorModel[]>([]);
  const [favoriteFilter, setFavoriteFilter] = useState<'all' | 'favorites'>('all');
  const [customServices, setCustomServices] = useState<CustomService[]>([]);
  const [selectedMotor, setSelectedMotor] = useState<string>('');

  const [confirmAction, setConfirmAction] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  // Search states
  const [motorSearch, setMotorSearch] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [onlyPriced, setOnlyPriced] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);

  // Debounced search states
  const [debouncedMotorSearch, setDebouncedMotorSearch] = useState('');
  const [debouncedServiceSearch, setDebouncedServiceSearch] = useState('');
  const [debouncedCatalogSearch, setDebouncedCatalogSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedMotorSearch(motorSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [motorSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedServiceSearch(serviceSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [serviceSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCatalogSearch(catalogSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [catalogSearch]);

  // Height refs for virtualization
  const motorsContainerRef = useRef<HTMLDivElement>(null);
  const motorsContainerHeight = useContainerHeight(motorsContainerRef);

  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      const baseFontSize = parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16;
      setScale(baseFontSize / 16);
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  // Loading states
  const [isLoadingMotors, setIsLoadingMotors] = useState(false);
  const [isLoadingServices, setIsLoadingServices] = useState(false);

  // Dialog open states
  const [isNewMotorOpen, setIsNewMotorOpen] = useState(false);
  const [isNewServiceOpen, setIsNewServiceOpen] = useState(false);
  const [isDefinePriceOpen, setIsDefinePriceOpen] = useState(false);
  const [isCopyPricesOpen, setIsCopyPricesOpen] = useState(false);
  const [isEditServiceOpen, setIsEditServiceOpen] = useState(false);
  const [isObservationOpen, setIsObservationOpen] = useState(false);

  // Observation form values
  const [obsServiceId, setObsServiceId] = useState('');
  const [obsServiceName, setObsServiceName] = useState('');
  const [obsValue, setObsValue] = useState('');

  // Dialog form values
  const [newMotorName, setNewMotorName] = useState('');
  
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');

  const [editServiceId, setEditServiceId] = useState('');
  const [editServiceName, setEditServiceName] = useState('');
  const [editServicePrice, setEditServicePrice] = useState('');

  const [priceServiceId, setPriceServiceId] = useState('');
  const [priceServiceName, setPriceServiceName] = useState('');
  const [priceSubName, setPriceSubName] = useState('');
  const [priceValue, setPriceValue] = useState('');
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);

  const [copySourceMotor, setCopySourceMotor] = useState('');

  // Load motors and custom services
  const loadMotorsList = useCallback(async () => {
    setIsLoadingMotors(true);
    try {
      const list = await fetchMotorsWithFavorites();
      setMotors(list);
      if (list.length > 0) {
        const hasSelected = list.some(m => m.id.toUpperCase() === selectedMotor.toUpperCase());
        if (!selectedMotor || !hasSelected) {
          setSelectedMotor(list[0].id);
        }
      } else {
        setSelectedMotor('');
      }
    } catch (e) {
      console.error('Erro ao buscar motores:', e);
      toast.error('Erro ao carregar lista de motores.');
    } finally {
      setIsLoadingMotors(false);
    }
  }, [selectedMotor]);

  const loadCustomServicesList = useCallback(async () => {
    setIsLoadingServices(true);
    try {
      const list = await fetchCustomServices();
      setCustomServices(list);
    } catch (e) {
      console.error('Erro ao buscar serviços adicionais:', e);
    } finally {
      setIsLoadingServices(false);
    }
  }, []);

  useEffect(() => {
    loadMotorsList();
    loadCustomServicesList();
  }, [loadMotorsList, loadCustomServicesList]);

  // ── Action Handlers ──

  const handleCreateMotor = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newMotorName.trim().toUpperCase();
    if (!name) return;

    const normalizedName = normalizeForComparison(name);
    const exists = motors.some(m => normalizeForComparison(m.id) === normalizedName);

    if (exists) {
      toast.error('Este motor já existe.');
      return;
    }

    try {
      await addMotor(name);
      setMotors(prev => [...prev, { id: name, is_favorite: false }].sort((a, b) => normalizeForComparison(a.id).localeCompare(normalizeForComparison(b.id))));
      setSelectedMotor(name);
      setIsNewMotorOpen(false);
      setNewMotorName('');
      toast.success(`Motor ${name} adicionado com sucesso!`);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao adicionar motor.');
    }
  }, [newMotorName, motors]);

  const handleDeleteMotorClick = useCallback((name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmAction({
      isOpen: true,
      title: `Remover Motor ${name}`,
      description: `Deseja realmente remover o motor "${name}"? Todos os preços associados serão desvinculados. Esta ação é permanente e não poderá ser desfeita.`,
      onConfirm: async () => {
        try {
          await deleteMotor(name);
          const remainingMotors = motors.filter(m => m.id !== name);
          setMotors(remainingMotors);
          if (selectedMotor === name) {
            setSelectedMotor(remainingMotors.length > 0 ? remainingMotors[0].id : '');
          }
          toast.success(`Motor "${name}" removido.`);
        } catch (e) {
          console.error(e);
          toast.error('Erro ao remover motor.');
        }
      }
    });
  }, [motors, selectedMotor]);

  const handleToggleFavorite = useCallback(async (name: string, currentFav: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextFav = !currentFav;
    
    // 1. Update UI state immediately
    setMotors(prev => prev.map(m => m.id.toUpperCase() === name.toUpperCase() ? { ...m, is_favorite: nextFav } : m));
    
    try {
      // 2. Save in local SQLite database
      await toggleModelFavorite(name, nextFav);
      toast.success(nextFav ? `Motor ${name} adicionado aos favoritos!` : `Motor ${name} removido dos favoritos!`);
    } catch (err) {
      console.error('Failed to toggle model favorite, reverting UI...', err);
      // 3. Rollback UI state on failure and show toast warning
      setMotors(prev => prev.map(m => m.id.toUpperCase() === name.toUpperCase() ? { ...m, is_favorite: currentFav } : m));
      toast.error('Erro ao atualizar favorito. A alteração foi desfeita.');
    }
  }, []);

  const handleCreateService = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newServiceName.trim().toUpperCase();
    const price = parseFloat(newServicePrice) || 0;
    if (!name) return;

    try {
      const res = await addCustomService(name, price);
      if (res) {
        setCustomServices(prev => [...prev, res].sort((a, b) => (a.name || '').localeCompare(b.name || '')));
        setIsNewServiceOpen(false);
        setNewServiceName('');
        setNewServicePrice('');
        toast.success(`Serviço ${name} adicionado.`);
      }
    } catch (e) {
      console.error(e);
      toast.error('Erro ao criar serviço.');
    }
  }, [newServiceName, newServicePrice]);

  const handleUpdateService = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const name = editServiceName.trim().toUpperCase();
    const price = parseFloat(editServicePrice) || 0;
    if (!name || !editServiceId) return;

    try {
      await updateCustomService(editServiceId, name, price);
      setCustomServices(prev => prev.map(s => s.id === editServiceId ? { ...s, name, defaultPrice: price } : s));
      setIsEditServiceOpen(false);
      toast.success('Serviço atualizado.');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao atualizar serviço.');
    }
  }, [editServiceName, editServicePrice, editServiceId]);

  const handleDeleteServiceClick = useCallback((id: string, name: string) => {
    setConfirmAction({
      isOpen: true,
      title: `Remover Serviço ${name}`,
      description: `Deseja realmente remover o serviço "${name}"? Ele será removido de todas as tabelas de preços. Esta ação é permanente.`,
      onConfirm: async () => {
        try {
          await deleteCustomService(id);
          setCustomServices(prev => prev.filter(s => s.id !== id));
          toast.success(`Serviço "${name}" removido.`);
        } catch (e) {
          console.error(e);
          toast.error('Erro ao remover serviço.');
        }
      }
    });
  }, []);

  const handleOpenDefinePrice = useCallback((serviceId: string, serviceName: string, priceItem?: MotorPrice) => {
    setPriceServiceId(serviceId);
    setPriceServiceName(serviceName);
    if (priceItem) {
      setEditingPriceId(priceItem.id);
      setPriceSubName(priceItem.subName);
      setPriceValue(priceItem.price.toString());
    } else {
      setEditingPriceId(null);
      setPriceSubName('');
      setPriceValue('');
    }
    setIsDefinePriceOpen(true);
  }, []);

  const handleSavePrice = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(priceValue);
    if (isNaN(val) || val < 0) {
      toast.error('Insira um preço válido.');
      return;
    }

    if (!selectedMotor) {
      toast.error('Nenhum motor selecionado.');
      return;
    }

    try {
      await saveMotorPrice(selectedMotor, priceServiceId, priceSubName.trim(), val);
      setIsDefinePriceOpen(false);
      setPriceSubName('');
      setPriceValue('');
      setEditingPriceId(null);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao salvar preço.');
    }
  }, [selectedMotor, priceServiceId, priceSubName, priceValue]);

  const handleDeletePriceClick = useCallback((id: string) => {
    setConfirmAction({
      isOpen: true,
      title: 'Remover Especificação de Preço',
      description: 'Deseja realmente remover esta especificação de preço? Esta ação é permanente.',
      onConfirm: async () => {
        try {
          await deleteMotorPrice(id);
          toast.success('Preço removido.');
        } catch (e) {
          console.error(e);
          toast.error('Erro ao remover preço.');
        }
      }
    });
  }, []);

  const handleCopyPrices = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!copySourceMotor) {
      toast.error('Selecione o motor de origem.');
      return;
    }
    if (copySourceMotor === selectedMotor) {
      toast.error('O motor de origem deve ser diferente do motor de destino.');
      return;
    }

    try {
      await copyMotorPrices(copySourceMotor, selectedMotor);
      setIsCopyPricesOpen(false);
      setCopySourceMotor('');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao copiar tabela de preços.');
    }
  }, [copySourceMotor, selectedMotor]);

  const handleOpenObservation = useCallback((serviceId: string, serviceName: string, currentObs?: string) => {
    setObsServiceId(serviceId);
    setObsServiceName(serviceName);
    setObsValue(currentObs || '');
    setIsObservationOpen(true);
  }, []);

  const handleSaveObservation = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMotor) {
      toast.error('Nenhum motor selecionado.');
      return;
    }

    try {
      const existing = motorPrices.find(
        p => (p.motorId === selectedMotor || resolveMotorName(p.motorId).toUpperCase() === selectedMotor.toUpperCase()) && resolveServiceId(p.serviceId) === obsServiceId && p.subName === ''
      );
      const price = existing ? existing.price : 0;
      await saveMotorPrice(selectedMotor, obsServiceId, '', price, obsValue.trim());
      setIsObservationOpen(false);
      setObsValue('');
      toast.success('Observação salva com sucesso!');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao salvar observação.');
    }
  }, [selectedMotor, obsServiceId, obsValue, motorPrices, resolveMotorName, resolveServiceId]);

  const handleDeleteObservation = useCallback((serviceId: string) => {
    setConfirmAction({
      isOpen: true,
      title: 'Remover Observação',
      description: 'Deseja realmente remover esta observação?',
      onConfirm: async () => {
        try {
          const existing = motorPrices.find(
            p => (p.motorId === selectedMotor || resolveMotorName(p.motorId).toUpperCase() === selectedMotor.toUpperCase()) && resolveServiceId(p.serviceId) === serviceId && p.subName === ''
          );
          if (existing) {
            if (existing.price === 0) {
              await deleteMotorPrice(existing.id);
            } else {
              await saveMotorPrice(selectedMotor, serviceId, '', existing.price, '');
            }
          }
          toast.success('Observação removida.');
        } catch (e) {
          console.error(e);
          toast.error('Erro ao remover observação.');
        }
      }
    });
  }, [selectedMotor, motorPrices, resolveMotorName, resolveServiceId]);

  // ── Filtered Calculations ──

  const filteredMotors = useMemo(() => {
    const q = normalizeForComparison(debouncedMotorSearch);
    let list = motors;
    if (q) {
      list = list.filter(m => normalizeForComparison(m.id).includes(q));
    }
    
    if (favoriteFilter === 'favorites') {
      list = list.filter(m => m.is_favorite);
    }

    return [...list].sort((a, b) => {
      if (favoriteFilter === 'all') {
        if (a.is_favorite && !b.is_favorite) return -1;
        if (!a.is_favorite && b.is_favorite) return 1;
      }
      return normalizeForComparison(a.id).localeCompare(normalizeForComparison(b.id));
    });
  }, [motors, debouncedMotorSearch, favoriteFilter]);

  const filteredCatalogServices = useMemo(() => {
    const q = debouncedCatalogSearch.toLowerCase().trim();
    if (!q) return customServices;
    return customServices.filter(s => {
      const sName = s.name || '';
      return sName.toLowerCase().includes(q);
    });
  }, [customServices, debouncedCatalogSearch]);

  const combinedCatalogList = useMemo(() => {
    const list: Array<
      | { type: 'header'; id: string; label: string }
      | { type: 'standard'; id: string; name: string }
      | { type: 'custom'; id: string; name: string; defaultPrice: number }
    > = [];

    const q = catalogSearch.toLowerCase().trim();

    // 1. Standard services matching catalogSearch
    const matchedStandards = SERVICE_CATEGORIES.flatMap(cat => cat.services)
      .filter(s => !q || s.name.toLowerCase().includes(q));

    if (matchedStandards.length > 0) {
      if (!catalogSearch) {
        list.push({ type: 'header', id: 'header-standard', label: 'Serviços Padrão' });
      }
      matchedStandards.forEach(svc => {
        list.push({ type: 'standard', id: svc.id, name: svc.name });
      });
    }

    // 2. Custom/Added services matching catalogSearch
    if (filteredCatalogServices.length > 0) {
      if (!catalogSearch) {
        list.push({ type: 'header', id: 'header-custom', label: 'Serviços Adicionais' });
      }
      filteredCatalogServices.forEach(svc => {
        const svcName = svc.name || '';
        list.push({ type: 'custom', id: svc.id, name: svcName, defaultPrice: svc.defaultPrice });
      });
    }

    return list;
  }, [catalogSearch, filteredCatalogServices]);

  // Combine standard and custom services for the selected motor pricing column
  const combinedPricingList = useMemo(() => {
    const q = debouncedServiceSearch.toLowerCase().trim();
    const list: Array<{
      id: string;
      name: string;
      category: string;
      prices: MotorPrice[];
      isCustom: boolean;
      defaultPrice: number;
    }> = [];

    // Add standard services
    SERVICE_CATEGORIES.forEach(cat => {
      cat.services.forEach(svc => {
        // filter by text
        if (q && !svc.name.toLowerCase().includes(q)) return;
        
        const pricesForThisMotorAndService = motorPrices.filter(
          p => (p.motorId === selectedMotor || resolveMotorName(p.motorId).toUpperCase() === selectedMotor.toUpperCase()) && resolveServiceId(p.serviceId) === svc.id
        );

        const hasRealPrice = pricesForThisMotorAndService.some(p => p.price > 0);

        // filter by priced toggle
        if (onlyPriced && !hasRealPrice) return;

        list.push({
          id: svc.id,
          name: svc.name,
          category: cat.name,
          prices: pricesForThisMotorAndService,
          isCustom: false,
          defaultPrice: svc.defaultPrice
        });
      });
    });

    // Add custom services
    customServices.forEach(svc => {
      const svcName = svc.name || '';
      if (q && !svcName.toLowerCase().includes(q)) return;

      const pricesForThisMotorAndService = motorPrices.filter(
        p => (p.motorId === selectedMotor || resolveMotorName(p.motorId).toUpperCase() === selectedMotor.toUpperCase()) && resolveServiceId(p.serviceId) === svc.id
      );

      const hasRealPrice = pricesForThisMotorAndService.some(p => p.price > 0);

      if (onlyPriced && !hasRealPrice) return;

      list.push({
        id: svc.id,
        name: svcName,
        category: CUSTOM_CATEGORY,
        prices: pricesForThisMotorAndService,
        isCustom: true,
        defaultPrice: svc.defaultPrice
      });
    });

    return list;
  }, [selectedMotor, motorPrices, customServices, debouncedServiceSearch, onlyPriced, resolveMotorName, resolveServiceId]);

  // Counters
  const activePricesForSelectedMotorCount = useMemo(() => {
    return motorPrices.filter(p => (p.motorId === selectedMotor || resolveMotorName(p.motorId).toUpperCase() === selectedMotor.toUpperCase()) && p.price > 0).length;
  }, [motorPrices, selectedMotor, resolveMotorName]);

  // Categorias na ordem do catálogo (+ personalizados) para as abas e o agrupamento
  const categoryTabs = useMemo(() => {
    const tabs = SERVICE_CATEGORIES.map(c => ({ key: c.name, label: sentenceCase(c.name) }));
    if (customServices.length > 0) tabs.push({ key: CUSTOM_CATEGORY, label: 'Personalizados' });
    return tabs;
  }, [customServices.length]);

  const pricingGroups = useMemo(() => {
    const keys = categoryFilter ? [categoryFilter] : categoryTabs.map(t => t.key);
    return keys
      .map(key => ({
        key,
        label: categoryTabs.find(t => t.key === key)?.label || key,
        items: combinedPricingList.filter(s => s.category === key),
      }))
      .filter(g => g.items.length > 0);
  }, [combinedPricingList, categoryFilter, categoryTabs]);

  // Salva o preço digitado na linha (vazio ou zero remove o preço)
  const commitPrice = useCallback(async (serviceId: string, subName: string, value: number | null, existing?: MotorPrice) => {
    if (!selectedMotor) return;
    setSaveState('saving');
    let ok = true;
    if (value === null) {
      if (existing) {
        // mantém a observação do serviço, se houver
        ok = subName === '' && existing.observation
          ? await saveMotorPrice(selectedMotor, serviceId, '', 0, existing.observation, { silent: true })
          : await deleteMotorPrice(existing.id, { silent: true });
      }
    } else {
      ok = await saveMotorPrice(selectedMotor, serviceId, subName, value, undefined, { silent: true });
    }
    setSaveState(ok ? 'saved' : 'error');
  }, [selectedMotor, saveMotorPrice, deleteMotorPrice]);

  const tabClass = (active: boolean) =>
    cn(
      'h-8 px-3.5 rounded-full text-sm font-medium whitespace-nowrap border transition-colors cursor-pointer',
      active ? 'bg-foreground text-background border-foreground' : 'bg-card text-foreground border-border hover:bg-muted'
    );

  return (
    <div className="space-y-5 max-w-7xl mx-auto h-[calc(100vh-4rem)] flex flex-col">
      {/* ═══ CABEÇALHO ═══ */}
      <div className="flex flex-wrap items-end justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Tabela de Preços</h2>
          <p className="text-muted-foreground mt-0.5 text-sm">Escolha o motor e digite o preço de cada serviço. Salva sozinho.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIsCatalogOpen(true)}
            className="h-10 px-4 rounded-xl border-border bg-card text-sm font-semibold gap-2"
          >
            <Wrench className="w-4 h-4" /> Serviços do catálogo
          </Button>
          <Button
            onClick={() => setIsNewMotorOpen(true)}
            className="solid-btn h-10 px-4 rounded-xl text-sm font-bold gap-2"
          >
            <Plus className="w-4 h-4" /> Novo motor
          </Button>
        </div>
      </div>

      {/* ═══ CONTEÚDO: motores à esquerda, preços à direita ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-5 flex-1 min-h-0 pb-2">

        {/* ── Motores ── */}
        <div className="bg-card border border-border rounded-2xl p-3 flex flex-col min-h-0 shadow-sm">
          <div className="relative shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar motor"
              value={motorSearch}
              onChange={e => setMotorSearch(e.target.value)}
              className="pl-9 text-sm h-10 rounded-xl border-border bg-card focus-visible:ring-primary/30"
            />
          </div>

          <div className="flex items-center gap-1 mt-2.5 mb-2 shrink-0">
            {(['all', 'favorites'] as const).map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setFavoriteFilter(f)}
                className={cn(
                  'h-7 px-3 rounded-full text-xs font-medium transition-colors cursor-pointer inline-flex items-center gap-1',
                  favoriteFilter === f ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {f === 'favorites' && <Star className="w-3 h-3" />}
                {f === 'all' ? `Todos (${motors.length})` : 'Favoritos'}
              </button>
            ))}
          </div>

          <div ref={motorsContainerRef} className="flex-1 min-h-0">
            {motorsContainerHeight > 0 && (
              <List<MotorRowPropsData>
                style={{ height: motorsContainerHeight, width: "100%" }}
                rowCount={filteredMotors.length}
                rowHeight={Math.round(46 * scale)}
                rowComponent={MotorRowWrapper as any}
                rowProps={{
                  filteredMotors,
                  motorPrices,
                  selectedMotor,
                  setSelectedMotor,
                  handleDeleteMotorClick,
                  handleToggleFavorite
                }}
              />
            )}
            {filteredMotors.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {isLoadingMotors ? 'Carregando motores…' : 'Nenhum motor encontrado'}
              </div>
            )}
          </div>
        </div>

        {/* ── Preços do motor selecionado ── */}
        <div className="bg-card border border-border rounded-2xl flex flex-col min-h-0 shadow-sm overflow-hidden">
          {/* Cabeçalho do motor */}
          <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-border shrink-0">
            <div className="min-w-0">
              <h3 className="text-2xl font-bold tracking-tight text-foreground uppercase truncate">{selectedMotor || 'Selecione um motor'}</h3>
              {selectedMotor && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {activePricesForSelectedMotorCount} {activePricesForSelectedMotorCount === 1 ? 'preço definido' : 'preços definidos'}
                </p>
              )}
            </div>
            {selectedMotor && (
              <div className="flex items-center gap-2 shrink-0">
                <div className="relative w-52">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Buscar serviço"
                    value={serviceSearch}
                    onChange={e => setServiceSearch(e.target.value)}
                    className="pl-9 text-sm h-9 rounded-xl border-border bg-card focus-visible:ring-primary/30"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => setIsCopyPricesOpen(true)}
                  className="h-9 px-3.5 rounded-xl border-border bg-card text-sm font-semibold gap-2"
                >
                  <Copy className="w-4 h-4" /> Copiar preços de outro motor
                </Button>
              </div>
            )}
          </div>

          {/* Abas de categoria + busca */}
          <div className="flex flex-wrap items-center gap-2 px-6 py-3.5 border-b border-border shrink-0">
            <button type="button" onClick={() => setCategoryFilter('')} className={tabClass(!categoryFilter)}>Todos</button>
            {categoryTabs.map(t => (
              <button key={t.key} type="button" onClick={() => setCategoryFilter(categoryFilter === t.key ? '' : t.key)} className={tabClass(categoryFilter === t.key)}>
                {t.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setOnlyPriced(v => !v)}
              className={cn(tabClass(onlyPriced), 'ml-auto inline-flex items-center gap-1.5')}
              title="Mostrar só os serviços com preço neste motor"
            >
              {onlyPriced && <Check className="w-3.5 h-3.5" />} Só com preço
            </button>
          </div>

          {/* Cabeçalho da tabela */}
          <div className="grid grid-cols-[minmax(0,1fr)_170px_96px] gap-4 px-6 py-2.5 bg-muted/50 border-b border-border text-xs font-semibold uppercase tracking-wide text-muted-foreground shrink-0">
            <div>Serviço</div>
            <div>Preço neste motor</div>
            <div className="text-right">Opções</div>
          </div>

          {/* Linhas */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {!selectedMotor ? (
              <div className="py-16 text-center text-sm text-muted-foreground">Selecione um motor à esquerda para ver e editar os preços.</div>
            ) : pricingGroups.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">Nenhum serviço encontrado com esses filtros.</div>
            ) : (
              pricingGroups.map(group => (
                <div key={group.key}>
                  {!categoryFilter && (
                    <div className="px-6 pt-4 pb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.label}</div>
                  )}
                  {group.items.map(svc => {
                    const base = svc.prices.find(p => p.subName === '');
                    const variations = svc.prices.filter(p => p.subName !== '');
                    const observation = base?.observation || '';
                    return (
                      <div key={svc.id} className="border-b border-border last:border-b-0">
                        <div className="group grid grid-cols-[minmax(0,1fr)_170px_96px] gap-4 items-center px-6 py-2.5 hover:bg-muted/30 transition-colors">
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-foreground truncate" title={svc.name}>{sentenceCase(svc.name)}</div>
                            {observation && (
                              <button
                                type="button"
                                onClick={() => handleOpenObservation(svc.id, svc.name, observation)}
                                className="block max-w-full text-left text-xs text-muted-foreground italic truncate hover:text-foreground cursor-pointer"
                                title="Editar observação"
                              >
                                {observation}
                              </button>
                            )}
                          </div>
                          <PriceInput
                            value={base?.price}
                            label={`Preço de ${svc.name} no motor ${selectedMotor}`}
                            onCommit={(v) => commitPrice(svc.id, '', v, base)}
                          />
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenDefinePrice(svc.id, svc.name)}
                              title="Adicionar preço para uma medida (ex.: 0.25, 8 válvulas)"
                              className="h-8 px-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" /> Medida
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenObservation(svc.id, svc.name, observation)}
                              title={observation ? 'Editar observação' : 'Adicionar observação'}
                              className={cn(
                                'w-8 h-8 rounded-lg inline-flex items-center justify-center hover:bg-muted cursor-pointer',
                                observation ? 'text-foreground' : 'text-muted-foreground opacity-0 group-hover:opacity-100 focus:opacity-100'
                              )}
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Preços por medida */}
                        {variations.map(v => (
                          <div key={v.id} className="group grid grid-cols-[minmax(0,1fr)_170px_96px] gap-4 items-center px-6 py-2 bg-muted/20">
                            <div className="min-w-0 pl-4 text-sm text-muted-foreground truncate">
                              <span className="text-muted-foreground/60 mr-1.5">↳</span>Medida <span className="font-medium text-foreground uppercase">{v.subName}</span>
                            </div>
                            <PriceInput
                              value={v.price}
                              label={`Preço de ${svc.name} medida ${v.subName}`}
                              onCommit={(val) => val === null ? handleDeletePriceClick(v.id) : commitPrice(svc.id, v.subName, val, v)}
                            />
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() => handleDeletePriceClick(v.id)}
                                title="Remover esta medida"
                                className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-muted-foreground opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-danger hover:bg-danger/10 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Rodapé */}
          <div className="flex items-center justify-between gap-4 px-6 py-3 border-t border-border text-sm shrink-0">
            <span className="text-muted-foreground">Preços em branco ficam livres para digitar na O.S.</span>
            <span className={cn(
              'font-medium whitespace-nowrap',
              saveState === 'saved' && 'text-success',
              saveState === 'saving' && 'text-muted-foreground',
              saveState === 'error' && 'text-danger'
            )}>
              {saveState === 'saved' && 'Alterações salvas'}
              {saveState === 'saving' && 'Salvando…'}
              {saveState === 'error' && 'Erro ao salvar'}
            </span>
          </div>
        </div>
      </div>

      {/* ═══ DIALOG: SERVIÇOS DO CATÁLOGO ═══ */}
      {isCatalogOpen && (
        <Dialog open={isCatalogOpen} onOpenChange={setIsCatalogOpen}>
          <DialogContent className="max-w-lg bg-card border border-border rounded-2xl shadow-2xl p-0 gap-0 overflow-hidden">
            <DialogHeader className="px-6 pt-5 pb-4 border-b border-border">
              <div className="flex items-start justify-between gap-4 pr-8">
                <div>
                  <DialogTitle className="text-lg font-bold text-foreground">Serviços do catálogo</DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground mt-0.5">
                    Ficam disponíveis em todos os motores. O preço de cada motor é definido na tabela.
                  </DialogDescription>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Buscar serviço"
                    value={catalogSearch}
                    onChange={e => setCatalogSearch(e.target.value)}
                    className="pl-9 text-sm h-9 rounded-xl border-border bg-card"
                  />
                </div>
                <Button onClick={() => setIsNewServiceOpen(true)} className="solid-btn h-9 px-3.5 rounded-xl text-sm font-bold gap-1.5">
                  <Plus className="w-4 h-4" /> Novo serviço
                </Button>
              </div>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto px-3 py-2">
              {combinedCatalogList.length === 0 && (
                <div className="py-8 text-center text-sm text-muted-foreground">Nenhum serviço encontrado</div>
              )}
              {combinedCatalogList.map(item => {
                if (item.type === 'header') {
                  return (
                    <div key={item.id} className="px-3 pt-3 pb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {item.label}
                    </div>
                  );
                }
                return (
                  <div key={item.id} className="group flex items-center gap-3 px-3 h-11 rounded-lg hover:bg-muted/60">
                    <span className="flex-1 min-w-0 truncate text-sm font-medium text-foreground">{sentenceCase(item.name)}</span>
                    {item.type === 'custom' ? (
                      <>
                        {item.defaultPrice > 0 && (
                          <span className="text-xs text-muted-foreground tabular-nums">
                            padrão {item.defaultPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        )}
                        <button
                          type="button"
                          title="Editar serviço"
                          onClick={() => {
                            setEditServiceId(item.id);
                            setEditServiceName(item.name);
                            setEditServicePrice(item.defaultPrice.toString());
                            setIsEditServiceOpen(true);
                          }}
                          className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          title="Remover serviço"
                          onClick={() => handleDeleteServiceClick(item.id, item.name)}
                          className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:text-danger hover:bg-danger/10 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">padrão do sistema</span>
                    )}
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ═══ DIALOG: NOVO MOTOR ═══ */}
      {isNewMotorOpen && (
        <Dialog open={isNewMotorOpen} onOpenChange={setIsNewMotorOpen}>
          <DialogContent className="max-w-sm bg-card dark:bg-background border border-border rounded-xl shadow-2xl p-6">
            <form onSubmit={handleCreateMotor} className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Layers className="w-4 h-4 text-muted-foreground" />
                  Cadastrar Novo Motor
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Adicione um novo modelo/marca de motor à base de dados.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2">
                <Label htmlFor="motor-name" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Nome do Motor</Label>
                <Input
                  id="motor-name"
                  type="text"
                  placeholder="Ex: GM, AP, CHT, FIAT"
                  value={newMotorName}
                  onChange={e => setNewMotorName(e.target.value)}
                  className="text-xs font-bold uppercase placeholder:normal-case h-10 border-border bg-muted/60 dark:bg-card focus-visible:ring-primary/40"
                  required
                  autoFocus
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0 mt-4 border-t border-border pt-4 bg-transparent">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsNewMotorOpen(false)}
                  className="text-xs border-border hover:bg-muted dark:hover:bg-card text-muted-foreground"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="solid-btn font-bold uppercase tracking-wider text-xs px-4"
                >
                  Cadastrar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* ═══ DIALOG: NOVO SERVIÇO ═══ */}
      {isNewServiceOpen && (
        <Dialog open={isNewServiceOpen} onOpenChange={setIsNewServiceOpen}>
          <DialogContent className="max-w-sm bg-card dark:bg-background border border-border rounded-xl shadow-2xl p-6">
            <form onSubmit={handleCreateService} className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-muted-foreground" />
                  Cadastrar Novo Serviço
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Adicione um novo serviço personalizado disponível para todos os motores.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="svc-name" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Descrição do Serviço</Label>
                  <Input
                    id="svc-name"
                    type="text"
                    placeholder="Ex.: Retificar bielas"
                    value={newServiceName}
                    onChange={e => setNewServiceName(e.target.value)}
                    className="text-xs font-bold uppercase placeholder:normal-case h-10 border-border bg-muted/60 dark:bg-card focus-visible:ring-primary/40"
                    required
                    autoFocus
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="svc-price" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Preço Padrão (Opcional)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground">R$</span>
                    <Input
                      id="svc-price"
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={newServicePrice}
                      onChange={e => setNewServicePrice(e.target.value)}
                      className="pl-9 text-xs font-mono h-10 border-border bg-muted/60 dark:bg-card focus-visible:ring-primary/40"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 mt-4 border-t border-border pt-4 bg-transparent">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsNewServiceOpen(false)}
                  className="text-xs border-border hover:bg-muted dark:hover:bg-card text-muted-foreground"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="solid-btn font-bold uppercase tracking-wider text-xs px-4"
                >
                  Cadastrar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* ═══ DIALOG: EDITAR SERVIÇO ═══ */}
      {isEditServiceOpen && (
        <Dialog open={isEditServiceOpen} onOpenChange={setIsEditServiceOpen}>
          <DialogContent className="max-w-sm bg-card dark:bg-background border border-border rounded-xl shadow-2xl p-6">
            <form onSubmit={handleUpdateService} className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-muted-foreground" />
                  Editar Serviço Catalogado
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Altere os detalhes do serviço personalizado.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-svc-name" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Descrição do Serviço</Label>
                  <Input
                    id="edit-svc-name"
                    type="text"
                    placeholder="Ex.: Retificar bielas"
                    value={editServiceName}
                    onChange={e => setEditServiceName(e.target.value)}
                    className="text-xs font-bold uppercase placeholder:normal-case h-10 border-border bg-muted/60 dark:bg-card focus-visible:ring-primary/40"
                    required
                    autoFocus
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-svc-price" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Preço Padrão</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground">R$</span>
                    <Input
                      id="edit-svc-price"
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={editServicePrice}
                      onChange={e => setEditServicePrice(e.target.value)}
                      className="pl-9 text-xs font-mono h-10 border-border bg-muted/60 dark:bg-card focus-visible:ring-primary/40"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 mt-4 border-t border-border pt-4 bg-transparent">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditServiceOpen(false)}
                  className="text-xs border-border hover:bg-muted dark:hover:bg-card text-muted-foreground"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="solid-btn font-bold uppercase tracking-wider text-xs px-4"
                >
                  Salvar Alterações
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* ═══ DIALOG: DEFINIR PREÇO POR MOTOR ═══ */}
      {isDefinePriceOpen && (
        <Dialog open={isDefinePriceOpen} onOpenChange={setIsDefinePriceOpen}>
          <DialogContent className="max-w-sm bg-card dark:bg-background border border-border rounded-xl shadow-2xl p-6">
            <form onSubmit={handleSavePrice} className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  {editingPriceId ? 'Alterar Preço do Motor' : 'Definir Preço do Motor'}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Defina o preço específico para o motor <strong className="uppercase">{selectedMotor}</strong> no serviço <strong>{priceServiceName}</strong>.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="price-subname" className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                    <span>Variação / Especificidade (Opcional)</span>
                    <span className="text-xs text-muted-foreground lowercase">Ex: 8 válvulas, 1.0, 1.6</span>
                  </Label>
                  <Input
                    id="price-subname"
                    type="text"
                    placeholder="Deixe vazio para o preço base geral"
                    value={priceSubName}
                    onChange={e => setPriceSubName(e.target.value)}
                    disabled={!!editingPriceId}
                    className="text-xs font-bold uppercase placeholder:normal-case h-10 border-border bg-muted/60 dark:bg-card focus-visible:ring-primary/40"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="price-value" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Valor do Serviço (R$)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground">R$</span>
                    <Input
                      id="price-value"
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={priceValue}
                      onChange={e => setPriceValue(e.target.value)}
                      className="pl-9 text-xs font-mono h-10 border-border bg-muted/60 dark:bg-card focus-visible:ring-primary/40"
                      required
                      autoFocus
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 mt-4 border-t border-border pt-4 bg-transparent">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDefinePriceOpen(false)}
                  className="text-xs border-border hover:bg-muted dark:hover:bg-card text-muted-foreground"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="solid-btn font-bold uppercase tracking-wider text-xs px-4"
                >
                  Salvar Preço
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* ═══ DIALOG: COPIAR TABELA DE PREÇOS ═══ */}
      {isCopyPricesOpen && (
        <Dialog open={isCopyPricesOpen} onOpenChange={setIsCopyPricesOpen}>
          <DialogContent className="max-w-sm bg-card dark:bg-background border border-border rounded-xl shadow-2xl p-6">
            <form onSubmit={handleCopyPrices} className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Copy className="w-4 h-4 text-muted-foreground" />
                  Copiar Tabela de Preços
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Copie todas as configurações de preços de um motor existente para o motor selecionado (<strong className="uppercase">{selectedMotor}</strong>).
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="source-motor" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Copiar Preços a Partir de:</Label>
                  <select
                    id="source-motor"
                    value={copySourceMotor}
                    onChange={e => setCopySourceMotor(e.target.value)}
                    className="w-full h-10 px-3 text-xs font-bold uppercase rounded-lg border border-border bg-muted/60 dark:bg-card text-foreground focus-visible:ring-primary/40 focus:outline-none focus:ring-2 focus:ring-danger/30"
                    required
                  >
                    <option value="">Selecione um motor...</option>
                    {motors
                      .filter(m => m.id.toUpperCase() !== selectedMotor.toUpperCase())
                      .map(m => {
                        const count = motorPrices.filter(p => p.motorId === m.id.toUpperCase() && p.price > 0).length;
                        return (
                          <option key={m.id} value={m.id}>
                            {m.id} ({count} preços definidos)
                          </option>
                        );
                      })
                    }
                  </select>
                </div>

                <div className="p-3 bg-danger/10 border border-danger/20 text-danger rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Atenção</span>
                  </div>
                  <p className="text-xs font-semibold leading-relaxed">
                    Esta ação substituirá preços existentes no motor <strong className="uppercase">{selectedMotor}</strong> que possuam as mesmas variações de serviços vindas do motor de origem.
                  </p>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 mt-4 border-t border-border pt-4 bg-transparent">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCopyPricesOpen(false)}
                  className="text-xs border-border hover:bg-muted dark:hover:bg-card text-muted-foreground"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="solid-btn font-bold uppercase tracking-wider text-xs px-4"
                >
                  Copiar e Substituir
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* ═══ DIALOG: DEFINIR/EDITAR OBSERVAÇÃO ═══ */}
      {isObservationOpen && (
        <Dialog open={isObservationOpen} onOpenChange={setIsObservationOpen}>
          <DialogContent className="max-w-md bg-card dark:bg-background border border-border rounded-xl shadow-2xl p-6">
            <form onSubmit={handleSaveObservation} className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Tag className="w-4 h-4 text-muted-foreground" />
                  Definir Observação
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Adicione ou edite uma observação específica para o serviço <strong className="uppercase">{obsServiceName}</strong> no motor <strong className="uppercase">{selectedMotor}</strong>.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="observation-text" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Observação:</Label>
                  <textarea
                    id="observation-text"
                    placeholder="Ex: Preço válido somente para eixo sem solda..."
                    value={obsValue}
                    onChange={e => setObsValue(e.target.value)}
                    className="w-full min-h-[80px] p-3 text-xs font-semibold rounded-lg border border-border bg-muted/60 dark:bg-card text-foreground focus-visible:ring-primary/40 focus:outline-none focus:ring-2 focus:ring-danger/30 resize-y"
                    maxLength={500}
                  />
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 mt-4 border-t border-border pt-4 bg-transparent">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsObservationOpen(false)}
                  className="text-xs border-border hover:bg-muted dark:hover:bg-card text-muted-foreground"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="solid-btn font-bold uppercase tracking-wider text-xs px-4"
                >
                  Salvar Observação
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Confirmation Dialog for Deletions */}
      <Dialog open={confirmAction.isOpen} onOpenChange={(open) => { if (!open) setConfirmAction(prev => ({ ...prev, isOpen: false })); }}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" /> {confirmAction.title}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 text-xs space-y-2 text-muted-foreground">
            <p>{confirmAction.description}</p>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmAction(prev => ({ ...prev, isOpen: false }))}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                const action = confirmAction.onConfirm;
                setConfirmAction(prev => ({ ...prev, isOpen: false }));
                await action();
              }}
            >
              Confirmar Exclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
