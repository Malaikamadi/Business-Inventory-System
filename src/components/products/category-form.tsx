"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { createCategoryAction } from "@/server/actions/product.actions";

export function CategoryForm({
  shops,
  defaultShopId,
}: {
  shops: { id: string; name: string }[];
  defaultShopId: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [shopId, setShopId] = useState(defaultShopId);

  function submit(event: React.FormEvent) {
    event.preventDefault();

    startTransition(async () => {
      const result = await createCategoryAction({ name, description, shopId });

      if (!result.success) {
        toast({
          variant: "error",
          title: "Could not create category",
          description: result.error,
        });
        return;
      }

      toast({ variant: "success", title: `${name} created` });
      setName("");
      setDescription("");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New category</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          {shops.length > 1 && (
            <div className="space-y-1.5">
              <Label htmlFor="category-shop">Shop</Label>
              <select
                id="category-shop"
                value={shopId}
                onChange={(event) => setShopId(event.target.value)}
                className="field-select w-full"
                required
              >
                {shops.map((shop) => (
                  <option key={shop.id} value={shop.id}>
                    {shop.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="category-name">Name</Label>
            <Input
              id="category-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Cables & power"
              required
              maxLength={100}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="category-description">Description</Label>
            <Input
              id="category-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional"
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isPending || !name.trim()}
          >
            <Plus className="h-4 w-4" />
            {isPending ? "Creating…" : "Create category"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
