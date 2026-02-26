"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import { Gender, MemberStatus } from "@prisma/client";

import {
  createMemberAction,
  deleteMemberAction,
  type MemberActionState,
  updateMemberAction,
} from "@/app/(dashboard)/members/actions";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageMotion, HeroMotion } from "@/components/ui/motion";
import { SportCard } from "@/components/ui/sport-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useActionToast } from "@/lib/use-action-toast";
import { Mars, Users, Venus, VenusAndMars, type LucideIcon } from "lucide-react";

type MemberListItem = {
  id: string;
  phone: string | null;
  dateOfBirth: Date | null;
  gender: Gender | null;
  status: MemberStatus;
  notes: string | null;
  userId: string;
  userName: string | null;
  userEmail: string;
  userImage: string | null;
};

type MemberManagementProps = {
  members: MemberListItem[];
  canManage: boolean;
};

const initialCreateState: MemberActionState = {
  success: false,
  message: "",
};

const statuses: MemberStatus[] = [
  MemberStatus.ACTIVE,
  MemberStatus.INACTIVE,
  MemberStatus.SUSPENDED,
];

const genders: { value: Gender; label: string; Icon: LucideIcon; iconClass: string }[] = [
  { value: Gender.MALE, label: "Male", Icon: Mars, iconClass: "text-blue-600 dark:text-blue-400" },
  { value: Gender.FEMALE, label: "Female", Icon: Venus, iconClass: "text-pink-600 dark:text-pink-400" },
  { value: Gender.OTHER, label: "Other", Icon: VenusAndMars, iconClass: "text-muted-foreground" },
];

function memberStatusChipClass(status: MemberStatus) {
  switch (status) {
    case MemberStatus.ACTIVE:
      return "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40";
    case MemberStatus.INACTIVE:
      return "bg-muted/80 text-muted-foreground border border-border";
    case MemberStatus.SUSPENDED:
      return "bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/40";
    default:
      return "bg-muted text-muted-foreground border border-border";
  }
}

function dateInputValue(value: Date | null) {
  if (!value) return "";
  return value.toISOString().slice(0, 10);
}

export function MemberManagement({ members, canManage }: MemberManagementProps) {
  const router = useRouter();
  const [createState, createFormAction] = useActionState(
    createMemberAction,
    initialCreateState,
  );
  const [updateState, updateFormAction] = useActionState(
    updateMemberAction,
    initialCreateState,
  );

  useActionToast(createState, {
    successPrefix: "Member created",
    errorPrefix: "Unable to create member",
  });
  useActionToast(updateState, {
    successPrefix: "Member updated",
    errorPrefix: "Unable to update member",
  });

  const lastRefreshedToastKey = useRef<number | null>(null);

  useEffect(() => {
    const key = createState.success ? createState.toastKey : updateState.success ? updateState.toastKey : null;
    if (key != null && key !== lastRefreshedToastKey.current) {
      lastRefreshedToastKey.current = key;
      router.refresh();
    }
  }, [createState.success, createState.toastKey, updateState.success, updateState.toastKey, router]);

  return (
    <PageMotion className="space-y-8">
      <HeroMotion
        title="Members"
        subtitle={
          canManage
            ? "Create, update, delete, and list club members."
            : "View the club member directory."
        }
      />

      {canManage ? (
        <SportCard variant="gradient" className="p-5">
        <form action={createFormAction} className="space-y-4">
        <h2 className="text-lg font-medium">Create member</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <Label htmlFor="create-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input id="create-name" name="name" placeholder="John Doe" required />
            {createState.errors?.name ? (
              <p className="text-xs text-destructive">{createState.errors.name[0]}</p>
            ) : null}
          </div>
          <div className="space-y-1">
            <Label htmlFor="create-email">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input id="create-email" name="email" type="email" placeholder="john@club.com" required />
            {createState.errors?.email ? (
              <p className="text-xs text-destructive">{createState.errors.email[0]}</p>
            ) : null}
          </div>
          <div className="space-y-1">
            <Label htmlFor="create-password">
              Password <span className="text-destructive">*</span>
            </Label>
            <Input id="create-password" name="password" type="password" required minLength={8} />
            {createState.errors?.password ? (
              <p className="text-xs text-destructive">{createState.errors.password[0]}</p>
            ) : null}
          </div>
          <div className="space-y-1">
            <Label htmlFor="create-phone">Phone</Label>
            <Input id="create-phone" name="phone" placeholder="+1 555-0100" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="create-date-of-birth">Date of birth</Label>
            <Input id="create-date-of-birth" name="dateOfBirth" type="date" />
            {createState.errors?.dateOfBirth ? (
              <p className="text-xs text-destructive">
                {createState.errors.dateOfBirth[0]}
              </p>
            ) : null}
          </div>
          <div className="space-y-1">
            <Label htmlFor="create-gender">Gender</Label>
            <select
              id="create-gender"
              name="gender"
              className="border-input bg-transparent h-9 w-full rounded-md border px-3 text-sm"
            >
              <option value="">—</option>
              {genders.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="create-status">Status</Label>
            <select
              id="create-status"
              name="status"
              defaultValue={MemberStatus.ACTIVE}
              className="border-input bg-transparent h-9 w-full rounded-md border px-3 text-sm"
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="create-notes">Notes</Label>
            <Input id="create-notes" name="notes" placeholder="Optional notes" />
          </div>
        </div>
        {createState.message && !createState.success ? (
          <p className="text-sm text-destructive">{createState.message}</p>
        ) : null}
        <Button type="submit" variant="sport">Add member</Button>
        </form>
        </SportCard>
      ) : null}

      <SportCard variant="leaderboard" className="overflow-hidden">
        <div className="border-b border-border/60 px-4 py-3">
          <h2 className="text-lg font-semibold tracking-tight">Member list</h2>
        </div>
        <div className="p-4 pt-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12" aria-label="Avatar" />
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Date of Birth</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Notes</TableHead>
              {canManage ? <TableHead>Actions</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => {
              const rowKey = `${member.id}-${member.status}-${member.userName ?? ""}-${member.userEmail}-${member.phone ?? ""}-${dateInputValue(member.dateOfBirth)}-${member.gender ?? ""}-${member.notes ?? ""}`;
              return canManage ? (
                <TableRow key={rowKey}>
                  <TableCell className="w-12 align-middle">
                    {member.userImage ? (
                      <Image
                        src={member.userImage}
                        alt=""
                        width={32}
                        height={32}
                        className="size-8 shrink-0 rounded-full object-cover"
                        unoptimized
                      />
                    ) : null}
                  </TableCell>
                  <TableCell colSpan={8} className="p-0">
                    <form
                      action={updateFormAction}
                      className="grid grid-cols-1 gap-2 p-2 lg:grid-cols-[1.25fr_1.5fr_1fr_1fr_0.75fr_1fr_1.5fr_auto]"
                    >
                      <input type="hidden" name="memberId" value={member.id} />
                      <input type="hidden" name="userId" value={member.userId} />
                      <Input name="name" defaultValue={member.userName ?? ""} />
                      <Input name="email" type="email" defaultValue={member.userEmail} />
                      <Input name="phone" defaultValue={member.phone ?? ""} />
                      <Input
                        name="dateOfBirth"
                        type="date"
                        defaultValue={dateInputValue(member.dateOfBirth)}
                      />
                      <select
                        name="gender"
                        defaultValue={member.gender ?? ""}
                        className="border-input bg-transparent h-9 w-full rounded-md border px-3 text-sm"
                      >
                        <option value="">—</option>
                        {genders.map((g) => (
                          <option key={g.value} value={g.value}>
                            {g.label}
                          </option>
                        ))}
                      </select>
                      <select
                        name="status"
                        defaultValue={member.status}
                        className="border-input bg-transparent h-9 w-full rounded-md border px-3 text-sm"
                      >
                        {statuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                      <Input name="notes" defaultValue={member.notes ?? ""} />
                      <div className="flex gap-2">
                        <Button type="submit" size="sm">
                          Save
                        </Button>
                        <Button
                          formAction={deleteMemberAction}
                          type="submit"
                          size="sm"
                          variant="destructive"
                        >
                          Delete
                        </Button>
                      </div>
                    </form>
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow key={rowKey}>
                  <TableCell className="w-12 align-middle">
                    {member.userImage ? (
                      <Image
                        src={member.userImage}
                        alt=""
                        width={32}
                        height={32}
                        className="size-8 shrink-0 rounded-full object-cover"
                        unoptimized
                      />
                    ) : null}
                  </TableCell>
                  <TableCell>{member.userName ?? "-"}</TableCell>
                  <TableCell>{member.userEmail}</TableCell>
                  <TableCell>{member.phone ?? "-"}</TableCell>
                  <TableCell>{member.dateOfBirth ? dateInputValue(member.dateOfBirth) : "-"}</TableCell>
                  <TableCell>
                    {member.gender ? (() => {
                      const g = genders.find((gr) => gr.value === member.gender);
                      if (!g) return member.gender;
                      return (
                        <span title={g.label} className="inline-flex items-center">
                          <g.Icon className={cn("h-4 w-4", g.iconClass)} aria-hidden />
                        </span>
                      );
                    })() : "—"}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${memberStatusChipClass(member.status)}`}
                    >
                      {member.status}
                    </span>
                  </TableCell>
                  <TableCell>{member.notes ?? "-"}</TableCell>
                </TableRow>
              );
            })}
            {!members.length ? (
              <TableRow>
                <TableCell colSpan={canManage ? 9 : 8} className="p-4">
                  <EmptyState
                    title="No members yet"
                    description={
                      canManage
                        ? "Create the first member to start attendance, matches, and budget tracking."
                        : "No members found yet."
                    }
                    icon={Users}
                  />
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
        </div>
      </SportCard>
    </PageMotion>
  );
}
