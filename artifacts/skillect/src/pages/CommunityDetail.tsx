import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { useApp } from "@/context/AppContext";

export default function CommunityDetail({ id }: { id: string }) {
  const { communities, currentUserId, joinCommunity, leaveCommunity, getProfile } =
    useApp();
  const community = communities.find((c) => c.id === id);

  if (!community) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 text-center text-sm text-muted-foreground">
        Community not found.
      </div>
    );
  }

  const joined = currentUserId ? community.members.includes(currentUserId) : false;

  return (
    <div className="max-w-2xl mx-auto pb-10">
      <div className="relative">
        <img src={community.cover} alt={community.name} className="h-44 w-full object-cover" />
        <Link
          href="/communities"
          className="absolute top-4 left-4 h-9 w-9 rounded-full bg-black/50 backdrop-blur flex items-center justify-center"
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </Link>
      </div>
      <div className="px-4 md:px-6 py-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">{community.name}</h1>
            <p className="text-xs text-muted-foreground mt-1">
              {community.members.length} members
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              joined ? leaveCommunity(community.id) : joinCommunity(community.id)
            }
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              joined
                ? "border border-border text-muted-foreground hover-elevate"
                : "bg-primary text-primary-foreground shadow-[0_0_14px_var(--primary-glow)] hover-elevate"
            }`}
          >
            {joined ? "Joined" : "Join"}
          </button>
        </div>
        <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
          {community.description}
        </p>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {community.tags.map((tag) => (
            <span key={tag} className="text-xs text-neon-blue font-medium">
              #{tag}
            </span>
          ))}
        </div>

        <h2 className="text-sm font-semibold mt-8 mb-3">Members</h2>
        <div className="space-y-2">
          {community.members.map((memberId) => {
            const member = getProfile(memberId);
            if (!member) return null;
            return (
              <Link
                key={memberId}
                href={`/user/${memberId}`}
                className="flex items-center gap-3 rounded-xl border border-border p-3 hover-elevate"
              >
                <img
                  src={member.avatar}
                  alt={member.name}
                  className="h-10 w-10 rounded-full object-cover border border-border"
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{member.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    @{member.username}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
