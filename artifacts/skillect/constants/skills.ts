export interface Skill {
  id: string;
  name: string;
  color: string;
}

export const SKILLS: Skill[] = [
  { id: "coding", name: "Coding", color: "#3B82F6" },
  { id: "trading", name: "Trading", color: "#F59E0B" },
  { id: "youtube", name: "YouTube", color: "#EF4444" },
  { id: "marketing", name: "Digital Marketing", color: "#8B5CF6" },
  { id: "freelancing", name: "Freelancing", color: "#10B981" },
  { id: "design", name: "Design", color: "#EC4899" },
  { id: "entrepreneurship", name: "Entrepreneurship", color: "#F97316" },
  { id: "finance", name: "Finance", color: "#22C55E" },
  { id: "writing", name: "Content Writing", color: "#06B6D4" },
  { id: "aiml", name: "AI & Machine Learning", color: "#A855F7" },
  { id: "crypto", name: "Crypto", color: "#EAB308" },
  { id: "photography", name: "Photography", color: "#14B8A6" },
  { id: "video_editing", name: "Video Editing", color: "#F43F5E" },
  { id: "sales", name: "Sales", color: "#84CC16" },
  { id: "seo", name: "SEO", color: "#0EA5E9" },
  { id: "data_science", name: "Data Science", color: "#6366F1" },
  { id: "social_media", name: "Social Media", color: "#FB7185" },
  { id: "public_speaking", name: "Public Speaking", color: "#FBBF24" },
];

export function getSkillById(id: string): Skill | undefined {
  return SKILLS.find((s) => s.id === id);
}

export function getSkillColor(id: string): string {
  return getSkillById(id)?.color ?? "#666688";
}

export function getSkillName(id: string): string {
  return getSkillById(id)?.name ?? id;
}
