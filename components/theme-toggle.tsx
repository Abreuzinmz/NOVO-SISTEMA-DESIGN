'use client';

import React from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ThemeToggle({ className, iconOnly }: { className?: string; iconOnly?: boolean }) {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className={cn(iconOnly ? "h-9 w-9 rounded-xl animate-pulse" : "h-9 w-full rounded-lg animate-pulse", "bg-secondary", className)} />
    );
  }

  const isDark = resolvedTheme === 'dark';

  const toggle = () => {
    document.documentElement.classList.add('theme-transition');
    setTheme(isDark ? 'light' : 'dark');
    setTimeout(() => document.documentElement.classList.remove('theme-transition'), 350);
  };

  return (
    <button
      onClick={toggle}
      className={cn(
        iconOnly
          ? "w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-150 cursor-pointer text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
          : "w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg transition-all duration-150 group text-xs font-semibold select-none text-muted-foreground hover:text-foreground hover:bg-secondary/40",
        className
      )}
      type="button"
    >
      <div className={iconOnly ? "relative w-4 h-4 flex items-center justify-center" : "flex items-center gap-3"}>
        <div className="relative w-4 h-4 flex items-center justify-center">
          <Sun
            className={cn(
              "w-4 h-4 stroke-[1.5] absolute transition-all duration-200",
              isDark ? "opacity-0 rotate-90 scale-0" : "opacity-100 rotate-0 scale-100 text-foreground"
            )}
          />
          <Moon
            className={cn(
              "w-4 h-4 stroke-[1.5] absolute transition-all duration-200",
              isDark ? "opacity-100 rotate-0 scale-100 text-foreground" : "opacity-0 -rotate-90 scale-0"
            )}
          />
        </div>
        {!iconOnly && <span>{isDark ? 'Modo Escuro' : 'Modo Claro'}</span>}
      </div>

      {/* Toggle pill */}
      {!iconOnly && (
        <div className={cn(
          "w-8 h-4.5 rounded-full relative transition-all duration-200 shrink-0",
          isDark ? "bg-accent" : "bg-secondary"
        )}>
          <div className={cn(
            "w-3.5 h-3.5 rounded-full absolute top-[2px] transition-all duration-200",
            isDark
              ? "left-[14px] bg-foreground"
              : "left-[2px] bg-foreground/60"
          )} />
        </div>
      )}
    </button>
  );
}
