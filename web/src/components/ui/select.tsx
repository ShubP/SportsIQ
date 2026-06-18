import { cn } from "@/lib/utils";

export interface Option {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  className?: string;
  "aria-label"?: string;
}

/** Lightweight styled native select (shadcn look, no extra deps). */
export function Select({ value, onChange, options, className, ...rest }: SelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 text-sm",
        "text-[#e6edf6] outline-none focus:border-[var(--color-accent)] transition-colors cursor-pointer",
        className
      )}
      {...rest}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
