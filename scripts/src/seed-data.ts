export interface SeedPersona {
  id: string;
  name: string;
  username: string;
  avatar: string;
  bio: string;
  location: string;
  skills: string[];
  postTopics: string[];
}

export const SKILLECT_TEAM_ID = "seed_skillect_team";

export const seedPersonas: SeedPersona[] = [
  {
    id: SKILLECT_TEAM_ID,
    name: "Skillect Team",
    username: "skillect",
    avatar: "https://api.dicebear.com/9.x/shapes/svg?seed=skillect-team&backgroundColor=00FF87",
    bio: "Official account. Tips, community highlights, and updates from the Skillect team.",
    location: "Everywhere",
    skills: ["Community", "Product"],
    postTopics: ["platform"],
  },
  {
    id: "seed_maya_chen",
    name: "Maya Chen",
    username: "mayabuilds",
    avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=Maya",
    bio: "Frontend engineer obsessed with fast, accessible UI. React + TypeScript daily.",
    location: "Seattle, WA",
    skills: ["React", "TypeScript", "CSS", "Accessibility"],
    postTopics: ["frontend"],
  },
  {
    id: "seed_diego_alvarez",
    name: "Diego Alvarez",
    username: "diegoships",
    avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=Diego",
    bio: "Backend engineer. Distributed systems, Postgres, and making APIs boring (in a good way).",
    location: "Austin, TX",
    skills: ["Node.js", "PostgreSQL", "System Design", "APIs"],
    postTopics: ["backend"],
  },
  {
    id: "seed_priya_nair",
    name: "Priya Nair",
    username: "priyacodes",
    avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=Priya",
    bio: "Product designer turned design engineer. I believe good UX is a competitive advantage.",
    location: "Toronto, Canada",
    skills: ["Product Design", "Figma", "Design Systems", "UX Research"],
    postTopics: ["design"],
  },
  {
    id: "seed_jordan_lee",
    name: "Jordan Lee",
    username: "jordanmobile",
    avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=Jordan",
    bio: "Mobile dev building for iOS and Android. Currently deep in React Native + Expo.",
    location: "Denver, CO",
    skills: ["React Native", "Expo", "Swift", "Kotlin"],
    postTopics: ["mobile"],
  },
  {
    id: "seed_amara_okafor",
    name: "Amara Okafor",
    username: "amaradata",
    avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=Amara",
    bio: "ML engineer working on recommendation systems. Python, PyTorch, and a lot of coffee.",
    location: "Chicago, IL",
    skills: ["Python", "Machine Learning", "PyTorch", "Data Engineering"],
    postTopics: ["ml"],
  },
  {
    id: "seed_ben_walsh",
    name: "Ben Walsh",
    username: "benops",
    avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=Ben",
    bio: "DevOps / platform engineer. Kubernetes, CI/CD, and keeping prod boring.",
    location: "Remote",
    skills: ["Kubernetes", "Docker", "CI/CD", "AWS"],
    postTopics: ["devops"],
  },
  {
    id: "seed_sofia_moreno",
    name: "Sofia Moreno",
    username: "sofiabuilds",
    avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=Sofia",
    bio: "Indie hacker & full-stack dev. Building small profitable products in public.",
    location: "Lisbon, Portugal",
    skills: ["Full-Stack", "Indie Hacking", "SaaS", "Marketing"],
    postTopics: ["indiehacking"],
  },
];

export const demoPersonas = seedPersonas.filter((p) => p.id !== SKILLECT_TEAM_ID);

const postTemplates: Record<string, string[]> = {
  platform: [
    "Welcome to everyone who joined Skillect this week! Drop a post to introduce yourself and what you're building. 👋",
    "Community highlight: the conversations happening in the discussions here have been genuinely great this week. Keep sharing your work.",
    "Reminder: your profile is your portfolio. Fill in your skills and link your projects so people can find you.",
    "Tip: the best posts here aren't polished announcements, they're honest updates about what you're learning or stuck on.",
    "We're seeing more projects shared every week. If you shipped something recently, post it — even the small stuff counts.",
    "Question for the community: what's one tool you couldn't build without right now?",
    "New to Skillect? Join a community that matches your craft and introduce yourself in a comment.",
    "Shoutout to everyone posting consistently. Momentum compounds — keep showing your work.",
  ],
  frontend: [
    "Spent the afternoon shaving 200ms off our largest contentful paint by lazy-loading below-the-fold images. Small wins add up.",
    "Hot take: CSS container queries have quietly made a whole category of layout hacks unnecessary.",
    "Refactored a gnarly form component into smaller pieces with proper focus management. Accessibility audits got so much cleaner.",
    "Been playing with React Server Components on a side project. The mental model shift takes a minute but the payload savings are real.",
    "Debugged a layout shift bug for two hours today. Turned out to be a missing width/height on an img tag. Classic.",
    "Wrote a small hook to manage optimistic UI updates without pulling in a whole state library. Sometimes simple wins.",
    "Design system update: consolidated our button variants from 11 down to 4. Consistency > flexibility most of the time.",
    "TypeScript's satisfies operator has changed how I write config objects. No more losing literal types.",
  ],
  backend: [
    "Migrated a hot table to use a covering index and query time dropped from 800ms to 40ms. Always check your query plans.",
    "Wrote a small internal tool to replay production traffic against staging before deploys. Caught two regressions already.",
    "Postgres row-level security is underrated for multi-tenant apps. Worth the learning curve.",
    "Spent today untangling a N+1 query in our API. Dataloader pattern to the rescue.",
    "Rate limiting design doc done. Going with a token bucket per API key instead of a fixed window — much smoother under bursty traffic.",
    "Added structured logging with request IDs across all our services. Debugging production issues is a completely different experience now.",
    "Hot take: idempotency keys should be a default part of any payment or write-heavy API, not an afterthought.",
    "Finally deleted that legacy cron job that's been silently failing for months. Nobody noticed because nobody needed it. Good riddance.",
  ],
  design: [
    "Ran five quick usability tests on our onboarding flow this week. Turns out one confusing label was costing us 30% drop-off.",
    "Redesigned our empty states to actually guide people toward their first action instead of just saying 'nothing here yet'.",
    "Design systems tip: document the 'why' behind a component's constraints, not just its variants. Saves so much back-and-forth later.",
    "Spent the morning auditing color contrast across the app. Found six places that failed WCAG AA. Fixed and shipped.",
    "Prototyped three onboarding flows in Figma this week. The winner wasn't the prettiest one, it was the one with the fewest steps.",
    "A good empty state is a design opportunity, not an afterthought. Just shipped one that actually converts.",
    "User research reminder: watch what people do, not just what they say they'd do. Completely changed our roadmap this week.",
    "Micro-interactions matter more than people think. Added a subtle success animation and support tickets about 'did it save?' dropped.",
  ],
  mobile: [
    "Shipped offline support for our React Native app using a simple queue + background sync. Users on spotty connections are much happier.",
    "Expo's new build pipeline saved us so much CI time this week. Native builds without owning the native folders is still magic to me.",
    "Debugged a gnarly memory leak from an un-cleaned event listener in a list screen. Instruments finally paid off.",
    "Pushed a native module for biometric auth today. The bridge code is always more fiddly than expected but worth it for the UX.",
    "App startup time down from 3.2s to 1.4s after trimming our JS bundle and deferring non-critical initialization.",
    "Testing on a low-end Android device again reminded me why performance budgets matter more than flagship-device benchmarks.",
    "Deep linking finally works consistently across cold start, background, and foreground states. Took longer than it should have.",
    "Shipped a small haptic feedback pass across key interactions. Tiny detail, but testers noticed immediately.",
  ],
  ml: [
    "Retrained our recommendation model with a better negative sampling strategy. Offline metrics up, now watching the online A/B test.",
    "Spent the day on feature engineering instead of model architecture — as usual, that's where the real gains were hiding.",
    "Wrote up a short internal doc on when to reach for a simple heuristic instead of a model. Not every problem needs ML.",
    "Data drift caught early this week thanks to a monitoring dashboard we set up last month. Past-me did future-me a favor.",
    "Experimented with quantizing our model for faster inference. 4x speedup with barely noticeable accuracy loss.",
    "Labeling pipeline finally automated end to end. What used to take a day of manual review now runs overnight.",
    "Read through a paper on contrastive learning for recommendations today, already sketching how to apply it to our use case.",
    "Reminder to self: always version your training data, not just your model weights. Saved me today.",
  ],
  devops: [
    "Cut our CI pipeline time in half by parallelizing the test suite across shards. Small config change, huge day-to-day impact.",
    "Wrote a runbook for our most common incident type so on-call doesn't have to relearn it every time. Future us will thank present us.",
    "Migrated our staging environment to match prod infra exactly. Found three config drift issues immediately.",
    "Set up automatic rollback on failed health checks after a deploy today. Should have done this months ago.",
    "Kubernetes resource requests were way overprovisioned across half our services. Right-sized them and cut infra cost by 20%.",
    "Added a chaos testing step to our pipeline that randomly kills a pod during load tests. Found a graceful shutdown bug immediately.",
    "Finally consolidated our logging across services into one place. On-call debugging is so much faster now.",
    "Wrote a small Terraform module to standardize how we provision new services. Onboarding a new service now takes minutes, not hours.",
  ],
  indiehacking: [
    "Hit a small but real revenue milestone on my side project this week. Slow and steady, but it's real money from real users now.",
    "Shipped a landing page rewrite focused on one clear value prop instead of five. Conversion rate nearly doubled.",
    "Talked to eight users this week who churned. Almost all of them cited the same missing feature. Building it now.",
    "Building in public update: added Stripe billing today. Way less scary than I expected once I just started.",
    "Cut my product's onboarding from 6 steps to 2. Activation rate jumped noticeably in the first day.",
    "Reminder that marketing is a skill you can practice like anything else. Wrote my first real cold outreach email today.",
    "Shipped a tiny feature that took 20 minutes to build and it's already the most requested thing in my inbox. Ship the small stuff.",
    "Weekly build-in-public update: still pre-revenue, but signups are trending up since I started actually talking to users.",
  ],
};

export function pickPostContent(topic: string, usedIndexes: Set<number>): {
  content: string;
  index: number;
} {
  const pool = postTemplates[topic] ?? postTemplates.platform;
  const available = pool
    .map((_, i) => i)
    .filter((i) => !usedIndexes.has(i));
  const pool_ = available.length > 0 ? available : pool.map((_, i) => i);
  const index = pool_[Math.floor(Math.random() * pool_.length)];
  return { content: pool[index], index };
}

export const commentTemplates = [
  "This is a great point, thanks for sharing!",
  "Love this. Been thinking about the same problem lately.",
  "Nice work, curious how you'd approach it at larger scale.",
  "Saving this, super useful.",
  "Ran into something similar last week, good to know I'm not the only one.",
  "This is exactly the kind of update I like seeing here.",
  "Solid breakdown, appreciate you sharing the details.",
  "Well said. Small wins like this add up fast.",
];
