'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Calculator,
  CreditCard,
  User,
  Calendar as CalendarIcon,
  CheckCircle2,
  Check,
  Pencil,
  Trash2,
  ChevronDown,
  Plus,
  DollarSign,
  Percent,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { DatePicker } from '@/components/ui/date-picker';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════

export type PaymentMethodType = 'pix' | 'dinheiro' | 'debito' | 'credito';
export type PaymentStatusType = 'nao_pago' | 'entrada' | 'pago';

export interface PaymentEntryItem {
  id?: string;
  amount: number;
  method: string;
  installments?: string;
  date: string;
  payer?: string;
}

export interface PagoConfirmationData {
  method: string;
  installments?: string;
  date: string;
  payer?: string;
  amount: number;
}

export interface ResumoFinanceiroProps {
  subtotal: number;
  desconto?: number;
  onDescontoChange?: (val: number) => void;
  clientName?: string;
  initialStatus?: PaymentStatusType | 'Não Pago' | 'Entrada' | 'Pago';
  /**
   * Current list of payment entries — the single source of truth, owned by the parent.
   * Must be referentially stable (memoized) across re-renders that don't actually change
   * the data, otherwise the "pago" form prefill effect below will re-run needlessly.
   */
  entries: PaymentEntryItem[];
  context?: 'individual' | 'agrupado';
  onConfirmPago?: (data: PagoConfirmationData) => Promise<void> | void;
  onAddEntrada?: (data: PaymentEntryItem) => Promise<void> | void;
  onUpdateEntrada?: (id: string, data: PaymentEntryItem) => Promise<void> | void;
  onDeleteEntrada?: (id: string, index: number) => Promise<void> | void;
  onStatusChange?: (status: PaymentStatusType) => void;
  isSaving?: boolean;
  className?: string;
}

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════

export function formatBRL(val: number): string {
  return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateDisplay(dateStr?: string): string {
  if (!dateStr) return '';
  if (dateStr.includes('/')) return dateStr;
  try {
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  } catch (e) {
    return dateStr;
  }
}

export function normalizeStatus(status?: string): PaymentStatusType {
  if (!status) return 'nao_pago';
  const s = status.toLowerCase().trim();
  if (s === 'pago' || s === 'pago integral') return 'pago';
  if (s === 'entrada' || s === 'pagamento parcial' || s === 'parcial') return 'entrada';
  return 'nao_pago';
}

export function normalizeMethodValue(method?: string): { methodKey: PaymentMethodType; methodLabel: string; installments?: string } {
  if (!method) return { methodKey: 'pix', methodLabel: 'PIX' };
  const m = method.toLowerCase();
  if (m.includes('pix')) return { methodKey: 'pix', methodLabel: 'PIX' };
  if (m.includes('dinheiro') || m.includes('especie')) return { methodKey: 'dinheiro', methodLabel: 'Dinheiro' };
  if (m.includes('debito') || m.includes('débito')) return { methodKey: 'debito', methodLabel: 'Débito' };
  if (m.includes('credito') || m.includes('crédito')) {
    if (m.includes('2x')) return { methodKey: 'credito', methodLabel: 'Crédito', installments: '2x' };
    if (m.includes('3x')) return { methodKey: 'credito', methodLabel: 'Crédito', installments: '3x' };
    for (let i = 4; i <= 12; i++) {
      if (m.includes(`${i}x`)) return { methodKey: 'credito', methodLabel: 'Crédito', installments: `${i}x` };
    }
    return { methodKey: 'credito', methodLabel: 'Crédito', installments: 'À vista' };
  }
  return { methodKey: 'pix', methodLabel: method.toUpperCase() };
}

// ═══════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════

export const PixIcon: React.FC<{ size?: number; className?: string }> = ({ size = 18, className = '' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 48 48"
    width={size}
    height={size}
    baseProfile="basic"
    className={className}
  >
    <path fill="#4db6ac" d="M11.9,12h-0.68l8.04-8.04c2.62-2.61,6.86-2.61,9.48,0L36.78,12H36.1c-1.6,0-3.11,0.62-4.24,1.76	l-6.8,6.77c-0.59,0.59-1.53,0.59-2.12,0l-6.8-6.77C15.01,12.62,13.5,12,11.9,12z"/>
    <path fill="#4db6ac" d="M36.1,36h0.68l-8.04,8.04c-2.62,2.61-6.86,2.61-9.48,0L11.22,36h0.68c1.6,0,3.11-0.62,4.24-1.76	l6.8-6.77c0.59-0.59,1.53-0.59,2.12,0l6.8,6.77C32.99,35.38,34.5,36,36.1,36z"/>
    <path fill="#4db6ac" d="M44.04,28.74L38.78,34H36.1c-1.07,0-2.07-0.42-2.83-1.17l-6.8-6.78c-1.36-1.36-3.58-1.36-4.94,0	l-6.8,6.78C13.97,33.58,12.97,34,11.9,34H9.22l-5.26-5.26c-2.61-2.62-2.61-6.86,0-9.48L9.22,14h2.68c1.07,0,2.07,0.42,2.83,1.17	l6.8,6.78c0.68,0.68,1.58,1.02,2.47,1.02s1.79-0.34,2.47-1.02l6.8-6.78C34.03,14.42,35.03,14,36.1,14h2.68l5.26,5.26	C46.65,21.88,46.65,26.12,44.04,28.74z"/>
  </svg>
);

export const DinheiroIcon: React.FC<{ size?: number; className?: string }> = ({ size = 18, className = '' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 2200 2200"
    width={size}
    height={size}
    className={className}
  >
    <g>
      <g>
        <path fill="#C47743" d="M1680.791,570.476v166.382H464.526c-24.507,0-47.063-8.374-64.958-22.411 c-3.351-2.629-6.531-5.447-9.539-8.455c-19.069-19.06-30.866-45.41-30.866-74.506c0-58.174,47.18-105.354,105.363-105.354 h1171.93C1660.945,526.132,1680.791,545.987,1680.791,570.476z"/>
        <path fill="#AA693C" d="M1680.791,714.447v22.411H464.526c-24.507,0-47.063-8.374-64.958-22.411 c-3.351-2.629-6.531-5.447-9.539-8.455c-12.168-12.159-21.373-27.289-26.431-44.208c0.535,0.759,1.077,1.512,1.627,2.26 c23.507,31.967,61.19,50.404,100.87,50.404H1680.791z"/>
        <path fill="#E28947" d="M1797.482,781.193v969.225c0,24.48-19.846,44.335-44.335,44.335H465.574 c-58.761,0-106.411-47.641-106.411-106.411V631.486c0,29.096,11.797,55.446,30.866,74.506 c19.06,19.069,45.401,30.866,74.497,30.866h1288.621C1777.636,736.859,1797.482,756.704,1797.482,781.193z"/>
        <path fill="#7BC97B" d="M498.3,736.855l162.356-210.72l235.54-305.718c8.726-11.324,24.971-13.425,36.295-4.709 l180.942,139.416l-383.609,381.73H498.3z"/>
        <path fill="#B3E08C" d="M1062.912,392.513L690.997,709.885l-31.607,26.973h-92.482l9.105-11.824l153.248-198.902 l145.516-188.866c29.349,22.61,71.471,17.154,94.09-12.195c0.813-1.066,1.599-2.132,2.331-3.225l73.295,56.475L1062.912,392.513z"/>
        <polygon fill="#70BA70" points="1113.434,355.125 784.292,682.65 690.997,709.885 1062.912,392.513 1044.493,378.322 1095.016,340.934"/>
        <polygon fill="#A0C979" points="1062.912,392.513 690.997,709.885 598.597,736.859 560.043,736.859 576.014,725.034 587.712,716.38 590.322,714.447 1044.493,378.322"/>
        <path fill="#7BC97B" d="M1396.905,494.344L618.181,721.656l51.977-38.472l539.065-398.942 c11.481-8.5,27.696-6.079,36.187,5.402l137.323,185.551L1396.905,494.344z"/>
        <path fill="#B3E08C" d="M1335.064,512.393l-566.02,165.226l51.986-38.472l335.61-248.377 c22.032,29.782,64.036,36.06,93.828,14.01c1.066-0.786,2.114-1.608,3.125-2.457l67.297,90.919L1335.064,512.393z"/>
        <path fill="#7BC97B" d="M1592.272,736.855l-61.496-210.72l-11.812-40.454c-4.008-13.718-18.374-21.592-32.092-17.593 l-198.864,58.047l-721.907,210.72H1592.272z"/>
        <polygon fill="#70BA70" points="1396.905,494.344 1335.064,512.393 1320.891,493.242 1382.732,475.194"/>
        <polygon fill="#A0C979" points="1335.064,512.393 769.044,677.619 821.03,639.146 1257.333,511.797 1320.891,493.242"/>
        <path fill="#B3E08C" d="M1529.304,736.855l-41.624-142.617c-1.241,0.443-2.51,0.851-3.795,1.224 c-35.568,10.384-72.812-10.038-83.187-45.597l-640.636,186.99H1529.304z"/>
        <polygon fill="#70BA70" points="836.847,714.447 760.065,736.859 566.104,736.859 642.877,714.447"/>
        <polygon fill="#70BA70" points="1592.275,736.859 1529.305,736.859 1522.765,714.447 1585.735,714.447"/>
        <polygon fill="#A0C979" points="1529.305,736.859 760.065,736.859 836.847,714.447 1522.765,714.447"/>
        <polygon fill="#A0C979" points="642.877,714.447 566.104,736.859 560.043,736.859 584.171,714.447"/>
        <polygon fill="#70BA70" points="821.03,639.146 769.044,677.619 618.181,721.656 670.158,683.183"/>
        <polygon fill="#70BA70" points="584.171,714.447 566.908,736.859 498.301,736.859 515.564,714.447"/>
        <g>
          <path fill="#AA693C" d="M497.081,847.683h-51.138c-9.978,0-18.066-8.088-18.066-18.066s8.088-18.066,18.066-18.066 h51.138c9.978,0,18.066,8.088,18.066,18.066S507.059,847.683,497.081,847.683z"/>
          <path fill="#AA693C" d="M1653.245,1731.343h-44.465c-9.978,0-18.066-8.088-18.066-18.066 c0-9.978,8.089-18.066,18.066-18.066h44.465c9.978,0,18.066,8.088,18.066,18.066 C1671.311,1723.255,1663.223,1731.343,1653.245,1731.343z M1537.636,1731.343h-44.465c-9.978,0-18.066-8.088-18.066-18.066 c0-9.978,8.088-18.066,18.066-18.066h44.465c9.978,0,18.066,8.088,18.066,18.066 C1555.702,1723.255,1547.614,1731.343,1537.636,1731.343z M1422.028,1731.343h-44.465c-9.978,0-18.066-8.088-18.066-18.066 c0-9.978,8.088-18.066,18.066-18.066h44.465c9.978,0,18.066,8.088,18.066,18.066 C1440.094,1723.255,1432.006,1731.343,1422.028,1731.343z M1306.419,1731.343h-44.465c-9.978,0-18.066-8.088-18.066-18.066 c0-9.978,8.089-18.066,18.066-18.066h44.465c9.978,0,18.066,8.088,18.066,18.066 C1324.485,1723.255,1316.397,1731.343,1306.419,1731.343z M1190.811,1731.343h-44.465c-9.978,0-18.066-8.088-18.066-18.066 c0-9.978,8.088-18.066,18.066-18.066h44.465c9.978,0,18.066,8.088,18.066,18.066 C1208.877,1723.255,1200.789,1731.343,1190.811,1731.343z M1075.202,1731.343h-44.465c-9.978,0-18.066-8.088-18.066-18.066 c0-9.978,8.088-18.066,18.066-18.066h44.465c9.978,0,18.066,8.088,18.066,18.066 C1093.268,1723.255,1085.18,1731.343,1075.202,1731.343z M959.594,1731.343h-44.465c-9.978,0-18.066-8.088-18.066-18.066 c0-9.978,8.088-18.066,18.066-18.066h44.465c9.978,0,18.066,8.088,18.066,18.066 C977.66,1723.255,969.571,1731.343,959.594,1731.343z M843.984,1731.343H799.52c-9.978,0-18.066-8.088-18.066-18.066 c0-9.978,8.088-18.066,18.066-18.066h44.465c9.978,0,18.066,8.088,18.066,18.066 C862.051,1723.255,853.962,1731.343,843.984,1731.343z M728.376,1731.343h-44.465c-9.978,0-18.066-8.088-18.066-18.066 c0-9.978,8.088-18.066,18.066-18.066h44.465c9.978,0,18.066,8.088,18.066,18.066 C746.443,1723.255,738.354,1731.343,728.376,1731.343z M612.768,1731.343h-44.466c-9.978,0-18.066-8.088-18.066-18.066 c0-9.978,8.088-18.066,18.066-18.066h44.466c9.978,0,18.066,8.088,18.066,18.066 C630.835,1723.255,622.746,1731.343,612.768,1731.343z M1718.904,1714.994c-3.525,0-7.086-1.03-10.211-3.175 c-8.225-5.648-10.314-16.895-4.667-25.12c2.233-3.252,3.413-7.07,3.413-11.045v-21.85c0-9.978,8.088-18.066,18.066-18.066 c9.978,0,18.066,8.088,18.066,18.066v21.85c0,11.308-3.375,22.2-9.759,31.498 C1730.311,1712.253,1724.655,1714.994,1718.904,1714.994z M1725.506,1600.727c-9.978,0-18.066-8.089-18.066-18.066v-44.465 c0-9.978,8.088-18.066,18.066-18.066c9.978,0,18.066,8.089,18.066,18.066v44.465 C1743.572,1592.639,1735.484,1600.727,1725.506,1600.727z M1725.506,1485.119c-9.978,0-18.066-8.088-18.066-18.066v-44.465 c0-9.978,8.088-18.066,18.066-18.066c9.978,0,18.066,8.088,18.066,18.066v44.465 C1743.572,1477.031,1735.484,1485.119,1725.506,1485.119z M1725.506,1369.51c-9.978,0-18.066-8.088-18.066-18.066v-44.465 c0-9.978,8.088-18.066,18.066-18.066c9.978,0,18.066,8.088,18.066,18.066v44.465 C1743.572,1361.422,1735.484,1369.51,1725.506,1369.51z M1725.506,1253.902c-9.978,0-18.066-8.089-18.066-18.066v-44.465 c0-9.978,8.088-18.066,18.066-18.066c9.978,0,18.066,8.088,18.066,18.066v44.465 C1743.572,1245.813,1735.484,1253.902,1725.506,1253.902z M1725.506,1138.293c-9.978,0-18.066-8.088-18.066-18.066v-44.465 c0-9.978,8.088-18.066,18.066-18.066c9.978,0,18.066,8.088,18.066,18.066v44.465 C1743.572,1130.205,1735.484,1138.293,1725.506,1138.293z M1725.506,1022.685c-9.978,0-18.066-8.088-18.066-18.066v-44.465 c0-9.978,8.088-18.066,18.066-18.066c9.978,0,18.066,8.088,18.066,18.066v44.465 C1743.572,1014.596,1735.484,1022.685,1725.506,1022.685z M1725.506,907.076c-9.978,0-18.066-8.088-18.066-18.066v-21.771 c0-3.988-1.188-7.819-3.436-11.078c-5.666-8.213-3.6-19.465,4.613-25.13c8.213-5.666,19.465-3.601,25.13,4.613 c6.428,9.319,9.826,20.244,9.826,31.595v21.771C1743.572,898.988,1735.484,907.076,1725.506,907.076z M1653.166,847.683h-44.465 c-9.978,0-18.066-8.088-18.066-18.066s8.089-18.066,18.066-18.066h44.465c9.978,0,18.066,8.088,18.066,18.066 S1663.144,847.683,1653.166,847.683z M1537.558,847.683h-44.465c-9.978,0-18.066-8.088-18.066-18.066 s8.088-18.066,18.066-18.066h44.465c9.978,0,18.066,8.088,18.066,18.066S1547.536,847.683,1537.558,847.683z M1421.95,847.683 h-44.465c-9.978,0-18.066-8.088-18.066-18.066s8.088-18.066,18.066-18.066h44.465c9.978,0,18.066,8.088,18.066,18.066 S1431.928,847.683,1421.95,847.683z M1306.341,847.683h-44.465c-9.978,0-18.066-8.088-18.066-18.066s8.089-18.066,18.066-18.066 h44.465c9.978,0,18.066,8.088,18.066,18.066S1316.319,847.683,1306.341,847.683z M1190.733,847.683h-44.466 c-9.978,0-18.066-8.088-18.066-18.066s8.088-18.066,18.066-18.066h44.466c9.978,0,18.066,8.088,18.066,18.066 S1200.711,847.683,1190.733,847.683z M1075.124,847.683h-44.465c-9.978,0-18.066-8.088-18.066-18.066 s8.088-18.066,18.066-18.066h44.465c9.978,0,18.066,8.088,18.066,18.066S1085.102,847.683,1075.124,847.683z M959.516,847.683 H915.05c-9.978,0-18.066-8.088-18.066-18.066s8.088-18.066,18.066-18.066h44.466c9.978,0,18.066,8.088,18.066,18.066 S969.494,847.683,959.516,847.683z M843.907,847.683h-44.465c-9.978,0-18.066-8.088-18.066-18.066s8.088-18.066,18.066-18.066 h44.465c9.978,0,18.066,8.088,18.066,18.066S853.885,847.683,843.907,847.683z M728.299,847.683h-44.466 c-9.978,0-18.066-8.088-18.066-18.066s8.088-18.066,18.066-18.066h44.466c9.978,0,18.066,8.088,18.066,18.066 S738.277,847.683,728.299,847.683z M612.69,847.683h-44.465c-9.978,0-18.066-8.088-18.066-18.066s8.088-18.066,18.066-18.066 h44.465c9.978,0,18.066,8.088,18.066,18.066S622.668,847.683,612.69,847.683z"/>
          <path fill="#AA693C" d="M497.081,1731.343h-51.138c-9.978,0-18.066-8.088-18.066-18.066 c0-9.978,8.088-18.066,18.066-18.066h51.138c9.978,0,18.066,8.088,18.066,18.066 C515.148,1723.255,507.059,1731.343,497.081,1731.343z"/>
        </g>
        <path fill="#C47743" d="M1675.242,1389.359h124.573c22.656,0,41.023-18.366,41.023-41.023v-165.069 c0-22.656-18.366-41.023-41.023-41.023h-124.573c-68.239,0-123.557,55.318-123.557,123.557v0 C1551.685,1334.04,1607.003,1389.359,1675.242,1389.359z"/>
        <circle fill="#FFBF31" cx="1677.01" cy="1265.803" r="42.885"/>
      </g>
      <ellipse fill="#CEDADD" cx="1086.445" cy="1960.621" rx="591.245" ry="29.047"/>
    </g>
  </svg>
);

export const DebitoIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="3 9 42 30"
    width={size}
    height={size}
    className={className}
  >
    <rect x="5" y="11" width="38" height="26" rx="4" fill="#7C3AED" stroke="#27272a" strokeWidth="2"/>
    <rect x="5" y="16" width="38" height="6" fill="#27272a"/>
    <rect x="10" y="27" width="9" height="2.2" rx="1.1" fill="#EDE9FE"/>
    <rect x="10" y="31" width="14" height="2.2" rx="1.1" fill="#EDE9FE"/>
    <circle cx="30" cy="29" r="5" fill="#ED1C24"/>
    <circle cx="35" cy="29" r="5" fill="#F7A600"/>
    <path d="M32.5 24.67 A5 5 0 0 1 32.5 33.33 A5 5 0 0 1 32.5 24.67 Z" fill="#F26D21"/>
  </svg>
);

export const CreditoIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="4 10 39 27"
    width={size}
    height={size}
    className={className}
  >
    <rect x="6" y="12" width="35" height="23" rx="3" fill="#F4F4F5" stroke="#27272a" strokeWidth="2"/>
    <rect x="11" y="16" width="6" height="5" rx="1" fill="#C9971F"/>
    <rect x="13.5" y="16" width="1.2" height="5" fill="#E8B923"/>
    <rect x="26" y="16" width="11" height="2" rx="1" fill="#D4D4D8"/>
    <rect x="10" y="24" width="5" height="2" rx="1" fill="#D4D4D8"/>
    <rect x="17" y="24" width="5" height="2" rx="1" fill="#D4D4D8"/>
    <rect x="24" y="24" width="5" height="2" rx="1" fill="#D4D4D8"/>
    <rect x="31" y="24" width="5" height="2" rx="1" fill="#D4D4D8"/>
    <rect x="10" y="28" width="12" height="2" rx="1" fill="#D4D4D8"/>
    <circle cx="31" cy="29" r="4" fill="#ED1C24"/>
    <circle cx="35" cy="29" r="4" fill="#F7A600"/>
    <path d="M33 25.54 A4 4 0 0 1 33 32.46 A4 4 0 0 1 33 25.54 Z" fill="#F26D21"/>
  </svg>
);

interface InstallmentsBoxProps {
  selectedInstallment: string;
  onSelectInstallment: (inst: string) => void;
}

export const InstallmentsBox: React.FC<InstallmentsBoxProps> = ({
  selectedInstallment,
  onSelectInstallment,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const standardOptions = ['À vista', '2x', '3x'];
  const moreOptions = ['4x', '5x', '6x', '7x', '8x', '9x', '10x', '11x', '12x'];
  const isMoreSelected = moreOptions.includes(selectedInstallment);

  return (
    <div className="installments-box-rf animate-in fade-in duration-200">
      <span className="installments-title-rf">Parcelamento:</span>
      <div className="installments-options-rf">
        {standardOptions.map(opt => (
          <button
            key={opt}
            type="button"
            className={`installment-btn-rf ${selectedInstallment === opt ? 'active' : ''}`}
            onClick={() => {
              onSelectInstallment(opt);
              toast.success(`Parcelamento: ${opt}`);
            }}
          >
            {opt}
          </button>
        ))}

        <div className="relative" ref={containerRef}>
          <button
            type="button"
            className={`installment-btn-rf btn-plus-rf ${isMoreSelected ? 'active' : ''}`}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMoreSelected ? selectedInstallment : '+'}
          </button>

          {isMenuOpen && (
            <div className="more-installments-menu-rf">
              <div className="menu-title-rf">Outras parcelas</div>
              <div className="menu-grid-rf">
                {moreOptions.map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      onSelectInstallment(opt);
                      setIsMenuOpen(false);
                      toast.success(`Parcelamento: ${opt}`);
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface PaymentMethodsGridProps {
  selectedMethod: PaymentMethodType | null;
  onSelectMethod: (method: PaymentMethodType) => void;
  creditoSubtitle?: string;
  is2x2?: boolean;
}

export const PaymentMethodsGrid: React.FC<PaymentMethodsGridProps> = ({
  selectedMethod,
  onSelectMethod,
  creditoSubtitle = 'Até 12x',
  is2x2 = false,
}) => {
  const methods = [
    { key: 'pix' as const, name: 'PIX', desc: 'Imediato', icon: <PixIcon size={20} className="text-[#00ac56]" /> },
    { key: 'dinheiro' as const, name: 'Dinheiro', desc: 'À vista', icon: <DinheiroIcon size={22} /> },
    { key: 'debito' as const, name: 'Débito', desc: 'À vista', icon: <DebitoIcon size={24} /> },
    { key: 'credito' as const, name: 'Crédito', desc: creditoSubtitle, icon: <CreditoIcon size={24} /> },
  ];

  return (
    <div className={`payment-methods-grid-rf ${is2x2 ? 'grid-cols-2' : ''}`}>
      {methods.map(m => {
        const isSelected = selectedMethod === m.key;
        return (
          <label
            key={m.key}
            className={`payment-option-rf ${isSelected ? 'selected' : ''}`}
            onClick={() => onSelectMethod(m.key)}
          >
            <input
              type="radio"
              name="payment-method-group"
              checked={isSelected}
              onChange={() => onSelectMethod(m.key)}
              className="sr-only"
            />
            <div className="option-icon-rf">{m.icon}</div>
            <div className="option-details-rf">
              <span className="option-name-rf">{m.name}</span>
              <span className="option-desc-rf">{m.desc}</span>
            </div>
            <div className="radio-indicator-rf" />
          </label>
        );
      })}
    </div>
  );
};

// ═══════════════════════════════════════════════
// PAYMENT ENTRY MODAL — compact add/edit for a single lançamento
// ═══════════════════════════════════════════════

const methodIcons: Record<PaymentMethodType, React.ReactNode> = {
  pix: <PixIcon size={14} className="text-[#00ac56]" />,
  dinheiro: <DinheiroIcon size={16} />,
  debito: <DebitoIcon size={16} />,
  credito: <CreditoIcon size={16} />,
};

const methodLabels: Record<PaymentMethodType, string> = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  debito: 'Débito',
  credito: 'Crédito',
};

export interface PaymentEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'add' | 'edit';
  /** Prefilled entry data, required for `mode="edit"`. */
  initialData?: PaymentEntryItem;
  /** Gross subtotal (before discount) this payment is measured against. */
  totalValue: number;
  /** Sum of all OTHER already-registered entries (i.e. excluding the one being edited). */
  paidElsewhere: number;
  /** Current discount applied to the order. Ignored when `showDiscount` is false. */
  discount?: number;
  /** Show and allow editing the Desconto field — only meaningful for a single (non-grouped) order. */
  showDiscount?: boolean;
  clientName?: string;
  title?: string;
  /** Called with the entry data and the (possibly edited) discount value. */
  onSubmit: (data: PaymentEntryItem, discount: number) => Promise<void> | void;
  isSaving?: boolean;
}

export const PaymentEntryModal: React.FC<PaymentEntryModalProps> = ({
  open,
  onOpenChange,
  mode,
  initialData,
  totalValue,
  paidElsewhere,
  discount = 0,
  showDiscount = false,
  clientName = '',
  title,
  onSubmit,
  isSaving = false,
}) => {
  const initialMethod = normalizeMethodValue(initialData?.method);

  const [discountInput, setDiscountInput] = useState<string>(() =>
    showDiscount && discount > 0 ? discount.toFixed(2).replace('.', ',') : ''
  );
  const parsedDiscount = showDiscount ? (parseFloat(discountInput.replace(/\./g, '').replace(',', '.')) || 0) : 0;
  const netValue = Math.max(0, totalValue - parsedDiscount);
  const remainingBalance = Math.max(0, netValue - paidElsewhere);

  // "Entrada" (partial, freely editable) vs "Pagamento Quitado" (locked to the
  // full remaining balance) — defaults to whichever matches the entry we're
  // starting from.
  // Um lançamento novo começa sempre como "Entrada", com o valor em branco: quitar
  // tudo exige escolher "Pagamento quitado" de propósito.
  const [paymentMode, setPaymentMode] = useState<'entrada' | 'quitado'>(() => {
    if (!initialData) return 'entrada';
    return remainingBalance > 0 && initialData.amount >= remainingBalance ? 'quitado' : 'entrada';
  });

  const [amount, setAmount] = useState<string>(() => {
    if (paymentMode === 'quitado') {
      return remainingBalance > 0 ? remainingBalance.toFixed(2).replace('.', ',') : '';
    }
    return initialData ? initialData.amount.toFixed(2).replace('.', ',') : '';
  });
  const [date, setDate] = useState<string>(initialData?.date || getTodayDateString());
  const [method, setMethod] = useState<PaymentMethodType | null>(initialData ? initialMethod.methodKey : null);
  const [installment, setInstallment] = useState<string>(initialMethod.installments || 'À vista');
  const [payer, setPayer] = useState<string>(initialData?.payer || '');
  const [submitting, setSubmitting] = useState(false);

  // While "Pagamento Quitado" is selected the amount is always the full
  // remaining balance — keep it in sync as the discount changes.
  useEffect(() => {
    if (paymentMode === 'quitado') {
      setAmount(remainingBalance > 0 ? remainingBalance.toFixed(2).replace('.', ',') : '');
    }
  }, [paymentMode, remainingBalance]);

  const handleSelectMode = (next: 'entrada' | 'quitado') => {
    setPaymentMode(next);
    if (next === 'quitado') {
      setAmount(remainingBalance > 0 ? remainingBalance.toFixed(2).replace('.', ',') : '');
    } else if (paymentMode !== 'entrada') {
      setAmount('');
    }
  };

  const parsedAmount = parseFloat(amount.replace(/\./g, '').replace(',', '.')) || 0;
  const afterEntryBalance = Math.max(0, remainingBalance - parsedAmount);
  const willQuitar = paymentMode === 'quitado';
  const busy = submitting || isSaving;

  const handleSubmit = async () => {
    if (parsedAmount <= 0) {
      toast.error('Informe um valor válido.');
      return;
    }
    if (!date) {
      toast.error('Informe a data do pagamento.');
      return;
    }
    if (!method) {
      toast.error('Selecione a forma de pagamento.');
      return;
    }
    const data: PaymentEntryItem = {
      id: initialData?.id,
      amount: parsedAmount,
      method: method === 'credito' ? (installment ? `Crédito ${installment}` : 'Crédito') : methodLabels[method],
      installments: method === 'credito' ? installment : undefined,
      date,
      payer: method === 'pix' ? (payer.trim() || clientName || 'CLIENTE') : undefined,
    };
    setSubmitting(true);
    try {
      await onSubmit(data, parsedDiscount);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm bg-card border border-neutral-300 dark:border-neutral-800 p-0 rounded-2xl shadow-2xl overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-neutral-300 dark:border-neutral-800">
          <DialogTitle className="text-sm font-black uppercase tracking-wider text-foreground flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-[#00ac56]" />
            {title || (mode === 'edit' ? 'Editar lançamento' : 'Lançar pagamento')}
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 py-4 space-y-3">
          {/* Valor Bruto — sempre visível no topo */}
          <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-secondary/40 border border-neutral-200 dark:border-neutral-800">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Valor total</span>
            <span className="text-base font-black font-mono text-foreground">{formatBRL(totalValue)}</span>
          </div>
          {paidElsewhere > 0 && (
            <div className="flex items-center justify-between px-3 text-sm">
              <span className="text-muted-foreground">Já pago</span>
              <span className="font-mono font-bold">{formatBRL(paidElsewhere)}</span>
            </div>
          )}
          <div className="flex items-center justify-between px-3 text-sm">
            <span className="text-muted-foreground">Falta pagar</span>
            <span className="font-mono font-bold text-red-600 dark:text-red-400">{formatBRL(remainingBalance)}</span>
          </div>

          {showDiscount && (
            <div className="flex items-center justify-between gap-3 py-2 border-b border-dashed border-neutral-200 dark:border-neutral-800">
              <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground shrink-0">
                <Percent className="w-3.5 h-3.5 text-amber-500" /> Desconto
              </label>
              <div className="flex items-center gap-1 h-8 px-2.5 rounded-lg border border-neutral-300 dark:border-neutral-800 bg-card">
                <span className="text-xs font-bold text-muted-foreground">R$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={discountInput}
                  onChange={e => setDiscountInput(e.target.value)}
                  placeholder="0,00"
                  className="w-20 bg-transparent text-right font-mono text-sm font-black outline-none text-amber-500 dark:text-amber-400"
                />
              </div>
            </div>
          )}

          {showDiscount && parsedDiscount > 0 && (
            <div className="flex items-center justify-end gap-1.5 text-[10px] font-bold text-muted-foreground -mt-1.5">
              <span className="uppercase tracking-wider">Total com Desconto</span>
              <span className="font-mono text-foreground">{formatBRL(netValue)}</span>
            </div>
          )}

          {/* Toggle: Entrada (parcial, editável) vs Pagamento Quitado (trava no saldo total) */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-secondary/60">
            <button
              type="button"
              onClick={() => handleSelectMode('entrada')}
              className={cn(
                'h-7 rounded-md text-[10px] font-black uppercase tracking-wider transition-colors',
                paymentMode === 'entrada'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Entrada
            </button>
            <button
              type="button"
              onClick={() => handleSelectMode('quitado')}
              className={cn(
                'h-7 rounded-md text-[10px] font-black uppercase tracking-wider transition-colors',
                paymentMode === 'quitado'
                  ? 'bg-green-500 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Quitar tudo
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 py-2 border-b border-dashed border-neutral-200 dark:border-neutral-800">
            <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground shrink-0">
              <DollarSign className="w-3.5 h-3.5 text-[#00ac56]" /> Valor
            </label>
            <div className={cn(
              'flex items-center gap-1 h-8 px-2.5 rounded-lg border border-neutral-300 dark:border-neutral-800',
              paymentMode === 'quitado' ? 'bg-secondary/50' : 'bg-card'
            )}>
              <span className="text-xs font-bold text-muted-foreground">R$</span>
              <input
                type="text"
                inputMode="decimal"
                autoFocus={paymentMode === 'entrada'}
                disabled={paymentMode === 'quitado'}
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0,00"
                className="w-20 bg-transparent text-right font-mono text-sm font-black outline-none text-foreground disabled:cursor-not-allowed disabled:opacity-70"
              />
            </div>
          </div>

          {paymentMode === 'entrada' && parsedAmount > 0 && (
            <div className="flex items-center justify-end gap-1.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 -mt-1.5">
              <span className="uppercase tracking-wider">Restante Após Entrada</span>
              <span className="font-mono">{formatBRL(afterEntryBalance)}</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 py-2 border-b border-dashed border-neutral-200 dark:border-neutral-800">
            <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground shrink-0">
              <CalendarIcon className="w-3.5 h-3.5 text-[#00ac56]" /> Data
            </label>
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="w-[132px] shrink-0">
                <DatePicker
                  value={date}
                  onChange={(dateStr) => setDate(dateStr)}
                  align="right"
                  className="h-8 rounded-lg text-xs font-bold bg-card border-neutral-300 dark:border-neutral-800 px-2 pr-8"
                />
              </div>
              <button
                type="button"
                onClick={() => setDate(getTodayDateString())}
                className="h-8 px-1.5 rounded-lg border border-neutral-300 dark:border-neutral-800 text-[9px] font-black uppercase tracking-wide text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors shrink-0"
              >
                Hoje
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 py-2 border-b border-dashed border-neutral-200 dark:border-neutral-800">
            <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground shrink-0">
              <CreditCard className="w-3.5 h-3.5 text-[#00ac56]" /> Forma de pagamento
            </label>
            <Select value={method} onValueChange={(val) => setMethod(val as PaymentMethodType | null)}>
              <SelectTrigger className="h-8 w-[140px] rounded-lg text-xs font-bold bg-card border-neutral-300 dark:border-neutral-800 justify-between gap-1.5">
                <SelectValue placeholder="Selecione">
                  {(val: PaymentMethodType | null) => val ? (
                    <span className="flex items-center gap-1.5">
                      {methodIcons[val]} {methodLabels[val]}
                    </span>
                  ) : (
                    <span className="text-muted-foreground normal-case font-semibold">Selecione</span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="z-[9999] bg-white dark:bg-[#0A0A0C] border border-neutral-300 dark:border-neutral-800 rounded-lg shadow-2xl">
                {(['pix', 'dinheiro', 'debito', 'credito'] as PaymentMethodType[]).map(key => (
                  <SelectItem key={key} value={key}>
                    <span className="flex items-center gap-2">
                      {methodIcons[key]} {methodLabels[key]}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {method === 'credito' && (
            <div className="flex items-center justify-between gap-3 py-2 border-b border-dashed border-neutral-200 dark:border-neutral-800 animate-in fade-in duration-200">
              <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground shrink-0">
                Parcelas
              </label>
              <Select value={installment} onValueChange={(val) => val && setInstallment(val)}>
                <SelectTrigger className="h-8 w-[140px] rounded-lg text-xs font-bold bg-card border-neutral-300 dark:border-neutral-800 justify-between gap-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[9999] bg-white dark:bg-[#0A0A0C] border border-neutral-300 dark:border-neutral-800 rounded-lg shadow-2xl">
                  {['À vista', '2x', '3x', '4x', '5x', '6x', '7x', '8x', '9x', '10x', '11x', '12x'].map(opt => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {method === 'pix' && (
            <div className="space-y-1.5 pt-1 animate-in fade-in duration-200">
              <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                <User className="w-3.5 h-3.5 text-[#00ac56]" /> Pago por
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={payer}
                  onChange={e => setPayer(e.target.value.toUpperCase())}
                  placeholder="NOME"
                  className="flex-1 h-8 px-2.5 rounded-lg border border-neutral-300 dark:border-neutral-800 bg-card text-xs font-semibold uppercase outline-none focus:border-[#00ac56] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setPayer((clientName || 'CLIENTE').toUpperCase())}
                  className="h-8 px-2.5 rounded-lg border border-neutral-300 dark:border-neutral-800 text-[9px] font-black uppercase tracking-wide text-muted-foreground hover:bg-secondary transition-colors shrink-0"
                >
                  Usar Cliente
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 p-4 border-t border-neutral-300 dark:border-neutral-800 bg-secondary/20">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => onOpenChange(false)}
            className="flex-1 h-9 rounded-lg font-black text-[10px] uppercase tracking-wider"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={busy}
            onClick={handleSubmit}
            className="solid-btn flex-1 h-9 rounded-lg font-bold text-sm gap-1.5"
          >
            <Check className="w-4 h-4" />
            {mode === 'edit' ? 'Salvar alterações' : willQuitar ? 'Quitar O.S.' : 'Lançar entrada'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ═══════════════════════════════════════════════
// MAIN COMPONENT: ResumoFinanceiro
// ═══════════════════════════════════════════════

export const ResumoFinanceiro: React.FC<ResumoFinanceiroProps> = ({
  subtotal,
  desconto = 0,
  onDescontoChange,
  clientName = '',
  initialStatus = 'nao_pago',
  entries,
  context = 'individual',
  onConfirmPago,
  onAddEntrada,
  onUpdateEntrada,
  onDeleteEntrada,
  onStatusChange,
  isSaving = false,
  className = '',
}) => {
  // Status State
  const [status, setStatus] = useState<PaymentStatusType>(normalizeStatus(initialStatus));

  // "Pago" View State (unselected by default unless already persisted)
  const [pagoMethod, setPagoMethod] = useState<PaymentMethodType | null>(() => {
    if (entries.length > 0 && entries[0]?.method && normalizeStatus(initialStatus) === 'pago') {
      return normalizeMethodValue(entries[0].method).methodKey;
    }
    return null;
  });
  const [pagoInstallment, setPagoInstallment] = useState<string>(() => {
    if (entries.length > 0 && entries[0]?.method) {
      return normalizeMethodValue(entries[0].method).installments || 'À vista';
    }
    return 'À vista';
  });
  const [pagoClientName, setPagoClientName] = useState<string>(() => {
    if (entries.length > 0 && entries[0]?.payer) {
      return entries[0].payer;
    }
    return '';
  });
  const [pagoDate, setPagoDate] = useState<string>(() => {
    if (entries.length > 0 && entries[0]?.date) {
      return entries[0].date;
    }
    return '';
  });
  const [isPagoConfirmed, setIsPagoConfirmed] = useState<boolean>(() => {
    return normalizeStatus(initialStatus) === 'pago' && entries.length > 0 && !!entries[0]?.method;
  });

  // "Desconto" Input State
  const [descontoInput, setDescontoInput] = useState<string>(() => {
    return desconto ? desconto.toFixed(2).replace('.', ',') : '';
  });

  // "Entrada" View State — `entries` is a prop (owned by the parent); this component
  // holds no local copy of it, only the draft fields for the entry being added/edited.
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [entradaVal, setEntradaVal] = useState<string>('');
  const [entradaDate, setEntradaDate] = useState<string>(getTodayDateString());
  const [entradaMethod, setEntradaMethod] = useState<PaymentMethodType | null>(null);
  const [entradaInstallment, setEntradaInstallment] = useState<string>('À vista');
  const [entradaClientName, setEntradaClientName] = useState<string>('');
  const [isFinalizeMode, setIsFinalizeMode] = useState<boolean>(false);

  const entradaValInputRef = useRef<HTMLInputElement>(null);

  // Sync desconto prop
  useEffect(() => {
    if (desconto !== undefined) {
      const currentParsed = parseFloat(descontoInput.replace(/\./g, '').replace(',', '.')) || 0;
      if (Math.abs(currentParsed - desconto) > 0.001) {
        setDescontoInput(desconto > 0 ? desconto.toFixed(2).replace('.', ',') : '');
      }
    }
  }, [desconto]);

  // Sync initialStatus when prop changes
  useEffect(() => {
    const norm = normalizeStatus(initialStatus);
    setStatus(norm);
  }, [initialStatus]);

  // Prefill the "Pago" draft fields from the first persisted entry when the entries
  // prop actually changes (parent must keep it referentially stable — see prop docs above).
  // Also flips `isPagoConfirmed` to true here: this covers the case where the status
  // transitions to 'pago' *externally* (e.g. accumulated "entrada" lançamentos reach the
  // full total and the parent promotes paymentStatus to 'Pago'), which only updates the
  // `initialStatus`/`entries` props — the useState initializer for `isPagoConfirmed` only
  // runs once on mount, so without this it would keep showing the blank confirmation form
  // even though the order is already fully paid.
  useEffect(() => {
    if (entries.length > 0 && normalizeStatus(initialStatus) === 'pago') {
      const first = entries[0];
      if (first) {
        const norm = normalizeMethodValue(first.method);
        setPagoMethod(norm.methodKey);
        if (norm.installments) setPagoInstallment(norm.installments);
        if (first.payer) setPagoClientName(first.payer);
        if (first.date) setPagoDate(first.date);
        setIsPagoConfirmed(true);
      }
    }
  }, [entries, initialStatus]);

  // Auto-focus on entradaVal when entering 'entrada' status, adding, or editing an entry
  useEffect(() => {
    if (status === 'entrada') {
      const timer = setTimeout(() => {
        entradaValInputRef.current?.focus();
        entradaValInputRef.current?.select();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [status, editingIndex, isFinalizeMode]);

  // Calculated values
  const totalValue = Math.max(0, subtotal - (desconto || 0));

  const totalEntriesSum = useMemo(() => {
    return entries.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  }, [entries]);

  const currentTypedVal = parseFloat(entradaVal.replace(/\./g, '').replace(',', '.')) || 0;
  const remainingValue = Math.max(0, totalValue - totalEntriesSum);
  const dynamicRemainingWithInput = Math.max(0, totalValue - (totalEntriesSum + currentTypedVal));
  const is100Quitado = remainingValue <= 0 && entries.length > 0;
  const isEntradaFormLocked = is100Quitado && editingIndex === null;

  // Header Subtitle Text
  const headerSubtitle = useMemo(() => {
    if (status === 'nao_pago') return 'RESUMO DE VALORES E PAGAMENTO';
    if (status === 'entrada') return 'MÉTODO DE ENTRADA';
    return 'CÁLCULO DE VALORES';
  }, [status]);

  // Desconto handlers
  const handleDescontoInputChange = (val: string) => {
    setDescontoInput(val);
    const parsed = parseFloat(val.replace(/\./g, '').replace(',', '.')) || 0;
    if (onDescontoChange) {
      onDescontoChange(parsed);
    }
  };

  const handleDescontoBlur = () => {
    const parsed = parseFloat(descontoInput.replace(/\./g, '').replace(',', '.')) || 0;
    setDescontoInput(parsed > 0 ? parsed.toFixed(2).replace('.', ',') : '');
  };

  // Status Change Handler
  const handleStatusChange = (newStatus: PaymentStatusType) => {
    setStatus(newStatus);
    if (onStatusChange) onStatusChange(newStatus);

    if (newStatus === 'nao_pago') {
      toast.info('Status alterado para: NÃO PAGO');
    } else if (newStatus === 'entrada') {
      toast.info('Status alterado para: ENTRADA');
    } else if (newStatus === 'pago') {
      toast.info('Status alterado para: PAGO');
      setIsPagoConfirmed(false);
      setPagoMethod(null);
      setPagoClientName('');
      setPagoDate('');
    }
  };

  // Switch to finalize mode (filling the remaining balance)
  const handleSwitchToFinalizeMode = () => {
    if (remainingValue <= 0) {
      toast.success('Pagamento já quitado 100%!');
      return;
    }
    setIsFinalizeMode(true);
    setEditingIndex(null);
    setEntradaVal(remainingValue.toFixed(2).replace('.', ','));
    toast.success(`Modo finalização ativado! Valor restante de ${formatBRL(remainingValue)} preenchido.`);
  };

  // Reset right form to clean standard mode
  const handleResetRightForm = () => {
    setIsFinalizeMode(false);
    setEditingIndex(null);
    setEntradaVal('');
    setEntradaMethod(null);
    setEntradaInstallment('À vista');
    setEntradaClientName('');
  };

  // Add / Save Entry Handler
  const handleRightFormSubmit = async () => {
    const val = parseFloat(entradaVal.replace(/\./g, '').replace(',', '.')) || 0;
    if (val <= 0) {
      toast.error('Por favor, digite um valor de entrada maior que R$ 0,00!');
      return;
    }

    // Validation: cannot exceed remaining amount (when not editing the same item)
    const currentItemVal = editingIndex !== null ? (entries[editingIndex]?.amount || 0) : 0;
    const maxAllowed = remainingValue + currentItemVal;

    if (val > maxAllowed + 0.009) {
      toast.error(`O valor digitado (${formatBRL(val)}) excede o saldo restante (${formatBRL(maxAllowed)})!`);
      return;
    }

    if (!entradaMethod) {
      toast.error('Por favor, selecione a forma de pagamento!');
      return;
    }

    const methodMap = {
      pix: 'PIX',
      dinheiro: 'Dinheiro',
      debito: 'Débito',
      credito: entradaInstallment ? `Crédito ${entradaInstallment}` : 'Crédito',
    };
    const methodLabel = methodMap[entradaMethod] || entradaMethod.toUpperCase();

    const newEntry: PaymentEntryItem = {
      id: editingIndex !== null ? entries[editingIndex]?.id : undefined,
      amount: val,
      method: methodLabel,
      installments: entradaMethod === 'credito' ? entradaInstallment : undefined,
      date: entradaDate || getTodayDateString(),
      payer: entradaMethod === 'pix' ? (entradaClientName.trim() || clientName || 'CLIENTE') : undefined,
    };

    if (editingIndex !== null) {
      // Update
      const targetId = entries[editingIndex]?.id || '';
      if (onUpdateEntrada && targetId) {
        await onUpdateEntrada(targetId, newEntry);
      }
      toast.success('Lançamento atualizado com sucesso!');
    } else {
      // Add
      const nextNum = entries.length + 1;
      if (onAddEntrada) {
        await onAddEntrada(newEntry);
      }
      toast.success(`LANÇAMENTO ${String(nextNum).padStart(2, '0')} registrado com sucesso!`);
    }

    handleResetRightForm();
  };

  // Edit Entry Card Click
  const handleEditEntry = (index: number) => {
    const target = entries[index];
    if (!target) return;

    setEditingIndex(index);
    setIsFinalizeMode(false);
    setEntradaVal(target.amount.toFixed(2).replace('.', ','));
    setEntradaDate(target.date || getTodayDateString());

    const { methodKey, installments } = normalizeMethodValue(target.method);
    setEntradaMethod(methodKey);
    if (installments) setEntradaInstallment(installments);
    setEntradaClientName(target.payer || '');

    toast.info(`Modo de edição ativado para o LANÇAMENTO ${String(index + 1).padStart(2, '0')}.`);
  };

  // Delete Entry Card Click
  const handleDeleteEntry = async (index: number) => {
    const target = entries[index];
    const targetId = target?.id || '';

    if (editingIndex === index) {
      handleResetRightForm();
    } else if (editingIndex !== null && editingIndex > index) {
      setEditingIndex(editingIndex - 1);
    }

    if (onDeleteEntrada) {
      await onDeleteEntrada(targetId, index);
    }
    toast.success('Lançamento removido!');
  };

  // Confirm Full Pago Payment
  const handleConfirmPago = async () => {
    if (!pagoMethod) {
      toast.error('Por favor, selecione a forma de pagamento!');
      return;
    }

    const methodMap = {
      pix: 'PIX',
      dinheiro: 'Dinheiro',
      debito: 'Débito',
      credito: pagoInstallment ? `Crédito ${pagoInstallment}` : 'Crédito',
    };
    const methodLabel = methodMap[pagoMethod] || pagoMethod.toUpperCase();

    const data: PagoConfirmationData = {
      method: methodLabel,
      installments: pagoMethod === 'credito' ? pagoInstallment : undefined,
      date: pagoDate || getTodayDateString(),
      payer: pagoMethod === 'pix' ? (pagoClientName.trim() || clientName || 'CLIENTE') : undefined,
      amount: totalValue,
    };

    if (onConfirmPago) {
      await onConfirmPago(data);
    }

    setIsPagoConfirmed(true);
    toast.success('Pagamento confirmado com sucesso!');
  };

  return (
    <div className={`financial-card ${className}`}>
      {/* ── CARD HEADER ── */}
      <header className="card-header-rf">
        <div className="header-left-rf">
          <div className="icon-badge-rf">
            <Calculator size={18} />
          </div>
          <div className="header-title-group-rf">
            <h1 className="header-title-rf">RESUMO FINANCEIRO</h1>
            <span className="header-subtitle-rf">{headerSubtitle}</span>
          </div>
        </div>
      </header>

      <div className="header-divider-rf" />

      {/* ── TOP HORIZONTAL SUMMARY BAR (4 COLUMNS) ── */}
      <div className="horizontal-summary-bar-rf">
        {/* Col 1: SUBTOTAL */}
        <div className="summary-col-rf">
          <div className="summary-col-header-rf">
            <span className="summary-col-title-rf">SUBTOTAL</span>
            <span className="summary-col-subtitle-rf">SERVIÇOS BRUTOS</span>
          </div>
          <div className="summary-box-filled-rf font-mono">
            <span>{formatBRL(subtotal)}</span>
          </div>
        </div>

        {/* Col 2: DESCONTO */}
        <div className="summary-col-rf">
          <div className="summary-col-header-rf">
            <span className="summary-col-title-rf">DESCONTO</span>
          </div>
          <div className="summary-box-outlined-rf font-mono flex items-center px-3">
            <span className="text-xs font-bold text-[#64748b] dark:text-[#a1a1aa] mr-1">R$</span>
            <input
              type="text"
              inputMode="decimal"
              value={descontoInput}
              onChange={e => handleDescontoInputChange(e.target.value)}
              onBlur={handleDescontoBlur}
              placeholder="0,00"
              className="w-full bg-transparent border-none outline-none font-mono text-sm font-bold text-left text-[#0f172a] dark:text-[#f4f4f5]"
            />
          </div>
        </div>

        {/* Col 3: STATUS PAGAMENTO */}
        <div className="summary-col-rf">
          <div className="summary-col-header-rf">
            <span className="summary-col-title-rf">STATUS PAGAMENTO</span>
          </div>
          <div className="status-select-wrapper-rf">
            <select
              value={status}
              onChange={e => handleStatusChange(e.target.value as PaymentStatusType)}
            >
              <option value="nao_pago">Não Pago</option>
              <option value="entrada">Entrada</option>
              <option value="pago">Pago</option>
            </select>
            <ChevronDown className="status-select-icon-rf" />
          </div>
        </div>

        {/* Col 4: VALOR TOTAL FINAL */}
        <div className="summary-col-rf summary-col-total-rf">
          <div className="summary-col-header-rf">
            <span className="summary-col-title-rf">
              {status === 'entrada' ? 'VALOR TOTAL A RECEBER' : 'VALOR TOTAL FINAL'}
            </span>
          </div>
          <div className="summary-total-green-box-rf">
            <span className="total-green-val-rf font-mono">{formatBRL(totalValue)}</span>
          </div>
        </div>
      </div>

      {/* ── DYNAMIC CONTENT AREA BELOW SUMMARY BAR ── */}
      {status !== 'nao_pago' && (
        <div className="payment-content-area-rf animate-in fade-in duration-300">
          <div className="summary-bottom-divider-rf" />

          {/* ═══════════════════════════════════════════════
              VIEW: STATUS = PAGO (PAGAMENTO INTEGRAL)
              Only used for a single lump payment. When "pago" was reached via multiple
              accumulated "entrada" lançamentos, the entrada view below renders instead
              (with its "Pagamento já quitado" locked panel) so each lançamento stays visible.
              ═══════════════════════════════════════════════ */}
          {status === 'pago' && entries.length <= 1 && (
            <div className="status-view-rf">
              {!isPagoConfirmed ? (
                /* FORM CONTAINER */
                <div className="animate-in fade-in duration-200">
                  <div className="payment-section-box-rf mb-3">
                    <label className="field-label-sm-rf mb-2 block">
                      Selecione a forma de pagamento
                    </label>
                    <PaymentMethodsGrid
                      selectedMethod={pagoMethod}
                      onSelectMethod={m => setPagoMethod(m)}
                      creditoSubtitle={pagoMethod === 'credito' ? pagoInstallment : 'Até 12x'}
                    />

                    {pagoMethod === 'credito' && (
                      <InstallmentsBox
                        selectedInstallment={pagoInstallment}
                        onSelectInstallment={inst => setPagoInstallment(inst)}
                      />
                    )}
                  </div>

                  {/* Inputs Area */}
                  <div className="form-inputs-group-rf">
                    <div className={pagoMethod === 'pix' ? 'form-row-rf' : 'flex justify-start'}>
                      {pagoMethod === 'pix' && (
                        <div className="input-field-wrapper-rf">
                          <label className="field-label-rf">
                            <User size={14} className="label-icon-rf" /> PAGO POR
                          </label>
                          <input
                            type="text"
                            value={pagoClientName}
                            onChange={e => setPagoClientName(e.target.value.toUpperCase())}
                            placeholder="NOME"
                            className="h-[42px] px-3.5 rounded-xl border border-[#e2e8f0] dark:border-[#27272a] bg-white dark:bg-[#18181b] text-sm font-semibold uppercase outline-none focus:border-[#00ac56] focus:ring-2 focus:ring-[#00ac56]/20 transition-all"
                          />
                        </div>
                      )}

                      <div className="input-field-wrapper-rf">
                        <label className="field-label-rf">
                          <CalendarIcon size={14} className="label-icon-rf" /> DATA
                        </label>
                        <div className="flex items-center gap-2">
                          <div className="w-[170px] shrink-0">
                            <DatePicker
                              value={pagoDate}
                              onChange={(dateStr) => setPagoDate(dateStr)}
                              align="right"
                              className="h-[42px] rounded-xl border-[#e2e8f0] dark:border-[#27272a] bg-white dark:bg-[#18181b] text-sm font-bold"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => setPagoDate(getTodayDateString())}
                            className="h-[42px] px-3.5 rounded-xl border border-[#e2e8f0] dark:border-[#27272a] bg-white dark:bg-[#18181b] text-xs font-black uppercase tracking-wide text-[#64748b] dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors shrink-0"
                          >
                            Hoje
                          </button>
                        </div>
                      </div>
                    </div>

                    {pagoMethod === 'pix' && (
                      <button
                        type="button"
                        className="btn-action-grey-rf"
                        onClick={() => {
                          const name = clientName || 'CLIENTE';
                          setPagoClientName(name.toUpperCase());
                          toast.success(`Nome do cliente inserido: ${name.toUpperCase()}`);
                        }}
                      >
                        <User size={16} /> USAR NOME DO CLIENTE
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={isSaving}
                      className="btn-confirm-green-rf"
                      onClick={handleConfirmPago}
                    >
                      <CheckCircle2 size={18} /> CONFIRMAR PAGAMENTO
                    </button>
                  </div>
                </div>
              ) : (
                /* CONFIRMED VIEW */
                <div className="@container animate-in fade-in duration-300 w-full max-w-md mx-auto border border-neutral-200 dark:border-neutral-800 rounded-2xl bg-card overflow-hidden">
                  <div className="flex justify-end p-2 border-b border-neutral-200 dark:border-neutral-800">
                    <button
                      type="button"
                      onClick={() => setIsPagoConfirmed(false)}
                      className="h-6 px-2 rounded-full border border-neutral-300 dark:border-neutral-800 bg-card text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-1"
                    >
                      <Pencil className="w-3 h-3" />
                      <span className="text-[9px] font-black uppercase tracking-wide">Editar Pagamento</span>
                    </button>
                  </div>

                  <div className="flex flex-col @sm:flex-row">
                    {/* Left: success illustration */}
                    <div className="flex flex-col items-center justify-center text-center gap-1.5 p-4 @sm:w-[150px] @sm:shrink-0 border-b @sm:border-b-0 @sm:border-r border-neutral-200 dark:border-neutral-800">
                      <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                        <div className="w-9 h-9 rounded-full bg-[#00ac56] flex items-center justify-center">
                          <Check className="w-4 h-4 text-white stroke-[3]" />
                        </div>
                      </div>
                      <h4 className="text-xs font-black text-foreground">Pagamento concluído!</h4>
                    </div>

                    {/* Right: field list */}
                    <div className="flex-1 px-4 @sm:pr-8 divide-y divide-neutral-200 dark:divide-neutral-800 min-w-0">
                      <div className="flex items-center gap-2.5 py-2.5">
                        <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0">
                          <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                        <span className="text-[11px] text-muted-foreground flex-1 min-w-0">Valor total pago</span>
                        <span className="text-sm font-black font-mono text-foreground shrink-0">{formatBRL(totalValue)}</span>
                      </div>
                      <div className="flex items-center gap-2.5 py-2.5">
                        <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0">
                          <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                        <span className="text-[11px] text-muted-foreground flex-1 min-w-0">Data do pagamento</span>
                        <span className="text-xs font-black text-foreground shrink-0">{formatDateDisplay(pagoDate)}</span>
                      </div>
                      <div className="flex items-center gap-2.5 py-2.5">
                        <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0">
                          <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                        <span className="text-[11px] text-muted-foreground flex-1 min-w-0">Forma de pagamento</span>
                        <span className="text-xs font-black text-foreground shrink-0">
                          {pagoMethod === 'pix' ? 'PIX' : pagoMethod === 'dinheiro' ? 'Dinheiro' : pagoMethod === 'debito' ? 'Débito' : `Crédito (${pagoInstallment})`}
                        </span>
                      </div>
                      {pagoMethod === 'pix' && pagoClientName && (
                        <div className="flex items-center gap-2.5 py-2.5">
                          <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0">
                            <User className="w-3.5 h-3.5 text-muted-foreground" />
                          </div>
                          <span className="text-[11px] text-muted-foreground flex-1 min-w-0">Nome do pagador</span>
                          <span className="text-xs font-black text-foreground truncate max-w-[45%]">{pagoClientName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════
              VIEW: STATUS = ENTRADA (2-COLUMN ENTRADA FLOW)
              Also used for status "pago" once it was reached via 2+ accumulated lançamentos,
              so those stay visible as individual styled cards instead of collapsing into a
              single summary. See is100Quitado / isEntradaFormLocked below for the locked state.
              ═══════════════════════════════════════════════ */}
          {(status === 'entrada' || (status === 'pago' && entries.length > 1)) && (
            <div className="entrada-grid-flow-rf">
              {/* ── LEFT COLUMN: CONFIRMED ENTRIES + REMAINING ACTION ── */}
              <div className="entrada-left-col-rf">
                {/* List of Entry Cards */}
                <div className="entries-cards-list-rf">
                  {entries.map((entry, index) => {
                    const numFormatted = String(index + 1).padStart(2, '0');
                    const isPix = entry.method.toUpperCase().includes('PIX');
                    return (
                      <div key={entry.id || index} className="lancamento-card-rf shadow-xs">
                        <div className="lancamento-header-rf">
                          <div className="lancamento-title-rf">
                            <span className="text-black dark:text-white text-[9px]">●</span>
                            <span>LANÇAMENTO {numFormatted}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="badge-entrada-rf">ENTRADA</span>
                            <button
                              type="button"
                              className="btn-edit-card-rf"
                              title="Editar Lançamento"
                              onClick={() => handleEditEntry(index)}
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              type="button"
                              className="btn-delete-card-rf"
                              title="Remover Lançamento"
                              onClick={() => handleDeleteEntry(index)}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        <div className="lancamento-info-row-rf">
                          <span className="field-label-sm-rf">
                            <span className="text-[#64748b] font-extrabold mr-0.5">$</span> VALOR DA ENTRADA
                          </span>
                          <strong className="info-val-rf font-mono">{formatBRL(entry.amount)}</strong>
                        </div>

                        <div className="lancamento-info-row-rf">
                          <span className="field-label-sm-rf flex items-center gap-1">
                            <CalendarIcon size={12} className="text-[#00ac56]" /> DATA
                          </span>
                          <span className="info-text-rf">{formatDateDisplay(entry.date)}</span>
                        </div>

                        <div className="lancamento-info-row-rf">
                          <span className="field-label-sm-rf flex items-center gap-1">
                            <CreditCard size={12} className="text-[#00ac56]" /> FORMA DE PAGTO
                          </span>
                          <span className="info-text-rf">{entry.method}</span>
                        </div>

                        {isPix && entry.payer && (
                          <div className="lancamento-info-row-rf">
                            <span className="field-label-sm-rf flex items-center gap-1">
                              <User size={12} className="text-[#00ac56]" /> PAGO POR
                            </span>
                            <span className="info-text-rf">{entry.payer}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Dashed "ADICIONAR NOVA ENTRADA +" Card */}
                {!is100Quitado && (
                  <div
                    className="add-entry-card-dashed-rf"
                    onClick={() => handleResetRightForm()}
                  >
                    <span className="add-entry-text-rf">ADICIONAR NOVA ENTRADA</span>
                    <div className="add-entry-plus-rf">+</div>
                  </div>
                )}

                {/* Remaining Value Banner & Finalize Button */}
                {!is100Quitado && remainingValue > 0 && (
                  <div className="entrada-left-actions-rf">
                    <div
                      className="remaining-value-banner-rf"
                      onClick={handleSwitchToFinalizeMode}
                      title="Clique para preencher o saldo restante no formulário"
                    >
                      <span>VALOR RESTANTE</span>
                      <strong className="orange-text-rf font-mono">{formatBRL(remainingValue)}</strong>
                    </div>

                    <button
                      type="button"
                      className="btn-finalizar-left-rf"
                      onClick={handleSwitchToFinalizeMode}
                    >
                      <Check size={16} /> FINALIZAR O PAG.
                    </button>
                  </div>
                )}

              </div>

              {/* ── RIGHT COLUMN: FORM TO CREATE / EDIT ENTRY ── */}
              <div className="entrada-right-col-rf payment-section-box-rf">
                {isEntradaFormLocked ? (
                  <div className="flex flex-col items-center justify-center text-center gap-2 py-10 px-4">
                    <div className="w-11 h-11 rounded-full bg-[#00ac56]/10 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-[#00ac56]" />
                    </div>
                    <p className="text-xs font-black uppercase tracking-wide text-foreground">Pagamento já quitado</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed max-w-[220px]">
                      Para lançar um novo valor, edite ou remova um dos lançamentos ao lado.
                    </p>
                  </div>
                ) : (
                <>
                {/* Inputs Row: Valor & Data */}
                <div className="grid grid-cols-[1fr_170px] gap-3 items-end">
                  <div className="input-field-wrapper-rf">
                    <label className="field-label-sm-rf">
                      <span className="text-[#64748b] font-extrabold mr-0.5">$</span>{' '}
                      {isFinalizeMode ? 'VALOR RESTANTE' : editingIndex !== null ? 'EDITAR ENTRADA' : 'VALOR DA ENTRADA'}
                    </label>
                    <div className="flex items-center gap-1.5 h-[42px] px-3.5 rounded-xl border border-[#e2e8f0] dark:border-[#27272a] bg-white dark:bg-[#18181b] focus-within:border-[#00ac56] focus-within:ring-2 focus-within:ring-[#00ac56]/20 transition-all">
                      <span className="text-xs font-bold text-[#64748b] shrink-0">R$</span>
                      <input
                        ref={entradaValInputRef}
                        type="text"
                        value={entradaVal}
                        onChange={e => setEntradaVal(e.target.value)}
                        placeholder="0,00"
                        className="w-full bg-transparent border-none outline-none font-mono text-sm font-bold text-right text-[#0f172a] dark:text-[#f4f4f5]"
                      />
                    </div>
                  </div>

                  <div className="input-field-wrapper-rf">
                    <label className="field-label-sm-rf flex items-center gap-1">
                      <CalendarIcon size={12} className="text-[#00ac56]" /> DATA
                    </label>
                    <DatePicker
                      value={entradaDate}
                      onChange={(dateStr) => setEntradaDate(dateStr)}
                      align="right"
                      className="h-[42px] rounded-xl border-[#e2e8f0] dark:border-[#27272a] bg-white dark:bg-[#18181b] text-xs font-bold"
                    />
                  </div>
                </div>

                {/* Subtitle */}
                <label className="field-label-sm-rf -mb-1 block">
                  Selecione a forma de pagamento
                </label>

                {/* 2x2 Payment Method Grid */}
                <PaymentMethodsGrid
                  selectedMethod={entradaMethod}
                  onSelectMethod={m => setEntradaMethod(m)}
                  creditoSubtitle={entradaMethod === 'credito' ? entradaInstallment : 'Até 12x'}
                  is2x2={true}
                />

                {/* Installments Box */}
                {entradaMethod === 'credito' && (
                  <InstallmentsBox
                    selectedInstallment={entradaInstallment}
                    onSelectInstallment={inst => setEntradaInstallment(inst)}
                  />
                )}

                {/* Pago por input (PIX) */}
                {entradaMethod === 'pix' && (
                  <div className="space-y-2 animate-in fade-in duration-200">
                    <div className="input-field-wrapper-rf">
                      <label className="field-label-sm-rf flex items-center gap-1">
                        <User size={12} className="text-[#00ac56]" /> PAGO POR
                      </label>
                      <input
                        type="text"
                        value={entradaClientName}
                        onChange={e => setEntradaClientName(e.target.value.toUpperCase())}
                        placeholder="NOME"
                        className="h-[38px] px-3 rounded-xl border border-[#e2e8f0] dark:border-[#27272a] bg-white dark:bg-[#18181b] text-xs font-semibold uppercase outline-none focus:border-[#00ac56] focus:ring-2 focus:ring-[#00ac56]/20 transition-all"
                      />
                    </div>

                    <button
                      type="button"
                      className="btn-action-grey-rf !h-[34px] !text-[10px]"
                      onClick={() => {
                        const name = clientName || 'CLIENTE';
                        setEntradaClientName(name.toUpperCase());
                        toast.success(`Nome do cliente inserido: ${name.toUpperCase()}`);
                      }}
                    >
                      <User size={14} /> USAR NOME DO CLIENTE
                    </button>
                  </div>
                )}

                {/* Action Button: Dynamic Transformation */}
                {(() => {
                  const isQuitandoAgora = dynamicRemainingWithInput <= 0 && (entries.length > 0 || currentTypedVal > 0);
                  const isButtonGreen = isQuitandoAgora || isFinalizeMode;

                  const submitButton = (
                    <button
                      type="button"
                      disabled={isSaving}
                      className={isButtonGreen ? 'btn-confirm-green-rf' : 'btn-add-entrada-action-rf'}
                      onClick={handleRightFormSubmit}
                    >
                      {editingIndex !== null ? (
                        <>
                          <Check size={16} /> SALVAR ALTERAÇÕES
                        </>
                      ) : isQuitandoAgora ? (
                        <>
                          <CheckCircle2 size={16} /> QUITADO 100%
                        </>
                      ) : isFinalizeMode ? (
                        <>
                          <Check size={16} /> CONFIRMAR PAGAMENTO
                        </>
                      ) : (
                        <>
                          <Plus size={16} /> ADICIONAR ENTRADA
                        </>
                      )}
                    </button>
                  );

                  if (editingIndex !== null) {
                    return (
                      <div className="flex gap-2">
                        <div className="w-[120px] shrink-0">
                          <button
                            type="button"
                            disabled={isSaving}
                            className="btn-action-grey-rf"
                            onClick={handleResetRightForm}
                          >
                            <X size={16} /> CANCELAR
                          </button>
                        </div>
                        <div className="flex-1">{submitButton}</div>
                      </div>
                    );
                  }

                  return submitButton;
                })()}
                </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ResumoFinanceiro;
