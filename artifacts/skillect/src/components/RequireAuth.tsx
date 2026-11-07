import { Link } from "wouter";
import { useAuth } from "@/context/AuthContext";

/** Renders children when signed in; otherwise a soft gate pointing to Profile auth. */
export function RequireAuth({
  children,
  action = "continue",
}: {
  children: React.ReactNode;
  action?: string;
}) {
  const { user } = useAuth();
  if (user) return <>{children}</>;
  return (
    <div className="mx-4 my-6 rounded-2xl border border-border bg-card p-5 text-center">
      <p className="text-sm font-semibold text-foreground">Sign in to {action}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        You can browse Skillect without an account. Create a profile from the Profile tab to like, post, follow, message, or join communities.
      </p>
      <Link
        href="/profile"
        className="mt-4 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
      >
        Go to Profile
      </Link>
    </div>
  );
}

export function useRequireAuthAction() {
  const { user } = useAuth();
  return (actionLabel: string) => {
    if (user) return true;
    window.alert(`Sign in from the Profile tab to ${actionLabel}.`)
    return false;
  };
}
