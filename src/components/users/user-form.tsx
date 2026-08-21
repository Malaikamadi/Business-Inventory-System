"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ROLES, isBusinessWideRole } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import {
  createUserAction,
  updateUserAction,
} from "@/server/actions/user.actions";

export interface UserFormValues {
  id?: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  roleId: string;
  shopIds: string[];
  primaryShopId: string;
}

export function UserForm({
  roles,
  shops,
  initialValues,
}: {
  roles: { id: string; name: string }[];
  shops: { id: string; name: string }[];
  initialValues?: UserFormValues;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState<UserFormValues>(
    initialValues ?? {
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      phone: "",
      roleId: roles.find((r) => r.name === ROLES.SALESPERSON)?.id ?? "",
      shopIds: [],
      primaryShopId: "",
    }
  );

  const isEdit = Boolean(initialValues?.id);

  // Only the owner sees every shop. Managers and salespeople need an assignment.
  const selectedRoleName = useMemo(
    () => roles.find((role) => role.id === values.roleId)?.name,
    [roles, values.roleId]
  );
  const needsShops = !isBusinessWideRole(selectedRoleName ?? "");

  function set<K extends keyof UserFormValues>(key: K, value: UserFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function toggleShop(shopId: string) {
    setValues((current) => {
      const shopIds = current.shopIds.includes(shopId)
        ? current.shopIds.filter((id) => id !== shopId)
        : [...current.shopIds, shopId];
      const primaryShopId = shopIds.includes(current.primaryShopId)
        ? current.primaryShopId
        : (shopIds[0] ?? "");
      return { ...current, shopIds, primaryShopId };
    });
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();

    startTransition(async () => {
      const payload = {
        ...(isEdit ? { id: initialValues!.id } : {}),
        email: values.email,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone,
        roleId: values.roleId,
        shopIds: needsShops ? values.shopIds : [],
        primaryShopId: needsShops ? values.primaryShopId : "",
      };

      const result = isEdit
        ? await updateUserAction(payload)
        : await createUserAction(payload);

      if (!result.success) {
        toast({
          variant: "error",
          title: isEdit ? "Could not save user" : "Could not add user",
          description: result.error,
        });
        return;
      }

      toast({
        variant: "success",
        title: isEdit ? "User saved" : "User added",
      });
      router.push(`/users/${result.data!.userId}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <Card>
        <CardContent className="space-y-5 p-6">
          <h2 className="text-sm font-semibold text-text-primary">Account</h2>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                value={values.firstName}
                onChange={(event) => set("firstName", event.target.value)}
                required
                maxLength={100}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                value={values.lastName}
                onChange={(event) => set("lastName", event.target.value)}
                required
                maxLength={100}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={values.email}
                onChange={(event) => set("email", event.target.value)}
                required
              />
              <p className="text-xs text-text-muted">Used to sign in.</p>
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
              <Label htmlFor="password">
                {isEdit ? "New password" : "Password"}
              </Label>
              <Input
                id="password"
                type="password"
                value={values.password}
                onChange={(event) => set("password", event.target.value)}
                required={!isEdit}
                minLength={8}
                autoComplete="new-password"
              />
              <p className="text-xs text-text-muted">
                {isEdit
                  ? "Leave blank to keep the current password."
                  : "At least 8 characters."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-5 p-6">
          <h2 className="text-sm font-semibold text-text-primary">Access</h2>

          <div className="space-y-1.5">
            <Label htmlFor="role">Role</Label>
            <select
              id="role"
              value={values.roleId}
              onChange={(event) => set("roleId", event.target.value)}
              className="field-select w-full sm:max-w-xs"
              required
            >
              {roles.map((role) => (
                <option key={role.id} value={role.id} className="capitalize">
                  {role.name}
                </option>
              ))}
            </select>
          </div>

          {needsShops ? (
            <fieldset className="space-y-2">
              <legend className="mb-2 text-sm font-medium text-text-primary">
                Assigned shops
              </legend>
              <p className="mb-3 text-xs text-text-muted">
                This user can only work at the shops selected here. The primary
                shop is the one they land on after signing in.
              </p>

              <div className="space-y-2">
                {shops.map((shop) => {
                  const checked = values.shopIds.includes(shop.id);
                  return (
                    <div
                      key={shop.id}
                      className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2.5"
                    >
                      <label className="flex flex-1 items-center gap-3 text-sm">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleShop(shop.id)}
                          className="h-4 w-4 rounded border-input"
                        />
                        {shop.name}
                      </label>

                      {checked && (
                        <label className="flex items-center gap-1.5 text-xs text-text-muted">
                          <input
                            type="radio"
                            name="primaryShop"
                            checked={values.primaryShopId === shop.id}
                            onChange={() => set("primaryShopId", shop.id)}
                            className="h-3.5 w-3.5"
                          />
                          Primary
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>

              {values.shopIds.length === 0 && (
                <p className="text-xs font-medium text-danger">
                  Select at least one shop.
                </p>
              )}
            </fieldset>
          ) : (
            <p className="rounded-md border border-border bg-muted/50 p-3 text-sm text-text-secondary">
              Owners have access to every shop, so no assignment is needed.
            </p>
          )}
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
        <Button
          type="submit"
          disabled={isPending || (needsShops && values.shopIds.length === 0)}
        >
          {isPending ? "Saving…" : isEdit ? "Save changes" : "Add user"}
        </Button>
      </div>
    </form>
  );
}
