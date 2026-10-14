"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatMoney } from "@/lib/money";
import { processRefundAction } from "@/actions/subscriptions/refund.actions";
import type { getRefundClients } from "@/actions/subscriptions/refund.actions";

type RefundRow = Awaited<ReturnType<typeof getRefundClients>>[number];

function paidInr(row: RefundRow): number {
  return row.subscription.payments.reduce(
    (sum, p) => sum + (p.amountInr ?? (p.currency === "INR" ? p.amount : 0)),
    0
  );
}

function ProcessDialog({
  row,
  onClose,
}: {
  row: RefundRow | null;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const open = !!row;

  function handleSubmit() {
    if (!row) return;
    setError(null);
    const trimmed = amount.trim();
    const n = trimmed === "" ? null : Number(trimmed);
    if (n !== null && (!Number.isFinite(n) || n < 0)) {
      setError("Enter a valid refund amount, or leave it blank.");
      return;
    }
    startTransition(async () => {
      const res = await processRefundAction(row.id, { amount: n, note });
      if (res?.error) {
        setError(res.error);
        return;
      }
      toast.success("Refund marked as completed");
      setAmount("");
      setNote("");
      onClose();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark refund as completed</DialogTitle>
          <DialogDescription>
            {row ? row.subscription.profile.name + ": confirm the money has been returned." : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">Amount refunded (INR, optional)</label>
            <Input
              type="number"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={row ? "Paid so far: " + paidInr(row) : ""}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Note (optional)</label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="e.g. Refunded via bank transfer, ref no..." />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Saving..." : "Mark Completed"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RefundsTable({ refunds }: { refunds: RefundRow[] }) {
  const [processing, setProcessing] = useState<RefundRow | null>(null);

  const columns: Column<RefundRow>[] = [
    {
      key: "client",
      header: "Client",
      accessor: (row) => row.subscription.profile.name + " " + row.subscription.profile.profileCode,
      render: (row) => (
        <div>
          <Link
            href={"/dashboard/admin/profiles/" + row.subscription.profile.id}
            className="font-medium text-primary hover:underline"
          >
            {row.subscription.profile.name}{" "}
            <span className="text-xs text-muted-foreground">({row.subscription.profile.profileCode})</span>
          </Link>
          <div className="text-xs text-muted-foreground">
            RM: {row.subscription.profile.assignedTo?.name ?? "Unassigned"}
          </div>
        </div>
      ),
    },
    {
      key: "plan",
      header: "Plan / Paid",
      render: (row) => (
        <div className="text-sm">
          {row.subscription.plan.name}
          <div className="text-xs text-muted-foreground tabular-nums">
            Paid: {formatMoney(paidInr(row), "INR")}
          </div>
        </div>
      ),
    },
    {
      key: "reason",
      header: "Reason",
      render: (row) => (
        <p className="max-w-xs whitespace-pre-wrap text-sm" title={row.reason}>
          {row.reason}
        </p>
      ),
    },
    {
      key: "marked",
      header: "Marked by",
      sortable: true,
      accessor: (row) => new Date(row.requestedAt).getTime(),
      render: (row) => (
        <div className="text-sm">
          {row.requestedByName}
          <div className="text-xs text-muted-foreground">
            {new Date(row.requestedAt).toLocaleDateString("en-IN")}
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Refund Status",
      render: (row) =>
        row.status === "PROCESSED" ? (
          <div>
            <Badge variant="outline" className="border-emerald-200 bg-emerald-100 text-emerald-700">
              Completed
            </Badge>
            <div className="mt-1 text-xs text-muted-foreground">
              {row.amount != null ? formatMoney(row.amount, "INR") + " " : ""}
              {row.processedByName ? "by " + row.processedByName : ""}
              {row.processedAt ? " on " + new Date(row.processedAt).toLocaleDateString("en-IN") : ""}
            </div>
            {row.processNote && <div className="text-xs text-muted-foreground">{row.processNote}</div>}
          </div>
        ) : (
          <Badge variant="outline" className="border-amber-200 bg-amber-100 text-amber-700">
            Pending
          </Badge>
        ),
    },
    {
      key: "actions",
      header: "",
      render: (row) =>
        row.status === "PENDING" ? (
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={() => setProcessing(row)}>
              Mark Completed
            </Button>
          </div>
        ) : null,
    },
  ];

  return (
    <>
      <DataTable
        data={refunds}
        columns={columns}
        searchPlaceholder="Search by client name..."
        emptyMessage="No clients have been marked for refund."
      />
      <ProcessDialog row={processing} onClose={() => setProcessing(null)} />
    </>
  );
}
