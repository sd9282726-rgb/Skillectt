import { useState } from "react";
import { Switch, Route, Redirect, Router as WouterRouter } from "wouter";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { AppProvider, useApp } from "@/context/AppContext";
import NotFound from "@/pages/not-found";
import SignInPage from "@/pages/SignInPage";
import SignUpPage from "@/pages/SignUpPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
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
import Notifications from "@/pages/Notifications";

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

function LoadingScreen() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-white">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
    </div>
  );
}

function ProfileRecovery() {
  const { profile, refreshProfile, isProfileLoading } = useApp();
  const { signOut } = useAuth();
  const [retrying, setRetrying] = useState(false);

  if (profile && !profile.onboarded) return <Onboarding />;

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-white px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 p-6 text-center">
        <h1 className="text-lg font-bold text-gray-900">Finishing your account setup</h1>
        <p className="mt-2 text-sm text-gray-600">Skillect could not load your profile yet. Retry setup or sign out and sign in again.</p>
        <button
          type="button"
          disabled={retrying || isProfileLoading}
          onClick={async () => { setRetrying(true); await refreshProfile(); setRetrying(false); }}
          className="mt-5 w-full rounded-full bg-blue-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {retrying || isProfileLoading ? "Checking…" : "Retry profile setup"}
        </button>
        <button type="button" onClick={() => void signOut()} className="mt-3 text-sm font-medium text-gray-500">Sign out</button>
      </div>
    </div>
  );
}

function HomeRedirect() {
  const { user, loading } = useAuth();
  const { profile, isProfileLoading } = useApp();

  if (loading || (user && isProfileLoading)) return <LoadingScreen />;
  if (!user) return <Landing />;
  if (!profile) return <ProfileRecovery />;
  if (!profile.onboarded) return <Onboarding />;

  return (
    <Shell>
      <Feed />
    </Shell>
  );
}

function AuthedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { profile, isProfileLoading } = useApp();

  if (loading || (user && isProfileLoading)) return <LoadingScreen />;
  if (!user) return <Redirect to="/sign-in" />;
  if (!profile) return <ProfileRecovery />;
  if (!profile.onboarded) return <Onboarding />;

  return <Shell>{children}</Shell>;
}

function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/sign-in" component={SignInPage} />
      <Route path="/sign-up" component={SignUpPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />

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

      <Route path="/notifications">
        {() => (
          <AuthedRoute>
            <Notifications />
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
        {() => {
          const { user, loading } = useAuth();
          const { profile, isProfileLoading } = useApp();
          if (loading || (user && isProfileLoading)) return <LoadingScreen />;
          if (!user) return <Redirect to="/sign-in" />;
          if (!profile) return <ProfileRecovery />;
          if (profile.onboarded) return <Redirect to="/" />;
          return <Onboarding />;
        }}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppProvider>
            <TooltipProvider>
              <AppRoutes />
              <Toaster />
            </TooltipProvider>
          </AppProvider>
        </AuthProvider>
      </QueryClientProvider>
    </WouterRouter>
  );
}

export default App;
