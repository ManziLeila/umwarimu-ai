import logoMark from "@/assets/logo-mark.png";
import { cn } from "@/lib/utils";

export function AiOrb({
  size = 28,
  active = false,
  className,
}: {
  size?: number | undefined;
  active?: boolean | undefined;
  className?: string | undefined;
}) {
  return (
    <span
      aria-hidden
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <span
        className={cn(
          "absolute inset-0 rounded-full bg-primary/25 blur-md",
          active && "animate-orb",
        )}
      />
      <span className="absolute inset-[15%] rounded-full border border-primary/50" />
      <span
        className={cn(
          "absolute inset-[32%] rounded-full bg-primary shadow-[0_0_18px_2px_var(--color-primary)]",
          active && "animate-orb",
        )}
      />
      {active && <span className="animate-ping-soft absolute inset-[20%] rounded-full bg-primary/30" />}
    </span>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <span className="relative inline-flex size-8 shrink-0 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-primary/20 blur-md" />
        <img
          src={logoMark}
          alt="Umwarimu AI logo"
          width={64}
          height={64}
          className="relative size-8 object-contain"
        />
      </span>
      {!compact && (
        <span className="font-display truncate text-[0.95rem] font-bold tracking-[0.18em] uppercase">
          Umwarimu <span className="text-gradient">AI</span>
        </span>
      )}
    </span>
  );
}
