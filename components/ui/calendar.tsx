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
        "group/calendar bg-card dark:bg-muted border border-border p-3 rounded-xl shadow-xl select-none font-sans text-foreground w-fit",
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
          "h-7 w-7 p-0 flex items-center justify-center rounded-lg bg-muted dark:bg-accent hover:bg-accent dark:hover:bg-accent/70 text-foreground/80 dark:text-foreground transition-colors cursor-pointer select-none aria-disabled:opacity-50",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          "h-7 w-7 p-0 flex items-center justify-center rounded-lg bg-muted dark:bg-accent hover:bg-accent dark:hover:bg-accent/70 text-foreground/80 dark:text-foreground transition-colors cursor-pointer select-none aria-disabled:opacity-50",
          defaultClassNames.button_next
        ),
        month_caption: cn(
          "flex h-7 w-full items-center justify-center px-7 text-xs font-bold text-foreground capitalize",
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
          "font-bold text-foreground select-none text-xs capitalize",
          defaultClassNames.caption_label
        ),
        weekdays: cn("flex text-center mb-1", defaultClassNames.weekdays),
        weekday: cn(
          "flex-1 text-xs font-medium text-muted-foreground py-0.5 select-none text-center",
          defaultClassNames.weekday
        ),
        week: cn("mt-1 flex w-full gap-1", defaultClassNames.week),
        day: cn(
          "group/day relative aspect-square h-7 w-7 rounded-lg p-0 text-center select-none flex items-center justify-center text-xs font-medium",
          defaultClassNames.day
        ),
        today: cn(
          "text-info font-bold bg-transparent border-0",
          defaultClassNames.today
        ),
        outside: cn(
          "text-muted-foreground/50 dark:text-muted-foreground font-normal aria-selected:text-primary-foreground",
          defaultClassNames.outside
        ),
        disabled: cn(
          "text-muted-foreground/50 opacity-50 dark:text-muted-foreground",
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
          ? "bg-primary text-primary-foreground font-semibold shadow-sm hover:bg-primary/90"
          : modifiers.today
          ? "text-info font-bold hover:bg-info/10 dark:hover:bg-info/30"
          : modifiers.outside
          ? "text-muted-foreground/50 dark:text-muted-foreground font-normal hover:bg-muted/60 dark:hover:bg-accent/50"
          : "text-foreground hover:bg-muted dark:hover:bg-accent",
        className
      )}
      {...props}
    />
  )
}

export { Calendar, CalendarDayButton }
