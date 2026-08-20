"use client";

import { useState } from "react";
import { Download, Printer, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { receiptShareText, type ReceiptData } from "@/lib/receipt";

export function ReceiptActions({ receipt }: { receipt: ReceiptData }) {
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);

  async function downloadPdf() {
    setDownloading(true);
    try {
      const response = await fetch(`/api/sales/${receipt.saleId}/receipt`);
      if (!response.ok) {
        throw new Error("Could not generate the receipt PDF.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${receipt.saleNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        variant: "error",
        title: "Receipt PDF failed",
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setDownloading(false);
    }
  }

  async function share() {
    const text = receiptShareText(receipt);
    const url = `${window.location.origin}/sales/${receipt.saleId}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Receipt ${receipt.saleNumber}`,
          text,
          url,
        });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      }
    }

    const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`;
    window.open(whatsapp, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <Button type="button" variant="outline" onClick={() => window.print()}>
        <Printer className="h-4 w-4" />
        Print receipt
      </Button>
      <Button type="button" variant="outline" onClick={() => void downloadPdf()} disabled={downloading}>
        <Download className="h-4 w-4" />
        {downloading ? "Preparing…" : "Download PDF"}
      </Button>
      <Button type="button" variant="outline" onClick={() => void share()}>
        <Share2 className="h-4 w-4" />
        Share
      </Button>
    </div>
  );
}
