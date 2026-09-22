"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { updatePaymentStatusAction, deletePaymentAction } from "@/actions/payments/payment.actions";
import { DeleteRowButton } from "@/components/shared/delete-row-button";
import { toast } from "sonner";
import confetti from "canvas-confetti";

type PaymentRow = {
  id: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  transactionId: string | null;
  createdAt: Date;
  paymentOffer: { token: string } | null;
  subscription: {
    profile: { id: string; name: string; profileCode: string };
    plan: { id: string; name: string };
  };
};

const STATUS_STYLES: Record<string, string> = {
  PAID: "bg-emerald-100 text-emerald-700 border-emerald-200",
  PENDING: "bg-amber-100 text-amber-700 border-amber-200",
  FAILED: "bg-red-100 text-red-700 border-red-200",
};

function StatusSelect({ payment }: { payment: PaymentRow }) {
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(payment.status);

  function handleChange(newStatus: string) {
    setValue(newStatus);
    startTransition(() => {
      updatePaymentStatusAction(payment.id, newStatus as "PAID" | "PENDING" | "FAILED");
      if (newStatus === "PAID") {
        toast.success("Payment confirmed", {
          description: `${payment.subscription.profile.name}'s payment marked as paid.`,
        });
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
        });
      } else if (newStatus === "FAILED") {
        toast.error("Payment marked as failed", {
          description: `${payment.subscription.profile.name}'s payment status updated.`,
        });
      } else {
        toast.info("Payment status updated");
      }
    });
  }

  return (
    <Select value={value} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger className="h-8 w-28 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="PAID">Paid</SelectItem>
        <SelectItem value="PENDING">Pending</SelectItem>
        <SelectItem value="FAILED">Failed</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function PaymentsTable({ payments, canDelete = false }: { payments: PaymentRow[]; canDelete?: boolean }) {
  const columns: Column<PaymentRow>[] = [
    {
      key: "profile",
      header: "Profile",
      render: (row) => (
        <span className="font-medium">
          {row.subscription.profile.name}{" "}
          <span className="text-xs text-muted-foreground">
            ({row.subscription.profile.profileCode})
          </span>
        </span>
      ),
    },
    {
      key: "plan",
      header: "Plan",
      render: (row) => row.subscription.plan.name,
    },
    {
  key: "amount",
  header: "Amount",
  sortable: true,
  render: (row) => (
    <span className="tabular-nums font-medium">
      {row.currency === "USD" ? "$" : "₹"}
      {row.amount.toLocaleString("en-IN")}
    </span>
  ),
},
    {
      key: "method",
      header: "Method",
      render: (row) => (
        <Badge variant="outline">{row.method.replace("_", " ")}</Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusSelect payment={row} />,
    },
    {
      key: "receipt",
      header: "Proof",
      render: (row) =>
        row.status === "PAID" && row.paymentOffer?.token ? (
          <Link href={`/pay/${row.paymentOffer.token}/success`} target="_blank" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            View Receipt <ExternalLink className="h-3 w-3" />
          </Link>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      key: "createdAt",
      header: "Date",
      sortable: true,
      accessor: (row) => new Date(row.createdAt).getTime(),
      render: (row) => new Date(row.createdAt).toLocaleDateString("en-IN"),
    },
    ...(canDelete
      ? [
          {
            key: "actions",
            header: "",
            render: (row: PaymentRow) => (
              <DeleteRowButton
                onDelete={() => deletePaymentAction(row.id)}
                entityLabel="payment"
                entityName={`${row.subscription.profile.name} - ${row.currency === "USD" ? "$" : "₹"}${row.amount.toLocaleString("en-IN")}`}
              />
            ),
          } as Column<PaymentRow>,
        ]
      : []),
  ];

  return (
    <DataTable
      data={payments}
      columns={columns}
      searchPlaceholder="Search by profile name..."
      emptyMessage="No payments recorded yet."
    />
  );
}
