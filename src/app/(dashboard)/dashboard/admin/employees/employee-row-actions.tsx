"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  toggleEmployeeActiveAction,
  resetEmployeePasswordAction,
  deleteEmployeeAction,
} from "@/actions/employees/employee.actions";
import {
  MoreHorizontal,
  Pencil,
  Power,
  PowerOff,
  KeyRound,
  Activity,
  Copy,
  Check,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface EmployeeRowActionsProps {
  employee: {
    id: string;
    name: string;
    active: boolean;
  };
}

type ConfirmAction = "toggle" | "delete" | null;

export function EmployeeRowActions({ employee }: EmployeeRowActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isResetting, startResetTransition] = useTransition();

  const [resetOpen, setResetOpen] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function handleToggle() {
    startTransition(() => {
      toggleEmployeeActiveAction(employee.id, !employee.active);
      setConfirmAction(null);
    });
  }

  function handleDelete() {
    setDeleteError(null);
    startDeleteTransition(async () => {
      const result = await deleteEmployeeAction(employee.id);
      if (result?.error) {
        setDeleteError(result.error);
        return;
      }
      setConfirmAction(null);
    });
  }

  function handleResetPassword() {
    startResetTransition(async () => {
      const result = await resetEmployeePasswordAction(employee.id);
      setTempPassword(result.password);
    });
  }

  function copyPassword() {
    if (!tempPassword) return;
    navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function closeResetDialog() {
    setResetOpen(false);
    setTempPassword(null);
    setCopied(false);
  }

  function closeConfirmDialog() {
    setConfirmAction(null);
    setDeleteError(null);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem asChild className="text-xs">
            <Link href={`/dashboard/admin/employees/${employee.id}/edit`}>
              <Pencil className="mr-2 h-3.5 w-3.5" />
              Edit
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="text-xs">
            <Link href={`/dashboard/admin/activity-logs?actor=${employee.id}`}>
              <Activity className="mr-2 h-3.5 w-3.5" />
              View Activity
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setResetOpen(true)} className="text-xs">
            <KeyRound className="mr-2 h-3.5 w-3.5" />
            Reset Password
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => setConfirmAction("toggle")}
            className={`text-xs ${employee.active ? "text-destructive" : "text-emerald-600"}`}
          >
            {employee.active ? (
              <PowerOff className="mr-2 h-3.5 w-3.5" />
            ) : (
              <Power className="mr-2 h-3.5 w-3.5" />
            )}
            {employee.active ? "Disable" : "Activate"}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => setConfirmAction("delete")}
            className="text-xs text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Reset password dialog */}
      <Dialog open={resetOpen} onOpenChange={(open) => (open ? setResetOpen(true) : closeResetDialog())}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base">Reset Password</DialogTitle>
            <DialogDescription className="text-xs">
              {tempPassword
                ? `New password for ${employee.name}. Copy and share it securely — it won't be shown again.`
                : `Generate a new temporary password for ${employee.name}?`}
            </DialogDescription>
          </DialogHeader>

          {tempPassword ? (
            <div className="flex items-center gap-2 rounded-md border bg-muted/50 p-2">
              <code className="flex-1 font-mono text-sm">{tempPassword}</code>
              <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={copyPassword}>
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
          ) : (
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={closeResetDialog}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleResetPassword} disabled={isResetting}>
                {isResetting ? "Generating..." : "Generate New Password"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Unified confirm dialog: toggle active / delete */}
      <AlertDialog open={confirmAction !== null} onOpenChange={(open) => !open && closeConfirmDialog()}>
        <AlertDialogContent className="sm:max-w-sm">
          <AlertDialogHeader className="space-y-1">
            <AlertDialogTitle className="flex items-center gap-2 text-base">
              {confirmAction === "delete" && <AlertTriangle className="h-4 w-4 text-destructive" />}
              {confirmAction === "delete"
                ? "Delete this employee?"
                : employee.active
                ? "Disable this employee?"
                : "Re-activate this employee?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              {confirmAction === "delete" ? (
                <>
                  This permanently deletes <strong>{employee.name}</strong>&apos;s account. Their leads,
                  profiles, and other assigned records will be reassigned to an admin. This can&apos;t be
                  undone.
                </>
              ) : employee.active ? (
                `${employee.name} will no longer be able to log in. You can re-enable their account anytime.`
              ) : (
                `${employee.name} will regain access to log in.`
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {deleteError && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {deleteError}
            </p>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
            {confirmAction === "delete" ? (
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleDelete();
                }}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            ) : (
              <AlertDialogAction onClick={handleToggle} disabled={isPending} className="text-xs">
                {employee.active ? "Disable" : "Activate"}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}