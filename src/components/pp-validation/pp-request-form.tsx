"use client";
import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  PPCriteriaFields,
  EMPTY_PP_CRITERIA,
  type PPCriteria,
  type RefOption,
} from "@/components/pp-validation/pp-criteria-fields";
import {
  submitPPValidationAction,
  resubmitPPValidationAction,
  type PPSubmitInput,
} from "@/actions/pp-validation/pp-validation.actions";

const fieldClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export type PPRequestFormInitial = PPSubmitInput;

export function PPRequestForm({
  religions,
  castes,
  motherTongues,
  editRequestId,
  initial,
  onDone,
}: {
  religions: RefOption[];
  castes: RefOption[];
  motherTongues: RefOption[];
  editRequestId?: string;
  initial?: PPRequestFormInitial;
  onDone?: () => void;
}) {
  const [clientName, setClientName] = useState(initial?.clientName ?? "");
  const [clientGender, setClientGender] = useState<"MALE" | "FEMALE" | "OTHER" | "">(initial?.clientGender ?? "");
  const [clientPhone, setClientPhone] = useState(initial?.clientPhone ?? "");
  const [clientEmail, setClientEmail] = useState(initial?.clientEmail ?? "");
  const [clientLocation, setClientLocation] = useState(initial?.clientLocation ?? "");
  const [packageDetails, setPackageDetails] = useState(initial?.packageDetails ?? "");
  const [amount, setAmount] = useState(initial?.amount ?? "");
  const [paymentMode, setPaymentMode] = useState(initial?.paymentMode ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [criteria, setCriteria] = useState<PPCriteria>(initial?.criteria ?? EMPTY_PP_CRITERIA);

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleSubmit() {
    setError(null);
    if (!clientName.trim()) return setError("Client name is required");
    if (!clientPhone.trim()) return setError("Client phone is required");

    const input: PPSubmitInput = {
      clientName,
      clientPhone,
      clientEmail,
      clientLocation,
      packageDetails,
      amount,
      paymentMode,
      notes,
      criteria,
    };

    startTransition(async () => {
      try {
        if (editRequestId) {
          await resubmitPPValidationAction(editRequestId, input);
        } else {
          await submitPPValidationAction(input);
          setClientName("");
          setClientPhone("");
          setClientEmail("");
          setClientLocation("");
          setPackageDetails("");
          setAmount("");
          setPaymentMode("");
          setNotes("");
          setCriteria(EMPTY_PP_CRITERIA);
        }
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
        onDone?.();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {editRequestId ? "Revise & resubmit" : "Send for PP Validation"}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Sent to your SME to check we have enough matching profiles before this goes further.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="mb-4 text-sm font-semibold text-muted-foreground">CLIENT &amp; SALE</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Client Name *</label>
              <input className={fieldClass} value={clientName} onChange={(e) => setClientName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Client Gender *</label>
              <select
                className={fieldClass}
                value={clientGender}
                onChange={(e) => setClientGender(e.target.value as "MALE" | "FEMALE" | "OTHER" | "")}
              >
                <option value="">Select</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Contact Number *</label>
              <input className={fieldClass} value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Client Email</label>
              <input className={fieldClass} value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Client Location</label>
              <input className={fieldClass} value={clientLocation} onChange={(e) => setClientLocation(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Package Details</label>
              <input className={fieldClass} value={packageDetails} onChange={(e) => setPackageDetails(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Amount</label>
              <input className={fieldClass} value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Payment Mode</label>
              <input className={fieldClass} value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} />
            </div>
          </div>
        </div>

        <PPCriteriaFields
          value={criteria}
          onChange={setCriteria}
          religions={religions}
          castes={castes}
          motherTongues={motherTongues}
        />

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Notes (anything that doesn't fit the fields above)</label>
          <textarea
            className={fieldClass + " min-h-[90px]"}
            placeholder="e.g. for the Malayali community prefer these sub-castes, otherwise consider via horoscope match..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-emerald-600">Sent for validation.</p>}
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Sending..." : editRequestId ? "Resubmit" : "Send for validation"}
        </Button>
      </CardContent>
    </Card>
  );
}
