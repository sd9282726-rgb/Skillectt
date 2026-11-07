import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Search, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

interface Community {
  id: string;
  name: string;
  description: string;
  cover_url: string | null;
  member_count: number;
  isJoined: boolean;
}

type MembershipRow = { community_id: string };

export default function Communities() {
  const { user } = useAuth();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"discover" | "joined">("discover");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadCommunities = async () => {
    setLoading(true);
    setError(null);

    const [{ data: rows, error: communityError }, { data: membershipRows, error: memberError }] =
      await Promise.all([
        supabase
          .from("communities")
          .select("id, name, description, cover_url")
          .order("name", { ascending: true }),
        supabase.from("community_members").select("community_id,user_id"),
      ]);

    if (communityError || memberError) {
      setError(communityError?.message || memberError?.message || "Could not load communities.");
      setCommunities([]);
      setLoading(false);
      return;
    }

    const memberships = (membershipRows || []) as (MembershipRow & { user_id: string })[];
    const counts = new Map<string, number>();
    const joined = new Set<string>();
    for (const row of memberships) {
      counts.set(row.community_id, (counts.get(row.community_id) || 0) + 1);
      if (row.user_id === user?.id) joined.add(row.community_id);
    }

    setCommunities(
      (rows || []).map((community) => ({
        ...community,
        cover_url: community.cover_url,
        member_count: counts.get(community.id) || 0,
        isJoined: joined.has(community.id),
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    void loadCommunities();
  }, [user?.id]);

  const visibleCommunities = useMemo(() => {
    const term = query.trim().toLowerCase();
    return communities.filter((community) => {
      if (tab === "joined" && !community.isJoined) return false;
      if (!term) return true;
      return (
        community.name.toLowerCase().includes(term) ||
        community.description.toLowerCase().includes(term)
      );
    });
  }, [communities, query, tab]);

  const toggleJoin = async (community: Community) => {
    if (!user || busyId) return;
    setBusyId(community.id);
    setError(null);

    const result = community.isJoined
      ? await supabase
          .from("community_members")
          .delete()
          .eq("community_id", community.id)
          .eq("user_id", user.id)
      : await supabase.from("community_members").insert({
          community_id: community.id,
          user_id: user.id,
        });

    if (result.error) {
      setError(result.error.message);
    } else {
      setCommunities((current) =>
        current.map((item) =>
          item.id === community.id
            ? {
                ...item,
                isJoined: !community.isJoined,
                member_count: Math.max(0, item.member_count + (community.isJoined ? -1 : 1)),
              }
            : item
        )
      );
    }
    setBusyId(null);
  };

  return (
    <div className="mx-auto min-h-full max-w-4xl bg-white px-4 py-6 md:px-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Communities</h1>
          <p className="mt-1 text-sm text-gray-500">
            Find people learning, creating, and building around the same interests.
          </p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <Users className="h-5 w-5" />
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search communities"
          aria-label="Search communities"
          className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm text-gray-900 outline-none focus:border-blue-500"
        />
      </div>

      <div className="mb-5 flex gap-2 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setTab("discover")}
          className={`border-b-2 px-3 py-2 text-sm font-semibold ${tab === "discover" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500"}`}
        >
          Discover
        </button>
        <button
          type="button"
          onClick={() => setTab("joined")}
          className={`border-b-2 px-3 py-2 text-sm font-semibold ${tab === "joined" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500"}`}
        >
          Joined
        </button>
      </div>

      {error && (
        <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-44 animate-pulse rounded-2xl border border-gray-100 bg-gray-50" />
          ))}
        </div>
      ) : visibleCommunities.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 px-5 py-14 text-center">
          <Users className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-3 text-sm font-semibold text-gray-800">
            {tab === "joined" ? "You haven't joined a community yet" : "No communities match that search"}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {tab === "joined" ? "Discover a community and join the conversation." : "Try another name or topic."}
          </p>
          {tab === "joined" && (
            <button type="button" onClick={() => setTab("discover")} className="mt-4 text-sm font-semibold text-blue-600">
              Explore communities
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {visibleCommunities.map((community) => (
            <article key={community.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <Link href={`/communities/${community.id}`} className="block">
                <div className="flex h-28 items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100">
                  {community.cover_url ? (
                    <img src={community.cover_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-3xl font-bold text-blue-600">{community.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
              </Link>
              <div className="p-4">
                <Link href={`/communities/${community.id}`} className="font-semibold text-gray-900 hover:text-blue-600">
                  {community.name}
                </Link>
                <p className="mt-1 line-clamp-2 min-h-9 text-xs leading-relaxed text-gray-500">
                  {community.description}
                </p>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="text-xs text-gray-500">
                    {community.member_count.toLocaleString()} {community.member_count === 1 ? "member" : "members"}
                  </span>
                  <button
                    type="button"
                    onClick={() => void toggleJoin(community)}
                    disabled={!user || busyId === community.id}
                    className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-50 ${community.isJoined ? "border border-gray-200 text-gray-700 hover:bg-gray-50" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                  >
                    {busyId === community.id ? "Saving…" : community.isJoined ? "Joined" : "Join"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
