"use client";

import { useState, useActionState, useEffect } from "react";

import {
  renameHousehold,
  inviteMember,
  cancelInvite,
  removeMember,
  leaveHousehold,
  type ActionState,
  type Household,
  type HouseholdMember,
  type HouseholdInvite,
} from "./actions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Loader, Pencil, Plus, Trash2, LogOut, UserPlus, X } from "lucide-react";

const initialState: ActionState = { ok: true };

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function HouseholdClient({
  household,
  members,
  invites,
  currentUserId,
}: {
  household: Household | null;
  members: HouseholdMember[];
  invites: HouseholdInvite[];
  currentUserId: string;
}) {
  const isOwner = members.find((m) => m.user_id === currentUserId)?.role === "owner";

  if (!household) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        No household found. Please sign out and back in.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Household Name */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{household.name}</CardTitle>
            {isOwner && <RenameDialog currentName={household.name} />}
          </div>
        </CardHeader>
      </Card>

      {/* Members */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Members</CardTitle>
            {isOwner && <InviteDialog />}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="truncate text-sm">
                  {member.full_name ?? member.email}
                </span>
                {member.full_name && (
                  <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                    {member.email}
                  </span>
                )}
                <Badge
                  variant={member.role === "owner" ? "default" : "outline"}
                >
                  {member.role}
                </Badge>
                {member.user_id === currentUserId && (
                  <Badge variant="secondary">you</Badge>
                )}
              </div>
              {isOwner && member.user_id !== currentUserId && (
                <RemoveMemberButton memberId={member.id} name={member.full_name ?? member.email} />
              )}
            </div>
          ))}

          {members.length > 1 && !isOwner && (
            <LeaveButton />
          )}
        </CardContent>
      </Card>

      {/* Pending Invites */}
      {isOwner && invites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invitations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between gap-2"
              >
                <span className="text-sm truncate">{invite.invited_email}</span>
                <CancelInviteButton inviteId={invite.id} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Rename Dialog
// ─────────────────────────────────────────────────────────────────────────────

function RenameDialog({ currentName }: { currentName: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    renameHousehold,
    initialState,
  );

  useEffect(() => {
    if (state.ok && !pending) {
      setOpen(false);
    }
  }, [state.ok, pending]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon">
                <Pencil className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Rename household</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename Household</DialogTitle>
          <DialogDescription>
            Choose a new name for your household.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="household-name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="household-name"
              name="name"
              defaultValue={currentName}
              required
            />
          </div>
          {!state.ok && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Invite Dialog
// ─────────────────────────────────────────────────────────────────────────────

function InviteDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    inviteMember,
    initialState,
  );

  useEffect(() => {
    if (state.ok && !pending) {
      setOpen(false);
    }
  }, [state.ok, pending]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="w-4 h-4 mr-1" />
          Invite
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Member</DialogTitle>
          <DialogDescription>
            Enter the email address of the person you want to invite. They will
            join your household when they next sign in.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="invite-email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="invite-email"
              name="email"
              type="email"
              placeholder="name@example.com"
              required
            />
          </div>
          {!state.ok && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                "Send Invite"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Remove / Cancel / Leave Buttons
// ─────────────────────────────────────────────────────────────────────────────

function RemoveMemberButton({
  memberId,
  name,
}: {
  memberId: string;
  name: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleRemove() {
    setLoading(true);
    await removeMember(memberId);
    setLoading(false);
    setConfirming(false);
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground">Remove {name}?</span>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleRemove}
          disabled={loading}
        >
          {loading ? <Loader className="w-3 h-3 animate-spin" /> : "Yes"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setConfirming(false)}
        >
          No
        </Button>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="iconDestructive"
            size="icon"
            onClick={() => setConfirming(true)}
          >
            <X className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Remove member</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function CancelInviteButton({ inviteId }: { inviteId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleCancel() {
    setLoading(true);
    await cancelInvite(inviteId);
    setLoading(false);
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="iconDestructive"
            size="icon"
            onClick={handleCancel}
            disabled={loading}
          >
            {loading ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Cancel invitation</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function LeaveButton() {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLeave() {
    setLoading(true);
    const result = await leaveHousehold();
    if (!result.ok) {
      setLoading(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2 pt-2 border-t">
        <span className="text-sm text-muted-foreground">
          Leave this household? A new one will be created for you.
        </span>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleLeave}
          disabled={loading}
        >
          {loading ? <Loader className="w-3 h-3 animate-spin" /> : "Leave"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setConfirming(false)}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="pt-2 border-t">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setConfirming(true)}
      >
        <LogOut className="w-4 h-4 mr-1" />
        Leave Household
      </Button>
    </div>
  );
}
