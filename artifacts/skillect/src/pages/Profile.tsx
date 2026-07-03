import { Link } from "wouter";
import { Settings, MapPin } from "lucide-react";
import { useApp } from "@/context/AppContext";
import PostCard from "@/components/PostCard";
import ProjectCard from "@/components/ProjectCard";
import { useState } from "react";
import { useClerk } from "@clerk/react";

export default function Profile() {
  const { getCurrentProfile, posts, projects } = useApp();
  const profile = getCurrentProfile();
  const { signOut } = useClerk();
  const [tab, setTab] = useState<"posts" | "projects">("posts");

  if (!profile) return null;

  const myPosts = posts
    .filter((p) => p.authorId === profile.id)
    .sort((a, b) => b.createdAt - a.createdAt);
  const myProjects = projects
    .filter((p) => p.authorId === profile.id)
    .sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="max-w-2xl mx-auto pb-10">
      <div className="px-4 md:px-6 py-6">
        <div className="flex items-start justify-between gap-3">
          <img
            src={profile.avatar}
            alt={profile.name}
            className="h-20 w-20 rounded-full object-cover border-2 border-primary shadow-[0_0_20px_var(--primary-glow)]"
          />
          <div className="flex gap-2">
            <Link
              href="/profile/edit"
              className="flex items-center gap-1.5 rounded-full border border-border px-3.5 py-2 text-xs font-semibold hover-elevate"
            >
              <Settings className="h-3.5 w-3.5" />
              Edit
            </Link>
            <button
              type="button"
              onClick={() => signOut()}
              className="rounded-full border border-border px-3.5 py-2 text-xs font-semibold text-destructive hover-elevate"
            >
              Sign out
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
            <strong>{profile.followers.length}</strong>{" "}
            <span className="text-muted-foreground">Followers</span>
          </span>
          <span>
            <strong>{profile.following.length}</strong>{" "}
            <span className="text-muted-foreground">Following</span>
          </span>
          <span>
            <strong>{profile.joinedCommunities.length}</strong>{" "}
            <span className="text-muted-foreground">Communities</span>
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
        myPosts.length > 0 ? (
          myPosts.map((post) => <PostCard key={post.id} post={post} />)
        ) : (
          <p className="text-center text-sm text-muted-foreground py-12">
            No posts yet.
          </p>
        )
      ) : myProjects.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 px-4 md:px-6 py-5">
          {myProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground py-12">
          No projects yet.
        </p>
      )}
    </div>
  );
}
