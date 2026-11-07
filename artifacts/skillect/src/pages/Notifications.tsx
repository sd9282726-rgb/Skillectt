import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Bell, CheckCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { timeAgo } from "@/lib/time";

interface NotificationRow {
  id: string;
  type: string;
  entity_type: string | null;
  entity_id: string | null;
  message: string | null;
  read: boolean;
  created_at: string;
  profiles: {
    id: string;
    display_name: string;
    username: string;
    avatar_url: string | null;
  } | null;
}

export default function Notifications() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const load = async () => {
    if (!user) return;
    setError(null);
    const { data, error: loadError } = await supabase
      .from("notifications")
      .select("id,type,entity_type,entity_id,message,read,created_at,profiles:actor_id(id,display_name,username,avatar_url)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (loadError) {
      setError(loadError.message);
      setItems([]);
    } else {
      setItems((data || []) as unknown as NotificationRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    void load();
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => void load()
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user?.id]);

  const markRead = async (item: NotificationRow) => {
    if (!user) return;
    if (!item.read) {
      const { error: updateError } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", item.id)
        .eq("user_id", user.id);
      if (updateError) {
        setError(updateError.message);
        return;
      }
      setItems((current) => current.map((row) => row.id === item.id ? { ...row, read: true } : row));
    }

    if (item.entity_type === "post" && item.entity_id) {
      setLocation(`/post/${item.entity_id}`);
    } else if (item.entity_type === "conversation" && item.entity_id) {
      setLocation(`/messages/${item.entity_id}`);
    } else if (item.profiles?.id) {
      setLocation(`/user/${item.profiles.id}`);
    }
  };

  const markAllRead = async () => {
    if (!user || markingAll) return;
    setMarkingAll(true);
    setError(null);
    const { error: updateError } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
    if (updateError) {
      setError(updateError.message);
    } else {
      setItems((current) => current.map((item) => ({ ...item, read: true })));
    }
    setMarkingAll(false);
  };

  const unreadCount = items.filter((item) => !item.read).length;

  return (
    <div className="mx-auto min-h-full max-w-2xl bg-white px-4 py-6 md:px-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
          <p className="mt-1 text-sm text-gray-500">
            {unreadCount ? `${unreadCount} unread update${unreadCount === 1 ? "" : "s"}` : "You're all caught up"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void markAllRead()}
          disabled={!unreadCount || markingAll}
          className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
        >
          <CheckCheck className="h-4 w-4" />
          {markingAll ? "Saving…" : "Mark all read"}
        </button>
      </div>

      {error && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((item) => <div key={item} className="h-16 animate-pulse rounded-xl bg-gray-50" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 px-5 py-14 text-center">
          <Bell className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-3 text-sm font-semibold text-gray-800">No notifications yet</p>
          <p className="mt-1 text-xs text-gray-500">Follows, likes, comments, and messages will appear here.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => void markRead(item)}
              className={`flex w-full items-start gap-3 px-2 py-4 text-left transition-colors hover:bg-gray-50 ${item.read ? "bg-white" : "bg-blue-50/60"}`}
            >
              <img
                src={item.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.profiles?.username || item.id}`}
                alt=""
                className="h-10 w-10 shrink-0 rounded-full border border-gray-200 object-cover"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-gray-800">
                  {item.message || `${item.profiles?.display_name || "Someone"} interacted with you`}
                </span>
                <span className="mt-1 block text-xs text-gray-500">{timeAgo(item.created_at)}</span>
              </span>
              {!item.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-600" aria-label="Unread" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
