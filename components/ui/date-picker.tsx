"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { format, parseISO, isValid, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DatePickerProps {
  value?: string | Date; // Expected YYYY-MM-DD or Date
  onChange?: (dateString: string, dateObj?: Date) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  readOnly?: boolean;
  id?: string;
  name?: string;
  align?: "left" | "right" | "center";
  compact?: boolean;
}

export function DatePickerCard({
  selectedDate,
  onSelectDate,
  onCancel,
  onConfirm,
  compact = false,
}: {
  selectedDate?: Date | null;
  onSelectDate: (date: Date) => void;
  onCancel?: () => void;
  onConfirm?: (date?: Date | null) => void;
  compact?: boolean;
}) {
  const [currentMonth, setCurrentMonth] = React.useState<Date>(() => selectedDate || new Date());
  const [tempSelected, setTempSelected] = React.useState<Date | null>(selectedDate || null);

  React.useEffect(() => {
    if (selectedDate) {
      setTempSelected(selectedDate);
      setCurrentMonth(selectedDate);
    }
  }, [selectedDate]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday start
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentMonth((prev) => subMonths(prev, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentMonth((prev) => addMonths(prev, 1));
  };

  const handleDayClick = (day: Date, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setTempSelected(day);
    onSelectDate(day);
  };

  const handleConfirmClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onConfirm) {
      onConfirm(tempSelected);
    }
  };

  const handleCancelClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <div
      className={cn(
        "bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-2xl shadow-xl select-none font-sans text-slate-800 dark:text-zinc-100",
        compact ? "w-[220px] p-2" : "w-[270px] p-3"
      )}
    >
      {/* Header: Month / Year & Navigation */}
      <div className="flex items-center justify-between w-full mb-2 px-1">
        <button
          type="button"
          onClick={handlePrevMonth}
          className={cn(
            "flex items-center justify-center rounded-lg bg-slate-100 dark:bg-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-600 text-slate-700 dark:text-zinc-200 transition-colors cursor-pointer",
            compact ? "w-6 h-6" : "w-7 h-7"
          )}
          aria-label="Mês anterior"
        >
          <ChevronLeft className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>

        <span className={cn("font-bold text-slate-900 dark:text-zinc-100 capitalize", compact ? "text-xs" : "text-xs")}>
          {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
        </span>

        <button
          type="button"
          onClick={handleNextMonth}
          className={cn(
            "flex items-center justify-center rounded-lg bg-slate-100 dark:bg-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-600 text-slate-700 dark:text-zinc-200 transition-colors cursor-pointer",
            compact ? "w-6 h-6" : "w-7 h-7"
          )}
          aria-label="Próximo mês"
        >
          <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 text-center mb-1">
        {weekDays.map((day, idx) => (
          <div key={idx} className={cn("font-medium text-slate-400 dark:text-zinc-400", compact ? "text-xs py-0.5" : "text-xs py-1")}>
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {days.map((day, idx) => {
          const isSelectedDay = tempSelected ? isSameDay(day, tempSelected) : false;
          const isTodayDay = isToday(day);
          const isCurrentMonthDay = isSameMonth(day, currentMonth);

          return (
            <button
              key={idx}
              type="button"
              onClick={(e) => handleDayClick(day, e)}
              className={cn(
                "mx-auto flex items-center justify-center font-medium transition-all cursor-pointer rounded-lg",
                compact ? "h-6 w-6 text-xs" : "h-7 w-7 text-xs",
                // Selected Day styling (Solid blue rounded square)
                isSelectedDay && "bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700",
                // Today Day styling (marked ONLY with blue font, no weird border)
                !isSelectedDay && isTodayDay && "text-blue-600 dark:text-blue-400 font-bold bg-transparent hover:bg-blue-50 dark:hover:bg-blue-950/30",
                // Regular Day in current month
                !isSelectedDay && !isTodayDay && isCurrentMonthDay && "text-slate-800 dark:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-700",
                // Outside Month Day
                !isSelectedDay && !isCurrentMonthDay && "text-slate-300 dark:text-zinc-500 font-normal hover:bg-slate-50 dark:hover:bg-zinc-700/50"
              )}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>

      {/* Footer Actions */}
      <div className="border-t border-slate-100 dark:border-zinc-700/60 pt-2.5 mt-2.5 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleCancelClick}
          className={cn(
            "flex-1 font-semibold text-slate-700 dark:text-zinc-200 bg-white dark:bg-zinc-700 border border-slate-200 dark:border-zinc-600 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-600 transition-all cursor-pointer text-center",
            compact ? "py-1 px-2 text-xs" : "py-1.5 px-3 text-xs"
          )}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleConfirmClick}
          className={cn(
            "flex-1 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-sm cursor-pointer text-center",
            compact ? "py-1 px-2 text-xs" : "py-1.5 px-3 text-xs"
          )}
        >
          OK
        </button>
      </div>
    </div>
  );
}

export function DatePicker({
  value,
  onChange,
  placeholder,
  className,
  disabled = false,
  readOnly = false,
  id,
  name,
  align = "left",
  compact = false,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [popoverPos, setPopoverPos] = React.useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const valueStr = React.useMemo(() => {
    if (!value) return "";
    if (value instanceof Date) {
      return isValid(value) ? format(value, "yyyy-MM-dd") : "";
    }
    const p = parseISO(value);
    if (isValid(p)) return format(p, "yyyy-MM-dd");
    return typeof value === "string" ? value : "";
  }, [value]);

  const parsedDate = React.useMemo(() => {
    if (!valueStr) return null;
    const p = parseISO(valueStr);
    return isValid(p) ? p : null;
  }, [valueStr]);

  const containerRef = React.useRef<HTMLDivElement>(null);

  const updatePos = React.useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const popoverWidth = compact ? 220 : 270;
      let left = rect.left;
      if (align === "right") {
        left = rect.right - popoverWidth;
      } else if (align === "center") {
        left = rect.left + rect.width / 2 - popoverWidth / 2;
      }
      if (left < 10) left = 10;
      if (typeof window !== "undefined" && left + popoverWidth > window.innerWidth - 10) {
        left = window.innerWidth - popoverWidth - 10;
      }
      setPopoverPos({
        top: rect.bottom + 6,
        left: left,
      });
    }
  }, [align, compact]);

  React.useEffect(() => {
    if (isOpen) {
      updatePos();
      window.addEventListener("resize", updatePos);
      window.addEventListener("scroll", updatePos, true);
    }
    return () => {
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
    };
  }, [isOpen, updatePos]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        const popoverEl = document.getElementById("date-picker-popover-portal");
        if (popoverEl && popoverEl.contains(event.target as Node)) {
          return;
        }
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleSelectDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    if (onChange) {
      onChange(dateStr, date);
    }
  };

  const handleConfirm = (date?: Date | null) => {
    const finalDate = date || parsedDate;
    if (finalDate) {
      const dateStr = format(finalDate, "yyyy-MM-dd");
      if (onChange) {
        onChange(dateStr, finalDate);
      }
    }
    setIsOpen(false);
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  const handleNativeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (onChange) {
      if (val) {
        const p = parseISO(val);
        onChange(val, isValid(p) ? p : undefined);
      } else {
        onChange("");
      }
    }
  };

  return (
    <div ref={containerRef} className="relative inline-block w-full">
      <div className="relative flex items-center">
        <input
          type="date"
          id={id}
          name={name}
          readOnly={readOnly}
          disabled={disabled}
          value={valueStr}
          onChange={handleNativeChange}
          className={cn(
            "w-full h-10 px-3 pr-9 text-xs font-semibold rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed [color-scheme:light] dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-inner-spin-button]:hidden",
            className
          )}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled || readOnly}
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled && !readOnly) {
              setIsOpen(!isOpen);
            }
          }}
          className="absolute right-2 p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-md transition-colors text-blue-600 dark:text-blue-400 disabled:opacity-50 cursor-pointer z-10"
        >
          <CalendarIcon className="w-4 h-4 stroke-[2]" />
        </button>
      </div>

      {isOpen && mounted && popoverPos && createPortal(
        <div
          id="date-picker-popover-portal"
          style={{
            position: "fixed",
            top: `${popoverPos.top}px`,
            left: `${popoverPos.left}px`,
          }}
          className="z-[9999] shadow-2xl bg-white dark:bg-zinc-800 rounded-2xl border border-slate-200 dark:border-zinc-700 animate-in fade-in zoom-in-95 duration-150"
        >
          <DatePickerCard
            selectedDate={parsedDate}
            onSelectDate={handleSelectDate}
            onCancel={handleCancel}
            onConfirm={handleConfirm}
            compact={compact}
          />
        </div>,
        document.body
      )}
    </div>
  );
}

