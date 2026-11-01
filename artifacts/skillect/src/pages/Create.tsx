import { useState } from "react";
import { useLocation } from "wouter";
import { Image as ImageIcon, X } from "lucide-react";
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

export default function Create() {
  const { profile } = useApp();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [content, setContent] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [image, setImage] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addTag = () => {
    const clean = tagInput.trim().replace(/^#/, "");
    if (clean && !tags.includes(clean)) {
      setTags([...tags, clean]);
    }
    setTagInput("");
  };

  const handleSubmit = async () => {
    if (!content.trim() || !user) return;
    setLoading(true);
    setError(null);

    const { error } = await supabase.from("posts").insert({
      author_id: user.id,
      content: content.trim(),
      tags,
      image_url: image.trim() || null,
      category: category || null,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setLocation("/");
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
            src={profile.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + profile.username}
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
        <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5 text-gray-700">
          <ImageIcon className="h-4 w-4" /> Image URL (optional)
        </label>
        <input
          value={image}
          onChange={(e) => setImage(e.target.value)}
          placeholder="https://..."
          className="w-full rounded-xl bg-gray-50 border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
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
