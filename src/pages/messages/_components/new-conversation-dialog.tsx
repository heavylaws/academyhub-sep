import { useState, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  MessageSquarePlus,
  Search,
  User,
  Activity,
  Video,
} from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Avatar, AvatarFallback } from "@/components/ui/avatar.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { useCurrentUser } from "@/hooks/use-current-user.ts";

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (conversationId: string) => void;
  initialRecipientId?: string;
  initialContextType?: "general" | "session" | "video";
  initialContextTitle?: string;
}

const ROLE_BADGES: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  coach: { label: "Coach", variant: "default" },
  athlete: { label: "Athlete", variant: "secondary" },
  academy_admin: { label: "Admin", variant: "outline" },
  accounting: { label: "Staff", variant: "outline" },
};

export default function NewConversationDialog({
  open,
  onOpenChange,
  onCreated,
  initialRecipientId,
  initialContextType = "general",
  initialContextTitle = "",
}: NewConversationDialogProps) {
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const members = useQuery(api.users.listAcademyMembers, {});
  const getOrCreateConversation = useMutation(api.messages.getOrCreateConversation);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string>(
    initialRecipientId || "",
  );
  const [contextType, setContextType] = useState<
    "general" | "session" | "video"
  >(initialContextType);
  const [contextTitle, setContextTitle] = useState(initialContextTitle);
  const [initialMessage, setInitialMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Eligible recipients: other academy members (excluding current user)
  const eligibleMembers = useMemo(() => {
    if (!members) return [];
    return members.filter((m) => m._id !== user?._id);
  }, [members, user?._id]);

  const filteredMembers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return eligibleMembers;
    return eligibleMembers.filter(
      (m) =>
        m.name?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q) ||
        m.role?.toLowerCase().includes(q),
    );
  }, [eligibleMembers, searchQuery]);

  const handleStartConversation = async () => {
    if (!selectedUserId) {
      toast.error("Please select an athlete or coach to message");
      return;
    }

    setIsSubmitting(true);
    try {
      const convId = await getOrCreateConversation({
        targetUserId: selectedUserId as Id<"users">,
        contextType: contextType !== "general" ? contextType : undefined,
        contextTitle: contextTitle.trim() || undefined,
        initialMessage: initialMessage.trim() || undefined,
      });

      toast.success("Direct channel opened");
      onOpenChange(false);
      // Reset form
      setSelectedUserId("");
      setContextTitle("");
      setInitialMessage("");
      setSearchQuery("");

      if (onCreated) {
        onCreated(convId);
      } else {
        navigate(`/messages/${convId}`);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to start conversation",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      const parts = name.split(" ");
      return parts.length >= 2
        ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
        : name.slice(0, 2).toUpperCase();
    }
    return (email?.slice(0, 2) ?? "US").toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <MessageSquarePlus className="size-5 text-primary" />
            New Direct Message Channel
          </DialogTitle>
          <DialogDescription>
            Start a private 1-on-1 coaching dialogue with an athlete or coach in your academy.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Member Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Select Recipient</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search athlete or coach by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <ScrollArea className="h-44 rounded-md border p-1">
              <div className="space-y-1">
                {filteredMembers.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No matching members found
                  </div>
                ) : (
                  filteredMembers.map((m) => {
                    const isSelected = selectedUserId === m._id;
                    const badgeInfo = ROLE_BADGES[m.role ?? "athlete"] || {
                      label: m.role || "Member",
                      variant: "outline",
                    };

                    return (
                      <button
                        key={m._id}
                        type="button"
                        onClick={() => setSelectedUserId(m._id)}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors ${
                          isSelected
                            ? "bg-primary/15 border-primary/40 border text-foreground"
                            : "hover:bg-muted/60 text-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="size-8">
                            <AvatarFallback className="text-xs font-semibold">
                              {getInitials(m.name, m.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium leading-none">
                              {m.name || m.email}
                            </p>
                            {m.name && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {m.email}
                              </p>
                            )}
                          </div>
                        </div>
                        <Badge variant={badgeInfo.variant} className="text-xs capitalize">
                          {badgeInfo.label}
                        </Badge>
                      </button>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Context Binding (Optional) */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground">
                Context Binding (Optional)
              </Label>
              <Select
                value={contextType}
                onValueChange={(val: "general" | "session" | "video") =>
                  setContextType(val)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Context" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">
                    <div className="flex items-center gap-2">
                      <User className="size-3.5" />
                      General Coaching
                    </div>
                  </SelectItem>
                  <SelectItem value="session">
                    <div className="flex items-center gap-2">
                      <Activity className="size-3.5 text-blue-500" />
                      Training Session
                    </div>
                  </SelectItem>
                  <SelectItem value="video">
                    <div className="flex items-center gap-2">
                      <Video className="size-3.5 text-purple-500" />
                      Video Review
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {contextType !== "general" && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground">
                  Context Label / Reference
                </Label>
                <Input
                  placeholder={
                    contextType === "session"
                      ? "e.g. Block 3 Sprint Mechanics"
                      : "e.g. Hurdle Clearance Drill Video"
                  }
                  value={contextTitle}
                  onChange={(e) => setContextTitle(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Initial Message */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground">
              Initial Message (Optional)
            </Label>
            <Textarea
              placeholder="Write your message..."
              value={initialMessage}
              onChange={(e) => setInitialMessage(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleStartConversation}
            disabled={!selectedUserId || isSubmitting}
          >
            {isSubmitting ? "Starting..." : "Start Channel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
