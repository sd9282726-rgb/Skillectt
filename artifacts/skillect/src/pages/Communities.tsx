import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListCommunities,
  useJoinCommunity,
  useLeaveCommunity,
  getListCommunitiesQueryKey,
} from "@workspace/api-client-react";

export default function Communities() {
  const queryClient = useQueryClient();
  const { data: communities = [] } = useListCommunities();
  const joinMutation = useJoinCommunity();
  const leaveMutation = useLeaveCommunity();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListCommunitiesQueryKey() });
    queryClient.invalidateQueries({
      predicate: (query) =>
        typeof query.queryKey[0] === "string" &&
        query.queryKey[0].startsWith("/api/communities/"),
    });
  };

  const toggleJoin = (id: number, joined: boolean) => {
    const mutation = joined ? leaveMutation : joinMutation;
    mutation.mutate({ id }, { onSuccess: invalidate });
  };

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6">
      <h1 className="text-xl font-bold mb-4 hidden md:block">Communities</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {communities.map((community) => (
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
                  {community.memberCount} members
                </span>
                <button
                  type="button"
                  onClick={() => toggleJoin(community.id, community.isJoinedByMe)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                    community.isJoinedByMe
                      ? "border border-border text-muted-foreground hover-elevate"
                      : "bg-primary text-primary-foreground shadow-[0_0_12px_var(--primary-glow)] hover-elevate"
                  }`}
                >
                  {community.isJoinedByMe ? "Joined" : "Join"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
