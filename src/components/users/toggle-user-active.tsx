"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { setUserActiveAction } from "@/server/actions/user.actions";

export function ToggleUserActive({
  userId,
  isActive,
}: {
  userId: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await setUserActiveAction({ id: userId, isActive: !isActive });

      if (!result.success) {
        toast({
          variant: "error",
          title: "Could not update account",
          description: result.error,
        });
        return;
      }

      toast({
        variant: "success",
        title: isActive ? "Account deactivated" : "Account reactivated",
      });
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        variant={isActive ? "outline" : "default"}
        onClick={() => setOpen(true)}
      >
        {isActive ? (
          <>
            <UserX className="h-4 w-4" />
            Deactivate
          </>
        ) : (
          <>
            <UserCheck className="h-4 w-4" />
            Reactivate
          </>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isActive ? "Deactivate this account?" : "Reactivate this account?"}
            </DialogTitle>
            <DialogDescription>
              {isActive
                ? "They will no longer be able to sign in. Their past sales and stock movements stay on record."
                : "They will be able to sign in again with their existing password."}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant={isActive ? "destructive" : "default"}
              onClick={submit}
              disabled={isPending}
            >
              {isPending
                ? "Saving…"
                : isActive
                  ? "Deactivate"
                  : "Reactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
