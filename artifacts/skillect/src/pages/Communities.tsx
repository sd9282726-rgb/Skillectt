import { Link } from "wouter";
import { useApp } from "@/context/AppContext";

export default function Communities() {
  const { communities, currentUserId, joinCommunity, leaveCommunity } = useApp();

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6">
      <h1 className="text-xl font-bold mb-4 hidden md:block">Communities</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {communities.map((community) => {
          const joined = currentUserId
            ? community.members.includes(currentUserId)
            : false;
          return (
            <div
              key={community.id}
              className="rounded-2xl border border-border bg-card overflow-hidden"
            >
              <Link href={`/communities/${community.id}`}>
                <img
                  src={community.cover}
                  alt={community.name}
                  className="h-28 w-full object-cover"
                />
              </Link>
              <div className="p-4">
                <Link href={`/communities/${community.id}`} className="font-semibold hover:underline">
                  {community.name}
                </Link>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {community.description}
                </p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-muted-foreground">
                    {community.members.length} members
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      joined
                        ? leaveCommunity(community.id)
                        : joinCommunity(community.id)
                    }
                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                      joined
                        ? "border border-border text-muted-foreground hover-elevate"
                        : "bg-primary text-primary-foreground shadow-[0_0_12px_var(--primary-glow)] hover-elevate"
                    }`}
                  >
                    {joined ? "Joined" : "Join"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
