"use client";

import { useActionState } from "react";
import Image from "next/image";

import {
  type AccountActionState,
  updateProfileAction,
} from "@/app/(dashboard)/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActionToast } from "@/lib/use-action-toast";

type ProfileFormProps = {
  name: string;
  email: string;
  avatar: string;
  phone: string;
  dateOfBirth: string;
};

const initialState: AccountActionState = {
  success: false,
  message: "",
};

export function ProfileForm({
  name,
  email,
  avatar,
  phone,
  dateOfBirth,
}: ProfileFormProps) {
  const [state, action] = useActionState(updateProfileAction, initialState);
  useActionToast(state, {
    successPrefix: "Profile updated",
    errorPrefix: "Unable to update profile",
  });

  return (
    <form action={action} className="space-y-4 rounded-xl border border-border/80 bg-card/80 p-5 shadow-md backdrop-blur-sm transition-shadow hover:shadow-lg">
      <h2 className="text-lg font-medium">Profile Information</h2>
      <div className="space-y-2">
        <Label htmlFor="avatar">Avatar</Label>
        <div className="flex items-center gap-3">
          <span className="inline-flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border bg-muted text-sm font-medium">
            {avatar ? (
              <Image
                src={avatar}
                alt="Current avatar"
                className="h-full w-full object-cover"
                width={48}
                height={48}
                unoptimized
              />
            ) : (
              (name?.trim()?.[0] ?? email[0] ?? "U").toUpperCase()
            )}
          </span>
          <div className="space-y-1">
            <Input id="avatar" name="avatar" type="file" accept="image/*" />
            <p className="text-xs text-muted-foreground">
              JPG/PNG/WebP up to 500KB.
            </p>
          </div>
        </div>
        {state.errors?.avatar ? (
          <p className="text-xs text-destructive">{state.errors.avatar[0]}</p>
        ) : null}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="name">Display name</Label>
          <Input id="name" name="name" defaultValue={name} />
          {state.errors?.name ? (
            <p className="text-xs text-destructive">{state.errors.name[0]}</p>
          ) : null}
        </div>
        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" defaultValue={email} />
          {state.errors?.email ? (
            <p className="text-xs text-destructive">{state.errors.email[0]}</p>
          ) : null}
        </div>
        <div className="space-y-1">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" defaultValue={phone} />
          {state.errors?.phone ? (
            <p className="text-xs text-destructive">{state.errors.phone[0]}</p>
          ) : null}
        </div>
        <div className="space-y-1">
          <Label htmlFor="dateOfBirth">Date of birth</Label>
          <Input
            id="dateOfBirth"
            name="dateOfBirth"
            type="date"
            defaultValue={dateOfBirth}
          />
          {state.errors?.dateOfBirth ? (
            <p className="text-xs text-destructive">{state.errors.dateOfBirth[0]}</p>
          ) : null}
        </div>
      </div>
      {state.message && !state.success ? (
        <p className="text-sm text-destructive">{state.message}</p>
      ) : null}
      <Button type="submit" variant="sport">Save profile</Button>
    </form>
  );
}
