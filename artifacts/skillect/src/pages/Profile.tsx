import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Settings, MapPin } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
import PostCard from "@/components/PostCard";

interface PostWithAuthor {
  id: string;
  content: string;
  image_url?: string | null;
  media_type?: "image" | "video" | "text";
  tags: string[];
  likes_count: number;
  comments_count: number;
  created_at: string;
  author_id: string;
}

export default function Profile() {
  const { profile } = useApp();
  const { signOut } = useAuth();
  const [tab, setTab] = useState<"posts" | "projects">("posts");
  const [myPosts, setMyPosts] = useState<PostWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  useEffect(() => {
    if (!profile) return;

    const load = async () => {
      setLoading(true);

      const [postsRes, followersRes, followingRes] = await Promise.all([
        supabase
          .from("posts")
          .select("*")
          .eq("author_id", profile.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("follows")
          .select("id", { count: "exact", head: true })
          .eq("following_id", profile.id),
        supabase
          .from("follows")
          .select("id", { count: "exact", head: true })
          .eq("follower_id", profile.id),
      ]);

      if (postsRes.data) setMyPosts(postsRes.data as PostWithAuthor[]);
      setFollowerCount(followersRes.count ?? 0);
      setFollowingCount(followingRes.count ?? 0);
      setLoading(false);
    };

    load();
  }, [profile?.id]);

  if (!profile) return null;

  return (
    <div className="max-w-2xl mx-auto pb-10 bg-white min-h-full">
      <div className="px-4 md:px-6 py-6">
        <div className="flex items-start justify-between gap-3">
          <img
            src={
              profile.avatar_url ||
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`
            }
            alt={profile.display_name}
            className="h-20 w-20 rounded-full object-cover border-2 border-blue-500"
          />
          <div className="flex gap-2">
            <Link
              href="/profile/edit"
              className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3.5 py-2 text-xs font-semibold hover:bg-gray-50"
            >
              <Settings className="h-3.5 w-3.5" />
              Edit
            </Link>
            <button
              type="button"
              onClick={() => signOut()}
              className="rounded-full border border-gray-200 px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
            >
              Sign out
            </button>
          </div>
        </div>

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
              <span
                key={s}
                className="text-xs font-medium text-blue-700 bg-blue-50 rounded-full px-2.5 py-1"
              >
                #{s}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-5 mt-4 text-sm">
          <span>
            <strong>{followerCount}</strong>{" "}
            <span className="text-gray-500">Followers</span>
          </span>
          <span>
            <strong>{followingCount}</strong>{" "}
            <span className="text-gray-500">Following</span>
          </span>
        </div>
      </div>

      <div className="flex border-b border-gray-200">
        <button
          type="button"
          onClick={() => setTab("posts")}
          className={`flex-1 py-3 text-sm font-semibold ${
            tab === "posts" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"
          }`}
        >
          Posts
        </button>
        <button
          type="button"
          onClick={() => setTab("projects")}
          className={`flex-1 py-3 text-sm font-semibold ${
            tab === "projects" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"
          }`}
        >
          Projects
        </button>
      </div>

      {tab === "posts" ? (
        loading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
        ) : myPosts.length > 0 ? (
          myPosts.map((post) => (
            <PostCard
              key={post.id}
              post={{
                id: post.id,
                content: post.content,
                image: post.image_url ?? undefined,
                mediaType: post.media_type ?? "text",
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
        )
      ) : (
        <p className="text-center text-sm text-gray-500 py-12">Projects coming soon.</p>
      )}
    </div>
  );
}
