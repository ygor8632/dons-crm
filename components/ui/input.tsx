import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-xl border border-input bg-pill-active/55 px-3 text-[13px] text-foreground shadow-[inset_0_1px_2px_rgb(40_25_15/0.05)] transition-[border-color,box-shadow,background-color] duration-150 file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-xs file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:bg-pill-active/80 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/30 dark:bg-white/6 dark:focus-visible:bg-white/10",
        className
      )}
      {...props}
    />
  )
}

export { Input }
