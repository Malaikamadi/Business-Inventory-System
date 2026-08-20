"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { uploadProductImageAction } from "@/server/actions/upload.actions";

/** Long edge of the stored image. Large enough to stay sharp on a product page,
 *  small enough that a photo costs a fraction of the original upload. */
const MAX_EDGE = 1000;
const JPEG_QUALITY = 0.82;

/**
 * Shrink a camera photo before it leaves the device.
 *
 * Phone cameras produce 3–8MB files. Uploading those over mobile data is slow
 * and expensive for the shop staff doing it, and we only ever display the image
 * at a few hundred pixels, so the extra resolution is pure waste. Falls back to
 * the original file if the browser cannot decode it — the server re-validates
 * either way.
 */
async function downscale(file: File): Promise<Blob> {
  if (typeof createImageBitmap !== "function") return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return file;
  }

  // Product photos are opaque, so flattening onto white keeps transparent PNGs
  // from turning black when encoded as JPEG.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
  );

  return blob && blob.size < file.size ? blob : file;
}

export function ProductImageInput({
  value,
  onChange,
  productName,
}: {
  value: string;
  onChange: (imageUrl: string) => void;
  productName: string;
}) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleFile(file: File) {
    setIsUploading(true);
    try {
      const blob = await downscale(file);

      const formData = new FormData();
      formData.append("file", blob, file.name);

      const result = await uploadProductImageAction(formData);
      if (!result.success) {
        toast({
          variant: "error",
          title: "Upload failed",
          description: result.error,
        });
        return;
      }

      onChange(result.data!.imageUrl);
    } catch {
      toast({
        variant: "error",
        title: "Upload failed",
        description: "The image could not be uploaded. Please try again.",
      });
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="product-image">Photo</Label>

      <div className="flex items-start gap-4">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
          {value ? (
            <Image
              src={value}
              alt={productName || "Product photo"}
              fill
              sizes="96px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-text-muted">
              <ImagePlus className="h-6 w-6" aria-hidden />
            </div>
          )}

          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-surface/70">
              <Loader2
                className="h-5 w-5 animate-spin text-text-secondary"
                aria-hidden
              />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUploading}
              onClick={() => inputRef.current?.click()}
            >
              {isUploading
                ? "Uploading…"
                : value
                  ? "Replace photo"
                  : "Upload photo"}
            </Button>

            {value && !isUploading && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange("")}
              >
                <Trash2 className="mr-1.5 h-4 w-4" aria-hidden />
                Remove
              </Button>
            )}
          </div>

          <p className="text-xs text-text-muted">
            JPEG, PNG, or WebP. Photos are resized automatically, so you can use
            a picture straight from your phone.
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        id="product-image"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
    </div>
  );
}
