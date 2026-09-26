import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { Link } from "react-router-dom";
import { format, isToday, isYesterday } from "date-fns";
import { toast } from "sonner";
import {
  Send,
  ArrowLeft,
  Activity,
  Video,
  ExternalLink,
  Check,
  CheckCheck,
  Sparkles,
  Info,
  User,
} from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Avatar, AvatarFallback } from "@/components/ui/avatar.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { cn } from "@/lib/utils.ts";

interface ChatPaneProps {
  conversationId: string;
  onBackToList?: () => void;
}

const COACHING_PROMPTS = [
  "🔥 Great execution on today's drill!",
  "📹 Please review your mechanics in Video Hub.",
  "💧 Prioritize recovery & hydration tonight.",
  "⚡ Focus on explosive shin angles tomorrow.",
];

function formatMessageTime(isoStr: string) {
  try {
    const d = new Date(isoStr);
    return isNaN(d.getTime()) ? "" : format(d, "h:mm a");
  } catch {
    return "";
  }
}

function formatDateHeader(isoStr: string) {
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return "";
    if (isToday(d)) return "Today";
    if (isYesterday(d)) return "Yesterday";
    return format(d, "EEEE, MMMM d, yyyy");
  } catch {
    return "";
  }
}

function getInitials(name?: string, email?: string) {
  if (name) {
    const parts = name.split(" ");
    return parts.length >= 2
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : name.slice(0, 2).toUpperCase();
  }
  return (email?.slice(0, 2) ?? "U").toUpperCase();
}

export default function ChatPane({
  conversationId,
  onBackToList,
}: ChatPaneProps) {
  const { user } = useCurrentUser();
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const conversation = useQuery(api.messages.getConversation, {
    conversationId: conversationId as Id<"conversations">,
  });

  const rawMessages = useQuery(api.messages.listMessages, {
    conversationId: conversationId as Id<"conversations">,
  });

  const sendMessage = useMutation(api.messages.sendMessage);
  const markRead = useMutation(api.messages.markConversationRead);

  // Mark conversation read automatically whenever new unread messages are visible
  useEffect(() => {
    if (!conversationId || !rawMessages || !user) return;
    const hasUnread = rawMessages.some(
      (m) => !m.readBy.includes(user._id),
    );
    if (hasUnread) {
      markRead({ conversationId: conversationId as Id<"conversations"> }).catch(
        () => {},
      );
    }
  }, [conversationId, rawMessages, user, markRead]);

  // Scroll to bottom when messages load or change
  useEffect(() => {
    if (rawMessages && rawMessages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [rawMessages]);

  // Find other participant
  const participants = conversation?.participants;
  const otherParticipant = useMemo(() => {
    if (!participants || !user) return null;
    return (
      participants.find((p) => p?._id !== user._id) ??
      participants[0]
    );
  }, [participants, user]);

  // Group messages by day
  const groupedMessages = useMemo(() => {
    if (!rawMessages) return [];
    const groups: { dateHeader: string; messages: typeof rawMessages }[] = [];

    rawMessages.forEach((msg) => {
      const header = formatDateHeader(msg.createdAt);
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.dateHeader === header) {
        lastGroup.messages.push(msg);
      } else {
        groups.push({ dateHeader: header, messages: [msg] });
      }
    });

    return groups;
  }, [rawMessages]);

  const handleSend = async (contentToSend?: string) => {
    const text = (contentToSend ?? inputText).trim();
    if (!text || isSending) return;

    setIsSending(true);
    try {
      await sendMessage({
        conversationId: conversationId as Id<"conversations">,
        content: text,
      });
      setInputText("");
      textareaRef.current?.focus();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send message",
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (conversation === undefined) {
    return (
      <div className="flex h-full flex-col p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <Skeleton className="h-full w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3 bg-card/40 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          {onBackToList && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden size-8"
              onClick={onBackToList}
            >
              <ArrowLeft className="size-4" />
            </Button>
          )}

          <Avatar className="size-10 border shadow-xs">
            <AvatarFallback className="text-xs font-bold bg-secondary">
              {getInitials(otherParticipant?.name, otherParticipant?.email)}
            </AvatarFallback>
          </Avatar>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-semibold text-sm leading-none">
                {otherParticipant?.name || otherParticipant?.email || "Direct Channel"}
              </h3>
              {otherParticipant?.role && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 capitalize"
                >
                  {otherParticipant.role.replace("_", " ")}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {otherParticipant?.email || "1-on-1 Direct Channel"}
            </p>
          </div>
        </div>

        {/* Header Action: Link to athlete profile if applicable */}
        {conversation.athleteId && (
          <Button
            variant="outline"
            size="sm"
            asChild
            className="hidden sm:flex gap-1.5 text-xs h-8"
          >
            <Link to={`/athletes/${conversation.athleteId}`}>
              <User className="size-3.5" />
              Athlete Profile
            </Link>
          </Button>
        )}
      </div>

      {/* Attached Context Banner */}
      {conversation.contextType && conversation.contextType !== "general" && (
        <div className="flex items-center justify-between gap-3 px-4 py-2 border-b bg-muted/30 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            {conversation.contextType === "session" ? (
              <Activity className="size-4 text-blue-500 shrink-0" />
            ) : (
              <Video className="size-4 text-purple-500 shrink-0" />
            )}
            <span className="font-medium text-foreground truncate">
              Context:{" "}
              {conversation.contextTitle ||
                (conversation.contextType === "session"
                  ? "Training Session Discussion"
                  : "Video Analysis Review")}
            </span>
          </div>

          {conversation.contextType === "session" && conversation.contextId && (
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-6 px-2 text-xs gap-1 text-primary shrink-0"
            >
              <Link to={`/sessions/${conversation.contextId}`}>
                View Session
                <ExternalLink className="size-3" />
              </Link>
            </Button>
          )}

          {conversation.contextType === "video" && (
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-6 px-2 text-xs gap-1 text-purple-600 dark:text-purple-400 shrink-0"
            >
              <Link to="/video-hub">
                Video Hub
                <ExternalLink className="size-3" />
              </Link>
            </Button>
          )}
        </div>
      )}

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {rawMessages === undefined ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  "flex gap-2 max-w-[70%]",
                  i % 2 === 0 ? "ml-auto justify-end" : "",
                )}
              >
                <Skeleton className="h-14 w-60 rounded-2xl" />
              </div>
            ))}
          </div>
        ) : rawMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
              <Sparkles className="size-6" />
            </div>
            <h4 className="font-display font-semibold text-base">
              Start the Coaching Dialogue
            </h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Send your first feedback, drill adjustment, or performance notes. Messages in this channel are private between you and {otherParticipant?.name ?? "this member"}.
            </p>
          </div>
        ) : (
          groupedMessages.map((group) => (
            <div key={group.dateHeader} className="space-y-3">
              {/* Date Header Divider */}
              <div className="relative flex items-center justify-center my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/50" />
                </div>
                <span className="relative bg-background px-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  {group.dateHeader}
                </span>
              </div>

              {/* Messages in Group */}
              {group.messages.map((m) => {
                const isOutgoing = m.senderId === user?._id;
                const isReadByOther =
                  m.readBy.filter((id) => id !== user?._id).length > 0;

                return (
                  <div
                    key={m._id}
                    className={cn(
                      "flex flex-col",
                      isOutgoing ? "items-end" : "items-start",
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-end gap-2 max-w-[85%] sm:max-w-[75%]",
                        isOutgoing ? "flex-row-reverse" : "flex-row",
                      )}
                    >
                      {!isOutgoing && (
                        <Avatar className="size-7 shrink-0 mb-1 border shadow-2xs">
                          <AvatarFallback className="text-[10px] font-semibold bg-secondary">
                            {getInitials(m.senderName)}
                          </AvatarFallback>
                        </Avatar>
                      )}

                      <div
                        className={cn(
                          "rounded-2xl px-4 py-2.5 text-sm shadow-xs break-words space-y-1.5",
                          isOutgoing
                            ? "bg-primary text-primary-foreground rounded-br-xs"
                            : "bg-muted/80 text-foreground border border-border/50 rounded-bl-xs",
                        )}
                      >
                        {!isOutgoing && (
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold opacity-85">
                            <span>{m.senderName}</span>
                            {m.senderRole && (
                              <span className="capitalize text-[10px] font-normal opacity-70">
                                ({m.senderRole})
                              </span>
                            )}
                          </div>
                        )}

                        <p className="whitespace-pre-wrap leading-relaxed">
                          {m.content}
                        </p>

                        {/* Timestamp & Read Receipts */}
                        <div
                          className={cn(
                            "flex items-center gap-1 text-[10px] justify-end pt-0.5",
                            isOutgoing
                              ? "text-primary-foreground/75"
                              : "text-muted-foreground",
                          )}
                        >
                          <span>{formatMessageTime(m.createdAt)}</span>
                          {isOutgoing && (
                            <span title={isReadByOther ? "Read" : "Sent"}>
                              {isReadByOther ? (
                                <CheckCheck className="size-3 text-sky-200" />
                              ) : (
                                <Check className="size-3 text-primary-foreground/70" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Coaching Suggestion Chips */}
      <div className="px-4 py-2 border-t bg-muted/20">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <span className="text-[11px] font-medium text-muted-foreground shrink-0 mr-1 flex items-center gap-1">
            <Sparkles className="size-3 text-amber-500" />
            Quick:
          </span>
          {COACHING_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(prompt)}
              className="text-[11px] px-2.5 py-1 rounded-full border bg-background hover:bg-muted transition-colors whitespace-nowrap text-muted-foreground hover:text-foreground shrink-0"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Composer Input Area */}
      <div className="p-3 border-t bg-card/50">
        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            className="min-h-[44px] max-h-32 resize-none text-sm py-2.5 leading-normal"
          />

          <Button
            size="icon"
            onClick={() => handleSend()}
            disabled={!inputText.trim() || isSending}
            className="size-10 shrink-0 shadow-sm"
          >
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
