import { cn } from "@/lib/utils";

export function PaSampangLogo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "block shrink-0 overflow-visible bg-transparent",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt="Logo SI CUTE - Sistem Informasi Cuti Elektronik"
        className="h-full w-full object-contain"
        src="/si-cute-logo-transparent.png"
      />
    </span>
  );
}
