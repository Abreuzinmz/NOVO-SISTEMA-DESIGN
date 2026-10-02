'use client';

import React, { useState, useMemo, useCallback, memo, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  SERVICE_CATEGORIES,
  searchServices,
  getServiceById,
  type CatalogService,
  type SearchMatch,
} from '@/lib/service-catalog';
import { useStore, type ServiceItem } from '@/lib/store';
import { 
  fetchCustomServices,
  addCustomService,
  updateCustomService,
  deleteCustomService,
  type CustomService,
} from '@/lib/custom-services';
import {
  SearchIcon,
  Check,
  Plus,
  X,
  Trash2,
  Pencil,
  GripVertical,
  DollarSign,
  Wrench,
  CopyPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface AddServicePayload {
  id: string;
  name: string;
  value: number;
  quantity: number;
  measure?: string;
  motorId?: string;
}

interface ServiceCatalogProps {
  selectedServices: ServiceItem[];
  selectedMotorModel?: string;
  motorsList?: Array<{ model: string; cylinders: string; displacement: string }>;
  onAddService: (svc: AddServicePayload) => void;
  onRemoveService: (id: string) => void;
  onUpdateService: (id: string, updates: Partial<ServiceItem>) => void;
  onReorderServices?: (newServices: ServiceItem[]) => void;
  readOnly?: boolean;
}

const ServiceItemRow = memo(({ 
  svc, 
  index,
  motorsList,
  selectedServices,
  onUpdate, 
  onRemove, 
  onDuplicateToMotor,
  onEditMeasure,
  readOnly,
  formatCurrency,
  draggedIndex,
  dragEnabledIndex,
  setDragEnabledIndex,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: { 
  svc: ServiceItem, 
  index: number,
  motorsList?: Array<{ model: string; cylinders: string; displacement: string }>;
  selectedServices: ServiceItem[];
  onUpdate: (id: string, updates: Partial<ServiceItem>) => void,
  onRemove: (id: string) => void,
  onDuplicateToMotor?: (svc: ServiceItem) => void,
  onEditMeasure?: (svc: ServiceItem) => void,
  readOnly: boolean,
  formatCurrency: (v: number) => string,
  draggedIndex: number | null,
  dragEnabledIndex: number | null,
  setDragEnabledIndex: (idx: number | null) => void,
  onDragStart: (e: React.DragEvent, index: number) => void,
  onDragEnd: () => void,
  onDragOver: (e: React.DragEvent, index: number) => void,
  onDrop: (e: React.DragEvent) => void,
}) => {
  const isDuplicateDisabled = useMemo(() => {
    if (!motorsList || motorsList.length < 2) return true;
    if (svc.motorId === 'all') return true;
    const assignedMotors = new Set(
      selectedServices
        .filter(s => s.name === svc.name)
        .map(s => String(s.motorId ?? '0'))
    );
    return motorsList.every((_, idx) => assignedMotors.has(String(idx)));
  }, [motorsList, selectedServices, svc.name, svc.motorId]);

  return (
  <tr 
    draggable={!readOnly && dragEnabledIndex === index}
    onDragStart={(e) => onDragStart(e, index)}
    onDragEnd={onDragEnd}
    onDragOver={(e) => onDragOver(e, index)}
    onDrop={onDrop}
    className={cn(
      "hover:bg-muted dark:hover:bg-white/[0.02] border-b border-border last:border-b-0 transition-all duration-300 group",
      draggedIndex === index && "opacity-40 bg-muted/50 dark:bg-white/[0.01]"
    )}
  >
    <td className="px-2 py-2 text-center w-10">
      {!readOnly && (
        <div
          onMouseDown={() => setDragEnabledIndex(index)}
          onMouseUp={() => setDragEnabledIndex(null)}
          onMouseLeave={() => setDragEnabledIndex(null)}
          className="cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-foreground transition-colors p-1 flex items-center justify-center"
          title="Arraste para reordenar"
        >
          <GripVertical className="w-3.5 h-3.5 stroke-[2.5]" />
        </div>
      )}
    </td>
    <td className="px-3 py-2">
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-xs font-bold text-foreground/90 truncate max-w-[150px] md:max-w-[300px]">
          {svc.id === 'eix-retificar' && svc.measure ? `Retificar Eixo — ${svc.measure}` : svc.name}
        </span>
        {(svc.measure || svc.id === 'eix-retificar') && (
          <button
            type="button"
            disabled={readOnly}
            onClick={() => onEditMeasure?.(svc)}
            className="text-[9px] font-black uppercase tracking-wider text-primary/80 hover:text-primary w-fit bg-primary/5 hover:bg-primary/10 border border-primary/20 dark:border-primary/10 rounded px-1.5 py-0.5 mt-0.5 transition-all flex items-center gap-1 cursor-pointer disabled:cursor-default"
          >
            {svc.id === 'eix-retificar' ? 'Editar Medidas' : `Medida: ${svc.measure}`}
            {!readOnly && <span className="text-[8px] opacity-60">✍</span>}
          </button>
        )}
        {motorsList && motorsList.length >= 2 && (
          <div className="mt-1 flex items-center gap-1">
            <span className="text-[9px] font-black uppercase text-amber-600 dark:text-amber-400">Motor:</span>
            <select
              value={svc.motorId ?? '0'}
              onChange={(e) => onUpdate(svc.id, { motorId: e.target.value })}
              disabled={readOnly}
              className="text-[9px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded px-1.5 py-0.5 focus:outline-none cursor-pointer disabled:cursor-default"
            >
              <option value="all" className="bg-background text-foreground font-black">
                ⚡ Todos os motores
              </option>
              {motorsList.map((m, idx) => {
                const formattedName = `${m.model}${m.displacement ? ` ${m.displacement}` : ''}${m.cylinders ? ` ${m.cylinders} CIL` : ''}`;
                return (
                  <option key={idx} value={String(idx)} className="bg-background text-foreground">
                    Motor {idx + 1}: {formattedName}
                  </option>
                );
              })}
            </select>
          </div>
        )}
      </div>
    </td>
    <td className="px-3 py-2">
      <div className="flex items-center justify-center gap-1.5 bg-muted dark:bg-black/20 rounded-lg border border-border p-1 w-fit mx-auto">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="h-6 w-6 rounded-md hover:bg-muted-foreground/10 hover:text-red-400"
          disabled={readOnly || svc.quantity <= 1}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onUpdate(svc.id, { quantity: svc.quantity - 1 }); }}
        >
          <Plus className="w-3 h-3 rotate-45" />
        </Button>
        <span className="text-xs font-black w-6 text-center text-foreground/80">{svc.quantity}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="h-6 w-6 rounded-md hover:bg-muted-foreground/10 hover:text-primary"
          disabled={readOnly}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onUpdate(svc.id, { quantity: svc.quantity + 1 }); }}
        >
          <Plus className="w-3 h-3" />
        </Button>
      </div>
    </td>
    <td className="px-3 py-2">
      <div className="relative ml-auto w-32 group">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-primary/60 group-focus-within:text-primary">R$</span>
        <Input
          type="number"
          step="0.01"
          value={svc.value === 0 ? '' : svc.value}
          onChange={(e) => onUpdate(svc.id, { value: parseFloat(e.target.value) || 0 })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.stopPropagation();
              const currentInput = e.currentTarget;
              setTimeout(() => {
                const allValueInputs = Array.from(
                  document.querySelectorAll<HTMLInputElement>('input.service-value-input')
                );
                const currentIndex = allValueInputs.indexOf(currentInput);
                if (currentIndex !== -1 && currentIndex + 1 < allValueInputs.length) {
                  const nextInput = allValueInputs[currentIndex + 1];
                  nextInput.focus();
                  nextInput.select();
                } else if (currentIndex !== -1) {
                  currentInput.blur();
                }
              }, 30);
            }
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
          }}
          onWheel={(e) => e.currentTarget.blur()}
          className="service-value-input pl-9 h-7 text-right font-mono text-xs font-black bg-input border-border focus-visible:ring-1 focus-visible:ring-primary/20 rounded-lg transition-all [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [appearance:textfield]"
          placeholder="0,00"
          disabled={readOnly}
        />
      </div>
    </td>
    <td className="px-3 py-2 text-right">
      <span className="text-xs font-black font-mono text-foreground/90">
        {formatCurrency(svc.value * svc.quantity)}
      </span>
    </td>
    <td className="px-3 py-2 text-center w-28">
      <div className="flex items-center justify-center gap-1.5">
        {motorsList && motorsList.length >= 2 && !readOnly && (
          <Button
            type="button"
            variant="outline"
            size="icon-xs"
            disabled={isDuplicateDisabled}
            className={cn(
              "h-7 w-7 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-all rounded-lg flex items-center justify-center shadow-xs",
              isDuplicateDisabled ? "opacity-30 cursor-not-allowed" : "opacity-90 hover:opacity-100 cursor-pointer"
            )}
            title={
              isDuplicateDisabled
                ? "Este serviço já está lançado para todos os motores da O.S."
                : "Duplicar para outro motor"
            }
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDuplicateToMotor?.(svc);
            }}
          >
            <CopyPlus className="w-3.5 h-3.5" />
          </Button>
        )}
        {!readOnly && (
          <Button
            type="button"
            variant="outline"
            size="icon-xs"
            className="h-7 w-7 border-red-500/30 text-red-500 hover:bg-red-500/10 opacity-70 hover:opacity-100 transition-all rounded-lg flex items-center justify-center shadow-xs cursor-pointer"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(svc.id); }}
            title="Remover serviço"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </td>
  </tr>
  );
});
ServiceItemRow.displayName = 'ServiceItemRow';

export const ServiceCatalog = memo(({
  selectedServices,
  selectedMotorModel,
  motorsList,
  onAddService,
  onRemoveService,
  onUpdateService,
  onReorderServices,
  readOnly = false,
}: ServiceCatalogProps) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragEnabledIndex, setDragEnabledIndex] = useState<number | null>(null);
  const [selectedMotorIndex, setSelectedMotorIndex] = useState<string>('0');

  const handleAddServiceWithMotor = useCallback((payload: AddServicePayload) => {
    const assignedMotorId = (motorsList && motorsList.length >= 2) ? selectedMotorIndex : '0';
    onAddService({
      ...payload,
      motorId: payload.motorId ?? assignedMotorId,
    });
  }, [motorsList, selectedMotorIndex, onAddService]);

  const handleDuplicateToMotor = useCallback((svc: ServiceItem) => {
    if (!motorsList || motorsList.length < 2) return;

    const assignedMotorsForService = new Set(
      selectedServices
        .filter(s => s.name === svc.name)
        .map(s => String(s.motorId ?? '0'))
    );

    const availableMotorIndex = motorsList
      .map((_, idx) => String(idx))
      .find(mIdx => !assignedMotorsForService.has(mIdx));

    if (availableMotorIndex === undefined) {
      toast.warning(`O serviço "${svc.name}" já está lançado para todos os motores da O.S.`);
      return;
    }

    const targetMotor = motorsList[Number(availableMotorIndex)];
    const motorName = `${targetMotor.model}${targetMotor.displacement ? ` ${targetMotor.displacement}` : ''}${targetMotor.cylinders ? ` ${targetMotor.cylinders} CIL` : ''}`;

    onAddService({
      id: crypto.randomUUID(),
      name: svc.name,
      value: svc.value,
      quantity: svc.quantity,
      measure: svc.measure,
      motorId: availableMotorIndex,
    });

    toast.success(`Serviço "${svc.name}" duplicado para o Motor ${Number(availableMotorIndex) + 1} (${motorName}).`);
  }, [motorsList, selectedServices, onAddService]);

  const { motorPrices, resolveMotorName, resolveServiceId } = useStore();
  const [isVariationDialogOpen, setIsVariationDialogOpen] = useState(false);
  const [pendingService, setPendingService] = useState<{ svc: CatalogService; prices: any[] } | null>(null);
  const [pendingMeasure, setPendingMeasure] = useState<string | undefined>(undefined);

  const handleAddServiceWithPricing = useCallback((svc: CatalogService) => {
    if (!selectedMotorModel) {
      handleAddServiceWithMotor({ id: svc.id, name: svc.name, value: svc.defaultPrice, quantity: 1 });
      return;
    }

    const specificPrices = motorPrices.filter(
      p => (p.motorId === selectedMotorModel || resolveMotorName(p.motorId).toUpperCase() === selectedMotorModel.toUpperCase()) && resolveServiceId(p.serviceId) === svc.id
    );

    if (specificPrices.length === 0) {
      handleAddServiceWithMotor({ id: svc.id, name: svc.name, value: svc.defaultPrice, quantity: 1 });
    } else if (specificPrices.length === 1) {
      const p = specificPrices[0];
      const name = p.subName ? `${svc.name} — ${p.subName}` : svc.name;
      handleAddServiceWithMotor({ id: svc.id, name, value: p.price, quantity: 1 });
    } else {
      setPendingService({ svc, prices: specificPrices });
      setIsVariationDialogOpen(true);
    }
  }, [selectedMotorModel, motorPrices, handleAddServiceWithMotor, resolveMotorName, resolveServiceId]);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    if (readOnly) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  }, [readOnly]);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    if (readOnly) return;
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === index) return;

    const reorderedList = [...selectedServices];
    const draggedItem = reorderedList[draggedIndex];
    reorderedList.splice(draggedIndex, 1);
    reorderedList.splice(index, 0, draggedItem);

    setDraggedIndex(index);
    setDragEnabledIndex(index); // Keep drag enabled on current row while moving
    onReorderServices?.(reorderedList);
  }, [readOnly, draggedIndex, selectedServices, onReorderServices]);

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDragEnabledIndex(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDraggedIndex(null);
    setDragEnabledIndex(null);
  }, []);

  const [globalSearch, setGlobalSearch] = useState('');
  const [highlightedServiceIndex, setHighlightedServiceIndex] = useState(0);
  const highlightedServiceRef = useRef<HTMLButtonElement>(null);
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [catSearch, setCatSearch] = useState('');
  const [popoverHighlightIndex, setPopoverHighlightIndex] = useState(0);
  const popoverHighlightedRef = useRef<any>(null);
  const searchResultsContainerRef = useRef<HTMLDivElement>(null);
  const popoverInputRef = useRef<HTMLInputElement>(null);
  const [customServices, setCustomServices] = useState<CustomService[]>([]);
  const [editTarget, setEditTarget] = useState<CustomService | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<CustomService | null>(null);

  // Axis measure states
  const [isMeasureDialogOpen, setIsMeasureDialogOpen] = useState(false);
  const [selectedMeasureService, setSelectedMeasureService] = useState<CatalogService | null>(null);
  const [selectedMeasure, setSelectedMeasure] = useState<string>('0.25');
  const [customMeasure, setCustomMeasure] = useState<string>('');
  const [isEditingMeasureForId, setIsEditingMeasureForId] = useState<string | null>(null);

  // Biela & Mancal states for Retificar Eixo
  const [bielaMeasure, setBielaMeasure] = useState<string>('nada');
  const [bielaCustomMeasure, setBielaCustomMeasure] = useState<string>('');
  const [mancalMeasure, setMancalMeasure] = useState<string>('nada');
  const [mancalCustomMeasure, setMancalCustomMeasure] = useState<string>('');

  const handleEditMeasureClick = useCallback((item: ServiceItem) => {
    const catSvc = getServiceById(item.id);
    setSelectedMeasureService(catSvc || { id: item.id, name: item.name, defaultPrice: item.value });
    setIsEditingMeasureForId(item.id);
    
    if (item.id === 'eix-retificar') {
      let bVal = '';
      let mVal = '';
      const measureStr = item.measure || '';
      
      if (measureStr.includes('/') || (measureStr.includes('Biela') && measureStr.includes('Mancal'))) {
        const match = measureStr.match(/Biela\s+(.+?)\s*\/\s*Mancal\s+(.+)/i);
        if (match) {
          bVal = match[1].trim();
          mVal = match[2].trim();
        } else {
          const bMatch = measureStr.match(/Biela\s+(.+?)(?=\s*\/|$)/i);
          const mMatch = measureStr.match(/Mancal\s+(.+)$/i);
          if (bMatch) bVal = bMatch[1].trim();
          if (mMatch) mVal = mMatch[1].trim();
        }
      } else {
        const bMatch = measureStr.match(/Biela\s+(.+)$/i);
        const mMatch = measureStr.match(/Mancal\s+(.+)$/i);
        if (bMatch) {
          bVal = bMatch[1].trim();
        } else if (mMatch) {
          mVal = mMatch[1].trim();
        }
      }

      if (!bVal) {
        setBielaMeasure('nada');
        setBielaCustomMeasure('');
      } else if (['STD', '0.25', '0.50', '0.75'].includes(bVal)) {
        setBielaMeasure(bVal);
        setBielaCustomMeasure('');
      } else {
        setBielaMeasure('personalizado');
        setBielaCustomMeasure(bVal);
      }

      if (!mVal) {
        setMancalMeasure('nada');
        setMancalCustomMeasure('');
      } else if (['STD', '0.25', '0.50', '0.75'].includes(mVal)) {
        setMancalMeasure(mVal);
        setMancalCustomMeasure('');
      } else {
        setMancalMeasure('personalizado');
        setMancalCustomMeasure(mVal);
      }
    } else {
      const isStandard = ['0.25', '0.50', '0.75', '1.00'].includes(item.measure || '');
      if (isStandard) {
        setSelectedMeasure(item.measure || '0.25');
        setCustomMeasure('');
      } else {
        setSelectedMeasure('personalizado');
        setCustomMeasure(item.measure || '');
      }
    }
    
    setIsMeasureDialogOpen(true);
  }, []);

  const handleConfirmMeasure = () => {
    let finalMeasure = '';
    if (selectedMeasureService?.id === 'eix-retificar') {
      const bielaSelected = bielaMeasure !== 'nada';
      const mancalSelected = mancalMeasure !== 'nada';
      
      const bVal = bielaMeasure === 'personalizado' ? bielaCustomMeasure.trim() : bielaMeasure;
      const mVal = mancalMeasure === 'personalizado' ? mancalCustomMeasure.trim() : mancalMeasure;
      
      if (bielaSelected && !bVal) {
        toast.error('Por favor, informe a medida de Biela.');
        return;
      }
      if (mancalSelected && !mVal) {
        toast.error('Por favor, informe a medida de Mancal.');
        return;
      }
      
      if (bielaSelected && mancalSelected) {
        finalMeasure = `Biela ${bVal} / Mancal ${mVal}`;
      } else if (bielaSelected) {
        finalMeasure = `Biela ${bVal}`;
      } else if (mancalSelected) {
        finalMeasure = `Mancal ${mVal}`;
      } else {
        finalMeasure = '';
      }
    } else {
      finalMeasure = selectedMeasure === 'personalizado' ? customMeasure.trim() : selectedMeasure;
      if (!finalMeasure) {
        toast.error('Por favor, informe a medida.');
        return;
      }
    }
    
    const measureToSave = finalMeasure || undefined;
    
    if (isEditingMeasureForId) {
      onUpdateService(isEditingMeasureForId, { measure: measureToSave });
    } else if (selectedMeasureService) {
      const svc = selectedMeasureService;
      let finalPrice = svc.defaultPrice;
      let finalName = svc.name;
      
      if (selectedMotorModel) {
        const specificPrices = motorPrices.filter(
          p => (p.motorId === selectedMotorModel || resolveMotorName(p.motorId).toUpperCase() === selectedMotorModel.toUpperCase()) && resolveServiceId(p.serviceId) === svc.id
        );

        if (specificPrices.length === 1) {
          const p = specificPrices[0];
          finalPrice = p.price;
          if (p.subName) {
            finalName = `${svc.name} — ${p.subName}`;
          }
        } else if (specificPrices.length > 1) {
          setPendingService({ svc, prices: specificPrices });
          setPendingMeasure(measureToSave);
          setIsVariationDialogOpen(true);
          setIsMeasureDialogOpen(false);
          setSelectedMeasureService(null);
          setIsEditingMeasureForId(null);
          return;
        }
      }

      handleAddServiceWithMotor({
        id: svc.id,
        name: finalName,
        value: finalPrice,
        quantity: 1,
        measure: measureToSave
      });
    }
    
    setIsMeasureDialogOpen(false);
    setSelectedMeasureService(null);
    setIsEditingMeasureForId(null);
  };

  const selectedIds = useMemo(() => new Set(selectedServices.map((s) => s.id)), [selectedServices]);

  useEffect(() => {
    let mounted = true;
    fetchCustomServices()
      .then((data) => { if (mounted) setCustomServices(data); })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  const handleAddCustomService = useCallback(async (name: string) => {
    const trimmed = name.trim().toUpperCase();
    if (!trimmed) return;

    const existing = customServices.find(s => s.name === trimmed);
    if (existing) {
      handleAddServiceWithMotor({ id: existing.id, name: existing.name, value: existing.defaultPrice, quantity: 1 });
      setGlobalSearch('');
      return;
    }

    const tempId = crypto.randomUUID();
    handleAddServiceWithMotor({ id: tempId, name: trimmed, value: 0, quantity: 1 });
    setGlobalSearch('');

    try {
      const saved = await addCustomService(trimmed);
      if (saved && saved.id !== tempId) {
        setCustomServices(prev => [...prev, saved]);
      } else {
        setCustomServices(prev => [...prev, { id: tempId, name: trimmed, defaultPrice: 0 }]);
      }
    } catch {
      setCustomServices(prev => [...prev, { id: tempId, name: trimmed, defaultPrice: 0 }]);
      toast.warning('Serviço adicionado à O.S., mas não foi salvo no catálogo do banco local.');
    }
  }, [customServices, onAddService]);

  const handleCatalogToggle = useCallback((svc: CatalogService, e?: any) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (selectedIds.has(svc.id)) {
      onRemoveService(svc.id);
    } else {
      if (svc.id === 'eix-retificar') {
        setSelectedMeasureService(svc);
        setBielaMeasure('nada');
        setBielaCustomMeasure('');
        setMancalMeasure('nada');
        setMancalCustomMeasure('');
        setIsEditingMeasureForId(null);
        setIsMeasureDialogOpen(true);
      } else {
        handleAddServiceWithPricing(svc);
      }
    }
  }, [selectedIds, handleAddServiceWithPricing, onRemoveService]);

  const subtotal = useMemo(() => selectedServices.reduce((acc, s) => acc + s.value * s.quantity, 0), [selectedServices]);
  const formatCurrency = useCallback((val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), []);

  const searchResults = useMemo(() => {
    if (!globalSearch.trim()) return [];
    return searchServices(globalSearch);
  }, [globalSearch]);

  const customSearchResults = useMemo(() => {
    if (!globalSearch.trim()) return [];
    const q = globalSearch.toLowerCase();
    return customServices.filter(s => (s.name || '').toLowerCase().includes(q));
  }, [globalSearch, customServices]);

  const showAddCustomOption = globalSearch.trim().length > 0
    && searchResults.length === 0
    && customSearchResults.length === 0
    && !customServices.some(s => s && s.name === globalSearch.trim().toUpperCase());

  const combinedResults = useMemo(() => {
    const list: Array<{ id: string; name: string; defaultPrice: number; raw: any; type: 'catalog' | 'custom' }> = [];
    
    searchResults.forEach(({ service }) => {
      list.push({
        id: service.id,
        name: service.name,
        defaultPrice: service.defaultPrice,
        raw: service,
        type: 'catalog'
      });
    });

    customSearchResults.forEach(svc => {
      if (!list.some(item => item.id === svc.id)) {
        list.push({
          id: svc.id,
          name: svc.name,
          defaultPrice: svc.defaultPrice,
          raw: svc,
          type: 'custom'
        });
      }
    });

    return list;
  }, [searchResults, customSearchResults]);

  useEffect(() => {
    setHighlightedServiceIndex(0);
  }, [combinedResults]);

  useEffect(() => {
    const container = searchResultsContainerRef.current;
    const element = highlightedServiceRef.current;
    if (container && element) {
      const containerTop = container.scrollTop;
      const containerBottom = containerTop + container.clientHeight;
      const elemTop = element.offsetTop;
      const elemBottom = elemTop + element.offsetHeight;
      if (elemTop < containerTop) {
        container.scrollTop = elemTop;
      } else if (elemBottom > containerBottom) {
        container.scrollTop = elemBottom - container.clientHeight;
      }
    }
  }, [highlightedServiceIndex]);

  useEffect(() => {
    setPopoverHighlightIndex(0);
  }, [openCategory, catSearch]);

  useEffect(() => {
    const element = popoverHighlightedRef.current;
    if (element) {
      const container = element.closest('[data-radix-scroll-area-viewport]') || element.closest('.rt-ScrollAreaViewport') || element.parentElement;
      if (container) {
        const containerTop = container.scrollTop;
        const containerBottom = containerTop + container.clientHeight;
        const elemTop = element.offsetTop;
        const elemBottom = elemTop + element.offsetHeight;
        if (elemTop < containerTop) {
          container.scrollTop = elemTop;
        } else if (elemBottom > containerBottom) {
          container.scrollTop = elemBottom - container.clientHeight;
        }
      }
    }
  }, [popoverHighlightIndex]);

  useEffect(() => {
    if (openCategory && popoverInputRef.current) {
      popoverInputRef.current.focus({ preventScroll: true });
    }
  }, [openCategory]);

  const filteredCustomServices = useMemo(() => {
    const q = (catSearch || '').toLowerCase();
    return customServices.filter(svc => (svc.name || '').toLowerCase().includes(q));
  }, [customServices, catSearch]);

  const handlePopoverSearchKeyDown = useCallback((
    e: React.KeyboardEvent<HTMLInputElement>,
    servicesList: Array<{ id: string; name: string; defaultPrice: number }>
  ) => {
    if (readOnly) return;
    const totalOptions = servicesList.length;

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setOpenCategory(null);
      setCatSearch('');
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      if (totalOptions > 0) {
        setPopoverHighlightIndex(prev => Math.min(totalOptions - 1, prev + 1));
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      if (totalOptions > 0) {
        setPopoverHighlightIndex(prev => Math.max(0, prev - 1));
      }
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();

      if (servicesList.length > 0) {
        const highlightedItem = servicesList[popoverHighlightIndex];
        if (highlightedItem) {
          if (highlightedItem.id === 'eix-retificar') {
            handleCatalogToggle(highlightedItem as any);
          } else {
            const existing = selectedServices.find(s => s.id === highlightedItem.id);
            if (existing) {
              onUpdateService(existing.id, { quantity: existing.quantity + 1 });
            } else {
              handleAddServiceWithPricing(highlightedItem as any);
            }
          }
          setCatSearch('');
          setPopoverHighlightIndex(0);
          e.currentTarget.focus({ preventScroll: true });
        }
      }
    }
  }, [
    popoverHighlightIndex,
    handleCatalogToggle,
    selectedServices,
    onAddService,
    onUpdateService,
    readOnly
  ]);

  const handleSearchInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (readOnly) return;
    const totalOptions = combinedResults.length + (showAddCustomOption ? 1 : 0);
    
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setGlobalSearch('');
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      if (totalOptions > 0) {
        setHighlightedServiceIndex(prev => Math.min(totalOptions - 1, prev + 1));
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      if (totalOptions > 0) {
        setHighlightedServiceIndex(prev => Math.max(0, prev - 1));
      }
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      
      const isCreateOptionHighlighted = showAddCustomOption && highlightedServiceIndex === 0;

      if (isCreateOptionHighlighted) {
        handleAddCustomService(globalSearch);
      } else if (combinedResults.length > 0) {
        const highlightedItem = combinedResults[highlightedServiceIndex];
        if (highlightedItem) {
          if (highlightedItem.type === 'catalog') {
            if (highlightedItem.id === 'eix-retificar') {
              handleCatalogToggle(highlightedItem.raw);
            } else {
              const existing = selectedServices.find(s => s.id === highlightedItem.id);
              if (existing) {
                onUpdateService(existing.id, { quantity: existing.quantity + 1 });
              } else {
                handleAddServiceWithPricing(highlightedItem.raw);
              }
            }
          } else {
            const existing = selectedServices.find(s => s.id === highlightedItem.id);
            if (existing) {
              onUpdateService(existing.id, { quantity: existing.quantity + 1 });
            } else {
              handleAddServiceWithPricing({
                id: highlightedItem.id,
                name: highlightedItem.name,
                defaultPrice: highlightedItem.defaultPrice
              });
            }
          }
          setGlobalSearch('');
          e.currentTarget.focus({ preventScroll: true });
        }
      }
    }
  }, [
    combinedResults,
    highlightedServiceIndex,
    showAddCustomOption,
    globalSearch,
    handleAddCustomService,
    handleCatalogToggle,
    onAddService,
    onUpdateService,
    selectedServices,
    readOnly
  ]);

  const selectedByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    SERVICE_CATEGORIES.forEach(cat => {
      counts[cat.id] = cat.services.filter(s => selectedIds.has(s.id)).length;
    });
    return counts;
  }, [selectedIds]);

  return (
    <div className="space-y-4">
      {/* Seletor de Motor para O.S. com Múltiplos Motores */}
      {motorsList && motorsList.length >= 2 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs shrink-0">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-foreground">
                Este serviço é de qual motor? <span className="text-amber-600 dark:text-amber-400">*</span>
              </div>
              <div className="text-[10px] text-muted-foreground font-medium">
                A O.S. possui {motorsList.length} motores vinculados. Selecione o motor para associar o serviço.
              </div>
            </div>
          </div>

          <div className="w-full sm:w-auto shrink-0">
            <select
              value={selectedMotorIndex}
              onChange={(e) => setSelectedMotorIndex(e.target.value)}
              disabled={readOnly}
              className="w-full sm:w-64 h-9 px-3 text-xs font-bold rounded-lg border border-amber-500/40 bg-background text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              <option value="all" className="bg-background text-foreground font-black">
                ⚡ Todos os motores (Serviço Comum)
              </option>
              {motorsList.map((m, idx) => {
                const formattedName = `${m.model}${m.displacement ? ` ${m.displacement}` : ''}${m.cylinders ? ` ${m.cylinders} CIL` : ''}`;
                return (
                  <option key={idx} value={String(idx)} className="bg-background text-foreground">
                    Motor {idx + 1}: {formattedName}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      )}

      {/* Barra de Pesquisa Premium */}
      <div className="relative group max-w-2xl mx-auto w-full transition-all duration-300">
        <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none z-10">
          <SearchIcon className="w-4 h-4 text-primary/40 group-focus-within:text-primary transition-colors" />
        </div>
        <Input
          placeholder="Pesquisar serviços no catálogo..."
          value={globalSearch}
          onChange={(e) => setGlobalSearch(e.target.value)}
          onKeyDown={handleSearchInputKeyDown}
          className="pl-10 h-11 text-xs ref-light-input rounded-xl focus-visible:ring-1 focus-visible:ring-primary/20 transition-all"
        />
        <div className="absolute inset-0 bg-primary/5 blur-2xl opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
      </div>

      <AnimatePresence mode="wait">
        {globalSearch.trim() ? (
          <motion.div key="search" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            {showAddCustomOption ? (
              <div className="flex flex-col items-center gap-3 py-8 px-4">
                <p className="text-muted-foreground italic text-xs">Nenhum serviço encontrado</p>
                <Button
                  ref={highlightedServiceRef}
                  size="sm"
                  className={cn(
                    "w-full max-w-xs text-[10px] font-black uppercase tracking-widest rounded-lg h-9",
                    highlightedServiceIndex === 0 && "ring-2 ring-primary bg-primary text-primary-foreground"
                  )}
                  onClick={() => handleAddCustomService(globalSearch)}
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Adicionar "{globalSearch}"
                </Button>
              </div>
            ) : (
              <div ref={searchResultsContainerRef} className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar p-1">
                {combinedResults.map((item, index) => {
                  const isSelected = selectedIds.has(item.id);
                  const isHighlighted = index === highlightedServiceIndex;
                  return (
                    <button
                      key={item.id}
                      ref={isHighlighted ? highlightedServiceRef : null}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (item.type === 'catalog') {
                          handleCatalogToggle(item.raw, e);
                        } else {
                          const existing = selectedServices.find(s => s.id === item.id);
                          if (existing) {
                            onUpdateService(existing.id, { quantity: existing.quantity + 1 });
                          } else {
                            handleAddServiceWithPricing({ id: item.id, name: item.name, defaultPrice: item.defaultPrice });
                          }
                        }
                      }}
                      className={cn(
                        "flex items-center justify-between p-3.5 rounded-xl border transition-all text-left group relative overflow-hidden",
                        isSelected 
                          ? "bg-primary/10 border-primary/30" 
                          : "bg-input border-border hover:bg-muted hover:border-foreground/10",
                        isHighlighted && "ring-2 ring-primary border-primary bg-primary/15 dark:bg-white/[0.08]"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 relative z-10">
                        <div className={cn(
                          "w-4 h-4 rounded-md border-2 shrink-0 flex items-center justify-center transition-all", 
                          isSelected ? "bg-primary border-primary text-primary-foreground shadow-lg" : "border-border bg-muted"
                        )}>
                          {isSelected && <Check className="w-3 h-3 stroke-[4]" />}
                        </div>
                        <div className="flex flex-col">
                          <span className={cn("text-xs font-black uppercase tracking-wide truncate", isSelected ? "text-primary" : "text-foreground/80")}>
                            {item.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-bold">{formatCurrency(item.defaultPrice)}</span>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            {SERVICE_CATEGORIES.map((cat) => {
              const filteredServices = cat.services.filter(s => s.name.toLowerCase().includes(catSearch.toLowerCase()));
              return (
                <Popover 
                  key={cat.id} 
                  open={openCategory === cat.id} 
                  onOpenChange={(open) => {
                    setOpenCategory(open ? cat.id : null);
                    if (!open) setCatSearch('');
                  }}
                >
                  <PopoverTrigger
                    render={
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "h-12 flex flex-col items-center justify-center gap-0.5 border rounded-xl transition-all relative overflow-hidden group shadow-sm",
                          openCategory === cat.id 
                            ? "border-primary/40 bg-primary/10" 
                            : "bg-card border-border hover:bg-muted hover:border-foreground/10",
                          selectedByCategory[cat.id] > 0 && !openCategory && "border-primary/20"
                        )}
                        disabled={readOnly}
                      >
                        <span className={cn(
                          "text-xs font-black uppercase tracking-wider transition-colors",
                          openCategory === cat.id ? "text-primary" : "text-foreground/90"
                        )}>
                          {cat.name}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[8px] font-medium uppercase tracking-[0.1em] text-muted-foreground/40">Explorar</span>
                          {selectedByCategory[cat.id] > 0 && (
                            <Badge className="h-4 min-w-[16px] px-1 text-[9px] font-black bg-primary text-primary-foreground rounded-md border-none shadow-lg amber-glow">
                              {selectedByCategory[cat.id]}
                            </Badge>
                          )}
                        </div>
                      </Button>
                    }
                  />
                  <PopoverContent
                    className="w-[340px] p-0 shadow-md border-border rounded-xl overflow-hidden bg-popover z-[1100]"
                    align="center"
                    sideOffset={10}
                  >
                    <div className="flex flex-col h-full">
                      <div className="p-2.5 border-b border-border bg-muted dark:bg-white/[0.02]">
                        <div className="relative group flex items-center">
                          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary/40 group-focus-within:text-primary transition-colors pointer-events-none" />
                          <Input 
                            ref={popoverInputRef}
                            placeholder="Buscar serviço..." 
                            className="pl-9 pr-8 h-8 text-xs rounded-lg premium-input focus-visible:ring-1 focus-visible:ring-primary/20 w-full" 
                            value={catSearch}
                            onChange={(e) => setCatSearch(e.target.value)}
                            onKeyDown={(e) => handlePopoverSearchKeyDown(e, filteredServices)}
                          />
                          {catSearch && (
                            <button
                              type="button"
                              onClick={() => setCatSearch('')}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 hover:text-foreground transition-colors flex items-center justify-center"
                              aria-label="Limpar pesquisa"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      <ScrollArea className="h-[250px]">
                        <div className="p-1.5 space-y-1">
                          {filteredServices.map((svc, index) => {
                            const isSelected = selectedIds.has(svc.id);
                            const isHighlighted = index === popoverHighlightIndex;
                            return (
                              <button
                                key={svc.id}
                                ref={isHighlighted ? popoverHighlightedRef : null}
                                type="button"
                                onClick={(e) => handleCatalogToggle(svc, e)}
                                className={cn(
                                  "w-full flex items-center justify-between py-2 px-2.5 transition-all rounded-lg text-left group",
                                  isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted/80 dark:hover:bg-white/5",
                                  isHighlighted && "bg-primary/15 dark:bg-white/[0.1] ring-1 ring-primary/30"
                                )}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className={cn(
                                    "w-4 h-4 rounded-md border-2 shrink-0 flex items-center justify-center transition-all", 
                                    isSelected ? "bg-primary border-primary text-primary-foreground shadow-lg" : "border-border bg-muted group-hover:border-foreground/15"
                                  )}>
                                    {isSelected && <Check className="w-3 h-3 stroke-[4]" />}
                                  </div>
                                  <span className={cn("text-xs truncate uppercase tracking-tight", isSelected ? "font-black text-primary" : "font-black text-foreground")}>
                                    {svc.name}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </ScrollArea>
                      <div className="p-1.5 border-t border-border bg-muted/30 dark:bg-white/[0.01] flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          className="text-[10px] font-black uppercase tracking-wider text-muted-foreground hover:text-foreground h-6 px-2.5 rounded-md cursor-pointer"
                          onClick={() => setOpenCategory(null)}
                        >
                          Fechar
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              );
            })}
            {customServices.length > 0 && (
              <Popover
                open={openCategory === 'custom'}
                onOpenChange={(open) => {
                  setOpenCategory(open ? 'custom' : null);
                  if (!open) setCatSearch('');
                }}
              >
                <PopoverTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "h-12 flex flex-col items-center justify-center gap-0.5 border rounded-xl transition-all relative overflow-hidden group shadow-sm",
                        openCategory === 'custom'
                          ? "border-primary/40 bg-primary/10"
                          : "bg-card border-border hover:bg-muted hover:border-foreground/10"
                      )}
                      disabled={readOnly}
                    >
                      <span className={cn(
                        "text-xs font-black uppercase tracking-wider transition-colors",
                        openCategory === 'custom' ? "text-primary" : "text-foreground/90"
                      )}>
                        PERSONALIZADOS
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8px] font-medium uppercase tracking-[0.1em] text-muted-foreground/40">Explorar</span>
                      </div>
                    </Button>
                  }
                />
                <PopoverContent
                  className="w-[300px] p-0 shadow-md border-border rounded-xl overflow-hidden bg-popover z-[1100]"
                  align="center"
                  sideOffset={10}
                >
                  <div className="flex flex-col h-full">
                    <div className="p-2.5 border-b border-border bg-muted dark:bg-white/[0.02]">
                      <div className="relative group flex items-center">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary/40 group-focus-within:text-primary transition-colors pointer-events-none" />
                        <Input 
                          ref={popoverInputRef}
                          placeholder="Buscar serviço personalizado..." 
                          className="pl-9 pr-8 h-8 text-xs rounded-lg premium-input focus-visible:ring-1 focus-visible:ring-primary/20 w-full" 
                          value={catSearch}
                          onChange={(e) => setCatSearch(e.target.value)}
                          onKeyDown={(e) => handlePopoverSearchKeyDown(e, filteredCustomServices)}
                        />
                        {catSearch && (
                          <button
                            type="button"
                            onClick={() => setCatSearch('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 hover:text-foreground transition-colors flex items-center justify-center"
                            aria-label="Limpar pesquisa"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <ScrollArea className="h-[250px]">
                      <div className="p-1.5 space-y-1">
                        {filteredCustomServices.map((svc, index) => {
                          const isSelected = selectedIds.has(svc.id);
                          const isHighlighted = index === popoverHighlightIndex;
                          return (
                            <div
                              key={svc.id}
                              ref={isHighlighted ? (node => {
                                if (node) popoverHighlightedRef.current = node;
                              }) : null}
                              className={cn(
                                "w-full flex items-center justify-between py-2 px-2.5 transition-all rounded-lg text-left group",
                                isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted/80 dark:hover:bg-white/5",
                                isHighlighted && "bg-primary/15 dark:bg-white/[0.1] ring-1 ring-primary/30"
                              )}
                            >
                              <button
                                type="button"
                                onClick={(e) => { 
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const existing = selectedServices.find(s => s.id === svc.id);
                                  if (existing) {
                                    onUpdateService(existing.id, { quantity: existing.quantity + 1 });
                                  } else {
                                    onAddService({ id: svc.id, name: svc.name, value: svc.defaultPrice, quantity: 1 });
                                  }
                                  setGlobalSearch('');
                                }}
                                className="flex items-center gap-2.5 min-w-0 flex-1"
                              >
                                <div className={cn(
                                  "w-4 h-4 rounded-md border-2 shrink-0 flex items-center justify-center transition-all",
                                  isSelected ? "bg-primary border-primary text-primary-foreground shadow-lg" : "border-border bg-muted group-hover:border-foreground/15"
                                )}>
                                  {isSelected && <Check className="w-3 h-3 stroke-[4]" />}
                                </div>
                                <span className={cn("text-xs truncate uppercase tracking-tight flex-1", isSelected ? "font-black text-primary" : "font-black text-foreground")}>
                                  {svc.name}
                                </span>
                              </button>
                              <div className="flex items-center gap-1 shrink-0">
                                {!readOnly && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditTarget(svc);
                                        setEditName(svc.name);
                                        setEditPrice(svc.defaultPrice.toString());
                                      }}
                                      className="p-1 rounded hover:bg-muted-foreground/10 text-muted-foreground/40 hover:text-primary transition-colors cursor-pointer"
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteTarget(svc);
                                      }}
                                      className="p-1 rounded hover:bg-red-500/10 text-muted-foreground/40 hover:text-red-500 transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                    <div className="p-1.5 border-t border-border bg-muted/30 dark:bg-white/[0.01] flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        className="text-[10px] font-black uppercase tracking-wider text-muted-foreground hover:text-foreground h-6 px-2.5 rounded-md cursor-pointer"
                        onClick={() => setOpenCategory(null)}
                      >
                        Fechar
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        )}
      </AnimatePresence>

      {/* Serviços Selecionados Premium */}
      <AnimatePresence>
        {selectedServices.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 pt-3 border-t border-border">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-5 bg-primary rounded-full shadow-[0_0_10px_rgba(200,169,107,0.3)]" />
              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-foreground/80">Serviços na Ordem</h4>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {selectedServices.map((svc) => (
                <Badge key={svc.id} variant="secondary" className="h-6 pl-2.5 pr-1 text-[10px] font-black uppercase tracking-wider bg-muted dark:bg-white/[0.03] text-foreground/60 rounded-lg gap-1.5 border border-border hover:bg-muted-foreground/10 transition-colors">
                  {svc.name}
                  <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemoveService(svc.id); }} className="w-4 h-4 flex items-center justify-center rounded hover:bg-red-500/10 hover:text-red-500 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>

            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-lg dark:shadow-2xl">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse table-fixed">
                  <thead>
                    <tr className="bg-muted dark:bg-white/[0.02] border-b border-border">
                      <th className="w-10 px-2 py-2.5"></th>
                      <th className="px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 w-[40%]">Serviço</th>
                      <th className="px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 text-center w-28">Quantidade</th>
                      <th className="px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 text-right w-36">Vlr. Unitário</th>
                      <th className="px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 text-right w-36">Total Item</th>
                      <th className="px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 text-center w-28">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedServices.map((svc, index) => (
                      <ServiceItemRow
                        key={svc.id}
                        svc={svc}
                        index={index}
                        motorsList={motorsList}
                        selectedServices={selectedServices}
                        onUpdate={onUpdateService}
                        onRemove={onRemoveService}
                        onDuplicateToMotor={handleDuplicateToMotor}
                        onEditMeasure={handleEditMeasureClick}
                        readOnly={readOnly}
                        formatCurrency={formatCurrency}
                        draggedIndex={draggedIndex}
                        dragEnabledIndex={dragEnabledIndex}
                        setDragEnabledIndex={setDragEnabledIndex}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-3.5 bg-primary/5 border-t border-border flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground block mb-0.5">Subtotal do Catálogo</span>
                  <p className="text-[9px] text-muted-foreground/40 font-bold uppercase tracking-widest">Base para cálculos finais</p>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-xl font-black font-mono text-primary shadow-sm">{formatCurrency(subtotal)}</span>
                  <div className="w-full h-1 bg-primary/20 rounded-full mt-1 overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} className="h-full bg-primary" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null); }}>
        {editTarget && (
          <DialogContent className="max-w-sm z-[1100]" overlayClassName="z-[1099]">
            <DialogHeader>
              <DialogTitle>Editar Serviço Personalizado</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60">Nome do Serviço</Label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-9 text-xs font-bold rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60">Valor Padrão (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  className="h-9 text-xs font-bold rounded-lg"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditTarget(null)}>Cancelar</Button>
              <Button onClick={async () => {
                if (!editTarget) return;
                const name = editName.trim().toUpperCase();
                const price = parseFloat(editPrice) || 0;
                if (!name) return;
                try {
                  await updateCustomService(editTarget.id, name, price);
                  setCustomServices(prev => prev.map(s => s.id === editTarget.id ? { ...s, name, defaultPrice: price } : s));
                  setEditTarget(null);
                  toast.success('Serviço atualizado.');
                } catch {
                  toast.warning('Falha ao salvar alterações.');
                }
              }}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        {deleteTarget && (
          <DialogContent className="max-w-sm z-[1100]" overlayClassName="z-[1099]">
            <DialogHeader>
              <DialogTitle>Excluir Serviço</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir <strong>{deleteTarget?.name}</strong>?
                Serviços já utilizados em ordens não serão afetados.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
              <Button variant="destructive" onClick={async () => {
                if (!deleteTarget) return;
                try {
                  await deleteCustomService(deleteTarget.id);
                  setCustomServices(prev => prev.filter(s => s.id !== deleteTarget.id));
                  setDeleteTarget(null);
                  toast.success(`Serviço "${deleteTarget.name}" excluído.`);
                } catch {
                  toast.warning('Falha ao excluir serviço.');
                }
              }}>Excluir</Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* ═══ AXIS MEASURE DIALOG ═══ */}
      <Dialog open={isMeasureDialogOpen} onOpenChange={(open) => { if (!open) { setIsMeasureDialogOpen(false); setSelectedMeasureService(null); setIsEditingMeasureForId(null); } }}>
        {isMeasureDialogOpen && (
          <DialogContent className="max-w-md bg-card border border-border p-6 rounded-xl shadow-2xl z-[1200]" overlayClassName="z-[1199]">
            <DialogHeader className="gap-1.5">
              <DialogTitle className="text-base font-semibold tracking-tight text-foreground flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                Medida do Eixo - {selectedMeasureService?.name || 'RETIFICAR EIXO'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Selecione a medida padrão ou informe uma medida personalizada para o eixo.
              </DialogDescription>
            </DialogHeader>

            {selectedMeasureService?.id === 'eix-retificar' ? (
              <div className="py-4 space-y-5">
                {/* Biela Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-black text-foreground/80 uppercase tracking-wider ml-0.5">Medida Biela</Label>
                    <span className="text-[10px] font-bold text-primary/60 bg-primary/5 px-2 py-0.5 rounded border border-primary/10">Biela</span>
                  </div>
                  
                  {/* Linha de Botões */}
                  <div 
                    className="flex flex-row items-center gap-1.5 w-full"
                    style={{ display: 'flex', flexDirection: 'row', gap: '6px', width: '100%', alignItems: 'center' }}
                  >
                    {/* EM BRANCO */}
                    <button
                      type="button"
                      onClick={() => {
                        setBielaMeasure('nada');
                        setBielaCustomMeasure('');
                      }}
                      className={cn(
                        "h-9 rounded-lg border text-[8px] sm:text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center text-center px-0.5",
                        bielaMeasure === 'nada'
                          ? "bg-primary/10 text-primary border-primary/30 dark:bg-primary/20 font-black"
                          : "bg-transparent text-muted-foreground/60 border-border/40 hover:bg-muted/30 font-bold"
                      )}
                      style={{ flex: 1, minWidth: 0 }}
                    >
                      EM BRANCO
                    </button>

                    {/* STD */}
                    <button
                      type="button"
                      onClick={() => {
                        setBielaMeasure('STD');
                        setBielaCustomMeasure('');
                      }}
                      className={cn(
                        "h-9 rounded-lg border text-xs font-black tracking-wider transition-all cursor-pointer flex items-center justify-center text-center px-0.5",
                        bielaMeasure === 'STD'
                          ? "bg-primary/10 text-primary border-primary/30 dark:bg-primary/20 font-black"
                          : "bg-transparent text-muted-foreground/60 border-border/40 hover:bg-muted/30 font-bold"
                      )}
                      style={{ flex: 1, minWidth: 0 }}
                    >
                      STD
                    </button>

                    {/* 0.25, 0.50, 0.75 */}
                    {['0.25', '0.50', '0.75'].map((measure) => (
                      <button
                        key={measure}
                        type="button"
                        onClick={() => {
                          setBielaMeasure(measure);
                          setBielaCustomMeasure('');
                        }}
                        className={cn(
                          "h-9 rounded-lg border text-xs font-black tracking-wider transition-all cursor-pointer flex items-center justify-center text-center px-0.5",
                          bielaMeasure === measure
                            ? "bg-primary/10 text-primary border-primary/30 dark:bg-primary/20 font-black"
                            : "bg-transparent text-muted-foreground/60 border-border/40 hover:bg-muted/30 font-bold"
                        )}
                        style={{ flex: 1, minWidth: 0 }}
                      >
                        {measure}
                      </button>
                    ))}

                    {/* Outro */}
                    <button
                      type="button"
                      onClick={() => {
                        setBielaMeasure('personalizado');
                      }}
                      className={cn(
                        "h-9 rounded-lg border text-[10px] sm:text-xs font-black tracking-wider transition-all cursor-pointer flex items-center justify-center text-center px-0.5",
                        bielaMeasure === 'personalizado'
                          ? "bg-primary/10 text-primary border-primary/30 dark:bg-primary/20 font-black"
                          : "bg-transparent text-muted-foreground/60 border-border/40 hover:bg-muted/30 font-bold"
                      )}
                      style={{ flex: 1, minWidth: 0 }}
                    >
                      Outro
                    </button>
                  </div>

                  {bielaMeasure === 'personalizado' && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-1.5 pt-1"
                    >
                      <Input
                        placeholder="Ex: 1.20, etc."
                        value={bielaCustomMeasure}
                        onChange={(e) => setBielaCustomMeasure(e.target.value.toUpperCase())}
                        className="h-8.5 text-xs rounded-lg premium-input uppercase"
                        autoFocus
                      />
                    </motion.div>
                  )}
                </div>

                {/* Mancal Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-black text-foreground/80 uppercase tracking-wider ml-0.5">Medida Mancal</Label>
                    <span className="text-[10px] font-bold text-primary/60 bg-primary/5 px-2 py-0.5 rounded border border-primary/10">Mancal</span>
                  </div>
                  
                  {/* Linha de Botões */}
                  <div 
                    className="flex flex-row items-center gap-1.5 w-full"
                    style={{ display: 'flex', flexDirection: 'row', gap: '6px', width: '100%', alignItems: 'center' }}
                  >
                    {/* EM BRANCO */}
                    <button
                      type="button"
                      onClick={() => {
                        setMancalMeasure('nada');
                        setMancalCustomMeasure('');
                      }}
                      className={cn(
                        "h-9 rounded-lg border text-[8px] sm:text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center text-center px-0.5",
                        mancalMeasure === 'nada'
                          ? "bg-primary/10 text-primary border-primary/30 dark:bg-primary/20 font-black"
                          : "bg-transparent text-muted-foreground/60 border-border/40 hover:bg-muted/30 font-bold"
                      )}
                      style={{ flex: 1, minWidth: 0 }}
                    >
                      EM BRANCO
                    </button>

                    {/* STD */}
                    <button
                      type="button"
                      onClick={() => {
                        setMancalMeasure('STD');
                        setMancalCustomMeasure('');
                      }}
                      className={cn(
                        "h-9 rounded-lg border text-xs font-black tracking-wider transition-all cursor-pointer flex items-center justify-center text-center px-0.5",
                        mancalMeasure === 'STD'
                          ? "bg-primary/10 text-primary border-primary/30 dark:bg-primary/20 font-black"
                          : "bg-transparent text-muted-foreground/60 border-border/40 hover:bg-muted/30 font-bold"
                      )}
                      style={{ flex: 1, minWidth: 0 }}
                    >
                      STD
                    </button>

                    {/* 0.25, 0.50, 0.75 */}
                    {['0.25', '0.50', '0.75'].map((measure) => (
                      <button
                        key={measure}
                        type="button"
                        onClick={() => {
                          setMancalMeasure(measure);
                          setMancalCustomMeasure('');
                        }}
                        className={cn(
                          "h-9 rounded-lg border text-xs font-black tracking-wider transition-all cursor-pointer flex items-center justify-center text-center px-0.5",
                          mancalMeasure === measure
                            ? "bg-primary/10 text-primary border-primary/30 dark:bg-primary/20 font-black"
                            : "bg-transparent text-muted-foreground/60 border-border/40 hover:bg-muted/30 font-bold"
                        )}
                        style={{ flex: 1, minWidth: 0 }}
                      >
                        {measure}
                      </button>
                    ))}

                    {/* Outro */}
                    <button
                      type="button"
                      onClick={() => {
                        setMancalMeasure('personalizado');
                      }}
                      className={cn(
                        "h-9 rounded-lg border text-[10px] sm:text-xs font-black tracking-wider transition-all cursor-pointer flex items-center justify-center text-center px-0.5",
                        mancalMeasure === 'personalizado'
                          ? "bg-primary/10 text-primary border-primary/30 dark:bg-primary/20 font-black"
                          : "bg-transparent text-muted-foreground/60 border-border/40 hover:bg-muted/30 font-bold"
                      )}
                      style={{ flex: 1, minWidth: 0 }}
                    >
                      Outro
                    </button>
                  </div>

                  {mancalMeasure === 'personalizado' && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-1.5 pt-1"
                    >
                      <Input
                        placeholder="Ex: 1.20, etc."
                        value={mancalCustomMeasure}
                        onChange={(e) => setMancalCustomMeasure(e.target.value.toUpperCase())}
                        className="h-8.5 text-xs rounded-lg premium-input uppercase"
                      />
                    </motion.div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-4 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {['0.25', '0.50', '0.75', '1.00'].map((measure) => (
                    <button
                      key={measure}
                      type="button"
                      onClick={() => setSelectedMeasure(measure)}
                      className={cn(
                        "h-10 rounded-lg border text-xs font-black tracking-wider transition-all cursor-pointer",
                        selectedMeasure === measure
                          ? "bg-primary/10 text-primary border-primary/30 dark:bg-primary/20 font-black"
                          : "bg-transparent text-muted-foreground/60 border-border/40 hover:bg-muted/30 font-bold"
                      )}
                    >
                      {measure}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setSelectedMeasure('personalizado')}
                    className={cn(
                      "h-10 rounded-lg border text-xs font-black tracking-wider transition-all col-span-2 sm:col-span-1 cursor-pointer",
                      selectedMeasure === 'personalizado'
                        ? "bg-primary/10 text-primary border-primary/30 dark:bg-primary/20 font-black"
                        : "bg-transparent text-muted-foreground/60 border-border/40 hover:bg-muted/30 font-bold"
                    )}
                  >
                    Personalizado
                  </button>
                </div>

                {selectedMeasure === 'personalizado' && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-1.5"
                  >
                    <Label className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-wider ml-0.5">Informar Medida</Label>
                    <Input
                      placeholder="Ex: STD, 1.25, 0.10, etc."
                      value={customMeasure}
                      onChange={(e) => setCustomMeasure(e.target.value.toUpperCase())}
                      className="h-9 text-xs rounded-lg premium-input uppercase"
                      autoFocus
                    />
                  </motion.div>
                )}
              </div>
            )}

            <DialogFooter className="mt-2 flex items-center justify-between gap-2 border-t border-border/60 pt-4 bg-transparent -mx-6 -mb-6 px-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsMeasureDialogOpen(false);
                  setSelectedMeasureService(null);
                  setIsEditingMeasureForId(null);
                }}
                className="text-xs border-border hover:bg-secondary/60"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmMeasure}
                className="text-xs px-4 bg-foreground text-background hover:bg-foreground/90 font-black uppercase tracking-wider h-8"
              >
                Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* ═══ DIALOG: SELEÇÃO DE VARIAÇÃO DE PREÇO POR MOTOR ═══ */}
      <Dialog open={isVariationDialogOpen} onOpenChange={setIsVariationDialogOpen}>
        {isVariationDialogOpen && (
          <DialogContent className="max-w-sm bg-card border border-border p-6 rounded-xl shadow-2xl z-[1200]" overlayClassName="z-[1199]">
            <DialogHeader>
              <DialogTitle className="text-sm font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" />
                Selecionar Variação do Serviço
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Selecione qual especificação de preço do motor <strong className="uppercase">{selectedMotorModel}</strong> deseja adicionar para o serviço <strong>{pendingService?.svc.name}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-2 max-h-[250px] overflow-y-auto pr-1">
              {pendingService?.prices.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    const finalName = p.subName ? `${pendingService.svc.name} — ${p.subName}` : pendingService.svc.name;
                    handleAddServiceWithMotor({ 
                      id: pendingService.svc.id, 
                      name: finalName, 
                      value: p.price, 
                      quantity: 1,
                      measure: pendingMeasure
                    });
                    setIsVariationDialogOpen(false);
                    setPendingService(null);
                    setPendingMeasure(undefined);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-border/60 bg-secondary/20 hover:bg-secondary/60 hover:border-primary/20 transition-all text-left text-xs font-semibold cursor-pointer"
                >
                  <span className="font-extrabold uppercase text-foreground/90 truncate max-w-[180px]">
                    {p.subName || 'Preço Padrão'}
                  </span>
                  <span className="font-mono font-black text-foreground">
                    {p.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </button>
              ))}
            </div>

            <DialogFooter className="mt-2 flex items-center justify-end gap-2 border-t border-border/60 pt-4 bg-transparent -mx-6 -mb-6 px-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsVariationDialogOpen(false);
                  setPendingService(null);
                  setPendingMeasure(undefined);
                }}
                className="text-xs border-border hover:bg-secondary/60"
              >
                Cancelar
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(155, 155, 155, 0.2); border-radius: 10px; }
      `}</style>
    </div>
  );
});
ServiceCatalog.displayName = 'ServiceCatalog';