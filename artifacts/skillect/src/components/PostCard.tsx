import { useState } from "react";
import { Link } from "wouter";
import { Heart, MessageCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { timeAgo } from "@/lib/time";

export interface PostCardPost {
  id: string;
  content: string;
  image?: string;
  tags: string[];
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  likedByMe?: boolean;
  author: {
    id: string;
    name: string;
    username: string;
    avatar: string;
  };
}

export default function PostCard({ post }: { post: PostCardPost }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(!!post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likesCount || 0);
  const [liking, setLiking] = useState(false);

  const toggleLike = async () => {
    if (!user || liking) return;
    setLiking(true);

    if (liked) {
      await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", post.id)
        .eq("user_id", user.id);
      setLiked(false);
      setLikeCount((c) => Math.max(0, c - 1));
    } else {
      await supabase.from("post_likes").insert({
        post_id: post.id,
        user_id: user.id,
      });
      setLiked(true);
      setLikeCount((c) => c + 1);
    }

    setLiking(false);
  };

  return (
    <article className="border-b border-gray-200 px-4 md:px-6 py-5 bg-white">
      <div className="flex items-start gap-3">
        <Link href={`/user/${post.author.id}`}>
          <img
            src={
              post.author.avatar ||
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.author.username}`
            }
            alt={post.author.name}
            className="h-11 w-11 rounded-full object-cover border border-gray-200 shrink-0"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/user/${post.author.id}`}
              className="font-semibold text-sm text-gray-900 hover:underline"
            >
              {post.author.name}
            </Link>
            <span className="text-xs text-gray-500">
              @{post.author.username} · {timeAgo(post.createdAt)}
            </span>
          </div>

          <Link href={`/post/${post.id}`}>
            <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-wrap text-gray-800">
              {post.content}
            </p>
          </Link>

          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {post.tags.map((tag) => (
                <span key={tag} className="text-xs text-blue-600 font-medium">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {post.image && (
            <Link href={`/post/${post.id}`}>
              <img
                src={post.image}
                alt=""
                className="mt-3 w-full max-h-96 object-cover rounded-xl border border-gray-200"
              />
            </Link>
          )}

          <div className="flex items-center gap-5 mt-3.5">
            <button
              type="button"
              onClick={toggleLike}
              disabled={!user || liking}
              className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                liked
                  ? "text-pink-600"
                  : "text-gray-500 hover:text-pink-600"
              }`}
            >
              <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
              {likeCount}
            </button>
            <Link
              href={`/post/${post.id}`}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-blue-600 transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              {post.commentsCount}
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
