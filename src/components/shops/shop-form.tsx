"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { createShopAction, updateShopAction } from "@/server/actions/shop.actions";

export interface ShopFormValues {
  id?: string;
  name: string;
  location: string;
  address: string;
  phone: string;
  email: string;
  status?: "ACTIVE" | "INACTIVE";
}

const EMPTY: ShopFormValues = {
  name: "",
  location: "",
  address: "",
  phone: "",
  email: "",
  status: "ACTIVE",
};

export function ShopForm({
  initialValues,
}: {
  initialValues?: ShopFormValues;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState<ShopFormValues>(initialValues ?? EMPTY);

  const isEdit = Boolean(initialValues?.id);

  function set<K extends keyof ShopFormValues>(key: K, value: ShopFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();

    startTransition(async () => {
      const result = isEdit
        ? await updateShopAction({ ...values, id: initialValues!.id })
        : await createShopAction(values);

      if (!result.success) {
        toast({
          variant: "error",
          title: isEdit ? "Could not save shop" : "Could not add shop",
          description: result.error,
        });
        return;
      }

      toast({
        variant: "success",
        title: isEdit ? "Shop saved" : "Shop added",
      });
      router.push(`/shops/${result.data!.shopId}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <Card>
        <CardContent className="space-y-5 p-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="name">Shop name</Label>
              <Input
                id="name"
                value={values.name}
                onChange={(event) => set("name", event.target.value)}
                placeholder="e.g. Downtown Store"
                required
                maxLength={150}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={values.location}
                onChange={(event) => set("location", event.target.value)}
                placeholder="e.g. City Center"
                maxLength={200}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={values.phone}
                onChange={(event) => set("phone", event.target.value)}
                placeholder="Optional"
                maxLength={20}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={values.address}
                onChange={(event) => set("address", event.target.value)}
                placeholder="Optional"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={values.email}
                onChange={(event) => set("email", event.target.value)}
                placeholder="Optional"
              />
            </div>

            {isEdit && (
              <div className="space-y-1.5">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={values.status}
                  onChange={(event) =>
                    set("status", event.target.value as "ACTIVE" | "INACTIVE")
                  }
                  className="h-10 w-full rounded-md border border-input bg-surface px-3 text-sm"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
                <p className="text-xs text-text-muted">
                  A shop can only be deactivated once its stock has been
                  transferred elsewhere.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : isEdit ? "Save changes" : "Add shop"}
        </Button>
      </div>
    </form>
  );
}
