import { Link } from "wouter";
import { Heart, MessageCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLikePost, useUnlikePost, type Post } from "@workspace/api-client-react";
import { timeAgo } from "@/lib/time";

function invalidatePosts(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({
    predicate: (query) =>
      typeof query.queryKey[0] === "string" &&
      query.queryKey[0].startsWith("/api/posts"),
  });
}

export default function PostCard({ post }: { post: Post }) {
  const queryClient = useQueryClient();
  const likeMutation = useLikePost();
  const unlikeMutation = useUnlikePost();

  const toggleLike = () => {
    const mutation = post.likedByMe ? unlikeMutation : likeMutation;
    mutation.mutate(
      { id: post.id },
      { onSuccess: () => invalidatePosts(queryClient) },
    );
  };

  return (
    <article className="border-b border-border px-4 md:px-6 py-5">
      <div className="flex items-start gap-3">
        <Link href={`/user/${post.author.id}`}>
          <img
            src={post.author.avatar}
            alt={post.author.name}
            className="h-11 w-11 rounded-full object-cover border border-border shrink-0"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/user/${post.author.id}`}
              className="font-semibold text-sm hover:underline"
            >
              {post.author.name}
            </Link>
            <span className="text-xs text-muted-foreground">
              @{post.author.username} · {timeAgo(post.createdAt)}
            </span>
          </div>

          <Link href={`/post/${post.id}`}>
            <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-wrap">
              {post.content}
            </p>
          </Link>

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
            <Link href={`/post/${post.id}`}>
              <img
                src={post.image}
                alt=""
                className="mt-3 w-full max-h-96 object-cover rounded-xl border border-border"
              />
            </Link>
          )}

          <div className="flex items-center gap-5 mt-3.5">
            <button
              type="button"
              onClick={toggleLike}
              className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                post.likedByMe
                  ? "text-destructive"
                  : "text-muted-foreground hover:text-destructive"
              }`}
            >
              <Heart className={`h-4 w-4 ${post.likedByMe ? "fill-current" : ""}`} />
              {post.likeCount}
            </button>
            <Link
              href={`/post/${post.id}`}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              {post.commentCount}
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
