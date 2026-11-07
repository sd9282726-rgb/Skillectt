import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft, Send } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { timeAgo } from "@/lib/time";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
}

interface OtherUser {
  id: string;
  display_name: string;
  username: string;
  avatar_url?: string | null;
}

export default function Conversation({ id }: { id: string }) {
  const { currentUserId } = useApp();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [other, setOther] = useState<OtherUser | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      setLoading(true);

      const { data: others } = await supabase
        .from("conversation_participants")
        .select("user_id, profiles:user_id (id, display_name, username, avatar_url)")
        .eq("conversation_id", id)
        .neq("user_id", user.id)
        .limit(1);

      if (others?.[0]) {
        setOther((others[0] as any).profiles);
      }

      const { data: msgs } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });

      setMessages((msgs || []) as Message[]);
      setLoading(false);
    };

    load();

    const channel = supabase
      .channel(`messages:${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${id}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, user?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const handleSend = async () => {
    if (!text.trim() || !user || sending) return;
    const content = text.trim();
    setSending(true);
    setActionError(null);

    const { error } = await supabase.functions.invoke("moderate-text", {
      body: { type: "message", conversation_id: id, content },
    });

    if (error) {
      setActionError(error.message || "Message could not be sent.");
    } else {
      setText("");
    }
    setSending(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16 bg-white min-h-full">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[100dvh] md:h-[calc(100dvh)] bg-white">
      <div className="flex items-center gap-3 px-4 md:px-6 py-4 border-b border-gray-200 sticky top-0 bg-white/95 backdrop-blur z-10">
        <Link href="/messages" className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        {other && (
          <>
            <img
              src={
                other.avatar_url ||
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${other.username}`
              }
              alt={other.display_name}
              className="h-9 w-9 rounded-full object-cover border border-gray-200"
            />
            <div>
              <p className="text-sm font-semibold text-gray-900">{other.display_name}</p>
              <p className="text-xs text-gray-500">@{other.username}</p>
            </div>
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-3">
        {messages.map((m) => {
          const mine = m.sender_id === currentUserId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                  mine ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"
                }`}
              >
                {m.content}
                <p className={`text-[10px] mt-1 ${mine ? "text-blue-100" : "text-gray-500"}`}>
                  {timeAgo(m.created_at)}
                </p>
              </div>
            </div>
          );
        })}
        {messages.length === 0 && (
          <p className="text-center text-sm text-gray-500 py-10">
            Say hello to start the conversation.
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      {actionError && <p role="alert" className="px-4 pt-2 text-xs text-red-600">{actionError}</p>}
      <div className="flex gap-2 px-4 md:px-6 py-3 border-t border-gray-200">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Message..."
          className="flex-1 rounded-full bg-gray-50 border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
