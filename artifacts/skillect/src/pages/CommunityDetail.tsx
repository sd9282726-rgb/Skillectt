import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, RefreshCw, Send, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import PostCard from "@/components/PostCard";

interface Community {
  id: string;
  name: string;
  description: string;
  cover_url: string | null;
}

interface Member {
  user_id: string;
  profiles: {
    id: string;
    display_name: string;
    username: string;
    avatar_url: string | null;
  } | null;
}

interface CommunityPost {
  id: string;
  content: string;
  image_url: string | null;
  media_type: "image" | "video" | "text";
  tags: string[] | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  author_id: string;
  profiles: {
    id: string;
    display_name: string;
    username: string;
    avatar_url: string | null;
  } | null;
}

export default function CommunityDetail({ id }: { id: string }) {
  const { user } = useAuth();
  const [community, setCommunity] = useState<Community | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [joined, setJoined] = useState(false);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingMembership, setSavingMembership] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCommunity = async () => {
    setLoading(true);
    setError(null);

    const [communityResult, memberResult, countResult, postResult] = await Promise.all([
      supabase.from("communities").select("id,name,description,cover_url").eq("id", id).maybeSingle(),
      supabase
        .from("community_members")
        .select("user_id, profiles:user_id (id, display_name, username, avatar_url)")
        .eq("community_id", id)
        .order("created_at", { ascending: true })
        .limit(50),
      supabase
        .from("community_members")
        .select("id", { count: "exact", head: true })
        .eq("community_id", id),
      supabase
        .from("posts")
        .select(`
          id, content, image_url, media_type, tags, likes_count, comments_count, created_at, author_id,
          profiles:author_id (id, display_name, username, avatar_url)
        `)
        .eq("community_id", id)
        .eq("moderation_hidden", false)
        .order("created_at", { ascending: false })
        .limit(40),
    ]);

    if (communityResult.error || memberResult.error || countResult.error || postResult.error) {
      setError(
        communityResult.error?.message ||
        memberResult.error?.message ||
        countResult.error?.message ||
        postResult.error?.message ||
        "Could not load this community."
      );
      setLoading(false);
      return;
    }

    setCommunity(communityResult.data as Community | null);
    setMembers((memberResult.data || []) as unknown as Member[]);
    setMemberCount(countResult.count || 0);
    setPosts((postResult.data || []) as unknown as CommunityPost[]);

    if (user) {
      const { data: membership, error: membershipError } = await supabase
        .from("community_members")
        .select("id")
        .eq("community_id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (membershipError) setError(membershipError.message);
      setJoined(!!membership);
    } else {
      setJoined(false);
    }

    setLoading(false);
  };

  useEffect(() => {
    void loadCommunity();
    const channel = supabase
      .channel(`community-posts:${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "posts", filter: `community_id=eq.${id}` }, () => void loadCommunity())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [id, user?.id]);

  const toggleJoin = async () => {
    if (!user || savingMembership) return;
    setSavingMembership(true);
    setError(null);

    const result = joined
      ? await supabase.from("community_members").delete().eq("community_id", id).eq("user_id", user.id)
      : await supabase.from("community_members").insert({ community_id: id, user_id: user.id });

    if (result.error) {
      setError(result.error.message);
    } else {
      setJoined(!joined);
      setMemberCount((count) => Math.max(0, count + (joined ? -1 : 1)));
      await loadCommunity();
    }
    setSavingMembership(false);
  };

  const submitPost = async () => {
    const content = draft.trim();
    if (!content || !user || !joined || posting) return;
    setPosting(true);
    setError(null);

    const { data, error: moderationError } = await supabase.functions.invoke("moderate-text", {
      body: { type: "post", content, community_id: id, tags: [] },
    });

    if (moderationError) {
      setError(moderationError.message || "Your post could not be published.");
    } else if (data?.status !== "approved") {
      setError(data?.error || "Your post did not pass Skillect's safety check.");
    } else {
      setDraft("");
      await loadCommunity();
    }
    setPosting(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center bg-white">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!community) {
    return (
      <div className="mx-auto max-w-2xl bg-white px-4 py-12 text-center">
        <p className="text-sm text-gray-600">Community not found.</p>
        <Link href="/communities" className="mt-3 inline-block text-sm font-semibold text-blue-600">Back to communities</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-full max-w-3xl bg-white pb-10">
      <div className="relative h-40 overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100 sm:h-52">
        {community.cover_url && <img src={community.cover_url} alt="" className="h-full w-full object-cover" />}
        <Link
          href="/communities"
          aria-label="Back to communities"
          className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-gray-800 shadow-sm"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </div>

      <section className="border-b border-gray-200 px-4 py-5 md:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900">{community.name}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
              <Users className="h-3.5 w-3.5" />
              {memberCount.toLocaleString()} {memberCount === 1 ? "member" : "members"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void toggleJoin()}
            disabled={!user || savingMembership}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-50 ${joined ? "border border-gray-200 text-gray-700 hover:bg-gray-50" : "bg-blue-600 text-white hover:bg-blue-700"}`}
          >
            {savingMembership ? "Saving…" : joined ? "Joined" : "Join community"}
          </button>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-gray-600">{community.description}</p>
      </section>

      {error && (
        <div role="alert" className="mx-4 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 md:mx-6">
          {error}
        </div>
      )}

      <section className="border-b border-gray-200 px-4 py-5 md:px-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900">Community discussions</h2>
          <button type="button" onClick={() => void loadCommunity()} className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-blue-600">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
        {joined ? (
          <div className="rounded-2xl border border-gray-200 p-3">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={3}
              maxLength={5000}
              placeholder="Share a question, idea, or something you're working on…"
              className="w-full resize-none bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
            />
            <div className="flex items-center justify-between border-t border-gray-100 pt-3">
              <span className="text-[11px] text-gray-400">{draft.length}/5000 · Text posts are safety-screened before publishing</span>
              <button
                type="button"
                onClick={() => void submitPost()}
                disabled={!draft.trim() || posting}
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
              >
                <Send className="h-3.5 w-3.5" /> {posting ? "Checking…" : "Publish"}
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-gray-50 px-4 py-4 text-sm text-gray-600">
            Join this community to publish discussions and take part.
          </div>
        )}
      </section>

      <section className="px-4 md:px-6">
        {posts.length > 0 ? (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={{
                id: post.id,
                content: post.content,
                image: post.image_url || undefined,
                mediaType: post.media_type || "text",
                tags: post.tags || [],
                likesCount: post.likes_count,
                commentsCount: post.comments_count,
                createdAt: post.created_at,
                author: {
                  id: post.profiles?.id || post.author_id,
                  name: post.profiles?.display_name || "Skillect member",
                  username: post.profiles?.username || "member",
                  avatar: post.profiles?.avatar_url || "",
                },
              }}
            />
          ))
        ) : (
          <div className="py-12 text-center">
            <p className="text-sm font-semibold text-gray-800">No discussions yet</p>
            <p className="mt-1 text-xs text-gray-500">
              {joined ? "Start the first conversation in this community." : "Join to start the first conversation."}
            </p>
          </div>
        )}
      </section>

      <section className="border-t border-gray-200 px-4 py-5 md:px-6">
        <h2 className="mb-3 text-sm font-bold text-gray-900">Members</h2>
        {members.length === 0 ? (
          <p className="text-xs text-gray-500">No members yet.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {members.map((member) => {
              const profile = member.profiles;
              if (!profile) return null;
              return (
                <Link key={member.user_id} href={`/user/${profile.id}`} className="flex min-w-0 items-center gap-3 rounded-xl border border-gray-100 p-3 hover:bg-gray-50">
                  <img
                    src={profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`}
                    alt=""
                    className="h-10 w-10 rounded-full border border-gray-200 object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">{profile.display_name}</p>
                    <p className="truncate text-xs text-gray-500">@{profile.username}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
