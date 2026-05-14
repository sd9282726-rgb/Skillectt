export interface Skill {
  id: string;
  name: string;
  color: string;
}

export interface SkillCategory {
  id: string;
  name: string;
  icon: string;
  skills: Skill[];
}

export const SKILL_CATEGORIES: SkillCategory[] = [
  {
    id: "tech",
    name: "Tech",
    icon: "cpu",
    skills: [
      { id: "coding", name: "Coding", color: "#3B82F6" },
      { id: "aiml", name: "AI & ML", color: "#A855F7" },
      { id: "webdev", name: "Web Dev", color: "#06B6D4" },
      { id: "appdev", name: "App Dev", color: "#6366F1" },
      { id: "data_science", name: "Data Science", color: "#8B5CF6" },
      { id: "cybersecurity", name: "Cybersecurity", color: "#EF4444" },
      { id: "blockchain", name: "Blockchain", color: "#F59E0B" },
      { id: "devops", name: "DevOps", color: "#22D3EE" },
    ],
  },
  {
    id: "content",
    name: "Content",
    icon: "film",
    skills: [
      { id: "youtube", name: "YouTube", color: "#EF4444" },
      { id: "video_editing", name: "Video Editing", color: "#F43F5E" },
      { id: "writing", name: "Writing", color: "#06B6D4" },
      { id: "design", name: "Design", color: "#EC4899" },
      { id: "photography", name: "Photography", color: "#14B8A6" },
      { id: "podcasting", name: "Podcasting", color: "#7C3AED" },
      { id: "animation", name: "Animation", color: "#F97316" },
    ],
  },
  {
    id: "business",
    name: "Business",
    icon: "briefcase",
    skills: [
      { id: "marketing", name: "Digital Marketing", color: "#8B5CF6" },
      { id: "sales", name: "Sales", color: "#84CC16" },
      { id: "entrepreneurship", name: "Entrepreneurship", color: "#F97316" },
      { id: "freelancing", name: "Freelancing", color: "#10B981" },
      { id: "seo", name: "SEO", color: "#0EA5E9" },
      { id: "social_media", name: "Social Media", color: "#FB7185" },
      { id: "copywriting", name: "Copywriting", color: "#A3E635" },
    ],
  },
  {
    id: "finance",
    name: "Finance",
    icon: "trending-up",
    skills: [
      { id: "trading", name: "Trading", color: "#F59E0B" },
      { id: "investing", name: "Investing", color: "#22C55E" },
      { id: "finance", name: "Personal Finance", color: "#10B981" },
      { id: "crypto", name: "Crypto", color: "#EAB308" },
      { id: "options", name: "Options & Derivatives", color: "#FB923C" },
    ],
  },
  {
    id: "creative",
    name: "Creative",
    icon: "music",
    skills: [
      { id: "music", name: "Music", color: "#EC4899" },
      { id: "art", name: "Art & Illustration", color: "#A855F7" },
      { id: "filmmaking", name: "Filmmaking", color: "#F43F5E" },
      { id: "photography2", name: "Street Photography", color: "#14B8A6" },
      { id: "graphic_design", name: "Graphic Design", color: "#F97316" },
    ],
  },
  {
    id: "other",
    name: "Other",
    icon: "star",
    skills: [
      { id: "public_speaking", name: "Public Speaking", color: "#FBBF24" },
      { id: "languages", name: "Languages", color: "#22D3EE" },
      { id: "fitness", name: "Fitness", color: "#84CC16" },
      { id: "cooking", name: "Cooking", color: "#F97316" },
      { id: "productivity", name: "Productivity", color: "#6366F1" },
    ],
  },
];

export const SKILLS: Skill[] = SKILL_CATEGORIES.flatMap((c) => c.skills);

export function getSkillById(id: string): Skill | undefined {
  return SKILLS.find((s) => s.id === id);
}

export function getSkillColor(id: string): string {
  return getSkillById(id)?.color ?? "#666688";
}

export function getSkillName(id: string): string {
  return getSkillById(id)?.name ?? id;
}

export function getCategoryForSkill(id: string): SkillCategory | undefined {
  return SKILL_CATEGORIES.find((c) => c.skills.some((s) => s.id === id));
}
