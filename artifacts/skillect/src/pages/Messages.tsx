import { Link } from "wouter";
import {
  useListConversations,
  getListConversationsQueryKey,
} from "@workspace/api-client-react";
import { useApp } from "@/context/AppContext";
import { timeAgo } from "@/lib/time";

export default function Messages() {
  const { currentUserId } = useApp();
  const { data: conversations = [], isLoading } = useListConversations({
    query: {
      queryKey: getListConversationsQueryKey(),
      refetchInterval: 10000,
      refetchOnWindowFocus: true,
    },
  });

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6">
      <h1 className="text-xl font-bold mb-4 hidden md:block">Messages</h1>

      {!isLoading && conversations.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-16">
          No conversations yet. Visit someone's profile to say hi!
        </p>
      ) : (
        <div className="space-y-1">
          {conversations.map((conv) => {
            const other = conv.participants.find((p) => p.id !== currentUserId);
            const lastMessage = conv.messages[conv.messages.length - 1];
            if (!other) return null;
            return (
              <Link
                key={conv.id}
                href={`/messages/${conv.id}`}
                className="flex items-center gap-3 rounded-xl p-3 hover-elevate"
              >
                <img
                  src={other.avatar}
                  alt={other.name}
                  className="h-12 w-12 rounded-full object-cover border border-border"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-sm truncate">{other.name}</p>
                    {lastMessage && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        {timeAgo(lastMessage.createdAt)}
                      </span>
                    )}
                  </div>
                  {lastMessage && (
                    <p className="text-xs text-muted-foreground truncate">
                      {lastMessage.senderId === currentUserId ? "You: " : ""}
                      {lastMessage.content}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
