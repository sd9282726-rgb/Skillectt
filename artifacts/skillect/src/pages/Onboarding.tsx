import { useState } from "react";
import { useLocation } from "wouter";
import { useApp } from "@/context/AppContext";

const SUGGESTED_SKILLS = [
  "React",
  "TypeScript",
  "Node.js",
  "Figma",
  "UI/UX",
  "Python",
  "Robotics",
  "IoT",
  "Marketing",
  "Product",
];

export default function Onboarding() {
  const { profile, completeOnboarding } = useApp();
  const [, setLocation] = useLocation();
  const [name, setName] = useState(profile?.name ?? "");
  const [bio, setBio] = useState("");
  const [location, setLocation2] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const toggleSkill = (skill: string) => {
    setSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill],
    );
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await completeOnboarding({ name, bio, location, skills });
      setLocation("/");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8">
        <div className="flex items-center gap-2 mb-6">
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="Skillect" className="h-8 w-8" />
          <span className="text-lg font-bold neon-text">Welcome to Skillect</span>
        </div>
        <h1 className="text-2xl font-bold mb-1">Set up your profile</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Tell the community a bit about what you do.
        </p>

        <div className="space-y-5">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Display name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-xl bg-input border border-border px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="What are you building?"
              rows={3}
              className="w-full rounded-xl bg-input border border-border px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors resize-none"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Location</label>
            <input
              value={location}
              onChange={(e) => setLocation2(e.target.value)}
              placeholder="City, Country"
              className="w-full rounded-xl bg-input border border-border px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Skills</label>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_SKILLS.map((skill) => {
                const active = skills.includes(skill);
                return (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-medium border transition-colors ${
                      active
                        ? "bg-[var(--primary-dim)] border-primary text-primary"
                        : "border-border text-muted-foreground hover-elevate"
                    }`}
                  >
                    {skill}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!name || submitting}
          className="w-full mt-8 rounded-full py-3 text-sm font-semibold bg-primary text-primary-foreground shadow-[0_0_18px_var(--primary-glow)] hover-elevate disabled:opacity-40 disabled:pointer-events-none"
        >
          Enter Skillect
        </button>
      </div>
    </div>
  );
}
