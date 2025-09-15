import { cn } from "@/lib/utils";

function Skeleton({ className, children, ...props }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-zinc-100", // light instead of black
        className
      )}
      {...props}
    >
      <div
        className="pointer-events-none absolute inset-0 -translate-x-full
                   animate-[shimmer_2s_infinite]
                   bg-gradient-to-r from-transparent via-white/60 to-transparent"
      />
      {children}
    </div>
  );
}

export { Skeleton };
