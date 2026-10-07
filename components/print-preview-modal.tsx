'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Printer,
  FileDown,
  X,
  ZoomIn,
  ZoomOut,
  Phone,
  Mail
} from 'lucide-react';
import { cn, formatMotorDisplay, formatMotorModelAndCylinders } from '@/lib/utils';
import { Order, Client, ServiceItem } from '@/lib/store';
import { toast } from 'sonner';
import { OSPrintReport } from './os-print-report';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  client: Client | null;
  motors: Array<{ model: string; cylinders: string; displacement: string }>;
  getEntries: () => any[];
  formatDate: (dateStr: string) => string;
  onConfirmPrint: (onReady: () => void) => void;
  onConfirmPDF?: (onReady: () => void) => Promise<{ success: boolean; filePath?: string; canceled?: boolean }>;
}

export function PrintPreviewModal({
  isOpen,
  onClose,
  order,
  client,
  motors,
  getEntries,
  formatDate,
  onConfirmPrint,
  onConfirmPDF,
}: PrintPreviewModalProps) {
  const [zoom, setZoom] = useState<number>(1.0);

  const getFormattedEmissionDate = () => {
    if (order.arrivalDate) {
      try {
        const parts = order.arrivalDate.split('-');
        if (parts.length === 3) {
          const year = parts[0];
          const month = parts[1];
          const day = parts[2];
          if (order.createdAt) {
            const d = new Date(order.createdAt);
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            return `${day}/${month}/${year}, ${hours}:${minutes}`;
          }
          return `${day}/${month}/${year}`;
        }
      } catch (e) {}
    }
    if (!order.createdAt) return '';
    try {
      const d = new Date(order.createdAt);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year}, ${hours}:${minutes}`;
    } catch (e) {
      return '';
    }
  };

  const cleanObservations = order.observations
    ? order.observations.replace(/\[ENTRADAS_JSON:\[[\s\S]*?\]\]/i, "").trim()
    : '';

  const hasPartsLeft = order.partsLeft && order.partsLeft.length > 0;
  const hasAdditionalParts = order.additionalParts && order.additionalParts.length > 0;
  const hasAnyExtraParts = hasPartsLeft || hasAdditionalParts;

  const motorModelStr = motors.map(m => m.model).join(', ');
  const cylindersStr = motors.map(m => m.cylinders).filter(Boolean).join(', ');

  const isCompact = order.services.length > 3 || hasAnyExtraParts || (cleanObservations && cleanObservations.length > 80);

  const serviceCount = order.services.length;
  const hasObs = cleanObservations ? 1 : 0;
  const extraPartsCount = (order.partsLeft?.length || 0) + (order.additionalParts?.length || 0);

  let printZoom = 1.0;
  if (serviceCount > 12) {
    printZoom = 0.65;
  } else if (serviceCount > 8) {
    printZoom = 0.75;
  } else if (serviceCount > 5 || extraPartsCount > 4 || hasObs) {
    printZoom = 0.85;
  } else {
    printZoom = 0.95;
  }

  const handlePrintClick = () => {
    onConfirmPrint(() => {
      // Done printing callback
    });
  };

  const handlePDFClick = async () => {
    if (onConfirmPDF) {
      const loadingToast = toast.loading('Gerando PDF...');
      try {
        const res = await onConfirmPDF(() => { });
        toast.dismiss(loadingToast);
        if (res.success) {
          toast.success(`PDF salvo com sucesso em: ${res.filePath}`);
        } else if (!res.canceled) {
          toast.error('Falha ao gerar PDF.');
        }
      } catch (err: any) {
        toast.dismiss(loadingToast);
        toast.error(`Erro ao gerar PDF: ${err.message || err}`);
      }
    } else {
      // Fallback for Web browser
      toast.info('Selecione a opção "Salvar como PDF" no destino da impressão do navegador.');
      onConfirmPrint(() => { });
    }
  };

  const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        showCloseButton={false}
        useFlexLayout={true}
        className="w-[min(1200px,calc(100vw-48px))] max-h-[calc(100vh-48px)] p-0 border border-border bg-card rounded-xl overflow-hidden shadow-2xl z-[9999] flex flex-col gap-0"
        overlayClassName="z-[9998]"
        style={{ transform: 'none' }}
        finalFocus={false}
      >


        {/* Toolbar Header */}
        <div className="shrink-0 bg-card border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Printer className="w-5 h-5 text-muted-foreground" />
            <DialogTitle className="text-sm font-bold text-foreground uppercase tracking-wider">
              Pré-Visualização do Relatório (O.S. #{order.osNumber || order.id})
            </DialogTitle>
          </div>

          <div className="flex items-center gap-4">
            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5 border border-border">
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
                onClick={() => setZoom(prev => Math.max(0.5, prev - 0.25))}
                disabled={zoom <= 0.5}
                title="Diminuir Zoom"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-xs font-bold text-foreground w-12 text-center select-none font-mono">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
                onClick={() => setZoom(prev => Math.min(1.25, prev + 0.25))}
                disabled={zoom >= 1.25}
                title="Aumentar Zoom"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button
                onClick={handlePrintClick}
                className="h-9 px-4 rounded-lg solid-btn font-bold text-xs uppercase tracking-wider gap-1.5 shadow-sm"
              >
                <Printer className="w-4 h-4" /> Imprimir
              </Button>
              <Button
                variant="outline"
                onClick={handlePDFClick}
                className="h-9 px-4 rounded-lg border-border bg-card hover:bg-accent text-foreground font-bold text-xs uppercase tracking-wider gap-1.5"
              >
                <FileDown className="w-4 h-4" /> {isElectron ? 'Salvar PDF' : 'Salvar PDF'}
              </Button>
              <Button
                variant="outline"
                onClick={onClose}
                className="h-9 px-4 rounded-lg border-border bg-card hover:bg-accent text-foreground font-bold text-xs uppercase tracking-wider gap-1.5"
              >
                <X className="w-4 h-4" /> Fechar
              </Button>
            </div>
          </div>
        </div>

        {/* Scaled Preview Viewport */}
        <div
          className="overflow-auto flex-1 flex justify-center p-6 bg-muted dark:bg-card/60"
          style={{ minHeight: '0' }}
        >
          <div
            style={{
              width: `${210 * zoom}mm`,
              height: 'auto',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <div
              className="shadow-2xl border border-border"
              style={{
                width: '210mm',
                height: 'auto',
                minHeight: '297mm',
                transform: `scale(${zoom})`,
                transformOrigin: 'top center',
                background: 'white',
              }}
            >
              <OSPrintReport
                order={order}
                client={client}
                motors={motors}
                getEntries={getEntries}
                formatDate={formatDate}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
