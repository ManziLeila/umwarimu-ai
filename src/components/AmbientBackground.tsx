export function AmbientBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-background" />
      <div className="grid-lines absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_50%_0%,black,transparent_75%)]" />
      <div className="animate-drift absolute -top-40 left-[10%] h-[38rem] w-[38rem] rounded-full bg-primary/10 blur-[120px]" />
      <div
        className="animate-drift absolute top-1/3 right-[-10%] h-[32rem] w-[32rem] rounded-full bg-violet/10 blur-[130px]"
        style={{ animationDelay: "-8s" }}
      />
      <div
        className="animate-drift absolute bottom-[-15%] left-1/4 h-[26rem] w-[26rem] rounded-full bg-primary/8 blur-[120px]"
        style={{ animationDelay: "-16s" }}
      />
      <svg className="absolute inset-0 h-full w-full opacity-[0.16]" preserveAspectRatio="none">
        <defs>
          <linearGradient id="line-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
            <stop offset="50%" stopColor="currentColor" stopOpacity="1" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g className="text-primary" stroke="url(#line-grad)" fill="none" strokeWidth="1">
          <path d="M0 120 C 260 60, 520 200, 820 120 S 1400 40, 1920 140" />
          <path d="M0 420 C 300 360, 640 500, 980 420 S 1500 340, 1920 440" />
          <path d="M0 760 C 320 700, 600 840, 940 760 S 1520 680, 1920 780" />
        </g>
      </svg>
    </div>
  );
}
