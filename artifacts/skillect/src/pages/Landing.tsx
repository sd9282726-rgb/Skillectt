import { Link } from "wouter";
import { ArrowRight, Sparkles, Users2, MessagesSquare } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-[100dvh] w-full bg-background text-foreground overflow-x-hidden">
      <header className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="Skillect" className="h-9 w-9" />
          <span className="text-xl font-bold neon-text tracking-tight">Skillect</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/sign-in"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="text-sm font-semibold rounded-full px-4 py-2 bg-primary text-primary-foreground shadow-[0_0_18px_var(--primary-glow)] hover-elevate"
          >
            Get started
          </Link>
        </div>
      </header>

      <section className="max-w-4xl mx-auto text-center px-6 pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground mb-6">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          A social network for builders
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.05]">
          Show your skills.
          <br />
          <span className="neon-text">Build with your people.</span>
        </h1>
        <p className="mt-6 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
          Skillect is where developers, designers, and makers share what they're
          building, join communities around their craft, and connect directly
          with people doing the same.
        </p>
        <div className="mt-9 flex items-center justify-center gap-3">
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold bg-primary text-primary-foreground shadow-[0_0_24px_var(--primary-glow)] hover-elevate"
          >
            Join Skillect
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold border border-border hover-elevate"
          >
            Sign in
          </Link>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-24 grid gap-5 md:grid-cols-3">
        <FeatureCard
          icon={<Sparkles className="h-5 w-5 text-primary" />}
          title="Share your work"
          description="Post updates, projects, and progress. Get feedback from people who actually understand what you're building."
        />
        <FeatureCard
          icon={<Users2 className="h-5 w-5 text-neon-blue" />}
          title="Join communities"
          description="Find your people — frontend builders, indie makers, hardware tinkerers, and more."
        />
        <FeatureCard
          icon={<MessagesSquare className="h-5 w-5 text-gold" />}
          title="Connect directly"
          description="Follow builders you admire and message them directly to collaborate."
        />
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Skillect. Built for builders.
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 text-left">
      <div className="h-10 w-10 rounded-xl bg-[var(--card-alt)] flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-semibold mb-1.5">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
