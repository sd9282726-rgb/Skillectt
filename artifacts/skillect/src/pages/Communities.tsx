import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

interface Community {
  id: string;
  name: string;
  description: string;
  cover_url?: string | null;
  member_count: number;
  isJoined?: boolean;
}

export default function Communities() {
  const { user } = useAuth();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("communities")
        .select("*")
        .order("member_count", { ascending: false });

      let list = (data || []) as Community[];

      if (user && list.length > 0) {
        const { data: memberships } = await supabase
          .from("community_members")
          .select("community_id")
          .eq("user_id", user.id);

        const joined = new Set((memberships || []).map((m) => m.community_id));
        list = list.map((c) => ({ ...c, isJoined: joined.has(c.id) }));
      }

      setCommunities(list);
      setLoading(false);
    };

    load();
  }, [user?.id]);

  const toggleJoin = async (id: string, joined: boolean) => {
    if (!user) return;

    if (joined) {
      await supabase
        .from("community_members")
        .delete()
        .eq("community_id", id)
        .eq("user_id", user.id);
    } else {
      await supabase.from("community_members").insert({
        community_id: id,
        user_id: user.id,
      });
    }

    setCommunities((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              isJoined: !joined,
              member_count: joined
                ? Math.max(0, c.member_count - 1)
                : c.member_count + 1,
            }
          : c
      )
    );
  };

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 bg-white min-h-full">
      <h1 className="text-xl font-bold mb-4 hidden md:block text-gray-900">Communities</h1>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        </div>
      ) : communities.length === 0 ? (
        <p className="text-center text-sm text-gray-500 py-16">
          No communities yet. Check back soon!
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {communities.map((community) => (
            <div
              key={community.id}
              className="rounded-2xl border border-gray-200 bg-white overflow-hidden"
            >
              <Link href={`/communities/${community.id}`}>
                <div className="h-28 w-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                  {community.cover_url ? (
                    <img
                      src={community.cover_url}
                      alt={community.name}
                      className="h-28 w-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-bold text-blue-600">
                      {community.name.charAt(0)}
                    </span>
                  )}
                </div>
              </Link>
              <div className="p-4">
                <Link
                  href={`/communities/${community.id}`}
                  className="font-semibold text-gray-900 hover:underline"
                >
                  {community.name}
                </Link>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                  {community.description}
                </p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-gray-500">
                    {community.member_count} members
                  </span>
                  {user && (
                    <button
                      type="button"
                      onClick={() => toggleJoin(community.id, !!community.isJoined)}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                        community.isJoined
                          ? "border border-gray-200 text-gray-600 hover:bg-gray-50"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                    >
                      {community.isJoined ? "Joined" : "Join"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
