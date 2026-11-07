import { useEffect, useState } from "react";
import { Link } from "wouter";
import { PlusSquare } from "lucide-react";
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
  profiles?: {
    id: string;
    display_name: string;
    username: string;
    avatar_url?: string | null;
  } | null;
}

export default function Feed() {
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
      setLoading(true);
      setError(null);
      const { data, error: loadError } = await supabase
        .from("posts")
        .select(
          `
          id,
          content,
          image_url,
          media_type,
          tags,
          likes_count,
          comments_count,
          created_at,
          author_id,
          profiles:author_id (
            id,
            display_name,
            username,
            avatar_url
          )
        `
        )
        .order("created_at", { ascending: false })
        .limit(50);

      if (loadError) {
        setError(loadError.message);
      } else if (data) {
        setPosts(data as unknown as PostWithAuthor[]);
      }
      setLoading(false);
    };

  useEffect(() => {
    void load();
    const channel = supabase
      .channel("feed-posts")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="sticky top-0 z-10 hidden md:flex items-center justify-between bg-white/95 backdrop-blur border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900">Feed</h1>
        <Link
          href="/create"
          className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700"
        >
          <PlusSquare className="h-4 w-4" />
          New post
        </Link>
      </div>

      {error && <div role="alert" className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : posts.length === 0 ? (
        <p className="text-center text-sm text-gray-500 py-16">
          No posts yet. Be the first to share something!
        </p>
      ) : (
        posts.map((post) => (
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
                id: post.profiles?.id ?? post.author_id,
                name: post.profiles?.display_name ?? "User",
                username: post.profiles?.username ?? "user",
                avatar: post.profiles?.avatar_url ?? "",
              },
            }}
          />
        ))
      )}
    </div>
  );
}
