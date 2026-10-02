import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatMotorDisplay(motorModel: string, displacement: string = ''): string {
  if (!motorModel) return '';
  
  const motorModels = motorModel.split(', ');
  const displacements = displacement ? displacement.split(', ') : [];

  const formatted = motorModels.map((m, idx) => {
    const cylindersMatch = m.match(/\((\d+)\s*(?:CIL|cil|Cil|Cilindros|cilindros)?\)/i);
    const cylinders = cylindersMatch ? `${cylindersMatch[1]} CIL` : '';
    const model = m.replace(/\s*\(.*\)/, '').trim().toUpperCase();
    const disp = displacements[idx]?.trim() || '';

    let res = model;
    if (disp) {
      res += ` • ${disp}`;
    }
    if (cylinders) {
      res += ` • ${cylinders}`;
    }
    return res;
  });

  return formatted.join(', ');
}

export function formatMotorModelAndCylinders(motorModel: string): string {
  if (!motorModel) return '';
  
  const motorModels = motorModel.split(', ');
  
  const formatted = motorModels.map((m) => {
    const cylindersMatch = m.match(/\((\d+)\s*(?:CIL|cil|Cil|Cilindros|cilindros)?\)/i);
    const cylinders = cylindersMatch ? `${cylindersMatch[1]} CIL` : '';
    const model = m.replace(/\s*\(.*\)/, '').trim().toUpperCase();

    if (cylinders) {
      return `${model} • ${cylinders}`;
    }
    return model;
  });

  return formatted.join(', ');
}

export function getLocalDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getOrderNetValue(o: any): number {
  if (!o) return 0;
  const total = Number(o.totalValue || 0);
  const discount = Number(o.discount || 0);
  if (discount > 0) {
    return Math.max(0, total - discount);
  }
  if (o.netValue !== undefined && o.netValue !== null && !isNaN(Number(o.netValue)) && Number(o.netValue) > 0) {
    return Number(o.netValue);
  }
  return Math.max(0, total - discount);
}
