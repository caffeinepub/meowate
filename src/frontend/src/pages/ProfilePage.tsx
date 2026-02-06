import { useState, useEffect } from 'react';
import { useGetCallerUserProfile, useSaveCallerUserProfile, useUpdateKycStatus } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Shield, CheckCircle, User, Settings, Save } from 'lucide-react';
import type { UserProfile } from '../backend';

export default function ProfilePage() {
  const { identity } = useInternetIdentity();
  const { data: userProfile, isLoading } = useGetCallerUserProfile();
  const saveProfile = useSaveCallerUserProfile();
  const updateKyc = useUpdateKycStatus();

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setName(userProfile.name);
      setAge(userProfile.age.toString());
      setBio(userProfile.bio);
      setLocation(userProfile.location);
      setVoiceEnabled(userProfile.preferences.voiceEnabled);
      setVideoEnabled(userProfile.preferences.videoEnabled);
    }
  }, [userProfile]);

  const handleSave = async () => {
    if (!userProfile) return;

    const updatedProfile: UserProfile = {
      ...userProfile,
      name,
      age: BigInt(age),
      bio,
      location,
      preferences: {
        ...userProfile.preferences,
        voiceEnabled,
        videoEnabled,
      },
    };

    try {
      await saveProfile.mutateAsync(updatedProfile);
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error('Failed to update profile');
      console.error(error);
    }
  };

  const handleKycVerification = async () => {
    if (!identity) {
      toast.error('Please log in to verify KYC');
      return;
    }

    try {
      const userPrincipal = identity.getPrincipal();
      await updateKyc.mutateAsync({ user: userPrincipal, verified: true });
      toast.success('KYC verification completed!');
    } catch (error) {
      toast.error('KYC verification failed');
      console.error(error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground text-lg">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!userProfile) return null;

  return (
    <div className="min-h-screen py-8 sm:py-12">
      <div className="container mx-auto px-4 max-w-4xl space-y-6">
        {/* Profile Header */}
        <Card className="border-2 shadow-xl overflow-hidden">
          <div className="h-32 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500"></div>
          <CardContent className="p-6 sm:p-8 -mt-16">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6">
              <div className="relative">
                <Avatar className="h-32 w-32 border-4 border-background shadow-2xl">
                  <AvatarImage src={userProfile.profilePicture?.getDirectURL()} alt={userProfile.name} />
                  <AvatarFallback className="bg-gradient-to-br from-pink-500 via-purple-500 to-cyan-500 text-white text-5xl font-bold">
                    {userProfile.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {userProfile.kycVerified && (
                  <div className="absolute -bottom-2 -right-2 h-10 w-10 bg-green-500 rounded-full flex items-center justify-center border-4 border-background">
                    <CheckCircle className="h-6 w-6 text-white" />
                  </div>
                )}
              </div>
              <div className="flex-1 text-center sm:text-left space-y-3">
                <h1 className="text-3xl sm:text-4xl font-bold">{userProfile.name}</h1>
                <p className="text-base sm:text-lg text-muted-foreground">{userProfile.location}</p>
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                  {userProfile.kycVerified && (
                    <Badge className="bg-green-500/20 text-green-500 border-green-500/50 gap-1">
                      <CheckCircle className="h-3 w-3" />
                      KYC Verified
                    </Badge>
                  )}
                  <Badge variant="outline" className="gap-1">
                    <User className="h-3 w-3" />
                    {userProfile.age.toString()} years old
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Profile */}
        <Card className="border-2 shadow-xl">
          <CardHeader className="border-b border-border p-6 sm:p-8">
            <CardTitle className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <Settings className="h-6 w-6 sm:h-7 sm:w-7" />
              Edit Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 sm:p-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-base font-semibold">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-12 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age" className="text-base font-semibold">Age</Label>
                <Input
                  id="age"
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  min="18"
                  className="h-12 text-base"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location" className="text-base font-semibold">Location</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio" className="text-base font-semibold">Bio</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                className="resize-none text-base"
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground">{bio.length}/200 characters</p>
            </div>
            <Button
              onClick={handleSave}
              disabled={saveProfile.isPending}
              size="lg"
              className="w-full sm:w-auto bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 hover:opacity-90 h-12 px-8 text-base font-bold gap-2"
            >
              <Save className="h-5 w-5" />
              {saveProfile.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card className="border-2 shadow-xl">
          <CardHeader className="border-b border-border p-6 sm:p-8">
            <CardTitle className="text-2xl sm:text-3xl font-bold">Preferences</CardTitle>
          </CardHeader>
          <CardContent className="p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between p-4 sm:p-5 rounded-xl bg-muted/50 border border-border">
              <div className="space-y-1 flex-1">
                <Label htmlFor="voice" className="text-base font-semibold cursor-pointer">Voice Calls</Label>
                <p className="text-sm text-muted-foreground">Enable voice calling with matches</p>
              </div>
              <Switch
                id="voice"
                checked={voiceEnabled}
                onCheckedChange={setVoiceEnabled}
                className="data-[state=checked]:bg-primary"
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between p-4 sm:p-5 rounded-xl bg-muted/50 border border-border">
              <div className="space-y-1 flex-1">
                <Label htmlFor="video" className="text-base font-semibold cursor-pointer">Video Calls</Label>
                <p className="text-sm text-muted-foreground">
                  Enable video calling {!userProfile.kycVerified && '(requires KYC)'}
                </p>
              </div>
              <Switch
                id="video"
                checked={videoEnabled}
                onCheckedChange={setVideoEnabled}
                disabled={!userProfile.kycVerified}
                className="data-[state=checked]:bg-primary"
              />
            </div>
          </CardContent>
        </Card>

        {/* KYC Verification */}
        {!userProfile.kycVerified && (
          <Card className="border-2 border-green-500/50 bg-green-500/5 shadow-xl">
            <CardHeader className="border-b border-border p-6 sm:p-8">
              <CardTitle className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                <Shield className="h-6 w-6 sm:h-7 sm:w-7 text-green-500" />
                KYC Verification
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 sm:p-8 space-y-4">
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                Complete KYC verification to unlock video calling and enhance your safety on the platform.
                This helps us create a trusted community.
              </p>
              <Button
                onClick={handleKycVerification}
                disabled={updateKyc.isPending}
                size="lg"
                className="bg-green-500 hover:bg-green-600 h-12 px-8 text-base font-bold gap-2"
              >
                <Shield className="h-5 w-5" />
                {updateKyc.isPending ? 'Verifying...' : 'Start KYC Verification'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
