import { useState } from "react";
import { Check, Copy, KeyRound, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";

export interface GeneratedCredentials {
  name?: string;
  email: string;
  password: string;
  role: string;
  academyName?: string;
}

interface CredentialsSuccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credentials: GeneratedCredentials | null;
  onDone?: () => void;
}

const ROLE_DISPLAY: Record<string, string> = {
  platform_admin: "Super Admin",
  academy_admin: "Academy Manager",
  coach: "Coach / Staff",
  athlete: "Athlete",
  guardian: "Parent / Guardian",
  accounting: "Accounting / Finance",
};

export function CredentialsSuccessDialog({
  open,
  onOpenChange,
  credentials,
  onDone,
}: CredentialsSuccessDialogProps) {
  const [copied, setCopied] = useState(false);

  if (!credentials) return null;

  const roleLabel = ROLE_DISPLAY[credentials.role] ?? credentials.role;

  const handleCopy = async () => {
    const text = [
      `CoachTactics Login Credentials`,
      `--------------------------------`,
      `Academy:  ${credentials.academyName ?? "Designated Academy"}`,
      `Role:     ${roleLabel}`,
      `Username: ${credentials.email}`,
      `Password: ${credentials.password}`,
      `--------------------------------`,
      `Login:    ${typeof window !== "undefined" ? window.location.origin : "https://coachtactics.com"}`,
    ].join("\n");

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for non-secure contexts
        const textarea = document.createElement("textarea");
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      toast.success("Credentials copied to clipboard", {
        description: `Ready to send to ${credentials.email}`,
      });
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error("Failed to copy automatically. Please copy the text manually.");
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    onDone?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2.5 text-emerald-600 mb-1">
            <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <ShieldCheck className="size-5" />
            </div>
            <DialogTitle className="text-lg">Account & Password Created</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Since automated email sending is pending configuration, copy and share these
            auto-generated login credentials with the user so they can immediately sign in.
          </DialogDescription>
        </DialogHeader>

        {/* Credentials Card */}
        <div className="rounded-xl border border-border/70 bg-muted/40 p-4 space-y-3">
          {credentials.academyName && (
            <div className="flex items-center justify-between text-xs border-b border-border/40 pb-2">
              <span className="text-muted-foreground font-medium">Academy</span>
              <span className="font-semibold text-foreground truncate max-w-[220px]">
                {credentials.academyName}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs border-b border-border/40 pb-2">
            <span className="text-muted-foreground font-medium">Assigned Role</span>
            <span className="font-semibold text-primary">{roleLabel}</span>
          </div>

          <div className="flex items-center justify-between text-xs border-b border-border/40 pb-2">
            <span className="text-muted-foreground font-medium">Email / Username</span>
            <span className="font-mono font-medium text-foreground select-all">
              {credentials.email}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-muted-foreground font-medium flex items-center gap-1.5">
              <KeyRound className="size-3.5 text-amber-500" />
              <span>Auto Password</span>
            </span>
            <span className="font-mono text-sm font-bold tracking-wide text-foreground bg-background px-2.5 py-1 rounded-md border border-border select-all shadow-xs">
              {credentials.password}
            </span>
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
          <Button variant="outline" onClick={handleClose} className="sm:flex-1">
            Done
          </Button>
          <Button
            onClick={handleCopy}
            className="sm:flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            <span>{copied ? "Copied!" : "Copy Credentials"}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
