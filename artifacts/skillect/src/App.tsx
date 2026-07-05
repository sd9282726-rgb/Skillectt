import { useEffect, useRef } from "react";
import { ClerkProvider, Show, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Switch, Route, Redirect, useLocation, Router as WouterRouter } from "wouter";
import { QueryClientProvider, useQueryClient, QueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider, useApp } from "@/context/AppContext";
import NotFound from "@/pages/not-found";
import SignInPage from "@/pages/SignInPage";
import SignUpPage from "@/pages/SignUpPage";
import Landing from "@/pages/Landing";
import Onboarding from "@/pages/Onboarding";
import Shell from "@/components/Shell";
import Feed from "@/pages/Feed";
import Explore from "@/pages/Explore";
import Communities from "@/pages/Communities";
import CommunityDetail from "@/pages/CommunityDetail";
import Create from "@/pages/Create";
import Profile from "@/pages/Profile";
import EditProfile from "@/pages/EditProfile";
import UserProfilePage from "@/pages/UserProfilePage";
import PostDetail from "@/pages/PostDetail";
import Messages from "@/pages/Messages";
import Conversation from "@/pages/Conversation";

const queryClient = new QueryClient();

// REQUIRED — copy verbatim.
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

// REQUIRED — copy verbatim.
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#00FF87",
    colorForeground: "#F0F8FF",
    colorMutedForeground: "#8888AA",
    colorDanger: "#FF4466",
    colorBackground: "#07070F",
    colorInput: "#0C0C1A",
    colorInputForeground: "#F0F8FF",
    colorNeutral: "#181828",
    fontFamily: "Inter, sans-serif",
    borderRadius: "0.875rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-[#07070F] border border-[#0F0F1C] rounded-2xl w-[440px] max-w-full overflow-hidden",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-[#F0F8FF] font-bold",
    headerSubtitle: "text-[#8888AA]",
    socialButtonsBlockButtonText: "text-[#F0F8FF]",
    socialButtonsBlockButton: "bg-[#0A0A16] border border-[#181828] hover:bg-[#0F0F1C]",
    formFieldLabel: "text-[#F0F8FF]",
    footerActionLink: "text-[#00FF87] hover:text-[#00FF87]",
    footerActionText: "text-[#8888AA]",
    dividerText: "text-[#8888AA]",
    dividerLine: "bg-[#181828]",
    identityPreviewEditButton: "text-[#00FF87]",
    formFieldSuccessText: "text-[#00FF87]",
    alertText: "text-[#FF4466]",
    alert: "bg-[#0A0A16] border border-[#FF4466]/40",
    logoBox: "flex justify-center py-2",
    logoImage: "h-10 w-10",
    formButtonPrimary:
      "bg-[#00FF87] text-[#020209] hover:bg-[#00FF87]/90 font-semibold shadow-[0_0_16px_rgba(0,255,135,0.35)]",
    formFieldInput: "bg-[#0C0C1A] border border-[#181828] text-[#F0F8FF]",
    footerAction: "text-[#8888AA]",
    otpCodeFieldInput: "bg-[#0C0C1A] border border-[#181828] text-[#F0F8FF]",
    formFieldRow: "",
    main: "gap-4",
  },
};

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <OnboardingGate />
      </Show>
      <Show when="signed-out">
        <Landing />
      </Show>
    </>
  );
}

function OnboardingGate() {
  const { profile, isProfileLoading } = useApp();
  if (isProfileLoading) return null;
  if (profile && !profile.onboarded) {
    return <Onboarding />;
  }
  return (
    <Shell>
      <Feed />
    </Shell>
  );
}

function AuthedRoute({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Show when="signed-in">
        <Shell>{children}</Shell>
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function LogoutRedirectHome() {
  const { signOut } = useClerk();
  useEffect(() => {
    signOut({ redirectUrl: basePath || "/" });
  }, [signOut]);
  return null;
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Welcome back",
            subtitle: "Sign in to keep building with your community",
          },
        },
        signUp: {
          start: {
            title: "Join Skillect",
            subtitle: "Create an account to share your work and connect",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <AppProvider>
          <TooltipProvider>
            <Switch>
              <Route path="/" component={HomeRedirect} />
              <Route path="/sign-in/*?" component={SignInPage} />
              <Route path="/sign-up/*?" component={SignUpPage} />
              <Route path="/logout" component={LogoutRedirectHome} />
              <Route path="/explore">
                {() => (
                  <AuthedRoute>
                    <Explore />
                  </AuthedRoute>
                )}
              </Route>
              <Route path="/communities">
                {() => (
                  <AuthedRoute>
                    <Communities />
                  </AuthedRoute>
                )}
              </Route>
              <Route path="/communities/:id">
                {(params) => (
                  <AuthedRoute>
                    <CommunityDetail id={params.id} />
                  </AuthedRoute>
                )}
              </Route>
              <Route path="/create">
                {() => (
                  <AuthedRoute>
                    <Create />
                  </AuthedRoute>
                )}
              </Route>
              <Route path="/profile">
                {() => (
                  <AuthedRoute>
                    <Profile />
                  </AuthedRoute>
                )}
              </Route>
              <Route path="/profile/edit">
                {() => (
                  <AuthedRoute>
                    <EditProfile />
                  </AuthedRoute>
                )}
              </Route>
              <Route path="/user/:id">
                {(params) => (
                  <AuthedRoute>
                    <UserProfilePage id={params.id} />
                  </AuthedRoute>
                )}
              </Route>
              <Route path="/post/:id">
                {(params) => (
                  <AuthedRoute>
                    <PostDetail id={params.id} />
                  </AuthedRoute>
                )}
              </Route>
              <Route path="/messages">
                {() => (
                  <AuthedRoute>
                    <Messages />
                  </AuthedRoute>
                )}
              </Route>
              <Route path="/messages/:id">
                {(params) => (
                  <AuthedRoute>
                    <Conversation id={params.id} />
                  </AuthedRoute>
                )}
              </Route>
              <Route path="/onboarding">
                {() => (
                  <Show when="signed-in">
                    <Onboarding />
                  </Show>
                )}
              </Route>
              <Route component={NotFound} />
            </Switch>
          </TooltipProvider>
          <Toaster />
        </AppProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
