"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface MaskedInputProps
  extends Omit<React.ComponentProps<"input">, "value" | "onChange"> {
  /** Raw (unmasked) value, owned by the parent's state. */
  value: string
  /** Formats a raw value into what's displayed in the field. */
  mask: (raw: string) => string
  /** Extracts the raw value back out of whatever the user typed. */
  unmask: (displayed: string) => string
  /** Called with the new raw value after each edit. */
  onValueChange: (raw: string) => void
}

/**
 * A controlled text input for value/display pairs like phone numbers or
 * CPF/CNPJ, where `mask` inserts formatting characters (parentheses, dots,
 * dashes) that don't exist in the underlying raw value.
 *
 * A plain `<Input value={mask(x)} onChange={e => setX(unmask(e.target.value))} />`
 * re-renders with a brand new `value` on every keystroke; the browser has no
 * way to know the edit happened mid-string, so it resets the caret to the end
 * of the input. That makes correcting a digit in the middle of the value
 * impossible without the caret jumping away. This component tracks how many
 * raw digits precede the caret before the edit and restores the caret to the
 * same digit position after the mask is re-applied.
 */
export function MaskedInput({
  className,
  value,
  mask,
  unmask,
  onValueChange,
  ...props
}: MaskedInputProps) {
  const ref = React.useRef<HTMLInputElement>(null)
  const displayValue = mask(value)
  // quantos dígitos havia antes do cursor na última digitação (aplicado após o React atualizar o campo)
  const pendingDigits = React.useRef<number | null>(null)

  // Devolve o cursor para logo depois do mesmo dígito em que estava, já com a máscara reaplicada.
  const restoreCaret = React.useCallback(() => {
    const digitsBeforeCaret = pendingDigits.current
    const el = ref.current
    if (digitsBeforeCaret == null || !el) return
    pendingDigits.current = null
    if (document.activeElement !== el) return
    const shown = el.value
    let pos = shown.length
    if (digitsBeforeCaret === 0) {
      pos = 0
    } else {
      let seen = 0
      for (let i = 0; i < shown.length; i++) {
        if (/\d/.test(shown[i])) {
          seen++
          if (seen === digitsBeforeCaret) {
            pos = i + 1
            break
          }
        }
      }
    }
    el.setSelectionRange(pos, pos)
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target
    const typedDisplay = input.value
    const caret = input.selectionStart ?? typedDisplay.length
    pendingDigits.current = typedDisplay.slice(0, caret).replace(/\D/g, "").length
    onValueChange(unmask(typedDisplay))
    // se os dígitos não mudaram (ex.: apagou só um "(" ou "-"), o React restaura o campo sem
    // renderizar de novo; então o cursor é ajustado logo depois do evento
    queueMicrotask(restoreCaret)
  }

  // Antes da tela ser pintada (sem o cursor "piscar" no fim)
  React.useLayoutEffect(restoreCaret)

  return (
    <input
      ref={ref}
      type="text"
      inputMode="numeric"
      data-slot="input"
      value={displayValue}
      onChange={handleChange}
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80",
        className
      )}
      {...props}
    />
  )
}
