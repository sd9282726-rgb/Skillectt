import { Link } from "wouter";
import { PlusSquare } from "lucide-react";
import { useListPosts } from "@workspace/api-client-react";
import PostCard from "@/components/PostCard";

export default function Feed() {
  const { data: posts = [], isLoading } = useListPosts({ sort: "new" });

  return (
    <div className="max-w-2xl mx-auto">
      <div className="sticky top-0 z-10 hidden md:flex items-center justify-between bg-background/95 backdrop-blur border-b border-border px-6 py-4">
        <h1 className="text-xl font-bold">Feed</h1>
        <Link
          href="/create"
          className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground shadow-[0_0_14px_var(--primary-glow)] hover-elevate"
        >
          <PlusSquare className="h-4 w-4" />
          New post
        </Link>
      </div>

      {!isLoading && posts.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-16">
          No posts yet. Be the first to share something!
        </p>
      ) : (
        posts.map((post) => <PostCard key={post.id} post={post} />)
      )}
    </div>
  );
}
