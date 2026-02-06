import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useGetCallerUserProfile, useGetActiveUserCount } from '../hooks/useQueries';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { User, LogOut, Heart, Users, Sparkles, Menu, Home } from 'lucide-react';

export default function Header() {
  const { identity, clear, loginStatus, login } = useInternetIdentity();
  const { data: userProfile } = useGetCallerUserProfile();
  const { data: activeUserCount = 0 } = useGetActiveUserCount();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const isAuthenticated = !!identity;
  const disabled = loginStatus === 'logging-in';

  const handleAuth = async () => {
    if (isAuthenticated) {
      await clear();
      queryClient.clear();
      navigate({ to: '/' });
    } else {
      try {
        await login();
      } catch (error: any) {
        console.error('Login error:', error);
        if (error.message === 'User is already authenticated') {
          await clear();
          setTimeout(() => login(), 300);
        }
      }
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 glass-effect shadow-cat">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <button
          onClick={() => navigate({ to: '/' })}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-ring rounded-2xl p-1 group"
          aria-label="Go to home"
        >
          <div className="relative">
            <img
              src="/assets/generated/meowate-mascot-cat-transparent.dim_200x200.png"
              alt="Meowate"
              className="h-12 w-12 group-hover:animate-wiggle"
            />
            <img
              src="/assets/generated/cat-paw-icon-transparent.dim_64x64.png"
              alt=""
              className="absolute -bottom-1 -right-1 h-5 w-5 animate-paw-print"
            />
          </div>
          <div className="hidden sm:flex flex-col items-start">
            <span className="text-xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
              Meowate
            </span>
            <span className="text-xs text-muted-foreground font-medium">Chat. Voice. Vibe. 🐱</span>
          </div>
        </button>

        <nav className="flex items-center gap-2 sm:gap-3" aria-label="Main navigation">
          {/* Active Users Counter */}
          <Badge 
            variant="outline" 
            className="gap-2 px-3 py-1.5 rounded-full border-2 border-green-500/50 bg-green-500/10 text-green-600 dark:text-green-400 font-semibold animate-pulse-slow hidden sm:flex"
          >
            <img
              src="/assets/generated/cat-paw-icon-transparent.dim_64x64.png"
              alt=""
              className="h-4 w-4 animate-paw-print"
            />
            <span className="text-sm">{activeUserCount} Meows Active</span>
          </Badge>

          {isAuthenticated && userProfile && (
            <>
              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={() => navigate({ to: '/' })}
                  className="gap-2 h-11 px-4 font-semibold hover:bg-accent/50 transition-all rounded-2xl"
                  aria-label="Home"
                >
                  <Home className="h-5 w-5" />
                  <span>Home</span>
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={() => navigate({ to: '/matching' })}
                  className="gap-2 h-11 px-4 font-semibold hover:bg-accent/50 transition-all rounded-2xl group"
                  aria-label="Start matching"
                >
                  <Heart className="h-5 w-5 group-hover:animate-paw-print" />
                  <span>Match</span>
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={() => navigate({ to: '/friends' })}
                  className="gap-2 h-11 px-4 font-semibold hover:bg-accent/50 transition-all rounded-2xl"
                  aria-label="View friends"
                >
                  <Users className="h-5 w-5" />
                  <span>Friends</span>
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={() => navigate({ to: '/subscription' })}
                  className="gap-2 h-11 px-4 font-semibold hover:bg-accent/50 transition-all rounded-2xl"
                  aria-label="View premium plans"
                >
                  <Sparkles className="h-5 w-5" />
                  <span>Premium</span>
                </Button>
              </div>

              {/* Mobile Navigation */}
              <Sheet>
                <SheetTrigger asChild className="md:hidden">
                  <Button variant="ghost" size="icon" className="h-11 w-11 rounded-2xl" aria-label="Open menu">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72 bg-background/95 backdrop-blur-xl border-border/50">
                  <div className="mt-6 mb-4">
                    <Badge 
                      variant="outline" 
                      className="gap-2 px-4 py-2 rounded-full border-2 border-green-500/50 bg-green-500/10 text-green-600 dark:text-green-400 font-semibold w-full justify-center"
                    >
                      <img
                        src="/assets/generated/cat-paw-icon-transparent.dim_64x64.png"
                        alt=""
                        className="h-4 w-4 animate-paw-print"
                      />
                      <span>{activeUserCount} Meows Active</span>
                    </Badge>
                  </div>
                  <nav className="flex flex-col gap-2" aria-label="Mobile navigation">
                    <SheetClose asChild>
                      <Button
                        variant="ghost"
                        size="lg"
                        onClick={() => navigate({ to: '/' })}
                        className="justify-start gap-3 h-14 text-base font-semibold rounded-2xl"
                      >
                        <Home className="h-5 w-5" />
                        Home
                      </Button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button
                        variant="ghost"
                        size="lg"
                        onClick={() => navigate({ to: '/matching' })}
                        className="justify-start gap-3 h-14 text-base font-semibold rounded-2xl"
                      >
                        <Heart className="h-5 w-5" />
                        Match
                      </Button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button
                        variant="ghost"
                        size="lg"
                        onClick={() => navigate({ to: '/friends' })}
                        className="justify-start gap-3 h-14 text-base font-semibold rounded-2xl"
                      >
                        <Users className="h-5 w-5" />
                        Friends
                      </Button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button
                        variant="ghost"
                        size="lg"
                        onClick={() => navigate({ to: '/subscription' })}
                        className="justify-start gap-3 h-14 text-base font-semibold rounded-2xl"
                      >
                        <Sparkles className="h-5 w-5" />
                        Premium
                      </Button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button
                        variant="ghost"
                        size="lg"
                        onClick={() => navigate({ to: '/profile' })}
                        className="justify-start gap-3 h-14 text-base font-semibold rounded-2xl"
                      >
                        <User className="h-5 w-5" />
                        Profile
                      </Button>
                    </SheetClose>
                    <div className="border-t border-border my-2"></div>
                    <SheetClose asChild>
                      <Button
                        variant="ghost"
                        size="lg"
                        onClick={handleAuth}
                        className="justify-start gap-3 h-14 text-base font-semibold text-destructive hover:text-destructive hover:bg-destructive/10 rounded-2xl"
                      >
                        <LogOut className="h-5 w-5" />
                        Logout
                      </Button>
                    </SheetClose>
                  </nav>
                </SheetContent>
              </Sheet>

              {/* User Avatar Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="relative h-11 w-11 rounded-full p-0 hover:ring-2 hover:ring-ring transition-all"
                    aria-label="User menu"
                  >
                    <Avatar className="h-11 w-11 border-2 border-primary/30">
                      <AvatarImage src={userProfile.profilePicture?.getDirectURL()} alt={userProfile.name} />
                      <AvatarFallback className="bg-gradient-to-br from-pink-500 via-purple-500 to-cyan-500 text-white font-bold text-lg">
                        {userProfile.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-popover/95 backdrop-blur-xl border-border/50 rounded-2xl">
                  <div className="px-3 py-3 border-b border-border">
                    <p className="font-semibold text-base">{userProfile.name}</p>
                    <p className="text-sm text-muted-foreground">{userProfile.location}</p>
                  </div>
                  <DropdownMenuItem onClick={() => navigate({ to: '/profile' })} className="gap-2 cursor-pointer h-11 text-base rounded-xl">
                    <User className="h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate({ to: '/subscription' })} className="gap-2 cursor-pointer h-11 text-base rounded-xl">
                    <Sparkles className="h-4 w-4" />
                    Premium
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleAuth} className="gap-2 cursor-pointer h-11 text-base text-destructive focus:text-destructive focus:bg-destructive/10 rounded-xl">
                    <LogOut className="h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}

          {!isAuthenticated && (
            <Button
              size="lg"
              onClick={handleAuth}
              disabled={disabled}
              className="bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 hover:opacity-90 transition-opacity font-bold h-11 px-6 rounded-2xl shadow-cat"
            >
              {disabled ? 'Logging in...' : 'Login'}
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
