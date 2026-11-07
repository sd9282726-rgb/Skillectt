import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Heart } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { timeAgo } from "@/lib/time";

interface Author {
  id: string;
  display_name: string;
  username: string;
  avatar_url?: string | null;
}

interface Post {
  id: string;
  content: string;
  image_url?: string | null;
  media_type?: "image" | "video" | "text";
  tags: string[];
  likes_count: number;
  comments_count: number;
  created_at: string;
  author_id: string;
  profiles?: Author | null;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  profiles?: Author | null;
}

export default function PostDetail({ id }: { id: string }) {
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [liking, setLiking] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const { data: postData } = await supabase
        .from("posts")
        .select(
          `
          *,
          profiles:author_id (id, display_name, username, avatar_url)
        `
        )
        .eq("id", id)
        .single();

      if (postData) {
        setPost(postData as unknown as Post);
        setLikeCount(postData.likes_count || 0);
      }

      const { data: commentsData } = await supabase
        .from("comments")
        .select(
          `
          *,
          profiles:author_id (id, display_name, username, avatar_url)
        `
        )
        .eq("post_id", id)
        .order("created_at", { ascending: true });

      if (commentsData) setComments(commentsData as unknown as Comment[]);

      if (user) {
        const { data: likeData } = await supabase
          .from("post_likes")
          .select("id")
          .eq("post_id", id)
          .eq("user_id", user.id)
          .maybeSingle();
        setLiked(!!likeData);
      }

      setLoading(false);
    };

    load();
  }, [id, user?.id]);

  const toggleLike = async () => {
    if (!user || !post || liking) return;
    setLiking(true);
    setActionError(null);

    const result = liked
      ? await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", user.id)
      : await supabase.from("post_likes").insert({ post_id: post.id, user_id: user.id });

    if (result.error) {
      setActionError(result.error.message);
    } else {
      setLiked(!liked);
      setLikeCount((count) => Math.max(0, count + (liked ? -1 : 1)));
    }
    setLiking(false);
  };

  const handleComment = async () => {
    if (!comment.trim() || !user || !post) return;
    setSubmitting(true);

    setActionError(null);
    const { data, error } = await supabase.functions.invoke("moderate-text", {
      body: { type: "comment", post_id: post.id, content: comment.trim() },
    });

    if (error) {
      setActionError(error.message || "Comment could not be sent.");
    } else if (data?.status === "approved" && data?.id) {
      const { data: savedComment, error: readError } = await supabase
        .from("comments")
        .select(`*, profiles:author_id (id, display_name, username, avatar_url)`)
        .eq("id", data.id)
        .single();
      if (readError || !savedComment) {
        setActionError("Your comment passed the safety check but could not be loaded. Refresh to see it.");
      } else {
        setComments((prev) => [...prev, savedComment as unknown as Comment]);
        setComment("");
      }
    } else {
      setActionError(data?.error || "Comment did not pass Skillect's safety check.");
    }

    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16 bg-white min-h-full">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 text-center text-sm text-gray-500 bg-white min-h-full">
        Post not found.
      </div>
    );
  }

  const author = post.profiles;

  return (
    <div className="max-w-2xl mx-auto pb-10 bg-white min-h-full">
      <div className="flex items-center gap-3 px-4 md:px-6 py-4 border-b border-gray-200">
        <Link href="/" className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-semibold text-gray-900">Post</h1>
      </div>

      <div className="px-4 md:px-6 py-5 border-b border-gray-200">
        <div className="flex items-start gap-3">
          <Link href={`/user/${author?.id || post.author_id}`}>
            <img
              src={
                author?.avatar_url ||
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${author?.username || "user"}`
              }
              alt={author?.display_name || "User"}
              className="h-11 w-11 rounded-full object-cover border border-gray-200"
            />
          </Link>
          <div>
            <Link
              href={`/user/${author?.id || post.author_id}`}
              className="font-semibold text-sm text-gray-900 hover:underline"
            >
              {author?.display_name || "User"}
            </Link>
            <p className="text-xs text-gray-500">
              @{author?.username || "user"} · {timeAgo(post.created_at)}
            </p>
          </div>
        </div>

        <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap text-gray-800">{post.content}</p>

        {post.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {post.tags.map((tag) => (
              <span key={tag} className="text-xs text-blue-600 font-medium">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {post.image_url && (
          post.image_url.match(/\.(mp4|webm|mov)/i) ? (
            <video
              src={post.image_url}
              controls
              className="mt-3 w-full max-h-[420px] rounded-xl border border-gray-200 bg-black"
            />
          ) : (
            <img
              src={post.image_url}
              alt=""
              className="mt-3 w-full max-h-[420px] object-cover rounded-xl border border-gray-200"
            />
          )
        )}

        <button
          type="button"
          onClick={toggleLike}
          disabled={!user || liking}
          className={`flex items-center gap-1.5 text-xs font-medium mt-4 transition-colors ${
            liked ? "text-pink-600" : "text-gray-500 hover:text-pink-600"
          }`}
        >
          <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
          {likeCount} likes
        </button>
      </div>

      <div className="px-4 md:px-6 py-4">
        <h2 className="text-sm font-semibold mb-3 text-gray-900">Comments ({comments.length})</h2>
        <div className="space-y-4">
          {comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2.5">
              <img
                src={
                  c.profiles?.avatar_url ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.profiles?.username || "user"}`
                }
                alt={c.profiles?.display_name || "User"}
                className="h-8 w-8 rounded-full object-cover border border-gray-200 shrink-0"
              />
              <div className="min-w-0">
                <p className="text-xs">
                  <span className="font-semibold text-gray-900">{c.profiles?.display_name || "User"}</span>{" "}
                  <span className="text-gray-500">{timeAgo(c.created_at)}</span>
                </p>
                <p className="text-sm mt-0.5 text-gray-800">{c.content}</p>
              </div>
            </div>
          ))}
          {comments.length === 0 && (
            <p className="text-sm text-gray-500">No comments yet.</p>
          )}
        </div>

        {actionError && <p role="alert" className="mt-3 text-xs text-red-600">{actionError}</p>}
        {user && (
          <div className="flex gap-2 mt-5">
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleComment()}
              placeholder="Add a comment..."
              className="flex-1 rounded-full bg-gray-50 border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={handleComment}
              disabled={!comment.trim() || submitting}
              className="rounded-full px-4 py-2.5 text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40"
            >
              Send
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
