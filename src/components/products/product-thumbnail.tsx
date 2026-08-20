import Image from "next/image";
import { Package } from "lucide-react";

import { cn } from "@/lib/utils";

const SIZES = {
  sm: { box: "h-10 w-10 rounded-md", icon: "h-4 w-4", px: 40 },
  md: { box: "h-14 w-14 rounded-lg", icon: "h-5 w-5", px: 56 },
  lg: { box: "h-24 w-24 rounded-lg", icon: "h-7 w-7", px: 96 },
  xl: { box: "h-full w-full rounded-xl", icon: "h-10 w-10", px: 512 },
} as const;

/**
 * Product photo with a neutral placeholder for the many products that will
 * never have one. Rendered unoptimized: uploads are already downscaled and
 * served under an immutable cache header, so the optimizer would add a native
 * `sharp` dependency and a second copy of every file for no visible gain.
 */
export function ProductThumbnail({
  src,
  alt,
  size = "sm",
  className,
}: {
  src: string | null | undefined;
  alt: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const { box, icon, px } = SIZES[size];

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden border border-border bg-muted",
        box,
        className
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={`${px}px`}
          className="object-cover"
          unoptimized
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center text-text-muted"
          aria-hidden
        >
          <Package className={icon} />
        </div>
      )}
    </div>
  );
}
