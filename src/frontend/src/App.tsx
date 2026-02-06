import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useGetCallerUserProfile } from './hooks/useQueries';
import { RouterProvider, createRouter, createRootRoute, createRoute, Outlet } from '@tanstack/react-router';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import HomePage from './pages/HomePage';
import WelcomeAccountSetup from './components/WelcomeAccountSetup';
import MatchingPage from './pages/MatchingPage';
import FriendsPage from './pages/FriendsPage';
import ProfilePage from './pages/ProfilePage';
import SubscriptionPage from './pages/SubscriptionPage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';
import PaymentFailurePage from './pages/PaymentFailurePage';
import ViewTogetherPage from './pages/ViewTogetherPage';
import Header from './components/Header';
import Footer from './components/Footer';

const rootRoute = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-pink-100/30 via-purple-100/30 to-cyan-100/30 dark:from-pink-950/20 dark:via-purple-950/20 dark:to-cyan-950/20 relative overflow-hidden">
      {/* Decorative cat silhouettes in background */}
      <div className="fixed inset-0 pointer-events-none opacity-5 dark:opacity-10">
        <img 
          src="/assets/generated/cat-silhouette-bg-transparent.dim_120x120.png" 
          alt="" 
          className="absolute top-20 left-10 w-24 h-24 animate-float"
          style={{ animationDelay: '0s' }}
        />
        <img 
          src="/assets/generated/cat-silhouette-bg-transparent.dim_120x120.png" 
          alt="" 
          className="absolute top-40 right-20 w-32 h-32 animate-float"
          style={{ animationDelay: '1s' }}
        />
        <img 
          src="/assets/generated/cat-silhouette-bg-transparent.dim_120x120.png" 
          alt="" 
          className="absolute bottom-32 left-1/4 w-28 h-28 animate-float"
          style={{ animationDelay: '2s' }}
        />
        <img 
          src="/assets/generated/cat-silhouette-bg-transparent.dim_120x120.png" 
          alt="" 
          className="absolute bottom-20 right-1/3 w-20 h-20 animate-float"
          style={{ animationDelay: '1.5s' }}
        />
      </div>
      <Header />
      <main className="flex-1 relative z-10">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
});

const matchingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/matching',
  component: MatchingPage,
});

const friendsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/friends',
  component: FriendsPage,
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  component: ProfilePage,
});

const subscriptionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/subscription',
  component: SubscriptionPage,
});

const paymentSuccessRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/payment-success',
  component: PaymentSuccessPage,
});

const paymentFailureRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/payment-failure',
  component: PaymentFailurePage,
});

const viewTogetherRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/view-together',
  component: ViewTogetherPage,
});

const routeTree = rootRoute.addChildren([
  homeRoute,
  matchingRoute,
  friendsRoute,
  profileRoute,
  subscriptionRoute,
  paymentSuccessRoute,
  paymentFailureRoute,
  viewTogetherRoute,
]);

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  const { identity, isInitializing } = useInternetIdentity();
  const { data: userProfile, isLoading: profileLoading, isFetched, error: profileError } = useGetCallerUserProfile();

  const isAuthenticated = !!identity;
  
  // Only show onboarding if:
  // 1. User is authenticated
  // 2. Profile query has completed (isFetched)
  // 3. Profile is null OR onboarding is not complete
  const showOnboarding = isAuthenticated && isFetched && (
    userProfile === null || 
    (userProfile !== null && userProfile !== undefined && !userProfile.onboardingComplete)
  );

  if (isInitializing) {
    return (
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-100/50 via-purple-100/50 to-cyan-100/50 dark:from-pink-950/30 dark:via-purple-950/30 dark:to-cyan-950/30">
          <div className="text-center space-y-6">
            <div className="relative">
              <div className="w-32 h-32 border-8 border-primary/30 border-t-primary rounded-full animate-spin mx-auto"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <img
                  src="/assets/generated/meowate-mascot-cat-transparent.dim_200x200.png"
                  alt="Meowate Mascot"
                  className="h-20 w-20 animate-bounce-slow"
                />
              </div>
            </div>
            <p className="text-foreground text-2xl font-bold">Loading Meowate...</p>
            <p className="text-muted-foreground text-lg">Purr-paring your experience! 🐾</p>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <RouterProvider router={router} />
      {showOnboarding && <WelcomeAccountSetup />}
      <Toaster position="top-center" />
    </ThemeProvider>
  );
}
