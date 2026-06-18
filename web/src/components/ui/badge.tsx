import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
  {
    variants: {
      variant: {
        default: "bg-[var(--color-surface-2)] text-[var(--color-muted)]",
        over: "bg-[var(--color-pos)]/15 text-[var(--color-pos)]",
        under: "bg-[var(--color-neg)]/15 text-[var(--color-neg)]",
        accent: "bg-[var(--color-accent)]/15 text-[var(--color-accent)]",
        outline: "border border-[var(--color-border)] text-[var(--color-muted)]",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
