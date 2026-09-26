import { useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { MessageSquare, Plus, MessageCircle } from "lucide-react";
import AppLayout from "@/components/layout/app-layout.tsx";
import { Button } from "@/components/ui/button.tsx";
import ConversationList from "./_components/conversation-list.tsx";
import ChatPane from "./_components/chat-pane.tsx";
import NewConversationDialog from "./_components/new-conversation-dialog.tsx";

export default function MessagesPage() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [newDialogOpen, setNewDialogOpen] = useState(
    searchParams.get("new") === "true",
  );

  const initialRecipientId = searchParams.get("recipientId") ?? undefined;
  const initialContextType = (searchParams.get("contextType") as
    | "general"
    | "session"
    | "video") ?? "general";
  const initialContextTitle = searchParams.get("contextTitle") ?? "";

  const handleSelectConversation = (id: string) => {
    navigate(`/messages/${id}`);
  };

  const handleBackToList = () => {
    navigate("/messages");
  };

  const handleConversationCreated = (id: string) => {
    navigate(`/messages/${id}`);
  };

  return (
    <>
      <div className="flex h-[calc(100vh-4.25rem)] w-full overflow-hidden rounded-xl border bg-background shadow-xs">
        {/* Left: Conversation List */}
        <div
          className={`w-full md:w-80 lg:w-96 shrink-0 h-full ${
            conversationId ? "hidden md:block" : "block"
          }`}
        >
          <ConversationList
            activeConversationId={conversationId}
            onSelectConversation={handleSelectConversation}
            onOpenNewDialog={() => setNewDialogOpen(true)}
          />
        </div>

        {/* Right: Active Chat or Empty Placeholder */}
        <div
          className={`flex-1 h-full min-w-0 ${
            !conversationId ? "hidden md:flex md:flex-col" : "flex flex-col"
          }`}
        >
          {conversationId ? (
            <ChatPane
              conversationId={conversationId}
              onBackToList={handleBackToList}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center bg-muted/10">
              <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4 shadow-xs">
                <MessageCircle className="size-8" />
              </div>
              <h3 className="font-display text-xl font-bold tracking-tight text-foreground">
                PeakForm Direct Messaging
              </h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                Private, contextual 1-on-1 coaching channels. Select a conversation on the left or initiate a new channel with an athlete.
              </p>
              <Button
                onClick={() => setNewDialogOpen(true)}
                className="mt-6 gap-2 shadow-sm"
              >
                <Plus className="size-4" />
                Start New Channel
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* New Conversation Dialog */}
      <NewConversationDialog
        open={newDialogOpen}
        onOpenChange={setNewDialogOpen}
        onCreated={handleConversationCreated}
        initialRecipientId={initialRecipientId}
        initialContextType={initialContextType}
        initialContextTitle={initialContextTitle}
      />
    </>
  );
}
