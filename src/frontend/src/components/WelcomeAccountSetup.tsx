import { useState } from 'react';
import { useSaveCallerUserProfile, useCompleteOnboarding } from '../hooks/useQueries';
import { useNavigate } from '@tanstack/react-router';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { User, MapPin, MessageSquare, Settings, CheckCircle, Loader2, Sparkles, Heart } from 'lucide-react';
import type { UserProfile } from '../backend';

type Step = 'profile' | 'preferences' | 'complete' | 'dashboard';

export default function WelcomeAccountSetup() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('profile');
  
  // Profile fields
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  
  // Preference fields
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [globalMatching, setGlobalMatching] = useState(false);
  
  const saveProfile = useSaveCallerUserProfile();
  const completeOnboarding = useCompleteOnboarding();

  const handleSkip = () => {
    toast.info('You can complete your profile anytime from settings');
    navigate({ to: '/' });
  };

  const handleProfileNext = () => {
    if (!name.trim() || !age || !location.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 18) {
      toast.error('You must be at least 18 years old');
      return;
    }

    if (ageNum > 120) {
      toast.error('Please enter a valid age');
      return;
    }

    setStep('preferences');
  };

  const handleComplete = async () => {
    const ageNum = parseInt(age);
    
    const profile: UserProfile = {
      name: name.trim(),
      age: BigInt(ageNum),
      bio: bio.trim(),
      location: location.trim(),
      kycVerified: false,
      profilePicture: undefined,
      preferences: {
        voiceEnabled,
        videoEnabled,
        privacyLevel: 'standard',
        globalMatching,
      },
      onboardingComplete: false,
    };

    try {
      await saveProfile.mutateAsync(profile);
      await completeOnboarding.mutateAsync();
      setStep('complete');
      
      setTimeout(() => {
        setStep('dashboard');
      }, 2000);
    } catch (error) {
      toast.error('Failed to complete setup. Please try again.');
      console.error(error);
    }
  };

  const handleGoToMatching = () => {
    navigate({ to: '/matching' });
    toast.success('Welcome to Meowate! 🎉 Start matching now!');
  };

  const handleGoToPremium = () => {
    navigate({ to: '/subscription' });
    toast.info('Check out our premium plans!');
  };

  const getProgress = () => {
    if (step === 'profile') return 25;
    if (step === 'preferences') return 50;
    if (step === 'complete') return 75;
    return 100;
  };

  const isProcessing = saveProfile.isPending || completeOnboarding.isPending;

  return (
    <Dialog open={true}>
      <DialogContent 
        className="sm:max-w-2xl bg-card/95 backdrop-blur-lg border-2 border-border shadow-cat-lg max-h-[90vh] overflow-y-auto" 
        onPointerDownOutside={(e) => e.preventDefault()}
        aria-describedby="welcome-setup-description"
      >
        {step === 'profile' && (
          <>
            <DialogHeader className="space-y-4">
              <div className="flex justify-center">
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-pink-500 via-purple-500 to-cyan-500 flex items-center justify-center shadow-cat">
                  <User className="h-10 w-10 text-white" />
                </div>
              </div>
              <DialogTitle className="text-3xl font-bold text-center bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
                Welcome to Meowate!
              </DialogTitle>
              <DialogDescription id="welcome-setup-description" className="text-center text-base text-muted-foreground">
                Let's set up your account. Complete your profile to start matching with amazing people.
              </DialogDescription>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground font-medium">Setup Progress</span>
                  <span className="font-bold text-primary">{getProgress()}%</span>
                </div>
                <Progress value={getProgress()} className="h-2.5" />
              </div>
            </DialogHeader>

            <div className="space-y-5 mt-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-base font-semibold flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  required
                  className="h-12 text-base border-2 focus:border-primary"
                  aria-required="true"
                  maxLength={50}
                />
                <p className="text-xs text-muted-foreground pl-1">This is how others will see you</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="age" className="text-base font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Age <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="age"
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="Must be 18 or older"
                  min="18"
                  max="120"
                  required
                  className="h-12 text-base border-2 focus:border-primary"
                  aria-required="true"
                />
                <p className="text-xs text-muted-foreground pl-1">You must be at least 18 years old</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location" className="text-base font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  Location <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Mumbai, India"
                  required
                  className="h-12 text-base border-2 focus:border-primary"
                  aria-required="true"
                  maxLength={100}
                />
                <p className="text-xs text-muted-foreground pl-1">City and country help us match you locally</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio" className="text-base font-semibold flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  Bio <span className="text-muted-foreground text-sm font-normal">(optional)</span>
                </Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  rows={3}
                  className="resize-none text-base border-2 focus:border-primary"
                  maxLength={200}
                />
                <p className="text-xs text-muted-foreground pl-1">{bio.length}/200 characters</p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={handleSkip}
                  className="flex-1 h-12 text-base font-semibold border-2"
                >
                  Skip for now
                </Button>
                <Button
                  type="button"
                  size="lg"
                  onClick={handleProfileNext}
                  className="flex-1 h-12 text-base font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 hover:opacity-90 shadow-cat"
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}

        {step === 'preferences' && (
          <>
            <DialogHeader className="space-y-4">
              <div className="flex justify-center">
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-purple-500 via-cyan-500 to-pink-500 flex items-center justify-center shadow-cat">
                  <Settings className="h-10 w-10 text-white" />
                </div>
              </div>
              <DialogTitle className="text-3xl font-bold text-center bg-gradient-to-r from-purple-500 via-cyan-500 to-pink-500 bg-clip-text text-transparent">
                Set Your Preferences
              </DialogTitle>
              <DialogDescription className="text-center text-base text-muted-foreground">
                Customize your Meowate experience. You can change these later in settings.
              </DialogDescription>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground font-medium">Setup Progress</span>
                  <span className="font-bold text-primary">{getProgress()}%</span>
                </div>
                <Progress value={getProgress()} className="h-2.5" />
              </div>
            </DialogHeader>

            <div className="space-y-4 mt-6">
              <Card className="border-2 shadow-sm">
                <CardContent className="p-6 space-y-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-primary" />
                        <Label htmlFor="voice-enabled" className="text-base font-semibold cursor-pointer">
                          Voice Chat
                        </Label>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Enable voice conversations during matches
                      </p>
                    </div>
                    <Switch
                      id="voice-enabled"
                      checked={voiceEnabled}
                      onCheckedChange={setVoiceEnabled}
                      className="mt-1"
                    />
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-primary" />
                        <Label htmlFor="video-enabled" className="text-base font-semibold cursor-pointer">
                          Video Calls with Friends
                        </Label>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Enable video calls with friends (requires KYC & premium)
                      </p>
                    </div>
                    <Switch
                      id="video-enabled"
                      checked={videoEnabled}
                      onCheckedChange={setVideoEnabled}
                      className="mt-1"
                    />
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-primary" />
                        <Label htmlFor="global-matching" className="text-base font-semibold cursor-pointer">
                          Global Matching
                        </Label>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Match with users worldwide (premium feature)
                      </p>
                    </div>
                    <Switch
                      id="global-matching"
                      checked={globalMatching}
                      onCheckedChange={setGlobalMatching}
                      className="mt-1"
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => setStep('profile')}
                  className="flex-1 h-12 text-base font-semibold border-2"
                >
                  Back
                </Button>
                <Button
                  type="button"
                  size="lg"
                  onClick={handleComplete}
                  disabled={isProcessing}
                  className="flex-1 h-12 text-base font-bold bg-gradient-to-r from-purple-500 via-cyan-500 to-pink-500 hover:opacity-90 shadow-cat"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Complete Setup'
                  )}
                </Button>
              </div>
            </div>
          </>
        )}

        {step === 'complete' && (
          <div className="text-center space-y-6 py-8">
            <div className="flex justify-center">
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-cyan-500 flex items-center justify-center animate-bounce-slow shadow-cat-lg">
                <CheckCircle className="h-12 w-12 text-white" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
                All Set!
              </h2>
              <p className="text-muted-foreground text-lg">
                Your profile is ready. Let's start matching! 🎉
              </p>
            </div>
            <Progress value={100} className="h-2.5" />
          </div>
        )}

        {step === 'dashboard' && (
          <>
            <DialogHeader className="space-y-4">
              <div className="flex justify-center">
                <img
                  src="/assets/generated/meowate-mascot-cat-transparent.dim_200x200.png"
                  alt="Meowate Mascot"
                  className="h-24 w-24 animate-float"
                />
              </div>
              <DialogTitle className="text-3xl font-bold text-center bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
                Welcome to Meowate!
              </DialogTitle>
              <DialogDescription className="text-center text-base text-muted-foreground">
                You're all set! Choose what you'd like to do next.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-6">
              <Card className="border-2 hover:border-primary transition-colors cursor-pointer shadow-sm hover:shadow-cat" onClick={handleGoToMatching}>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-pink-500 via-purple-500 to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-cat">
                    <Heart className="h-7 w-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold">Start Matching</h3>
                    <p className="text-sm text-muted-foreground">
                      Connect with new people through voice chat
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 hover:border-primary transition-colors cursor-pointer shadow-sm hover:shadow-cat" onClick={handleGoToPremium}>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-purple-500 via-cyan-500 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-cat">
                    <Sparkles className="h-7 w-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold">Explore Premium</h3>
                    <p className="text-sm text-muted-foreground">
                      Unlock unlimited calls and exclusive features
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
