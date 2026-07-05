import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Heart } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetPost,
  useListComments,
  useCreateComment,
  useLikePost,
  useUnlikePost,
  getGetPostQueryKey,
  getListCommentsQueryKey,
} from "@workspace/api-client-react";
import { timeAgo } from "@/lib/time";

function invalidatePostQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({
    predicate: (query) =>
      typeof query.queryKey[0] === "string" &&
      query.queryKey[0].startsWith("/api/posts"),
  });
}

export default function PostDetail({ id }: { id: string }) {
  const postId = Number(id);
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");

  const { data: post, isLoading } = useGetPost(postId, {
    query: { queryKey: getGetPostQueryKey(postId), enabled: !!postId },
  });
  const { data: comments = [] } = useListComments(postId, {
    query: { queryKey: getListCommentsQueryKey(postId), enabled: !!postId },
  });
  const likeMutation = useLikePost();
  const unlikeMutation = useUnlikePost();
  const createCommentMutation = useCreateComment();

  if (isLoading) return null;

  if (!post) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 text-center text-sm text-muted-foreground">
        Post not found.
      </div>
    );
  }

  const toggleLike = () => {
    const mutation = post.likedByMe ? unlikeMutation : likeMutation;
    mutation.mutate(
      { id: post.id },
      { onSuccess: () => invalidatePostQueries(queryClient) },
    );
  };

  const handleComment = () => {
    if (!comment.trim()) return;
    createCommentMutation.mutate(
      { id: post.id, data: { content: comment.trim() } },
      {
        onSuccess: () => {
          invalidatePostQueries(queryClient);
          setComment("");
        },
      },
    );
  };

  return (
    <div className="max-w-2xl mx-auto pb-10">
      <div className="flex items-center gap-3 px-4 md:px-6 py-4 border-b border-border">
        <Link href="/" className="h-9 w-9 rounded-full flex items-center justify-center hover-elevate">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-semibold">Post</h1>
      </div>

      <div className="px-4 md:px-6 py-5 border-b border-border">
        <div className="flex items-start gap-3">
          <Link href={`/user/${post.author.id}`}>
            <img
              src={post.author.avatar}
              alt={post.author.name}
              className="h-11 w-11 rounded-full object-cover border border-border"
            />
          </Link>
          <div>
            <Link href={`/user/${post.author.id}`} className="font-semibold text-sm hover:underline">
              {post.author.name}
            </Link>
            <p className="text-xs text-muted-foreground">
              @{post.author.username} · {timeAgo(post.createdAt)}
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
          onClick={toggleLike}
          className={`flex items-center gap-1.5 text-xs font-medium mt-4 transition-colors ${
            post.likedByMe ? "text-destructive" : "text-muted-foreground hover:text-destructive"
          }`}
        >
          <Heart className={`h-4 w-4 ${post.likedByMe ? "fill-current" : ""}`} />
          {post.likeCount} likes
        </button>
      </div>

      <div className="px-4 md:px-6 py-4">
        <h2 className="text-sm font-semibold mb-3">Comments ({comments.length})</h2>
        <div className="space-y-4">
          {comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2.5">
              <img
                src={c.author.avatar}
                alt={c.author.name}
                className="h-8 w-8 rounded-full object-cover border border-border shrink-0"
              />
              <div className="min-w-0">
                <p className="text-xs">
                  <span className="font-semibold">{c.author.name}</span>{" "}
                  <span className="text-muted-foreground">{timeAgo(c.createdAt)}</span>
                </p>
                <p className="text-sm mt-0.5">{c.content}</p>
              </div>
            </div>
          ))}
          {comments.length === 0 && (
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
