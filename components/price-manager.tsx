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
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Star
} from 'lucide-react';
import { toast } from 'sonner';
import { List } from 'react-window';

// Wrapper component for MotorRow to use with react-window List
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
    <div style={style} className="pr-2.5 pb-2">
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

// Wrapper component for ServiceCard to use with react-window List
interface ServiceCardPropsData {
  combinedPricingList: {
    id: string;
    name: string;
    category: string;
    prices: MotorPrice[];
    isCustom: boolean;
    defaultPrice: number;
  }[];
  selectedMotor: string;
  handleOpenObservation: (id: string, name: string, obsText: string) => void;
  handleDeleteObservation: (id: string) => void;
  handleOpenDefinePrice: (id: string, name: string, priceItem?: MotorPrice) => void;
  handleDeletePriceClick: (id: string) => void;
}

interface ServiceCardWrapperProps extends ServiceCardPropsData {
  index: number;
  style: React.CSSProperties;
}

const ServiceCardWrapper = React.memo(({
  index,
  style,
  combinedPricingList,
  selectedMotor,
  handleOpenObservation,
  handleDeleteObservation,
  handleOpenDefinePrice,
  handleDeletePriceClick
}: ServiceCardWrapperProps) => {
  const svc = combinedPricingList[index];
  if (!svc) return null;
  return (
    <div style={style} className="pr-2.5 pb-3">
      <ServiceCard
        svc={svc}
        selectedMotor={selectedMotor}
        onOpenObservation={handleOpenObservation}
        onDeleteObservation={handleDeleteObservation}
        onOpenDefinePrice={handleOpenDefinePrice}
        onDeletePriceClick={handleDeletePriceClick}
      />
    </div>
  );
});
ServiceCardWrapper.displayName = 'ServiceCardWrapper';

interface CatalogRowPropsData {
  combinedCatalogList: Array<
    | { type: 'header'; id: string; label: string }
    | { type: 'standard'; id: string; name: string }
    | { type: 'custom'; id: string; name: string; defaultPrice: number }
  >;
  setEditServiceId: (id: string) => void;
  setEditServiceName: (name: string) => void;
  setEditServicePrice: (price: string) => void;
  setIsEditServiceOpen: (open: boolean) => void;
  handleDeleteServiceClick: (id: string, name: string) => void;
}

interface CatalogRowWrapperProps extends CatalogRowPropsData {
  index: number;
  style: React.CSSProperties;
}

const CatalogRowWrapper = React.memo(({
  index,
  style,
  combinedCatalogList,
  setEditServiceId,
  setEditServiceName,
  setEditServicePrice,
  setIsEditServiceOpen,
  handleDeleteServiceClick
}: CatalogRowWrapperProps) => {
  const item = combinedCatalogList[index];
  if (!item) return null;

  if (item.type === 'header') {
    return (
      <div style={style} className="px-1 py-1 text-xs font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 border-b border-zinc-100 dark:border-zinc-900/60 flex items-end">
        {item.label}
      </div>
    );
  }

  if (item.type === 'custom') {
    return (
      <div style={style} className="pb-1.5 pr-2.5">
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold group h-full">
          <div className="flex flex-col min-w-0">
            <span className="font-extrabold text-zinc-950 dark:text-zinc-100 uppercase truncate">
              {item.name}
            </span>
            {item.defaultPrice > 0 && (
              <span className="text-xs font-mono text-zinc-500 mt-0.5">
                Padrão: {item.defaultPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => {
                setEditServiceId(item.id);
                setEditServiceName(item.name);
                setEditServicePrice(item.defaultPrice.toString());
                setIsEditServiceOpen(true);
              }}
              className="h-6 w-6 text-zinc-500 hover:text-red-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded"
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => handleDeleteServiceClick(item.id, item.name)}
              className="h-6 w-6 text-zinc-500 hover:text-red-650 hover:bg-red-500/10 rounded"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // standard item
  return (
    <div style={style} className="pb-1.5 pr-2.5">
      <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-100 dark:border-zinc-900/40 text-xs h-full">
        <span className="font-extrabold text-zinc-800 dark:text-zinc-300 uppercase tracking-wide truncate max-w-[150px] lg:max-w-full">
          {item.name}
        </span>
        <Badge variant="outline" className="text-xs uppercase tracking-widest bg-zinc-100 dark:bg-zinc-950 font-bold shrink-0 text-zinc-500 border-zinc-200 dark:border-zinc-800">
          Padrão
        </Badge>
      </div>
    </div>
  );
});
CatalogRowWrapper.displayName = 'CatalogRowWrapper';


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

// Memoized Motor Row item
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
      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
        isSelected
          ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 border-zinc-950 dark:border-white shadow-md'
          : 'bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {/* Star icon button */}
        <button
          onClick={(e) => onToggleFavorite(motor.id, motor.is_favorite, e)}
          className={`p-1 hover:scale-110 transition-transform shrink-0 ${
            motor.is_favorite 
              ? 'text-amber-500 hover:text-amber-600' 
              : isSelected 
                ? 'text-zinc-400 hover:text-white' 
                : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
          }`}
        >
          {motor.is_favorite ? (
            <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
          ) : (
            <Star className="w-4 h-4" />
          )}
        </button>

        <div className="flex flex-col min-w-0 flex-1">
          <span className="font-extrabold text-xs uppercase tracking-wide truncate">{motor.id}</span>
          <span className={`text-xs font-bold uppercase tracking-wider mt-0.5 ${
            isSelected 
              ? 'opacity-80' 
              : 'text-zinc-500 dark:text-zinc-400'
          }`}>
            {count} {count === 1 ? 'preço' : 'preços'}
          </span>
        </div>
      </div>
      
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={(e) => onDelete(motor.id, e)}
        className={`h-6 w-6 rounded-md hover:bg-red-500/10 hover:text-red-600 transition-colors ${
          isSelected 
            ? 'text-zinc-400 hover:text-red-500 hover:bg-white/10 dark:hover:bg-black/10' 
            : 'text-zinc-500'
        }`}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
});
MotorRow.displayName = 'MotorRow';

// Memoized Service Card Component
interface ServiceCardProps {
  svc: {
    id: string;
    name: string;
    category: string;
    prices: MotorPrice[];
    isCustom: boolean;
    defaultPrice: number;
  };
  selectedMotor: string;
  onOpenObservation: (id: string, name: string, obsText: string) => void;
  onDeleteObservation: (id: string) => void;
  onOpenDefinePrice: (id: string, name: string, priceItem?: MotorPrice) => void;
  onDeletePriceClick: (id: string) => void;
}

const ServiceCard = React.memo(({
  svc,
  selectedMotor,
  onOpenObservation,
  onDeleteObservation,
  onOpenDefinePrice,
  onDeletePriceClick
}: ServiceCardProps) => {
  const isPriced = svc.prices.some(p => p.price > 0);
  const standardPriceItem = svc.prices.find(p => p.subName === '');
  const observationText = standardPriceItem?.observation || '';

  return (
    <div className="pt-3 px-4 pb-3 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-zinc-300 dark:hover:border-zinc-700 transition-all space-y-2 min-h-0 mb-3">
      {/* Service title row */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <span className="text-xs font-black uppercase text-zinc-500 tracking-wider">
            {svc.category}
          </span>
          <h4 className="font-extrabold text-xs text-zinc-900 dark:text-zinc-100 uppercase tracking-wide truncate">
            {svc.name}
          </h4>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          <Badge
            variant="outline"
            className={`text-xs font-bold px-2 py-0.5 rounded border shrink-0 ${
              isPriced
                ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20'
                : 'bg-zinc-500/10 text-muted-foreground border-zinc-500/20'
            }`}
          >
            {isPriced ? 'Com preço' : 'Sem preço'}
          </Badge>
          <Button
            size="xs"
            onClick={() => onOpenDefinePrice(svc.id, svc.name)}
            className="solid-btn text-xs font-bold h-7 px-3 rounded-lg flex items-center gap-1.5"
          >
            <Plus className="w-3 h-3" />
            {isPriced ? 'Outra medida' : 'Definir preço'}
          </Button>
        </div>
      </div>

      {/* Observation Field */}
      <div className="pt-0.5">
        {observationText ? (
          <div className="p-2.5 bg-zinc-100/60 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800/80 rounded-lg flex items-start justify-between gap-3 text-xs">
            <div className="space-y-1 min-w-0">
              <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground block">
                Observação:
              </span>
              <p className="text-zinc-700 dark:text-zinc-300 font-medium italic select-text">
                {observationText}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => onOpenObservation(svc.id, svc.name, observationText)}
                className="h-6 w-6 text-zinc-500 hover:text-red-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded"
              >
                <Pencil className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => onDeleteObservation(svc.id)}
                className="h-6 w-6 text-zinc-500 hover:text-red-650 hover:bg-red-500/10 rounded"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => onOpenObservation(svc.id, svc.name, '')}
            className="text-xs text-zinc-500 hover:text-foreground font-semibold transition-colors flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Adicionar observação
          </button>
        )}
      </div>

      {/* Variations list */}
      {svc.prices.some(p => p.price > 0 || p.subName !== '') && (
        <div className="border-t border-zinc-200/50 dark:border-zinc-800/50 pt-2.5 space-y-2">
          {svc.prices.filter(p => p.price > 0 || p.subName !== '').map((priceItem) => (
            <div 
              key={priceItem.id} 
              className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900/60 shadow-sm text-xs font-semibold"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Tag className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span className="text-zinc-900 dark:text-zinc-200 uppercase truncate">
                  {priceItem.subName 
                    ? `${svc.name} — ${priceItem.subName}` 
                    : `${svc.name} (Padrão)`
                  }
                </span>
              </div>
              
              <div className="flex items-center gap-3 shrink-0 ml-4">
                <span className="font-mono font-black text-zinc-900 dark:text-zinc-100">
                  {priceItem.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
                
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => onOpenDefinePrice(svc.id, svc.name, priceItem)}
                    className="h-7 w-7 text-zinc-500 hover:text-red-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-full"
                  >
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => onDeletePriceClick(priceItem.id)}
                    className="h-7 w-7 text-zinc-500 hover:text-red-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-full"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
});
ServiceCard.displayName = 'ServiceCard';

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
  const servicesContainerRef = useRef<HTMLDivElement>(null);
  const servicesContainerHeight = useContainerHeight(servicesContainerRef);
  const servicesListRef = useRef<any>(null);
  const catalogContainerRef = useRef<HTMLDivElement>(null);
  const catalogContainerHeight = useContainerHeight(catalogContainerRef);

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

  const getCatalogItemSize = useCallback((index: number) => {
    const item = combinedCatalogList[index];
    if (!item) return 44;
    if (item.type === 'header') return 24;
    if (item.type === 'custom' && item.defaultPrice > 0) return 54;
    return 44;
  }, [combinedCatalogList]);

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
        category: 'SERVIÇOS PERSONALIZADOS',
        prices: pricesForThisMotorAndService,
        isCustom: true,
        defaultPrice: svc.defaultPrice
      });
    });

    return list.sort((a, b) => (a.category || '').localeCompare(b.category || '') || (a.name || '').localeCompare(b.name || ''));
  }, [selectedMotor, motorPrices, customServices, debouncedServiceSearch, onlyPriced, resolveMotorName, resolveServiceId]);

  const getItemSize = useCallback((index: number) => {
    const svc = combinedPricingList[index];
    if (!svc) return Math.round(174 * scale);

    let size = 92; // base: título + categoria + botão na mesma linha + observação + espaçamento
    
    const standardPriceItem = svc.prices.find(p => p.subName === '');
    const observationText = standardPriceItem?.observation || '';
    if (observationText) {
      size += 55;
    }

    const pricedVariations = svc.prices.filter(p => p.price > 0 || p.subName !== '');
    if (pricedVariations.length > 0) {
      size += pricedVariations.length * 52 + 16;
    }
    
    return Math.round((size + 12) * scale);
  }, [combinedPricingList, scale]);

  useEffect(() => {
    if (servicesListRef.current && typeof servicesListRef.current.resetAfterIndex === 'function') {
      servicesListRef.current.resetAfterIndex(0);
    }
  }, [combinedPricingList, scale]);

  // Counters
  const catalogedServicesCount = SERVICE_CATEGORIES.reduce((acc, cat) => acc + cat.services.length, 0) + customServices.length;
  const activePricesCount = useMemo(() => {
    return motorPrices.filter(p => p.price > 0).length;
  }, [motorPrices]);

  const activePricesForSelectedMotorCount = useMemo(() => {
    return motorPrices.filter(p => (p.motorId === selectedMotor || resolveMotorName(p.motorId).toUpperCase() === selectedMotor.toUpperCase()) && p.price > 0).length;
  }, [motorPrices, selectedMotor, resolveMotorName]);

  return (
    <div className="space-y-6 select-none max-w-7xl mx-auto h-[calc(100vh-4rem)] flex flex-col">
      {/* ═══ BARRA SUPERIOR DE STATS ═══ */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Tabela de Preços</h2>
          <p className="text-muted-foreground mt-0.5 text-sm">Preço de cada serviço por motor. Escolha o motor à esquerda.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Stats Indicators */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border rounded-lg text-sm text-muted-foreground">
            <Layers className="w-3.5 h-3.5 text-zinc-500" />
            <span>Motores:</span>
            <span className="font-bold text-foreground tabular-nums">{motors.length}</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border rounded-lg text-sm text-muted-foreground">
            <Wrench className="w-3.5 h-3.5 text-zinc-500" />
            <span>Serviços:</span>
            <span className="font-bold text-foreground tabular-nums">{catalogedServicesCount}</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border rounded-lg text-sm text-muted-foreground">
            <Coins className="w-3.5 h-3.5 text-zinc-500" />
            <span>Preços definidos:</span>
            <span className="font-bold text-foreground tabular-nums">{activePricesCount}</span>
          </div>
        </div>
      </div>

      {/* ═══ CONTEÚDO PRINCIPAL (3 COLUNAS) ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 pb-2">
        
        {/* ═══ COLUNA 1: MOTORES (3/12 width) ═══ */}
        <div className="lg:col-span-3 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col min-h-0 shadow-lg relative">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
              <Layers className="w-4 h-4 text-muted-foreground" />
              <span>Motores ({motors.length})</span>
            </div>
            <Button
              size="xs"
              onClick={() => setIsNewMotorOpen(true)}
              className="solid-btn text-xs font-bold px-2.5 h-7 rounded-lg"
            >
              <Plus className="w-3 h-3 mr-1" />
              Novo
            </Button>
          </div>

          {/* Search bar */}
          <div className="relative mb-3 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
            <Input
              type="text"
              placeholder="Pesquisar motor..."
              value={motorSearch}
              onChange={e => setMotorSearch(e.target.value)}
              className="pl-9 text-xs h-9 rounded-lg border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 focus-visible:ring-primary/40"
            />
          </div>

          {/* Filters "Todos" and "Favoritos" */}
          <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg mb-3 shrink-0">
            <button
              onClick={() => setFavoriteFilter('all')}
              className={`flex-1 py-1.5 text-xs font-black uppercase tracking-wider rounded-md transition-all ${
                favoriteFilter === 'all'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFavoriteFilter('favorites')}
              className={`flex-1 py-1.5 text-xs font-black uppercase tracking-wider rounded-md transition-all ${
                favoriteFilter === 'favorites'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              Favoritos
            </button>
          </div>

          {/* Motors list scroll area */}
          <div ref={motorsContainerRef} className="flex-1 min-h-0">
            {motorsContainerHeight > 0 && (
              <List<MotorRowPropsData>
                style={{ height: motorsContainerHeight, width: "100%" }}
                rowCount={filteredMotors.length}
                rowHeight={72}
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
              <div className="py-8 text-center text-xs text-zinc-500 italic">
                Nenhum motor encontrado
              </div>
            )}
          </div>
        </div>

        {/* ═══ COLUNA 2: TABELA DE PREÇOS DO MOTOR (6/12 width) ═══ */}
        <div className="lg:col-span-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col min-h-0 shadow-lg">
          {/* Header block */}
          <div className="p-3.5 bg-secondary/40 border border-border rounded-xl text-foreground flex items-center justify-between mb-4 shrink-0">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Preços do motor</span>
              <h3 className="font-black text-sm uppercase tracking-wide">{selectedMotor || 'SELECIONE UM MOTOR'}</h3>
            </div>
            
            {selectedMotor && (
              <Button
                size="xs"
                variant="outline"
                onClick={() => setIsCopyPricesOpen(true)}
                className="bg-card border-border text-foreground text-sm font-semibold h-8 rounded-lg flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                Copiar de outro motor
              </Button>
            )}
          </div>

          {/* Search/Filters bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4 shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              <Input
                type="text"
                placeholder="Pesquisar serviço nesta tabela..."
                value={serviceSearch}
                onChange={e => setServiceSearch(e.target.value)}
                className="pl-9 text-xs h-9 rounded-lg border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 focus-visible:ring-primary/40"
              />
            </div>
            
            <div className="flex items-center gap-2 px-1">
              <Checkbox 
                id="only-priced" 
                checked={onlyPriced} 
                onCheckedChange={(checked) => setOnlyPriced(!!checked)}
                className="border-zinc-300 dark:border-zinc-700 data-[state=checked]:bg-primary data-[state=checked]:border-primary rounded"
              />
              <label 
                htmlFor="only-priced" 
                className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 select-none cursor-pointer"
              >
                Apenas precificados
              </label>
            </div>
          </div>

          {/* Scrollable list of services and prices */}
          <div ref={servicesContainerRef} className="flex-1 min-h-0">
            {servicesContainerHeight > 0 && (
              <List<ServiceCardPropsData>
                listRef={servicesListRef}
                style={{ height: servicesContainerHeight, width: "100%" }}
                rowCount={combinedPricingList.length}
                rowHeight={getItemSize}
                rowComponent={ServiceCardWrapper as any}
                rowProps={{
                  combinedPricingList,
                  selectedMotor,
                  handleOpenObservation,
                  handleDeleteObservation,
                  handleOpenDefinePrice,
                  handleDeletePriceClick
                }}
              />
            )}

            {combinedPricingList.length === 0 && (
              <div className="py-12 text-center text-xs text-zinc-500 italic">
                {selectedMotor 
                  ? 'Nenhum serviço correspondente aos filtros' 
                  : 'Selecione um motor na coluna da esquerda para gerenciar seus preços'
                }
              </div>
            )}
          </div>
        </div>

        {/* ═══ COLUNA 3: SERVIÇOS CATALOGADOS (3/12 width) ═══ */}
        <div className="lg:col-span-3 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col min-h-0 shadow-lg justify-between">
          <div className="flex flex-col min-h-0 flex-1">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                <Wrench className="w-4 h-4 text-muted-foreground" />
                <span>Serviços Catalogados ({catalogedServicesCount})</span>
              </div>
              <Button
                size="xs"
                onClick={() => setIsNewServiceOpen(true)}
                className="solid-btn text-xs font-bold px-2.5 h-7 rounded-lg"
              >
                <Plus className="w-3 h-3 mr-1" />
                Novo
              </Button>
            </div>

            {/* Search Input */}
            <div className="relative mb-3 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              <Input
                type="text"
                placeholder="Pesquisar catálogo..."
                value={catalogSearch}
                onChange={e => setCatalogSearch(e.target.value)}
                className="pl-9 text-xs h-9 rounded-lg border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 focus-visible:ring-primary/40"
              />
            </div>

            {/* Catalog services scroll area */}
            <div ref={catalogContainerRef} className="flex-1 min-h-0">
              {catalogContainerHeight > 0 && (
                <List<CatalogRowPropsData>
                  style={{ height: catalogContainerHeight, width: "100%" }}
                  rowCount={combinedCatalogList.length}
                  rowHeight={getCatalogItemSize as any}
                  rowComponent={CatalogRowWrapper as any}
                  rowProps={{
                    combinedCatalogList,
                    setEditServiceId,
                    setEditServiceName,
                    setEditServicePrice,
                    setIsEditServiceOpen,
                    handleDeleteServiceClick
                  }}
                />
              )}
              {combinedCatalogList.length === 0 && (
                <div className="py-8 text-center text-xs text-zinc-500 italic">
                  Nenhum serviço encontrado no catálogo
                </div>
              )}
            </div>
          </div>

          {/* Footer note card */}
          <div className="mt-4 p-3 bg-secondary/30 border border-border text-muted-foreground rounded-xl space-y-1.5 shrink-0">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-foreground tracking-wide">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Aviso do Catálogo</span>
            </div>
            <p className="text-xs leading-relaxed font-semibold">
              Qualquer serviço registrado no Catálogo fica disponível para todos os motores. Use as tabelas para customizar preços individuais.
            </p>
          </div>
        </div>
      </div>

      {/* ═══ DIALOG: NOVO MOTOR ═══ */}
      {isNewMotorOpen && (
        <Dialog open={isNewMotorOpen} onOpenChange={setIsNewMotorOpen}>
          <DialogContent className="max-w-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-6">
            <form onSubmit={handleCreateMotor} className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-sm font-black uppercase tracking-wider text-zinc-950 dark:text-zinc-100 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-muted-foreground" />
                  Cadastrar Novo Motor
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-500">
                  Adicione um novo modelo/marca de motor à base de dados.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2">
                <Label htmlFor="motor-name" className="text-xs font-black text-zinc-500 uppercase tracking-wider">Nome do Motor</Label>
                <Input
                  id="motor-name"
                  type="text"
                  placeholder="Ex: GM, AP, CHT, FIAT"
                  value={newMotorName}
                  onChange={e => setNewMotorName(e.target.value)}
                  className="text-xs font-bold uppercase placeholder:normal-case h-10 border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 focus-visible:ring-primary/40"
                  required
                  autoFocus
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0 mt-4 border-t border-zinc-100 dark:border-zinc-900 pt-4 bg-transparent">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsNewMotorOpen(false)}
                  className="text-xs border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400"
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
          <DialogContent className="max-w-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-6">
            <form onSubmit={handleCreateService} className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-sm font-black uppercase tracking-wider text-zinc-950 dark:text-zinc-100 flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-muted-foreground" />
                  Cadastrar Novo Serviço
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-500">
                  Adicione um novo serviço personalizado disponível para todos os motores.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="svc-name" className="text-xs font-black text-zinc-500 uppercase tracking-wider">Descrição do Serviço</Label>
                  <Input
                    id="svc-name"
                    type="text"
                    placeholder="Ex.: Retificar bielas"
                    value={newServiceName}
                    onChange={e => setNewServiceName(e.target.value)}
                    className="text-xs font-bold uppercase placeholder:normal-case h-10 border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 focus-visible:ring-primary/40"
                    required
                    autoFocus
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="svc-price" className="text-xs font-black text-zinc-500 uppercase tracking-wider">Preço Padrão (Opcional)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-400">R$</span>
                    <Input
                      id="svc-price"
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={newServicePrice}
                      onChange={e => setNewServicePrice(e.target.value)}
                      className="pl-9 text-xs font-mono h-10 border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 focus-visible:ring-primary/40"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 mt-4 border-t border-zinc-100 dark:border-zinc-900 pt-4 bg-transparent">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsNewServiceOpen(false)}
                  className="text-xs border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400"
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
          <DialogContent className="max-w-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-6">
            <form onSubmit={handleUpdateService} className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-sm font-black uppercase tracking-wider text-zinc-950 dark:text-zinc-100 flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-muted-foreground" />
                  Editar Serviço Catalogado
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-500">
                  Altere os detalhes do serviço personalizado.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-svc-name" className="text-xs font-black text-zinc-500 uppercase tracking-wider">Descrição do Serviço</Label>
                  <Input
                    id="edit-svc-name"
                    type="text"
                    placeholder="Ex.: Retificar bielas"
                    value={editServiceName}
                    onChange={e => setEditServiceName(e.target.value)}
                    className="text-xs font-bold uppercase placeholder:normal-case h-10 border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 focus-visible:ring-primary/40"
                    required
                    autoFocus
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-svc-price" className="text-xs font-black text-zinc-500 uppercase tracking-wider">Preço Padrão</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-400">R$</span>
                    <Input
                      id="edit-svc-price"
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={editServicePrice}
                      onChange={e => setEditServicePrice(e.target.value)}
                      className="pl-9 text-xs font-mono h-10 border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 focus-visible:ring-primary/40"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 mt-4 border-t border-zinc-100 dark:border-zinc-900 pt-4 bg-transparent">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditServiceOpen(false)}
                  className="text-xs border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400"
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
          <DialogContent className="max-w-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-6">
            <form onSubmit={handleSavePrice} className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-sm font-black uppercase tracking-wider text-zinc-950 dark:text-zinc-100 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  {editingPriceId ? 'Alterar Preço do Motor' : 'Definir Preço do Motor'}
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-500">
                  Defina o preço específico para o motor <strong className="uppercase">{selectedMotor}</strong> no serviço <strong>{priceServiceName}</strong>.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="price-subname" className="text-xs font-black text-zinc-500 uppercase tracking-wider flex items-center justify-between">
                    <span>Variação / Especificidade (Opcional)</span>
                    <span className="text-xs text-zinc-400 lowercase">Ex: 8 válvulas, 1.0, 1.6</span>
                  </Label>
                  <Input
                    id="price-subname"
                    type="text"
                    placeholder="Deixe vazio para o preço base geral"
                    value={priceSubName}
                    onChange={e => setPriceSubName(e.target.value)}
                    disabled={!!editingPriceId}
                    className="text-xs font-bold uppercase placeholder:normal-case h-10 border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 focus-visible:ring-primary/40"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="price-value" className="text-xs font-black text-zinc-500 uppercase tracking-wider">Valor do Serviço (R$)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-400">R$</span>
                    <Input
                      id="price-value"
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={priceValue}
                      onChange={e => setPriceValue(e.target.value)}
                      className="pl-9 text-xs font-mono h-10 border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 focus-visible:ring-primary/40"
                      required
                      autoFocus
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 mt-4 border-t border-zinc-100 dark:border-zinc-900 pt-4 bg-transparent">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDefinePriceOpen(false)}
                  className="text-xs border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400"
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
          <DialogContent className="max-w-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-6">
            <form onSubmit={handleCopyPrices} className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-sm font-black uppercase tracking-wider text-zinc-950 dark:text-zinc-100 flex items-center gap-2">
                  <Copy className="w-4 h-4 text-muted-foreground" />
                  Copiar Tabela de Preços
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-500">
                  Copie todas as configurações de preços de um motor existente para o motor selecionado (<strong className="uppercase">{selectedMotor}</strong>).
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="source-motor" className="text-xs font-black text-zinc-500 uppercase tracking-wider">Copiar Preços a Partir de:</Label>
                  <select
                    id="source-motor"
                    value={copySourceMotor}
                    onChange={e => setCopySourceMotor(e.target.value)}
                    className="w-full h-10 px-3 text-xs font-bold uppercase rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-foreground focus-visible:ring-primary/40 focus:outline-none focus:ring-2 focus:ring-red-600/30"
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

                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Atenção</span>
                  </div>
                  <p className="text-xs font-semibold leading-relaxed">
                    Esta ação substituirá preços existentes no motor <strong className="uppercase">{selectedMotor}</strong> que possuam as mesmas variações de serviços vindas do motor de origem.
                  </p>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 mt-4 border-t border-zinc-100 dark:border-zinc-900 pt-4 bg-transparent">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCopyPricesOpen(false)}
                  className="text-xs border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400"
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
          <DialogContent className="max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-6">
            <form onSubmit={handleSaveObservation} className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-sm font-black uppercase tracking-wider text-zinc-950 dark:text-zinc-100 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-muted-foreground" />
                  Definir Observação
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-500">
                  Adicione ou edite uma observação específica para o serviço <strong className="uppercase">{obsServiceName}</strong> no motor <strong className="uppercase">{selectedMotor}</strong>.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="observation-text" className="text-xs font-black text-zinc-500 uppercase tracking-wider">Observação:</Label>
                  <textarea
                    id="observation-text"
                    placeholder="Ex: Preço válido somente para eixo sem solda..."
                    value={obsValue}
                    onChange={e => setObsValue(e.target.value)}
                    className="w-full min-h-[80px] p-3 text-xs font-semibold rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-foreground focus-visible:ring-primary/40 focus:outline-none focus:ring-2 focus:ring-red-600/30 resize-y"
                    maxLength={500}
                  />
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 mt-4 border-t border-zinc-100 dark:border-zinc-900 pt-4 bg-transparent">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsObservationOpen(false)}
                  className="text-xs border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400"
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
