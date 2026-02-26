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
      <AlertDialogContent
        size="xl"
        className="flex min-w-[400px] max-h-[90vh] flex-col"
        onOverlayClick={() => handleOpenChange(false)}
      >
        <AlertDialogHeader className="shrink-0">
          <AlertDialogTitle className="flex items-center gap-2 text-xl">
            <span aria-hidden>🏸</span>
            Club Rules & Information
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="sr-only">
              Club schedule, participation rules, guest policy, and fund transfer information.
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto py-2">
          <ClubRulesContent />
        </div>
        <AlertDialogFooter className="shrink-0 border-t border-border pt-4">
          <AlertDialogCancel>Close</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
