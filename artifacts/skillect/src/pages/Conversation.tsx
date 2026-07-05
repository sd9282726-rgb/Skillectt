import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Send } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetConversation,
  useSendMessage,
  getGetConversationQueryKey,
} from "@workspace/api-client-react";
import { useApp } from "@/context/AppContext";
import { timeAgo } from "@/lib/time";

export default function Conversation({ id }: { id: string }) {
  const conversationId = Number(id);
  const { currentUserId } = useApp();
  const [, setLocation] = useLocation();
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: conv, isLoading, isError } = useGetConversation(conversationId, {
    query: {
      queryKey: getGetConversationQueryKey(conversationId),
      enabled: !!conversationId,
      refetchInterval: 5000,
      refetchOnWindowFocus: true,
    },
  });
  const sendMessageMutation = useSendMessage();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [conv?.messages.length]);

  if (isError) {
    setLocation("/messages", { replace: true });
    return null;
  }

  if (isLoading || !conv) return null;

  const other = conv.participants.find((p) => p.id !== currentUserId);

  const handleSend = () => {
    if (!text.trim()) return;
    sendMessageMutation.mutate(
      { id: conv.id, data: { content: text.trim() } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            predicate: (query) =>
              typeof query.queryKey[0] === "string" &&
              query.queryKey[0].startsWith("/api/conversations"),
          });
          setText("");
        },
      },
    );
  };

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[100dvh] md:h-[calc(100dvh)]">
      <div className="flex items-center gap-3 px-4 md:px-6 py-4 border-b border-border sticky top-0 bg-background/95 backdrop-blur z-10">
        <Link href="/messages" className="h-9 w-9 rounded-full flex items-center justify-center hover-elevate">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        {other && (
          <>
            <img
              src={other.avatar}
              alt={other.name}
              className="h-9 w-9 rounded-full object-cover border border-border"
            />
            <div>
              <p className="text-sm font-semibold">{other.name}</p>
              <p className="text-xs text-muted-foreground">@{other.username}</p>
            </div>
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-3">
        {conv.messages.map((m) => {
          const mine = m.senderId === currentUserId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                  mine
                    ? "bg-primary text-primary-foreground"
                    : "bg-[var(--card-alt)] text-foreground"
                }`}
              >
                {m.content}
                <p
                  className={`text-[10px] mt-1 ${
                    mine ? "text-primary-foreground/70" : "text-muted-foreground"
                  }`}
                >
                  {timeAgo(m.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
        {conv.messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-10">
            Say hello to start the conversation.
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 px-4 md:px-6 py-3 border-t border-border">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Message..."
          className="flex-1 rounded-full bg-input border border-border px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!text.trim()}
          className="h-10 w-10 rounded-full bg-primary text-primary-foreground shadow-[0_0_12px_var(--primary-glow)] flex items-center justify-center hover-elevate disabled:opacity-40 disabled:pointer-events-none"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
