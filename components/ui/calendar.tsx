"use client"

import * as React from "react"
import {
  DayPicker,
  getDefaultClassNames,
  type DayButton,
  type Locale,
} from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import { ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon } from "lucide-react"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  locale,
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"]
}) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "group/calendar bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 p-3 rounded-2xl shadow-xl select-none font-sans text-slate-800 dark:text-zinc-100 w-fit",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className
      )}
      captionLayout={captionLayout}
      locale={locale}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString(locale?.code, { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn(
          "relative flex flex-col gap-4 md:flex-row",
          defaultClassNames.months
        ),
        month: cn("flex w-full flex-col gap-2", defaultClassNames.month),
        nav: cn(
          "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1 z-10",
          defaultClassNames.nav
        ),
        button_previous: cn(
          "h-7 w-7 p-0 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-600 text-slate-700 dark:text-zinc-200 transition-colors cursor-pointer select-none aria-disabled:opacity-50",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          "h-7 w-7 p-0 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-600 text-slate-700 dark:text-zinc-200 transition-colors cursor-pointer select-none aria-disabled:opacity-50",
          defaultClassNames.button_next
        ),
        month_caption: cn(
          "flex h-7 w-full items-center justify-center px-7 text-xs font-bold text-slate-900 dark:text-zinc-100 capitalize",
          defaultClassNames.month_caption
        ),
        dropdowns: cn(
          "flex h-7 w-full items-center justify-center gap-1.5 text-xs font-semibold",
          defaultClassNames.dropdowns
        ),
        dropdown_root: cn(
          "relative rounded-lg",
          defaultClassNames.dropdown_root
        ),
        dropdown: cn(
          "absolute inset-0 bg-popover opacity-0",
          defaultClassNames.dropdown
        ),
        caption_label: cn(
          "font-bold text-slate-900 dark:text-zinc-100 select-none text-xs capitalize",
          defaultClassNames.caption_label
        ),
        weekdays: cn("flex text-center mb-1", defaultClassNames.weekdays),
        weekday: cn(
          "flex-1 text-xs font-medium text-slate-400 dark:text-zinc-400 py-0.5 select-none text-center",
          defaultClassNames.weekday
        ),
        week: cn("mt-1 flex w-full gap-1", defaultClassNames.week),
        day: cn(
          "group/day relative aspect-square h-7 w-7 rounded-lg p-0 text-center select-none flex items-center justify-center text-xs font-medium",
          defaultClassNames.day
        ),
        today: cn(
          "text-blue-600 dark:text-blue-400 font-bold bg-transparent border-0",
          defaultClassNames.today
        ),
        outside: cn(
          "text-slate-300 dark:text-zinc-500 font-normal aria-selected:text-white",
          defaultClassNames.outside
        ),
        disabled: cn(
          "text-slate-300 opacity-50 dark:text-zinc-600",
          defaultClassNames.disabled
        ),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return (
            <div
              data-slot="calendar"
              ref={rootRef}
              className={cn(className)}
              {...props}
            />
          )
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") {
            return (
              <ChevronLeftIcon className={cn("size-3.5 stroke-[2.5]", className)} {...props} />
            )
          }

          if (orientation === "right") {
            return (
              <ChevronRightIcon className={cn("size-3.5 stroke-[2.5]", className)} {...props} />
            )
          }

          return (
            <ChevronDownIcon className={cn("size-3.5 stroke-[2.5]", className)} {...props} />
          )
        },
        DayButton: ({ ...props }) => (
          <CalendarDayButton locale={locale} {...props} />
        ),
        ...components,
      }}
      {...props}
    />
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  locale,
  ...props
}: React.ComponentProps<typeof DayButton> & { locale?: Partial<Locale> }) {
  const defaultClassNames = getDefaultClassNames()

  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  const isSelectedSingle = modifiers.selected && !modifiers.range_start && !modifiers.range_end && !modifiers.range_middle;

  return (
    <Button
      variant="ghost"
      size="icon"
      ref={ref}
      data-day={day.date.toLocaleDateString(locale?.code)}
      data-selected-single={isSelectedSingle}
      className={cn(
        "relative isolate z-10 flex aspect-square h-7 w-7 items-center justify-center rounded-lg text-xs font-medium border-0 transition-all cursor-pointer",
        isSelectedSingle
          ? "bg-blue-600 text-white font-semibold shadow-sm hover:bg-blue-700"
          : modifiers.today
          ? "text-blue-600 dark:text-blue-400 font-bold hover:bg-blue-50 dark:hover:bg-blue-950/30"
          : modifiers.outside
          ? "text-slate-300 dark:text-zinc-500 font-normal hover:bg-slate-50 dark:hover:bg-zinc-700/50"
          : "text-slate-800 dark:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-700",
        className
      )}
      {...props}
    />
  )
}

export { Calendar, CalendarDayButton }
