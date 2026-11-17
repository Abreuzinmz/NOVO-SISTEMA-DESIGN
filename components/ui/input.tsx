import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"
import { useCaretPreservingChange } from "@/hooks/use-caret-preserving-change"

function Input({ className, type, onChange, ref, ...props }: React.ComponentProps<"input">) {
  // mantém o cursor no lugar quando o valor é transformado no onChange (ex.: maiúsculas)
  const caret = useCaretPreservingChange<HTMLInputElement>(onChange, ref)
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      ref={caret.ref}
      onChange={onChange ? caret.handleChange : undefined}
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

/** <input> comum, sem estilo próprio, com o mesmo cuidado do cursor (para campos com visual próprio) */
function PlainInput({ onChange, ref, ...props }: React.ComponentProps<"input">) {
  const caret = useCaretPreservingChange<HTMLInputElement>(onChange, ref)
  return <input ref={caret.ref} onChange={onChange ? caret.handleChange : undefined} {...props} />
}

export { Input, PlainInput }
