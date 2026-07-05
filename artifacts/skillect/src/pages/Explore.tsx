import { useState } from "react";
import { Link } from "wouter";
import { Search } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useListProfiles, useFollowProfile, useUnfollowProfile } from "@workspace/api-client-react";
import { useApp } from "@/context/AppContext";

function invalidateProfiles(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({
    predicate: (query) =>
      typeof query.queryKey[0] === "string" &&
      query.queryKey[0].startsWith("/api/profiles"),
  });
}

export default function Explore() {
  const { currentUserId } = useApp();
  const [query, setQuery] = useState("");
  const queryClient = useQueryClient();

  const { data: allPeople = [], isLoading } = useListProfiles({ q: query || undefined });
  const people = allPeople.filter((p) => p.id !== currentUserId);

  const followMutation = useFollowProfile();
  const unfollowMutation = useUnfollowProfile();

  const toggleFollow = (id: string, isFollowing: boolean) => {
    const mutation = isFollowing ? unfollowMutation : followMutation;
    mutation.mutate({ id }, { onSuccess: () => invalidateProfiles(queryClient) });
  };

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6">
      <h1 className="text-xl font-bold mb-4 hidden md:block">Explore</h1>
      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people, skills..."
          className="w-full rounded-full bg-input border border-border pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary transition-colors"
        />
      </div>

      <div className="space-y-3">
        {people.map((person) => (
          <div
            key={person.id}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"
          >
            <Link href={`/user/${person.id}`}>
              <img
                src={person.avatar}
                alt={person.name}
                className="h-12 w-12 rounded-full object-cover border border-border"
              />
            </Link>
            <div className="min-w-0 flex-1">
              <Link href={`/user/${person.id}`} className="font-semibold text-sm hover:underline">
                {person.name}
              </Link>
              <p className="text-xs text-muted-foreground truncate">
                @{person.username} · {person.location}
              </p>
              {person.skills.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {person.skills.slice(0, 3).map((s) => (
                    <span key={s} className="text-[10px] font-medium text-neon-blue">
                      #{s}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => toggleFollow(person.id, person.isFollowedByMe)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                person.isFollowedByMe
                  ? "border border-border text-muted-foreground hover-elevate"
                  : "bg-primary text-primary-foreground shadow-[0_0_12px_var(--primary-glow)] hover-elevate"
              }`}
            >
              {person.isFollowedByMe ? "Following" : "Follow"}
            </button>
          </div>
        ))}
        {!isLoading && people.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-10">
            No one matches your search.
          </p>
        )}
      </div>
    </div>
  );
}
