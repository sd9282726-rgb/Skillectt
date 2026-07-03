import { useState } from "react";
import { useLocation } from "wouter";
import { Image as ImageIcon, X } from "lucide-react";
import { useApp } from "@/context/AppContext";

export default function Create() {
  const { addPost, getCurrentProfile } = useApp();
  const profile = getCurrentProfile();
  const [, setLocation] = useLocation();
  const [content, setContent] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [image, setImage] = useState("");

  const addTag = () => {
    const clean = tagInput.trim().replace(/^#/, "");
    if (clean && !tags.includes(clean)) {
      setTags([...tags, clean]);
    }
    setTagInput("");
  };

  const handleSubmit = () => {
    if (!content.trim()) return;
    addPost(content.trim(), tags, image.trim() || undefined);
    setLocation("/");
  };

  return (
    <div className="max-w-xl mx-auto px-4 md:px-6 py-6">
      <h1 className="text-xl font-bold mb-5">Create a post</h1>

      <div className="flex items-start gap-3 mb-4">
        {profile && (
          <img
            src={profile.avatar}
            alt={profile.name}
            className="h-11 w-11 rounded-full object-cover border border-border"
          />
        )}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What are you building today?"
          rows={5}
          className="flex-1 rounded-xl bg-input border border-border px-4 py-3 text-sm outline-none focus:border-primary transition-colors resize-none"
        />
      </div>

      <div className="mb-4">
        <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
          <ImageIcon className="h-4 w-4" /> Image URL (optional)
        </label>
        <input
          value={image}
          onChange={(e) => setImage(e.target.value)}
          placeholder="https://..."
          className="w-full rounded-xl bg-input border border-border px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors"
        />
      </div>

      <div className="mb-6">
        <label className="text-sm font-medium mb-1.5 block">Tags</label>
        <div className="flex gap-2">
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
            placeholder="react"
            className="flex-1 rounded-xl bg-input border border-border px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors"
          />
          <button
            type="button"
            onClick={addTag}
            className="rounded-xl border border-border px-4 text-sm font-medium hover-elevate"
          >
            Add
          </button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 text-xs font-medium text-neon-blue bg-[var(--card-alt)] rounded-full px-2.5 py-1"
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

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!content.trim()}
        className="w-full rounded-full py-3 text-sm font-semibold bg-primary text-primary-foreground shadow-[0_0_18px_var(--primary-glow)] hover-elevate disabled:opacity-40 disabled:pointer-events-none"
      >
        Post
      </button>
    </div>
  );
}
