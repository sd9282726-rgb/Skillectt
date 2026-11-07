import { useState } from "react";
import { useLocation } from "wouter";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";

const SUGGESTED_SKILLS = [
  "React",
  "TypeScript",
  "Node.js",
  "Figma",
  "UI/UX",
  "Python",
  "Design",
  "Marketing",
  "Product",
  "Writing",
  "Video",
  "Entrepreneurship",
];

export default function Onboarding() {
  const { profile, completeOnboarding } = useApp();
  const [, setLocation] = useLocation();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [bio, setBio] = useState("");
  const [location, setLocation2] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleSkill = (skill: string) => {
    setSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const handleSubmit = async () => {
    if (!displayName.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const saved = await completeOnboarding({
        display_name: displayName.trim(),
        bio: bio.trim().slice(0, 300),
        location: location.trim().slice(0, 100),
        skills,
      });
      if (!saved) {
        setError("We couldn't save your profile. Please try again.");
      } else {
        setLocation("/");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-white flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-lg font-bold text-blue-600">Welcome to Skillect</span>
        </div>
        <h1 className="text-2xl font-bold mb-1 text-gray-900">Set up your profile</h1>
        <p className="text-sm text-gray-600 mb-6">
          Tell the community what you're learning and building.
        </p>

        {error && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="space-y-5">
          <div>
            <label className="text-sm font-medium mb-1.5 block text-gray-700">Display name</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-xl bg-gray-50 border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block text-gray-700">Bio</label>
            <textarea
              value={bio}
              maxLength={300}
              onChange={(e) => setBio(e.target.value)}
              placeholder="What are you learning or building?"
              rows={3}
              className="w-full rounded-xl bg-gray-50 border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500 resize-none"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block text-gray-700">Location</label>
            <input
              value={location}
              onChange={(e) => setLocation2(e.target.value)}
              placeholder="City, Country"
              className="w-full rounded-xl bg-gray-50 border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block text-gray-700">Skills & interests</label>
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
                        ? "bg-blue-50 border-blue-500 text-blue-700"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {skill}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!displayName.trim() || submitting}
          className="w-full mt-8 rounded-full py-3 h-11 text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40"
        >
          {submitting ? "Saving…" : "Enter Skillect"}
        </Button>
      </div>
    </div>
  );
}
