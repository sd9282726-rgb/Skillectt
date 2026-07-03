import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Heart } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { timeAgo } from "@/lib/time";

export default function PostDetail({ id }: { id: string }) {
  const { posts, getProfile, currentUserId, toggleLike, addComment } = useApp();
  const [comment, setComment] = useState("");
  const post = posts.find((p) => p.id === id);

  if (!post) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 text-center text-sm text-muted-foreground">
        Post not found.
      </div>
    );
  }

  const author = getProfile(post.authorId);
  const liked = currentUserId ? post.likes.includes(currentUserId) : false;

  const handleComment = () => {
    if (!comment.trim()) return;
    addComment(post.id, comment.trim());
    setComment("");
  };

  return (
    <div className="max-w-2xl mx-auto pb-10">
      <div className="flex items-center gap-3 px-4 md:px-6 py-4 border-b border-border">
        <Link href="/" className="h-9 w-9 rounded-full flex items-center justify-center hover-elevate">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-semibold">Post</h1>
      </div>

      {author && (
        <div className="px-4 md:px-6 py-5 border-b border-border">
          <div className="flex items-start gap-3">
            <Link href={`/user/${author.id}`}>
              <img
                src={author.avatar}
                alt={author.name}
                className="h-11 w-11 rounded-full object-cover border border-border"
              />
            </Link>
            <div>
              <Link href={`/user/${author.id}`} className="font-semibold text-sm hover:underline">
                {author.name}
              </Link>
              <p className="text-xs text-muted-foreground">
                @{author.username} · {timeAgo(post.createdAt)}
              </p>
            </div>
          </div>

          <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>

          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {post.tags.map((tag) => (
                <span key={tag} className="text-xs text-neon-blue font-medium">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {post.image && (
            <img
              src={post.image}
              alt=""
              className="mt-3 w-full max-h-[420px] object-cover rounded-xl border border-border"
            />
          )}

          <button
            type="button"
            onClick={() => toggleLike(post.id)}
            className={`flex items-center gap-1.5 text-xs font-medium mt-4 transition-colors ${
              liked ? "text-destructive" : "text-muted-foreground hover:text-destructive"
            }`}
          >
            <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
            {post.likes.length} likes
          </button>
        </div>
      )}

      <div className="px-4 md:px-6 py-4">
        <h2 className="text-sm font-semibold mb-3">
          Comments ({post.comments.length})
        </h2>
        <div className="space-y-4">
          {post.comments.map((c) => {
            const commenter = getProfile(c.authorId);
            if (!commenter) return null;
            return (
              <div key={c.id} className="flex items-start gap-2.5">
                <img
                  src={commenter.avatar}
                  alt={commenter.name}
                  className="h-8 w-8 rounded-full object-cover border border-border shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-xs">
                    <span className="font-semibold">{commenter.name}</span>{" "}
                    <span className="text-muted-foreground">{timeAgo(c.createdAt)}</span>
                  </p>
                  <p className="text-sm mt-0.5">{c.content}</p>
                </div>
              </div>
            );
          })}
          {post.comments.length === 0 && (
            <p className="text-sm text-muted-foreground">No comments yet.</p>
          )}
        </div>

        <div className="flex gap-2 mt-5">
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleComment()}
            placeholder="Add a comment..."
            className="flex-1 rounded-full bg-input border border-border px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors"
          />
          <button
            type="button"
            onClick={handleComment}
            disabled={!comment.trim()}
            className="rounded-full px-4 py-2.5 text-sm font-semibold bg-primary text-primary-foreground shadow-[0_0_12px_var(--primary-glow)] hover-elevate disabled:opacity-40 disabled:pointer-events-none"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
