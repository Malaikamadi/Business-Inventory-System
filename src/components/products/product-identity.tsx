import Link from "next/link";
import { ProductThumbnail } from "@/components/products/product-thumbnail";

export function ProductIdentity({
  href,
  name,
  sku,
  imageUrl,
  size = "sm",
}: {
  href?: string;
  name: string;
  sku?: string | null;
  imageUrl?: string | null;
  size?: "sm" | "md";
}) {
  const title = href ? (
    <Link
      href={href}
      className="font-medium text-text-primary hover:text-accent"
    >
      {name}
    </Link>
  ) : (
    <span className="font-medium text-text-primary">{name}</span>
  );

  return (
    <div className="flex min-w-0 items-center gap-3">
      <ProductThumbnail src={imageUrl} alt={name} size={size} />
      <div className="min-w-0">
        {title}
        {sku && <p className="text-xs text-text-muted">{sku}</p>}
      </div>
    </div>
  );
}
