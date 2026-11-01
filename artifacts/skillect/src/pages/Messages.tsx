import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { timeAgo } from "@/lib/time";

interface ConversationItem {
  id: string;
  other: {
    id: string;
    display_name: string;
    username: string;
    avatar_url?: string | null;
  };
  lastMessage?: {
    content: string;
    sender_id: string;
    created_at: string;
  } | null;
}

export default function Messages() {
  const { currentUserId } = useApp();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      setLoading(true);

      const { data: parts } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id);

      const convIds = (parts || []).map((p) => p.conversation_id);
      if (convIds.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const items: ConversationItem[] = [];

      for (const convId of convIds) {
        const { data: others } = await supabase
          .from("conversation_participants")
          .select("user_id, profiles:user_id (id, display_name, username, avatar_url)")
          .eq("conversation_id", convId)
          .neq("user_id", user.id)
          .limit(1);

        const otherProfile = (others?.[0] as any)?.profiles;
        if (!otherProfile) continue;

        const { data: msgs } = await supabase
          .from("messages")
          .select("content, sender_id, created_at")
          .eq("conversation_id", convId)
          .order("created_at", { ascending: false })
          .limit(1);

        items.push({
          id: convId,
          other: otherProfile,
          lastMessage: msgs?.[0] || null,
        });
      }

      setConversations(items);
      setLoading(false);
    };

    load();
  }, [user?.id]);

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 bg-white min-h-full">
      <h1 className="text-xl font-bold mb-4 hidden md:block text-gray-900">Messages</h1>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        </div>
      ) : conversations.length === 0 ? (
        <p className="text-center text-sm text-gray-500 py-16">
          No conversations yet. Visit someone's profile to connect!
        </p>
      ) : (
        <div className="space-y-1">
          {conversations.map((conv) => (
            <Link
              key={conv.id}
              href={`/messages/${conv.id}`}
              className="flex items-center gap-3 rounded-xl p-3 hover:bg-gray-50"
            >
              <img
                src={
                  conv.other.avatar_url ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${conv.other.username}`
                }
                alt={conv.other.display_name}
                className="h-12 w-12 rounded-full object-cover border border-gray-200"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-sm truncate text-gray-900">
                    {conv.other.display_name}
                  </p>
                  {conv.lastMessage && (
                    <span className="text-xs text-gray-500 shrink-0">
                      {timeAgo(conv.lastMessage.created_at)}
                    </span>
                  )}
                </div>
                {conv.lastMessage && (
                  <p className="text-xs text-gray-500 truncate">
                    {conv.lastMessage.sender_id === currentUserId ? "You: " : ""}
                    {conv.lastMessage.content}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
