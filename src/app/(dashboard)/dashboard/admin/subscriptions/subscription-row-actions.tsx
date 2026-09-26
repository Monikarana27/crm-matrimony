"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, MessageSquareText, History, PauseCircle, PlayCircle, RefreshCw, Receipt } from "lucide-react";
import { SubscriptionAddCommentDialog } from "@/components/subscriptions/subscription-add-comment-dialog";
import { SubscriptionCommentHistoryDialog } from "@/components/subscriptions/subscription-comment-history-dialog";
import { SubscriptionPauseDialog } from "@/components/subscriptions/subscription-pause-dialog";
import { SubscriptionRenewDialog } from "@/components/subscriptions/subscription-renew-dialog";
import { SubscriptionPaymentHistoryDialog } from "@/components/subscriptions/subscription-payment-history-dialog";
import { DeleteRowButton } from "@/components/shared/delete-row-button";
import { deleteSubscriptionAction, resumeSubscriptionAction } from "@/actions/subscriptions/subscription.actions";

type SubscriptionForActions = {
  id: string;
  followUpDate: Date | null;
  isPaused: boolean;
  pauseDays: number | null;
  profile: { id: string; name: string };
};

export function SubscriptionRowActions({ subscription, isAdmin = false }: { subscription: SubscriptionForActions; isAdmin?: boolean }) {
  const [addCommentOpen, setAddCommentOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [pauseOpen, setPauseOpen] = useState(false);
  const [renewOpen, setRenewOpen] = useState(false);
  const [paymentHistoryOpen, setPaymentHistoryOpen] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);

  async function handleResume() {
    setResumeError(null);
    setIsResuming(true);
    try {
      await resumeSubscriptionAction(subscription.id);
    } catch (e) {
      setResumeError(e instanceof Error ? e.message : "Failed to resume service.");
    } finally {
      setIsResuming(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {isAdmin && (
            <DropdownMenuItem onSelect={() => setRenewOpen(true)} className="text-blue-700 focus:text-blue-700">
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
              Renew / Extend Service
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => setPaymentHistoryOpen(true)} className="text-indigo-700 focus:text-indigo-700">
            <Receipt className="mr-2 h-3.5 w-3.5" />
            Payment History
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setAddCommentOpen(true)} className="text-violet-700 focus:text-violet-700">
            <MessageSquareText className="mr-2 h-3.5 w-3.5" />
            Add Comment
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setHistoryOpen(true)} className="text-cyan-700 focus:text-cyan-700">
            <History className="mr-2 h-3.5 w-3.5" />
            Comment History
          </DropdownMenuItem>
          {!subscription.isPaused && isAdmin && (
            <DropdownMenuItem onSelect={() => setPauseOpen(true)} className="text-amber-700 focus:text-amber-700">
              <PauseCircle className="mr-2 h-3.5 w-3.5" />
              Pause Service
            </DropdownMenuItem>
          )}
          {subscription.isPaused && (
            <DropdownMenuItem onSelect={handleResume} disabled={isResuming} className="text-emerald-700 focus:text-emerald-700">
              <PlayCircle className="mr-2 h-3.5 w-3.5" />
              {isResuming ? "Resuming..." : `Resume Service (+${subscription.pauseDays} days)`}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {resumeError && <p className="text-xs text-destructive">{resumeError}</p>}

      <SubscriptionAddCommentDialog
        subscriptionId={subscription.id}
        profileName={subscription.profile.name}
        currentFollowUpDate={subscription.followUpDate}
        open={addCommentOpen}
        onOpenChange={setAddCommentOpen}
      />
      <SubscriptionCommentHistoryDialog
        subscriptionId={subscription.id}
        profileName={subscription.profile.name}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
      />
      <SubscriptionPauseDialog
        subscriptionId={subscription.id}
        profileName={subscription.profile.name}
        open={pauseOpen}
        onOpenChange={setPauseOpen}
      />
      <SubscriptionRenewDialog
        profileId={subscription.profile.id}
        profileName={subscription.profile.name}
        open={renewOpen}
        onOpenChange={setRenewOpen}
      />
      <SubscriptionPaymentHistoryDialog
        profileId={subscription.profile.id}
        profileName={subscription.profile.name}
        open={paymentHistoryOpen}
        onOpenChange={setPaymentHistoryOpen}
      />
      {isAdmin && (
        <DeleteRowButton
          onDelete={() => deleteSubscriptionAction(subscription.id)}
          entityLabel="subscription"
          entityName={subscription.profile.name}
        />
      )}
    </div>
  );
}
