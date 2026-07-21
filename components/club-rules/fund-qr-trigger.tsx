"use client";

import Image from "next/image";
import { useState } from "react";
import { QrCode } from "lucide-react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type FundQrTriggerProps = {
  className?: string;
  variant?: "default" | "outline" | "ghost" | "link" | "destructive" | "sport";
  size?: "default" | "sm" | "lg" | "icon";
};

export function FundQrTrigger({
  className,
  variant = "outline",
  size = "icon",
}: FundQrTriggerProps) {
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant={variant}
          size={size}
          className={className}
          aria-label="Show club fund transfer QR code"
          title="Fund transfer QR"
        >
          <QrCode className="size-4" aria-hidden />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent
        size="sm"
        className="flex flex-col"
        onOverlayClick={() => setOpen(false)}
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <QrCode className="size-5" aria-hidden />
            Club Fund Transfer
          </AlertDialogTitle>
          <AlertDialogDescription>
            Scan the QR code below to transfer money to the club fund.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex justify-center py-2">
          <Image
            src="/qr.png"
            alt="QR code for club fund transfer"
            width={320}
            height={320}
            className="max-w-full rounded-lg border border-border object-contain"
            unoptimized
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
