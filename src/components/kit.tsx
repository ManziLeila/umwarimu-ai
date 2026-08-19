import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, Sparkles, TrendingDown, TrendingUp, Minus } from "lucide-react";

import { cn } from "@/lib/utils";
import { AiOrb } from "@/components/AiOrb";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/app-context";
import type { Trend } from "@/lib/mock-data";

export function GlassPanel({
  className,
  children,
  hover = false,
}: {
  className?: string | undefined;
  children: ReactNode;
  hover?: boolean | undefined;
}) {
  return (
    <div className={cn("glass rounded-2xl", hover && "card-hover", className)}>{children}</div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="font-display text-muted-foreground text-[0.7rem] font-semibold tracking-[0.28em] uppercase">
      {children}
    </p>
  );
}

export function CountUp({ value, suffix }: { value: number; suffix?: string | undefined }) {
  const [shown, setShown] = useState(0);
  const { reduceMotion } = useApp();
  const started = useRef(false);

  useEffect(() => {
    if (reduceMotion) {
      setShown(value);
      return;
    }
    if (started.current) return;
    started.current = true;
    const duration = 900;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setShown(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reduceMotion]);

  return (
    <span>
      {shown}
      {suffix}
    </span>
  );
}

export function TrendBadge({ trend, value }: { trend: Trend; value?: string | undefined }) {
  const Icon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const tone =
    trend === "up" ? "text-success" : trend === "down" ? "text-risk" : "text-muted-foreground";
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", tone)}>
      <Icon className="size-3.5" aria-hidden />
      {value}
    </span>
  );
}

export function MetricCard({
  label,
  value,
  suffix,
  icon,
  delta,
  trend = "flat",
}: {
  label: string;
  value: number;
  suffix?: string | undefined;
  icon: ReactNode;
  delta?: string | undefined;
  trend?: Trend | undefined;
}) {
  return (
    <GlassPanel hover className="animate-fade-up relative overflow-hidden p-5">
      <div className="absolute -top-16 -right-14 size-36 rounded-full bg-primary/10 blur-2xl" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-3xl font-bold sm:text-4xl">
            <CountUp value={value} suffix={suffix} />
          </p>
          <p className="text-muted-foreground mt-1 truncate text-sm">{label}</p>
        </div>
        <span className="text-primary grid size-9 shrink-0 place-items-center rounded-xl border border-primary/25 bg-primary/10">
          {icon}
        </span>
      </div>
      {delta && (
        <div className="relative mt-3">
          <TrendBadge trend={trend} value={delta} />
        </div>
      )}
    </GlassPanel>
  );
}

export function InsightCard({
  title,
  body,
  bullet,
  actionLabel,
  onAction,
  generating = false,
}: {
  title: string;
  body: string;
  bullet?: string | undefined;
  actionLabel?: string | undefined;
  onAction?: (() => void) | undefined;
  generating?: boolean | undefined;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-primary/[0.06] p-5 backdrop-blur-xl">
      <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/70 to-transparent" />
      <div className="absolute -bottom-20 -left-10 size-48 rounded-full bg-violet/12 blur-3xl" />
      <div className="relative flex items-center gap-2">
        <AiOrb size={20} active={generating} />
        <p className="font-display text-primary text-[0.7rem] font-bold tracking-[0.24em] uppercase">
          {title}
        </p>
      </div>
      <p className="relative mt-3 text-sm leading-relaxed">{body}</p>
      {bullet && (
        <p className="relative mt-3 flex gap-2 text-sm">
          <ArrowRight className="text-primary mt-0.5 size-4 shrink-0" aria-hidden />
          <span className="text-muted-foreground">{bullet}</span>
        </p>
      )}
      {actionLabel && (
        <Button variant="glass" size="sm" className="relative mt-4" onClick={onAction}>
          <Sparkles className="size-3.5" aria-hidden />
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export function SkeletonBlock({ className }: { className?: string | undefined }) {
  return (
    <div
      className={cn(
        "animate-shimmer rounded-lg bg-[linear-gradient(90deg,var(--muted),color-mix(in_oklab,var(--primary)_18%,var(--muted)),var(--muted))] bg-[length:200%_100%]",
        className,
      )}
    />
  );
}

export function PanelSkeleton() {
  return (
    <GlassPanel className="space-y-3 p-5">
      <SkeletonBlock className="h-4 w-2/3" />
      <SkeletonBlock className="h-4 w-1/2" />
      <SkeletonBlock className="h-4 w-3/4" />
    </GlassPanel>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <GlassPanel className="grid place-items-center gap-2 p-10 text-center">
      <AiOrb size={32} />
      <p className="font-display text-base font-semibold">{title}</p>
      <p className="text-muted-foreground max-w-sm text-sm">{body}</p>
    </GlassPanel>
  );
}
