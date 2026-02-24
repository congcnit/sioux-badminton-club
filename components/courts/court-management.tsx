"use client";

import { useActionState } from "react";

import {
  createCourtAction,
  deleteCourtAction,
  type CourtActionState,
  updateCourtAction,
} from "@/app/(dashboard)/courts/actions";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useActionToast } from "@/lib/use-action-toast";
import { MapPinned } from "lucide-react";

type CourtItem = {
  id: string;
  name: string;
  locationLink: string | null;
  notes: string | null;
};

type CourtManagementProps = {
  courts: CourtItem[];
};

const initialState: CourtActionState = {
  success: false,
  message: "",
};

export function CourtManagement({ courts }: CourtManagementProps) {
  const [state, action] = useActionState(createCourtAction, initialState);
  useActionToast(state, {
    successPrefix: "Court created",
    errorPrefix: "Unable to create court",
  });

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Court Management</h1>
        <p className="text-sm text-muted-foreground">
          Add, update, and remove badminton courts.
        </p>
      </div>

      <form action={action} className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="text-lg font-medium">Add Court</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="name">Court Name</Label>
            <Input id="name" name="name" placeholder="Court A" />
            {state.errors?.name ? (
              <p className="text-xs text-destructive">{state.errors.name[0]}</p>
            ) : null}
          </div>
          <div className="space-y-1">
            <Label htmlFor="locationLink">Location Link</Label>
            <Input
              id="locationLink"
              name="locationLink"
              placeholder="https://maps.google.com/..."
            />
            {state.errors?.locationLink ? (
              <p className="text-xs text-destructive">
                {state.errors.locationLink[0]}
              </p>
            ) : null}
          </div>
          <div className="space-y-1">
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" name="notes" placeholder="Optional notes" />
            {state.errors?.notes ? (
              <p className="text-xs text-destructive">{state.errors.notes[0]}</p>
            ) : null}
          </div>
        </div>
        {state.message && !state.success ? (
          <p className="text-sm text-destructive">{state.message}</p>
        ) : null}
        <Button type="submit">Add court</Button>
      </form>

      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-medium">Court List</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Location Link</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courts.map((court) => (
              <TableRow key={court.id}>
                <TableCell colSpan={4} className="p-0">
                  <form
                    action={updateCourtAction}
                    className="grid grid-cols-1 gap-2 p-2 lg:grid-cols-[1fr_2fr_2fr_auto]"
                  >
                    <input type="hidden" name="courtId" value={court.id} />
                    <Input name="name" defaultValue={court.name} />
                    <Input name="locationLink" defaultValue={court.locationLink ?? ""} />
                    <Input name="notes" defaultValue={court.notes ?? ""} />
                    <div className="flex gap-2">
                      <Button size="sm" type="submit">
                        Save
                      </Button>
                      <Button formAction={deleteCourtAction} size="sm" variant="destructive">
                        Delete
                      </Button>
                    </div>
                  </form>
                </TableCell>
              </TableRow>
            ))}
            {!courts.length ? (
              <TableRow>
                <TableCell colSpan={4} className="p-4">
                  <EmptyState
                    title="No courts yet"
                    description="Add your first court to manage locations and notes."
                    icon={MapPinned}
                  />
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
