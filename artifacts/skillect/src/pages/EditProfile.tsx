import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";

export default function EditProfile() {
  const { profile, updateProfile } = useApp();
  const [, setLocation] = useLocation();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [location, setLocationField] = useState(profile?.location ?? "");
  const [website, setWebsite] = useState(profile?.website ?? "");
  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState<string[]>(profile?.skills ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!profile) return null;

  const addSkill = () => {
    const clean = skillInput.trim();
    if (clean && !skills.includes(clean)) setSkills([...skills, clean]);
    setSkillInput("");
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const result = await updateProfile({
        display_name: displayName,
        bio,
        location,
        website,
        skills,
      });
      if (!result) {
        setError("Failed to save profile");
        return;
      }
      setLocation("/profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 md:px-6 py-6 bg-white min-h-full">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => setLocation("/profile")}
          className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Edit profile</h1>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-5">
        <div>
          <label className="text-sm font-medium mb-1.5 block text-gray-700">Display name</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-xl bg-gray-50 border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block text-gray-700">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            className="w-full rounded-xl bg-gray-50 border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500 resize-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block text-gray-700">Location</label>
          <input
            value={location}
            onChange={(e) => setLocationField(e.target.value)}
            className="w-full rounded-xl bg-gray-50 border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block text-gray-700">Website / Portfolio</label>
          <input
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://"
            className="w-full rounded-xl bg-gray-50 border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block text-gray-700">Skills</label>
          <div className="flex gap-2">
            <input
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
              placeholder="Add a skill"
              className="flex-1 rounded-xl bg-gray-50 border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={addSkill}
              className="rounded-xl border border-gray-200 px-4 text-sm font-medium hover:bg-gray-50"
            >
              Add
            </button>
          </div>
          {skills.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 rounded-full px-2.5 py-1"
                >
                  #{skill}
                  <button
                    type="button"
                    onClick={() => setSkills(skills.filter((s) => s !== skill))}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <Button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="w-full mt-8 rounded-full py-3 h-11 text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40"
      >
        {saving ? "Saving…" : "Save changes"}
      </Button>
    </div>
  );
}
