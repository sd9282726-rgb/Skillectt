import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Search } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

interface Person {
  id: string;
  display_name: string;
  username: string;
  avatar_url?: string | null;
  location?: string | null;
  skills: string[];
  isFollowing?: boolean;
}

export default function Explore() {
  const { currentUserId } = useApp();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      setError(null);
      const { data, error: peopleError } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url, location, skills")
        .order("created_at", { ascending: false })
        .limit(100);

      if (peopleError) {
        setError(peopleError.message);
        setPeople([]);
        setLoading(false);
        return;
      }

      const term = query.trim().toLowerCase();
      let list = ((data || []) as Person[]).filter((person) => {
        if (person.id === currentUserId) return false;
        if (!term) return true;
        return (
          person.display_name.toLowerCase().includes(term) ||
          person.username.toLowerCase().includes(term) ||
          (person.skills || []).some((skill) => skill.toLowerCase().includes(term))
        );
      });

      if (user && list.length > 0) {
        const ids = list.map((p) => p.id);
        const { data: follows } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", user.id)
          .in("following_id", ids);

        const followingSet = new Set((follows || []).map((f) => f.following_id));
        list = list.map((p) => ({ ...p, isFollowing: followingSet.has(p.id) }));
      }

      setPeople(list);
      setLoading(false);
    };

    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [query, currentUserId, user?.id]);

  const toggleFollow = async (id: string, isFollowing: boolean) => {
    if (!user) return;

    const result = isFollowing
      ? await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", id)
      : await supabase.from("follows").insert({ follower_id: user.id, following_id: id });

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setPeople((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isFollowing: !isFollowing } : p))
    );
  };

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 bg-white min-h-full">
      <h1 className="text-xl font-bold mb-4 hidden md:block text-gray-900">Explore</h1>
      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people, skills..."
          className="w-full rounded-full bg-gray-50 border border-gray-200 pl-10 pr-4 py-2.5 text-sm outline-none focus:border-blue-500"
        />
      </div>

      {error && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-3">
          {people.map((person) => (
            <div
              key={person.id}
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4"
            >
              <Link href={`/user/${person.id}`}>
                <img
                  src={
                    person.avatar_url ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${person.username}`
                  }
                  alt={person.display_name}
                  className="h-12 w-12 rounded-full object-cover border border-gray-200"
                />
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/user/${person.id}`} className="font-semibold text-sm text-gray-900 hover:underline">
                  {person.display_name}
                </Link>
                <p className="text-xs text-gray-500 truncate">
                  @{person.username}
                  {person.location ? ` · ${person.location}` : ""}
                </p>
                {person.skills?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {person.skills.slice(0, 3).map((s) => (
                      <span key={s} className="text-[10px] font-medium text-blue-600">
                        #{s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {user && (
                <button
                  type="button"
                  onClick={() => toggleFollow(person.id, !!person.isFollowing)}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                    person.isFollowing
                      ? "border border-gray-200 text-gray-600 hover:bg-gray-50"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {person.isFollowing ? "Following" : "Follow"}
                </button>
              )}
            </div>
          ))}
          {people.length === 0 && (
            <p className="text-center text-sm text-gray-500 py-10">
              No one matches your search.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
