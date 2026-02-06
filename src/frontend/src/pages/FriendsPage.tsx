import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useGetFriends, useGetCallerUserProfile } from '../hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Phone, Video, Send, Youtube, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import type { Principal } from '@dfinity/principal';

export default function FriendsPage() {
  const navigate = useNavigate();
  const { data: friends, isLoading } = useGetFriends();
  const { data: userProfile } = useGetCallerUserProfile();
  const [selectedFriend, setSelectedFriend] = useState<Principal | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Array<{ text: string; isMine: boolean; time: string }>>([
    { text: 'Hey! How are you? 😺', isMine: false, time: '10:30 AM' },
    { text: 'I\'m good! Thanks for asking! 🐾', isMine: true, time: '10:31 AM' },
    { text: 'Want to hop on a voice call? 🎤', isMine: false, time: '10:32 AM' },
  ]);

  const handleTextChat = (friend: Principal) => {
    setSelectedFriend(friend);
    setChatOpen(true);
  };

  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    setMessages([...messages, { text: message, isMine: true, time }]);
    setMessage('');
    
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        text: 'That sounds purr-fect! 🎉', 
        isMine: false, 
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      }]);
    }, 1500);
  };

  const handleVoiceCall = () => {
    toast.success('Starting voice call... 🎤');
  };

  const handleVideoCall = () => {
    if (!userProfile?.kycVerified) {
      toast.error('KYC verification required for video calls. Please verify your identity in your profile. 🛡️');
      return;
    }
    toast.success('Starting video call... 📹');
  };

  const handleViewTogether = (friend: Principal) => {
    navigate({ 
      to: '/view-together',
      search: { peer: friend.toString() }
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <img
            src="/assets/generated/cat-loading-spinner-transparent.dim_80x80.png"
            alt="Loading"
            className="w-16 h-16 animate-spin mx-auto"
          />
          <p className="text-muted-foreground text-lg">Loading friends... 🐾</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 sm:py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <Card className="border-2 shadow-cat-lg rounded-3xl">
          <CardHeader className="border-b border-border p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src="/assets/generated/cat-paw-icon-transparent.dim_64x64.png"
                  alt=""
                  className="h-8 w-8 animate-paw-print"
                />
                <CardTitle className="text-3xl sm:text-4xl font-bold">
                  Friends
                </CardTitle>
              </div>
              <Badge className="bg-primary/20 text-primary border-primary/50 text-lg px-4 py-2 rounded-full">
                {friends?.length || 0}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6 sm:p-8">
            {!friends || friends.length === 0 ? (
              <div className="text-center py-12 sm:py-16 space-y-6">
                <div className="relative mx-auto w-28 h-28 sm:w-32 sm:h-32">
                  <div className="absolute inset-0 bg-muted rounded-full"></div>
                  <div className="absolute inset-2 bg-background rounded-full flex items-center justify-center">
                    <img
                      src="/assets/generated/meowate-mascot-cat-transparent.dim_200x200.png"
                      alt="No friends"
                      className="h-20 w-20 sm:h-24 sm:w-24 opacity-50"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl sm:text-3xl font-bold">No friends yet 😿</h3>
                  <p className="text-base sm:text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
                    Start matching and send friend requests after 6 minutes of great conversation! 🐱✨
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {friends.map((friend, index) => (
                  <Card key={friend.toString()} className="border-2 hover:border-primary/50 transition-all rounded-2xl group">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-14 w-14 sm:h-16 sm:w-16 border-2 border-primary/30">
                            <AvatarFallback className="bg-gradient-to-br from-pink-500 via-purple-500 to-cyan-500 text-white text-xl font-bold">
                              {String.fromCharCode(65 + index)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="space-y-1 flex-1">
                            <p className="font-bold text-lg sm:text-xl">Friend {index + 1}</p>
                            <p className="text-sm text-muted-foreground font-mono">
                              {friend.toString().slice(0, 12)}...
                            </p>
                            <Badge variant="outline" className="text-xs rounded-full">
                              Online 🟢
                            </Badge>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <Button
                            size="lg"
                            variant="outline"
                            onClick={() => handleTextChat(friend)}
                            className="gap-2 hover:bg-accent/50 transition-all h-12 rounded-2xl"
                            aria-label="Start text chat"
                          >
                            <MessageCircle className="h-5 w-5" />
                            <span>Chat</span>
                          </Button>
                          <Button
                            size="lg"
                            variant="outline"
                            onClick={handleVoiceCall}
                            className="gap-2 hover:bg-accent/50 transition-all h-12 rounded-2xl"
                            aria-label="Start voice call"
                          >
                            <Phone className="h-5 w-5" />
                            <span>Call</span>
                          </Button>
                          <Button
                            size="lg"
                            variant="outline"
                            onClick={handleVideoCall}
                            disabled={!userProfile?.kycVerified}
                            className="gap-2 hover:bg-accent/50 transition-all h-12 rounded-2xl disabled:opacity-50"
                            aria-label="Start video call"
                          >
                            <Video className="h-5 w-5" />
                            <span>Video</span>
                          </Button>
                          <Button
                            size="lg"
                            variant="outline"
                            onClick={() => handleViewTogether(friend)}
                            className="gap-2 hover:bg-accent/50 transition-all h-12 rounded-2xl"
                            aria-label="Watch together"
                          >
                            <Youtube className="h-5 w-5" />
                            <span>Watch</span>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {!userProfile?.kycVerified && (
                  <Alert className="rounded-2xl">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      Complete KYC verification in your profile to enable video calls with friends. 🛡️
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent className="sm:max-w-2xl h-[600px] flex flex-col bg-background/95 backdrop-blur-xl border-border/50 rounded-3xl">
          <DialogHeader className="border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-gradient-to-br from-pink-500 to-purple-500 text-white font-bold">
                  {selectedFriend ? String.fromCharCode(65 + (friends?.findIndex(f => f.toString() === selectedFriend.toString()) || 0)) : 'F'}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-xl">Friend Chat 💬</DialogTitle>
                <p className="text-sm text-muted-foreground">Online 🟢</p>
              </div>
            </div>
          </DialogHeader>
          
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4 py-4">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] space-y-1`}>
                    <div className={`rounded-2xl px-4 py-3 ${
                      msg.isMine 
                        ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white' 
                        : 'bg-muted border border-border'
                    }`}>
                      <p className="text-base">{msg.text}</p>
                    </div>
                    <p className={`text-xs text-muted-foreground px-2 ${msg.isMine ? 'text-right' : 'text-left'}`}>
                      {msg.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          
          <div className="border-t border-border pt-4">
            <div className="flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type a message... 💬"
                className="flex-1 h-12 text-base rounded-2xl"
                aria-label="Message input"
              />
              <Button
                onClick={handleSendMessage}
                size="lg"
                className="bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90 h-12 px-6 rounded-2xl"
                aria-label="Send message"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

