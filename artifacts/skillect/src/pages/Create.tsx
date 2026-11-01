import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { X, Upload } from "lucide-react";
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

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

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

  const addTag = () => {
    const clean = tagInput.trim().replace(/^#/, "");
    if (clean && !tags.includes(clean)) setTags([...tags, clean]);
    setTagInput("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.size > MAX_FILE_SIZE) {
      setError("File must be under 50MB");
      return;
    }

    const isImage = selected.type.startsWith("image/");
    const isVideo = selected.type.startsWith("video/");
    if (!isImage && !isVideo) {
      setError("Only images and videos are allowed");
      return;
    }

    setError(null);
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
    if (!content.trim() || !user) return;
    setLoading(true);
    setError(null);

    let mediaUrl: string | null = null;

    try {
      if (file) {
        const ext = file.name.split(".").pop() || "bin";
        const path = `${user.id}/${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("post-media")
          .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data: publicData } = supabase.storage
          .from("post-media")
          .getPublicUrl(path);

        mediaUrl = publicData.publicUrl;
      }

      const { error: insertError } = await supabase.from("posts").insert({
        author_id: user.id,
        content: content.trim(),
        tags,
        image_url: mediaUrl,
        category: category || null,
      });

      if (insertError) throw insertError;

      setLocation("/");
    } catch (err: any) {
      setError(err.message || "Failed to create post");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 md:px-6 py-6 bg-white min-h-full">
      <h1 className="text-xl font-bold mb-5 text-gray-900">Create a post</h1>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-start gap-3 mb-4">
        {profile && (
          <img
            src={
              profile.avatar_url ||
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`
            }
            alt={profile.display_name}
            className="h-11 w-11 rounded-full object-cover border border-gray-200"
          />
        )}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What are you learning or building today?"
          rows={5}
          className="flex-1 rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 transition-colors resize-none"
        />
      </div>

      <div className="mb-4">
        <label className="text-sm font-medium mb-1.5 block text-gray-700">Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-xl bg-gray-50 border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
        >
          <option value="">Select a category (optional)</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="text-sm font-medium mb-1.5 block text-gray-700">
          Image or Video (optional)
        </label>

        {!previewUrl ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 py-8 text-sm text-gray-500 hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            <Upload className="h-6 w-6" />
            <span>Click to upload image or video</span>
            <span className="text-xs text-gray-400">Max 50MB</span>
          </button>
        ) : (
          <div className="relative rounded-xl overflow-hidden border border-gray-200">
            {file?.type.startsWith("video/") ? (
              <video src={previewUrl} controls className="w-full max-h-80 object-contain bg-black" />
            ) : (
              <img src={previewUrl} alt="Preview" className="w-full max-h-80 object-cover" />
            )}
            <button
              type="button"
              onClick={clearFile}
              className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      <div className="mb-6">
        <label className="text-sm font-medium mb-1.5 block text-gray-700">Tags</label>
        <div className="flex gap-2">
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
            placeholder="react"
            className="flex-1 rounded-xl bg-gray-50 border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
          />
          <button
            type="button"
            onClick={addTag}
            className="rounded-xl border border-gray-200 px-4 text-sm font-medium hover:bg-gray-50"
          >
            Add
          </button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 rounded-full px-2.5 py-1"
              >
                #{tag}
                <button type="button" onClick={() => setTags(tags.filter((t) => t !== tag))}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <Button
        type="button"
        onClick={handleSubmit}
        disabled={!content.trim() || loading}
        className="w-full rounded-full py-3 h-11 text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40"
      >
        {loading ? "Posting…" : "Post"}
      </Button>
    </div>
  );
}
