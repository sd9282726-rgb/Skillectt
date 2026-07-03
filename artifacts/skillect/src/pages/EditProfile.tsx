import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, X } from "lucide-react";
import { useApp } from "@/context/AppContext";

export default function EditProfile() {
  const { getCurrentProfile, updateProfile } = useApp();
  const profile = getCurrentProfile();
  const [, setLocation] = useLocation();
  const [name, setName] = useState(profile?.name ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [location, setLocationField] = useState(profile?.location ?? "");
  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState<string[]>(profile?.skills ?? []);

  if (!profile) return null;

  const addSkill = () => {
    const clean = skillInput.trim();
    if (clean && !skills.includes(clean)) setSkills([...skills, clean]);
    setSkillInput("");
  };

  const handleSave = () => {
    updateProfile({ name, bio, location, skills });
    setLocation("/profile");
  };

  return (
    <div className="max-w-xl mx-auto px-4 md:px-6 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => setLocation("/profile")}
          className="h-9 w-9 rounded-full flex items-center justify-center hover-elevate"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold">Edit profile</h1>
      </div>

      <div className="space-y-5">
        <div>
          <label className="text-sm font-medium mb-1.5 block">Display name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl bg-input border border-border px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            className="w-full rounded-xl bg-input border border-border px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors resize-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Location</label>
          <input
            value={location}
            onChange={(e) => setLocationField(e.target.value)}
            className="w-full rounded-xl bg-input border border-border px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Skills</label>
          <div className="flex gap-2">
            <input
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
              placeholder="Add a skill"
              className="flex-1 rounded-xl bg-input border border-border px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors"
            />
            <button
              type="button"
              onClick={addSkill}
              className="rounded-xl border border-border px-4 text-sm font-medium hover-elevate"
            >
              Add
            </button>
          </div>
          {skills.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="flex items-center gap-1 text-xs font-medium text-neon-blue bg-[var(--card-alt)] rounded-full px-2.5 py-1"
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

      <button
        type="button"
        onClick={handleSave}
        className="w-full mt-8 rounded-full py-3 text-sm font-semibold bg-primary text-primary-foreground shadow-[0_0_18px_var(--primary-glow)] hover-elevate"
      >
        Save changes
      </button>
    </div>
  );
}
