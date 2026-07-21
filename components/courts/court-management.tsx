"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";

import {
  createCourtAction,
  deleteCourtAction,
  type CourtActionState,
  updateCourtAction,
} from "@/app/(dashboard)/courts/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import { Loader2, MapPinned } from "lucide-react";

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

function SubmitButton({
  children,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-busy={pending} {...props}>
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Saving…
        </>
      ) : (
        children
      )}
    </Button>
  );
}

function CourtRow({ court }: { court: CourtItem }) {
  const router = useRouter();
  const [updateState, updateAction] = useActionState(
    updateCourtAction,
    initialState,
  );
  const [deleteState, deleteAction] = useActionState(
    deleteCourtAction,
    initialState,
  );
  const [deleteOpen, setDeleteOpen] = useState(false);

  useActionToast(updateState, {
    successPrefix: "Court updated",
    errorPrefix: "Unable to update court",
  });
  useActionToast(deleteState, {
    successPrefix: "Court deleted",
    errorPrefix: "Unable to delete court",
  });

  useEffect(() => {
    if (updateState.success && updateState.toastKey) router.refresh();
  }, [updateState.success, updateState.toastKey, router]);

  useEffect(() => {
    if (deleteState.success && deleteState.toastKey) {
      setDeleteOpen(false);
      router.refresh();
    }
  }, [deleteState.success, deleteState.toastKey, router]);

  return (
    <TableRow>
      <TableCell colSpan={4} className="p-0">
        <form
          action={updateAction}
          className="grid grid-cols-1 gap-2 p-2 lg:grid-cols-[1fr_2fr_2fr_auto]"
        >
          <input type="hidden" name="courtId" value={court.id} />
          <div className="space-y-1">
            <Input name="name" defaultValue={court.name} />
            {updateState.errors?.name ? (
              <p className="text-xs text-destructive">{updateState.errors.name[0]}</p>
            ) : null}
          </div>
          <div className="space-y-1">
            <Input name="locationLink" defaultValue={court.locationLink ?? ""} />
            {updateState.errors?.locationLink ? (
              <p className="text-xs text-destructive">
                {updateState.errors.locationLink[0]}
              </p>
            ) : null}
          </div>
          <div className="space-y-1">
            <Input name="notes" defaultValue={court.notes ?? ""} />
            {updateState.errors?.notes ? (
              <p className="text-xs text-destructive">{updateState.errors.notes[0]}</p>
            ) : null}
          </div>
          <div className="flex gap-2">
            <SubmitButton size="sm">Save</SubmitButton>
            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <AlertDialogTrigger asChild>
                <Button type="button" size="sm" variant="destructive">
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent onOverlayClick={() => setDeleteOpen(false)}>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete court</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently removes “{court.name}”. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
                  <form action={deleteAction}>
                    <input type="hidden" name="courtId" value={court.id} />
                    <AlertDialogAction asChild>
                      <SubmitButton size="sm" variant="destructive">
                        Delete
                      </SubmitButton>
                    </AlertDialogAction>
                  </form>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </form>
      </TableCell>
    </TableRow>
  );
}

export function CourtManagement({ courts }: CourtManagementProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState(createCourtAction, initialState);
  useActionToast(state, {
    successPrefix: "Court created",
    errorPrefix: "Unable to create court",
  });

  useEffect(() => {
    if (state.success && state.toastKey) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state.success, state.toastKey, router]);

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Court Management</h1>
        <p className="text-sm text-muted-foreground">
          Add, update, and remove badminton courts.
        </p>
      </div>

      <form
        ref={formRef}
        action={action}
        className="space-y-4 rounded-xl border bg-card p-5 shadow-sm"
      >
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
        <SubmitButton>Add court</SubmitButton>
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
              <CourtRow key={court.id} court={court} />
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
