'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  className,
}: PaginationProps) {
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      if (start > 2) pages.push('...');
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 1) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  const from = Math.min((currentPage - 1) * pageSize + 1, totalItems);
  const to = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className={cn('flex flex-col sm:flex-row items-center justify-between gap-4 py-4', className)}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="font-mono">
          {from}–{to} de {totalItems}
        </span>
        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="ml-2 rounded-lg border border-border px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/30 cursor-pointer bg-background text-foreground transition-colors"
          >
            {[10, 20, 50, 100].map((s) => (
              <option key={s} value={s}>{s} por pág.</option>
            ))}
          </select>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(1)}
          className="hidden sm:inline-flex hover:bg-secondary/40 text-muted-foreground disabled:opacity-20"
        >
          <ChevronsLeft className="w-4 h-4 stroke-[1.5]" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="hover:bg-secondary/40 text-muted-foreground disabled:opacity-20"
        >
          <ChevronLeft className="w-4 h-4 stroke-[1.5]" />
        </Button>

        {getPageNumbers().map((page, idx) =>
          typeof page === 'string' ? (
            <span key={'ellipsis-' + idx} className="px-1.5 text-xs text-muted-foreground/45">...</span>
          ) : (
            <Button
              key={page}
              variant={currentPage === page ? 'default' : 'ghost'}
              size="icon-sm"
              onClick={() => onPageChange(page)}
              className={cn(
                'min-w-[28px] h-7 text-xs font-bold rounded-lg transition-all',
                currentPage === page 
                  ? 'bg-foreground text-background hover:opacity-90 shadow-sm' 
                  : 'text-muted-foreground hover:bg-secondary/40 hover:text-foreground'
              )}
            >
              {page}
            </Button>
          )
        )}

        <Button
          variant="ghost"
          size="icon-sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="hover:bg-secondary/40 text-muted-foreground disabled:opacity-20"
        >
          <ChevronRight className="w-4 h-4 stroke-[1.5]" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(totalPages)}
          className="hidden sm:inline-flex hover:bg-secondary/40 text-muted-foreground disabled:opacity-20"
        >
          <ChevronsRight className="w-4 h-4 stroke-[1.5]" />
        </Button>
      </div>
    </div>
  );
}
