import { useNavigate } from '@tanstack/react-router';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useGetCallerUserProfile } from '../hooks/useQueries';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, Users, Shield, Sparkles, Video, Globe, Zap, LogIn } from 'lucide-react';
import { toast } from 'sonner';

export default function HomePage() {
  const navigate = useNavigate();
  const { identity, login, loginStatus } = useInternetIdentity();
  const { data: userProfile, isLoading: profileLoading, isFetched } = useGetCallerUserProfile();

  const isAuthenticated = !!identity;
  const isLoggingIn = loginStatus === 'logging-in';

  const handleGetStarted = () => {
    if (!isAuthenticated) {
      // Prompt user to log in
      toast.info('Please log in to get started', {
        duration: 4000,
        action: {
          label: 'Log In',
          onClick: () => login(),
        },
      });
      return;
    }

    // Wait for profile to load
    if (profileLoading || !isFetched) {
      toast.info('Loading your profile...');
      return;
    }

    // If profile exists and onboarding complete, go to matching
    if (userProfile && userProfile.onboardingComplete) {
      navigate({ to: '/matching' });
    } else {
      // Profile setup will be shown by App.tsx
      toast.info('Please complete your profile setup');
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 space-y-16">
      {/* Hero Section */}
      <section className="text-center space-y-8 py-12">
        <div className="flex justify-center">
          <img
            src="/assets/generated/meowate-mascot-cat-transparent.dim_200x200.png"
            alt="Meowate Mascot"
            className="h-40 w-40 animate-float"
          />
        </div>
        <div className="space-y-4 max-w-3xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
            Meet New Friends with Meowate
          </h1>
          <p className="text-xl text-muted-foreground">
            Connect with real people through voice chat. Safe, fun, and purr-fectly designed for Gen-Z! 🐾
          </p>
        </div>
        <div className="flex gap-4 justify-center flex-wrap">
          {!isAuthenticated ? (
            <Button
              size="lg"
              onClick={() => login()}
              disabled={isLoggingIn}
              className="bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 hover:opacity-90 h-14 px-8 text-lg font-bold shadow-cat-lg"
            >
              {isLoggingIn ? (
                <>
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                  Logging in...
                </>
              ) : (
                <>
                  <LogIn className="h-6 w-6 mr-2" />
                  Log In to Get Started
                </>
              )}
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={handleGetStarted}
              disabled={profileLoading}
              className="bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 hover:opacity-90 h-14 px-8 text-lg font-bold shadow-cat-lg"
            >
              {profileLoading ? (
                <>
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                  Loading...
                </>
              ) : (
                <>
                  <Heart className="h-6 w-6 mr-2" />
                  Get Started
                </>
              )}
            </Button>
          )}
          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate({ to: '/subscription' })}
            className="h-14 px-8 text-lg font-bold border-2"
          >
            <Sparkles className="h-6 w-6 mr-2" />
            View Premium
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl md:text-4xl font-bold">Why Meowate?</h2>
          <p className="text-muted-foreground text-lg">
            The purr-fect way to make new connections
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="border-2 hover:border-primary transition-all hover:shadow-cat group">
            <CardHeader>
              <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-cat">
                <Heart className="h-7 w-7 text-white" />
              </div>
              <CardTitle className="text-xl">Voice Matching</CardTitle>
              <CardDescription>
                Connect instantly with real people through voice chat. No video pressure, just authentic conversations!
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-primary transition-all hover:shadow-cat group">
            <CardHeader>
              <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-cat">
                <Shield className="h-7 w-7 text-white" />
              </div>
              <CardTitle className="text-xl">Safe & Secure</CardTitle>
              <CardDescription>
                Your privacy matters. Built on Internet Computer with end-to-end encryption and KYC verification.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-primary transition-all hover:shadow-cat group">
            <CardHeader>
              <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-cyan-500 to-pink-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-cat">
                <Users className="h-7 w-7 text-white" />
              </div>
              <CardTitle className="text-xl">Make Friends</CardTitle>
              <CardDescription>
                Chat for 6 minutes to unlock friend requests. Build lasting connections with people you vibe with!
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-primary transition-all hover:shadow-cat group">
            <CardHeader>
              <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-pink-500 to-cyan-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-cat">
                <Video className="h-7 w-7 text-white" />
              </div>
              <CardTitle className="text-xl">Watch Together</CardTitle>
              <CardDescription>
                Share YouTube videos with friends in real-time. Synchronized playback for the ultimate watch party!
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-primary transition-all hover:shadow-cat group">
            <CardHeader>
              <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-cat">
                <Globe className="h-7 w-7 text-white" />
              </div>
              <CardTitle className="text-xl">Global Reach</CardTitle>
              <CardDescription>
                Match locally or go global with premium. Connect with people from around the world!
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-primary transition-all hover:shadow-cat group">
            <CardHeader>
              <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-cat">
                <Zap className="h-7 w-7 text-white" />
              </div>
              <CardTitle className="text-xl">Instant Matching</CardTitle>
              <CardDescription>
                No waiting around! Get matched with active users in seconds and start chatting right away.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Premium Section */}
      <section className="space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl md:text-4xl font-bold">Go Premium</h2>
          <p className="text-muted-foreground text-lg">
            Unlock the full Meowate experience
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Card className="border-2 hover:border-primary transition-all hover:shadow-cat">
            <CardHeader>
              <Badge className="w-fit mb-2 bg-gradient-to-r from-pink-500 to-purple-500">Basic</Badge>
              <CardTitle className="text-2xl">Free</CardTitle>
              <CardDescription className="text-lg font-semibold">₹0/month</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">✓ 23-minute voice calls</p>
              <p className="text-sm text-muted-foreground">✓ Local matching</p>
              <p className="text-sm text-muted-foreground">✓ Friend requests</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-primary shadow-cat-lg scale-105">
            <CardHeader>
              <Badge className="w-fit mb-2 bg-gradient-to-r from-purple-500 to-cyan-500">Premium</Badge>
              <CardTitle className="text-2xl">Premium Bundle</CardTitle>
              <CardDescription className="text-lg font-semibold">₹499/month</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm font-semibold">✓ Unlimited voice calls</p>
              <p className="text-sm font-semibold">✓ Global matching</p>
              <p className="text-sm font-semibold">✓ Ad-free experience</p>
              <p className="text-sm font-semibold">✓ Video calls with friends</p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary transition-all hover:shadow-cat">
            <CardHeader>
              <Badge className="w-fit mb-2 bg-gradient-to-r from-cyan-500 to-pink-500">Add-ons</Badge>
              <CardTitle className="text-2xl">À la carte</CardTitle>
              <CardDescription className="text-lg font-semibold">From ₹99/month</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">✓ Global matching only</p>
              <p className="text-sm text-muted-foreground">✓ Ad-free only</p>
              <p className="text-sm text-muted-foreground">✓ Video calling only</p>
            </CardContent>
          </Card>
        </div>
        <div className="text-center">
          <Button
            size="lg"
            onClick={() => navigate({ to: '/subscription' })}
            className="bg-gradient-to-r from-purple-500 via-cyan-500 to-pink-500 hover:opacity-90 h-12 px-8 font-bold shadow-cat"
          >
            <Sparkles className="h-5 w-5 mr-2" />
            View All Plans
          </Button>
        </div>
      </section>
    </div>
  );
}
