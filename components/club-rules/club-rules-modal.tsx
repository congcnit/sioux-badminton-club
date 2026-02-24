"use client";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ClubRulesContent } from "@/components/club-rules/club-rules-content";

type ClubRulesModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose?: () => void;
};

export function ClubRulesModal({ open, onOpenChange, onClose }: ClubRulesModalProps) {
  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) onClose?.();
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-xl">
            <span aria-hidden>🏸</span>
            Badminton Club Rules & Information
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="sr-only">
              Club schedule, participation rules, guest policy, and fund transfer information.
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-2">
          <ClubRulesContent />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
