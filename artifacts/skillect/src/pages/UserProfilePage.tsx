import { useState } from "react";
import { useLocation, Link } from "wouter";
import { ArrowLeft, MapPin, MessageCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetProfile,
  useFollowProfile,
  useUnfollowProfile,
  useListPosts,
  useListProjects,
  useStartConversation,
  getGetProfileQueryKey,
  getListPostsQueryKey,
  getListProjectsQueryKey,
} from "@workspace/api-client-react";
import { useApp } from "@/context/AppContext";
import PostCard from "@/components/PostCard";
import ProjectCard from "@/components/ProjectCard";

export default function UserProfilePage({ id }: { id: string }) {
  const { currentUserId } = useApp();
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<"posts" | "projects">("posts");
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useGetProfile(id, {
    query: { queryKey: getGetProfileQueryKey(id), enabled: !!id && id !== currentUserId },
  });
  const postsParams = { authorId: id, sort: "new" as const };
  const projectsParams = { authorId: id };
  const { data: userPosts = [] } = useListPosts(postsParams, {
    query: { queryKey: getListPostsQueryKey(postsParams), enabled: !!id },
  });
  const { data: userProjects = [] } = useListProjects(projectsParams, {
    query: { queryKey: getListProjectsQueryKey(projectsParams), enabled: !!id },
  });

  const followMutation = useFollowProfile();
  const unfollowMutation = useUnfollowProfile();
  const startConversationMutation = useStartConversation();

  if (currentUserId && id === currentUserId) {
    setLocation("/profile", { replace: true });
    return null;
  }

  if (isLoading) return null;

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 text-center text-sm text-muted-foreground">
        User not found.
      </div>
    );
  }

  const toggleFollow = () => {
    const mutation = profile.isFollowedByMe ? unfollowMutation : followMutation;
    mutation.mutate(
      { id: profile.id },
      {
        onSuccess: () =>
          queryClient.invalidateQueries({
            predicate: (query) =>
              typeof query.queryKey[0] === "string" &&
              query.queryKey[0].startsWith("/api/profiles"),
          }),
      },
    );
  };

  const handleMessage = async () => {
    const conversation = await startConversationMutation.mutateAsync({
      data: { userId: profile.id },
    });
    setLocation(`/messages/${conversation.id}`);
  };

  return (
    <div className="max-w-2xl mx-auto pb-10">
      <div className="px-4 md:px-6 py-6">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/explore" className="h-9 w-9 rounded-full flex items-center justify-center hover-elevate">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </div>

        <div className="flex items-start justify-between gap-3">
          <img
            src={profile.avatar}
            alt={profile.name}
            className="h-20 w-20 rounded-full object-cover border-2 border-primary shadow-[0_0_20px_var(--primary-glow)]"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={toggleFollow}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                profile.isFollowedByMe
                  ? "border border-border text-muted-foreground hover-elevate"
                  : "bg-primary text-primary-foreground shadow-[0_0_14px_var(--primary-glow)] hover-elevate"
              }`}
            >
              {profile.isFollowedByMe ? "Following" : "Follow"}
            </button>
            <button
              type="button"
              onClick={handleMessage}
              className="h-[38px] w-[38px] rounded-full border border-border flex items-center justify-center hover-elevate"
            >
              <MessageCircle className="h-4 w-4" />
            </button>
          </div>
        </div>

        <h1 className="text-xl font-bold mt-4">{profile.name}</h1>
        <p className="text-sm text-muted-foreground">@{profile.username}</p>
        {profile.bio && <p className="text-sm mt-2 leading-relaxed">{profile.bio}</p>}
        {profile.location && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
            <MapPin className="h-3.5 w-3.5" />
            {profile.location}
          </p>
        )}

        {profile.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {profile.skills.map((s) => (
              <span
                key={s}
                className="text-xs font-medium text-neon-blue bg-[var(--card-alt)] rounded-full px-2.5 py-1"
              >
                #{s}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-5 mt-4 text-sm">
          <span>
            <strong>{profile.followerCount}</strong>{" "}
            <span className="text-muted-foreground">Followers</span>
          </span>
          <span>
            <strong>{profile.followingCount}</strong>{" "}
            <span className="text-muted-foreground">Following</span>
          </span>
        </div>
      </div>

      <div className="flex border-b border-border">
        <button
          type="button"
          onClick={() => setTab("posts")}
          className={`flex-1 py-3 text-sm font-semibold ${
            tab === "posts" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
          }`}
        >
          Posts
        </button>
        <button
          type="button"
          onClick={() => setTab("projects")}
          className={`flex-1 py-3 text-sm font-semibold ${
            tab === "projects" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
          }`}
        >
          Projects
        </button>
      </div>

      {tab === "posts" ? (
        userPosts.length > 0 ? (
          userPosts.map((post) => <PostCard key={post.id} post={post} />)
        ) : (
          <p className="text-center text-sm text-muted-foreground py-12">No posts yet.</p>
        )
      ) : userProjects.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 px-4 md:px-6 py-5">
          {userProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground py-12">No projects yet.</p>
      )}
    </div>
  );
}
