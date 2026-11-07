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

interface Project {
  id: string;
  title: string;
  description: string;
  link: string | null;
  status: string;
  created_at: string;
}

export default function Profile() {
  const { profile } = useApp();
  const { signOut } = useAuth();
  const [tab, setTab] = useState<"posts" | "projects">("posts");
  const [myPosts, setMyPosts] = useState<PostWithAuthor[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectFormOpen, setProjectFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectLink, setProjectLink] = useState("");
  const [projectStatus, setProjectStatus] = useState("in_progress");
  const [projectSaving, setProjectSaving] = useState(false);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  useEffect(() => {
    if (!profile) return;

    const load = async () => {
      setLoading(true);

      const [postsRes, followersRes, followingRes, projectsRes] = await Promise.all([
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
        supabase
          .from("projects")
          .select("id,title,description,link,status,created_at")
          .eq("author_id", profile.id)
          .order("created_at", { ascending: false }),
      ]);

      if (postsRes.data) setMyPosts(postsRes.data as PostWithAuthor[]);
      if (projectsRes.data) setProjects(projectsRes.data as Project[]);
      setFollowerCount(followersRes.count ?? 0);
      setFollowingCount(followingRes.count ?? 0);
      setLoading(false);
    };

    load();
  }, [profile?.id]);

  if (!profile) return null;

  const openNewProject = () => {
    setEditingProject(null);
    setProjectTitle("");
    setProjectDescription("");
    setProjectLink("");
    setProjectStatus("in_progress");
    setProjectError(null);
    setProjectFormOpen(true);
  };

  const openEditProject = (project: Project) => {
    setEditingProject(project);
    setProjectTitle(project.title);
    setProjectDescription(project.description || "");
    setProjectLink(project.link || "");
    setProjectStatus(project.status || "in_progress");
    setProjectError(null);
    setProjectFormOpen(true);
  };

  const saveProject = async () => {
    if (!projectTitle.trim() || projectSaving) return;
    setProjectSaving(true);
    setProjectError(null);
    const cleanLink = projectLink.trim();
    if (cleanLink && !/^https?:\\/\\//i.test(cleanLink)) {
      setProjectError("Project links must start with https:// or http://");
      setProjectSaving(false);
      return;
    }
    const payload = {
      title: projectTitle.trim(),
      description: projectDescription.trim(),
      link: cleanLink || null,
      status: projectStatus,
    };
    const result = editingProject
      ? await supabase.from("projects").update(payload).eq("id", editingProject.id).eq("author_id", profile.id).select("id,title,description,link,status,created_at").single()
      : await supabase.from("projects").insert({ ...payload, author_id: profile.id }).select("id,title,description,link,status,created_at").single();

    if (result.error || !result.data) {
      setProjectError(result.error?.message || "Could not save this project.");
    } else {
      const saved = result.data as Project;
      setProjects((current) => editingProject
        ? current.map((project) => project.id === saved.id ? saved : project)
        : [saved, ...current]);
      setProjectFormOpen(false);
      setEditingProject(null);
    }
    setProjectSaving(false);
  };

  const deleteProject = async (project: Project) => {
    if (!window.confirm(`Delete “${project.title}”? This cannot be undone.`)) return;
    const { error: deleteError } = await supabase
      .from("projects")
      .delete()
      .eq("id", project.id)
      .eq("author_id", profile.id);
    if (deleteError) {
      setProjectError(deleteError.message);
    } else {
      setProjects((current) => current.filter((item) => item.id !== project.id));
    }
  };

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
        <div className="px-4 py-5 md:px-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Your projects</h2>
              <p className="mt-1 text-xs text-gray-500">Show what you've made and what you're working on.</p>
            </div>
            <button type="button" onClick={openNewProject} className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700">
              Add project
            </button>
          </div>

          {projectError && <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{projectError}</p>}

          {projects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 px-4 py-10 text-center">
              <p className="text-sm font-semibold text-gray-800">No projects yet</p>
              <p className="mt-1 text-xs text-gray-500">Add your first project to build your portfolio.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map((project) => (
                <article key={project.id} className="rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900">{project.title}</h3>
                      <span className="mt-1 inline-block rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold capitalize text-blue-700">
                        {project.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button type="button" onClick={() => openEditProject(project)} className="text-xs font-semibold text-blue-600">Edit</button>
                      <button type="button" onClick={() => void deleteProject(project)} className="text-xs font-semibold text-red-600">Delete</button>
                    </div>
                  </div>
                  {project.description && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-600">{project.description}</p>}
                  {project.link && <a href={project.link} target="_blank" rel="noreferrer" className="mt-3 inline-block break-all text-xs font-semibold text-blue-600 hover:underline">{project.link}</a>}
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {projectFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div role="dialog" aria-modal="true" aria-labelledby="project-dialog-title" className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 id="project-dialog-title" className="text-lg font-bold text-gray-900">{editingProject ? "Edit project" : "Add a project"}</h2>
              <button type="button" onClick={() => setProjectFormOpen(false)} className="text-sm text-gray-500">Close</button>
            </div>
            {projectError && <p role="alert" className="mb-3 text-xs text-red-600">{projectError}</p>}
            <div className="space-y-3">
              <input value={projectTitle} onChange={(event) => setProjectTitle(event.target.value)} maxLength={100} placeholder="Project title" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
              <textarea value={projectDescription} onChange={(event) => setProjectDescription(event.target.value)} maxLength={2000} rows={4} placeholder="What did you build and what did you learn?" className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
              <input value={projectLink} onChange={(event) => setProjectLink(event.target.value)} maxLength={500} placeholder="Project or portfolio link (optional)" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
              <select value={projectStatus} onChange={(event) => setProjectStatus(event.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500">
                <option value="in_progress">In progress</option>
                <option value="completed">Completed</option>
                <option value="on_hold">On hold</option>
              </select>
            </div>
            <button type="button" onClick={() => void saveProject()} disabled={!projectTitle.trim() || projectSaving} className="mt-5 w-full rounded-full bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40">
              {projectSaving ? "Saving…" : editingProject ? "Save changes" : "Add project"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
