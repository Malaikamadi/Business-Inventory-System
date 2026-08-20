"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { voidSaleAction } from "@/server/actions/sales.actions";

/**
 * Voiding is the only way to reverse a sale — records are never deleted — so
 * the dialog states the consequence and requires a reason for the audit trail.
 */
export function VoidSaleDialog({
  saleId,
  saleNumber,
}: {
  saleId: string;
  saleNumber: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await voidSaleAction({ saleId, reason });

      if (!result.success) {
        toast({
          variant: "error",
          title: "Could not void sale",
          description: result.error,
        });
        return;
      }

      toast({
        variant: "success",
        title: `Sale ${saleNumber} voided`,
        description: "The stock has been returned to the shop.",
      });
      setOpen(false);
      setReason("");
      router.refresh();
    });
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Ban className="h-4 w-4" />
        Void sale
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void sale {saleNumber}?</DialogTitle>
            <DialogDescription>
              The sale is kept on record and marked as voided. Its items are
              returned to the shop&apos;s stock and the amount is removed from
              revenue reporting.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="void-reason">Reason</Label>
            <Input
              id="void-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="e.g. Customer returned all items"
              autoFocus
            />
            <p className="text-xs text-text-muted">
              Recorded in the audit log against your account.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={submit}
              disabled={isPending || reason.trim().length < 5}
            >
              {isPending ? "Voiding…" : "Void sale"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
