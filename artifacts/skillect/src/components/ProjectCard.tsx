import type { Project } from "@workspace/api-client-react";
import { ExternalLink } from "lucide-react";

export default function ProjectCard({ project }: { project: Project }) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {project.image && (
        <img src={project.image} alt={project.title} className="h-36 w-full object-cover" />
      )}
      <div className="p-4">
        <h3 className="font-semibold text-sm">{project.title}</h3>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
          {project.description}
        </p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {project.tags.map((tag) => (
            <span key={tag} className="text-[10px] font-medium text-neon-blue">
              #{tag}
            </span>
          ))}
        </div>
        {project.links.length > 0 && (
          <div className="flex flex-wrap gap-3 mt-3">
            {project.links.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                {link.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
