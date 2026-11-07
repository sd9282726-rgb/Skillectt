import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { ArrowLeft, MapPin } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import PostCard from "@/components/PostCard";

interface Profile {
  id: string;
  display_name: string;
  username: string;
  avatar_url?: string | null;
  bio: string;
  location?: string | null;
  skills: string[];
}

interface PostRow {
  id: string;
  content: string;
  image_url?: string | null;
  tags: string[];
  likes_count: number;
  comments_count: number;
  created_at: string;
  author_id: string;
}

export default function UserProfilePage({ id }: { id: string }) {
  const { currentUserId } = useApp();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (currentUserId && id === currentUserId) {
      setLocation("/profile", { replace: true });
      return;
    }

    const load = async () => {
      setLoading(true);

      const [profileRes, postsRes, followersRes, followingRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", id).single(),
        supabase
          .from("posts")
          .select("*")
          .eq("author_id", id)
          .order("created_at", { ascending: false }),
        supabase
          .from("follows")
          .select("id", { count: "exact", head: true })
          .eq("following_id", id),
        supabase
          .from("follows")
          .select("id", { count: "exact", head: true })
          .eq("follower_id", id),
      ]);

      if (profileRes.data) setProfile(profileRes.data as Profile);
      if (postsRes.data) setPosts(postsRes.data as PostRow[]);
      setFollowerCount(followersRes.count ?? 0);
      setFollowingCount(followingRes.count ?? 0);

      if (user) {
        const { data: followData } = await supabase
          .from("follows")
          .select("id")
          .eq("follower_id", user.id)
          .eq("following_id", id)
          .maybeSingle();
        setIsFollowing(!!followData);
      }

      setLoading(false);
    };

    load();
  }, [id, currentUserId, user?.id]);

  const toggleFollow = async () => {
    if (!user || followLoading) return;
    setFollowLoading(true);
    setActionError(null);

    const result = isFollowing
      ? await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", id)
      : await supabase.from("follows").insert({ follower_id: user.id, following_id: id });

    if (result.error) {
      setActionError(result.error.message);
    } else {
      setIsFollowing(!isFollowing);
      setFollowerCount((count) => Math.max(0, count + (isFollowing ? -1 : 1)));
    }
    setFollowLoading(false);
  };

  const startConversation = async () => {
    if (!user || messageLoading) return;
    setMessageLoading(true);
    setActionError(null);
    try {
      const [blockedByMe, blockedMe] = await Promise.all([
        supabase.from("blocks").select("id").eq("blocker_id", user.id).eq("blocked_id", id).maybeSingle(),
        supabase.from("blocks").select("id").eq("blocker_id", id).eq("blocked_id", user.id).maybeSingle(),
      ]);
      if (blockedByMe.error || blockedMe.error) throw new Error("Could not verify messaging permissions.");
      if (blockedByMe.data || blockedMe.data) throw new Error("Messaging is unavailable between these accounts.");

      const { data: mine, error: mineError } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id);
      if (mineError) throw mineError;

      const conversationIds = (mine || []).map((row) => row.conversation_id);
      if (conversationIds.length > 0) {
        const { data: existing, error: existingError } = await supabase
          .from("conversation_participants")
          .select("conversation_id")
          .eq("user_id", id)
          .in("conversation_id", conversationIds)
          .limit(1);
        if (existingError) throw existingError;
        if (existing?.[0]?.conversation_id) {
          setLocation(`/messages/${existing[0].conversation_id}`);
          return;
        }
      }

      const { data: conversation, error: createError } = await supabase
        .from("conversations")
        .insert({ created_by: user.id })
        .select("id")
        .single();
      if (createError || !conversation) throw createError || new Error("Could not create conversation.");

      const { error: participantsError } = await supabase.from("conversation_participants").insert([
        { conversation_id: conversation.id, user_id: user.id },
        { conversation_id: conversation.id, user_id: id },
      ]);
      if (participantsError) throw participantsError;

      setLocation(`/messages/${conversation.id}`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not start conversation.");
    } finally {
      setMessageLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16 bg-white min-h-full">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 text-center text-sm text-gray-500 bg-white min-h-full">
        User not found.
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-10 bg-white min-h-full">
      <div className="px-4 md:px-6 py-6">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/explore" className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </div>

        <div className="flex items-start justify-between gap-3">
          <img
            src={
              profile.avatar_url ||
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`
            }
            alt={profile.display_name}
            className="h-20 w-20 rounded-full object-cover border-2 border-blue-500"
          />
          {user && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={toggleFollow}
                disabled={followLoading}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  isFollowing
                    ? "border border-gray-200 text-gray-600 hover:bg-gray-50"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {followLoading ? "Saving…" : isFollowing ? "Following" : "Follow"}
              </button>
              <button
                type="button"
                onClick={() => void startConversation()}
                disabled={messageLoading}
                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {messageLoading ? "Opening…" : "Message"}
              </button>
            </div>
          )}
        </div>

        {actionError && <p role="alert" className="mt-3 text-xs text-red-600">{actionError}</p>}
        <h1 className="text-xl font-bold mt-4 text-gray-900">{profile.display_name}</h1>
        <p className="text-sm text-gray-500">@{profile.username}</p>
        {profile.bio && <p className="text-sm mt-2 leading-relaxed text-gray-700">{profile.bio}</p>}
        {profile.location && (
          <p className="flex items-center gap-1.5 text-xs text-gray-500 mt-2">
            <MapPin className="h-3.5 w-3.5" />
            {profile.location}
          </p>
        )}

        {profile.skills?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {profile.skills.map((s) => (
              <span key={s} className="text-xs font-medium text-blue-700 bg-blue-50 rounded-full px-2.5 py-1">
                #{s}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-5 mt-4 text-sm">
          <span>
            <strong>{followerCount}</strong> <span className="text-gray-500">Followers</span>
          </span>
          <span>
            <strong>{followingCount}</strong> <span className="text-gray-500">Following</span>
          </span>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <div className="flex-1 py-3 text-center text-sm font-semibold text-blue-600 border-b-2 border-blue-600">
          Posts
        </div>
      </div>

      {posts.length > 0 ? (
        posts.map((post) => (
          <PostCard
            key={post.id}
            post={{
              id: post.id,
              content: post.content,
              image: post.image_url ?? undefined,
              tags: post.tags ?? [],
              likesCount: post.likes_count,
              commentsCount: post.comments_count,
              createdAt: post.created_at,
              author: {
                id: profile.id,
                name: profile.display_name,
                username: profile.username,
                avatar: profile.avatar_url || "",
              },
            }}
          />
        ))
      ) : (
        <p className="text-center text-sm text-gray-500 py-12">No posts yet.</p>
      )}
    </div>
  );
}
