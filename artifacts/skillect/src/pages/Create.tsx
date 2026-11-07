import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { X, Upload, ShieldCheck } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

const CATEGORIES = [
  "Personal Growth",
  "Skill Development",
  "Learning",
  "Entrepreneurship",
  "Technology",
  "Design",
  "Content Creation",
  "Productivity",
  "Projects and Building",
  "Career Development",
  "Ideas and Discussions",
  "Motivation and Experiences",
];

const IMAGE_LIMIT = 12 * 1024 * 1024;
const VIDEO_LIMIT = 50 * 1024 * 1024;

export default function Create() {
  const { profile } = useApp();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [content, setContent] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [category, setCategory] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const addTag = () => {
    const clean = tagInput.trim().replace(/^#/, "").slice(0, 30);
    if (clean && !tags.includes(clean) && tags.length < 10) setTags([...tags, clean]);
    setTagInput("");
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (!selected) return;

    const isImage = selected.type.startsWith("image/");
    const isVideo = selected.type.startsWith("video/");
    if (!isImage && !isVideo) {
      setError("Only supported images and videos are allowed");
      return;
    }
    if (isImage && (!new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]).has(selected.type) || selected.size > IMAGE_LIMIT)) {
      setError("Choose a JPG, PNG, WebP, HEIC or HEIF image under 12 MB");
      return;
    }
    if (isVideo && (!new Set(["video/mp4", "video/webm", "video/quicktime"]).has(selected.type) || selected.size > VIDEO_LIMIT)) {
      setError("Choose an MP4, WebM or MOV video under 50 MB");
      return;
    }

    setError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  };

  const clearFile = () => {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!content.trim() || !user || loading) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      let postId: string | null = null;

      if (!file) {
        const { data, error: moderationError } = await supabase.functions.invoke("moderate-text", {
          body: { type: "post", content: content.trim(), tags, category: category || null },
        });
        if (moderationError) throw new Error(moderationError.message || "Text safety screening failed.");
        if (data?.status !== "approved" || !data?.id) {
          throw new Error(data?.error || "Your post did not pass Skillect's safety check.");
        }
        postId = data.id;
      } else {
        if (file.type.startsWith("image/")) {
          const form = new FormData();
          form.append("file", file, file.name);
          form.append("content", content.trim());
          const { data, error: mediaError } = await supabase.functions.invoke("moderate-media", { body: form });
          if (mediaError) throw new Error(mediaError.message || "Image could not be submitted for screening.");
          if (!data?.post_id) throw new Error(data?.error || "Image post could not be created.");
          postId = data.post_id;
        } else {
          const extension = file.name.split(".").pop()?.toLowerCase() || "mp4";
          const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
          const { error: uploadError } = await supabase.storage
            .from("media-quarantine")
            .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
          if (uploadError) throw uploadError;

          const { data, error: videoError } = await supabase.functions.invoke("submit-video-post", {
            body: { storage_path: path, content: content.trim() },
          });
          if (videoError || !data?.post_id) {
            await supabase.storage.from("media-quarantine").remove([path]);
            throw new Error(videoError?.message || data?.error || "Video could not be submitted for screening.");
          }
          postId = data.post_id;
        }
      }

      if (file) {
        setSuccess("Your media post has been submitted. It stays hidden until safety screening approves it.");
        setContent("");
        setTags([]);
        setCategory("");
        clearFile();
      } else {
        setLocation("/");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create post");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto min-h-full max-w-xl bg-white px-4 py-6 md:px-6">
      <h1 className="mb-2 text-xl font-bold text-gray-900">Create a post</h1>
      <p className="mb-5 text-sm text-gray-500">Share something you're learning, making, or thinking about.</p>

      {error && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div role="status" className="mb-4 flex gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          {success}
        </div>
      )}

      <div className="mb-4 flex items-start gap-3">
        {profile && (
          <img
            src={profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`}
            alt={profile.display_name}
            className="h-11 w-11 rounded-full border border-gray-200 object-cover"
          />
        )}
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="What are you learning or building today?"
          rows={5}
          maxLength={5000}
          className="flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-blue-500"
        />
      </div>

      <div className="mb-4">
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Category</label>
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
        >
          <option value="">Select a category (optional)</option>
          {CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>

      <div className="mb-4">
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Image or video (optional)</label>
        {!previewUrl ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 py-8 text-sm text-gray-500 transition-colors hover:border-blue-400 hover:bg-blue-50"
          >
            <Upload className="h-6 w-6" />
            <span>Choose an image or video</span>
            <span className="text-xs text-gray-400">Images up to 12 MB · Videos up to 50 MB</span>
          </button>
        ) : (
          <div className="relative overflow-hidden rounded-xl border border-gray-200">
            {file?.type.startsWith("video/") ? (
              <video src={previewUrl} controls className="max-h-80 w-full bg-black object-contain" />
            ) : (
              <img src={previewUrl} alt="Upload preview" className="max-h-80 w-full object-contain" />
            )}
            <button
              type="button"
              onClick={clearFile}
              aria-label="Remove attachment"
              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,video/webm,video/quicktime"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      <div className="mb-6">
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Tags (up to 10)</label>
        <div className="flex gap-2">
          <input
            value={tagInput}
            onChange={(event) => setTagInput(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && (event.preventDefault(), addTag())}
            placeholder="Add a topic"
            className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
          />
          <button type="button" onClick={addTag} disabled={tags.length >= 10} className="rounded-xl border border-gray-200 px-4 text-sm font-medium hover:bg-gray-50 disabled:opacity-40">
            Add
          </button>
        </div>
        {tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span key={tag} className="flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                #{tag}
                <button type="button" aria-label={`Remove ${tag}`} onClick={() => setTags(tags.filter((item) => item !== tag))}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <p className="mb-3 text-xs text-gray-500">Posts and captions are screened before publishing. Media stays hidden until image or video screening passes.</p>
      <Button
        type="button"
        onClick={handleSubmit}
        disabled={!content.trim() || loading}
        className="h-11 w-full rounded-full bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
      >
        {loading ? "Checking and publishing…" : "Publish post"}
      </Button>
    </div>
  );
}
