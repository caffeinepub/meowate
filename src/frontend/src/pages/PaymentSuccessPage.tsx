import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useGetCallerSubscription } from '../hooks/useQueries';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, ArrowRight, Sparkles, Calendar, AlertCircle, Zap, Globe, Video, Shield, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

export default function PaymentSuccessPage() {
  const navigate = useNavigate();
  const { data: subscription, isLoading: subscriptionLoading, refetch } = useGetCallerSubscription();
  const [verificationComplete, setVerificationComplete] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [showFeatureActivation, setShowFeatureActivation] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    const verifyPayment = async () => {
      // Get order_id and payment_id from URL params
      const urlParams = new URLSearchParams(window.location.search);
      const orderId = urlParams.get('order_id');
      const paymentId = urlParams.get('payment_id');

      if (!orderId || !paymentId) {
        setVerificationError('Payment information not found. Please contact support if you were charged.');
        setIsVerifying(false);
        return;
      }

      try {
        // Payment has already been verified in the Razorpay handler
        // Just refetch subscription to get updated data
        await refetch();
        setVerificationComplete(true);
        
        // Show feature activation animation
        setTimeout(() => {
          setShowFeatureActivation(true);
          toast.success('🎉 Premium features activated!');
        }, 500);
      } catch (error) {
        console.error('Payment verification error:', error);
        setVerificationError('Unable to verify payment. Your subscription may take a few moments to activate. Please check your profile or contact support if the issue persists.');
        toast.error('Payment verification error');
      } finally {
        setIsVerifying(false);
      }
    };

    // Small delay to ensure backend has processed the payment
    const timer = setTimeout(() => {
      verifyPayment();
    }, 1500);

    return () => clearTimeout(timer);
  }, [refetch]);

  const getPlanName = () => {
    if (!subscription) return 'Premium';
    
    switch (subscription.type) {
      case 'basicPremium':
        return 'Basic Premium';
      case 'globalMatching':
        return 'Global Matching';
      case 'adFree':
        return 'Ad-Free';
      case 'videoCalling':
        return 'Video Calling';
      case 'premiumBundle':
        return 'Premium Bundle';
      default:
        return 'Premium';
    }
  };

  const getPlanFeatures = () => {
    if (!subscription) return [];
    
    switch (subscription.type) {
      case 'basicPremium':
        return [
          { icon: Zap, text: 'Unlimited voice duration', color: 'text-yellow-500' },
        ];
      case 'globalMatching':
        return [
          { icon: Globe, text: 'Global matchmaking', color: 'text-blue-500' },
          { icon: Zap, text: 'Unlimited voice duration', color: 'text-yellow-500' },
        ];
      case 'adFree':
        return [
          { icon: Shield, text: 'Ad-free experience', color: 'text-green-500' },
        ];
      case 'videoCalling':
        return [
          { icon: Video, text: 'Video calls with friends', color: 'text-purple-500' },
        ];
      case 'premiumBundle':
        return [
          { icon: Zap, text: 'Unlimited voice duration', color: 'text-yellow-500' },
          { icon: Globe, text: 'Global matchmaking', color: 'text-blue-500' },
          { icon: Shield, text: 'Ad-free experience', color: 'text-green-500' },
          { icon: Video, text: 'Video calling', color: 'text-purple-500' },
        ];
      default:
        return [];
    }
  };

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1000000);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  if (verificationError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-2 shadow-xl">
          <CardContent className="p-8 sm:p-10 space-y-6">
            <div className="h-20 w-20 mx-auto rounded-full bg-yellow-500/20 flex items-center justify-center">
              <AlertCircle className="h-12 w-12 text-yellow-500" />
            </div>
            <div className="text-center space-y-3">
              <h1 className="text-3xl sm:text-4xl font-bold">Payment Verification</h1>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                {verificationError}
              </p>
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                If you were charged, your subscription will be activated shortly. Please check your profile or contact support if the issue persists.
              </AlertDescription>
            </Alert>
            <div className="flex flex-col gap-3">
              <Button
                size="lg"
                onClick={() => {
                  refetch();
                  navigate({ to: '/profile' });
                }}
                className="bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 hover:opacity-90 h-14 text-lg font-bold"
              >
                Go to Profile
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate({ to: '/' })}
                className="h-14 text-lg font-bold"
              >
                Go Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isVerifying || !verificationComplete || subscriptionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-2 shadow-xl">
          <CardContent className="p-8 sm:p-10 space-y-6">
            <div className="relative h-20 w-20 mx-auto">
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500 via-purple-500 to-cyan-500 rounded-full animate-spin" style={{ animationDuration: '2s' }}></div>
              <div className="absolute inset-2 bg-background rounded-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
            </div>
            <Skeleton className="h-10 w-3/4 mx-auto" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-5/6 mx-auto" />
            <div className="space-y-3 pt-4">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
            <p className="text-center text-sm text-muted-foreground animate-pulse">
              Verifying your payment and activating features...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const features = getPlanFeatures();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-2 shadow-xl">
        <CardHeader className="text-center pb-4">
          <div className="h-20 w-20 mx-auto rounded-full bg-green-500/20 flex items-center justify-center mb-4 animate-in zoom-in duration-500">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
          <CardTitle className="text-3xl sm:text-4xl font-bold">Payment Successful!</CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="text-center space-y-2">
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              Your premium subscription has been activated successfully. All premium features are now available!
            </p>
          </div>

          {subscription && subscription.isActive && (
            <>
              <Card className="border-2 border-primary/50 bg-primary/5 animate-in slide-in-from-bottom duration-500">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      <span className="font-semibold text-lg">Active Plan</span>
                    </div>
                    <Badge className="bg-gradient-to-r from-pink-500 to-purple-500 text-white border-0">
                      {getPlanName()}
                    </Badge>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Started</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(subscription.startDate)}
                        </p>
                      </div>
                    </div>

                    {subscription.endDate && (
                      <div className="flex items-start gap-3">
                        <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Active Until</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(subscription.endDate)}
                          </p>
                        </div>
                      </div>
                    )}

                    {!subscription.endDate && (
                      <div className="flex items-start gap-3">
                        <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-primary">Ongoing Plan</p>
                          <p className="text-sm text-muted-foreground">
                            Your subscription renews automatically
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {showFeatureActivation && features.length > 0 && (
                <Card className="border-2 border-green-500/50 bg-green-500/5 animate-in slide-in-from-bottom duration-700">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="font-semibold text-lg">Features Activated</span>
                    </div>
                    <div className="space-y-3">
                      {features.map((feature, index) => (
                        <div 
                          key={index} 
                          className="flex items-center gap-3 animate-in slide-in-from-left duration-500"
                          style={{ animationDelay: `${index * 100}ms` }}
                        >
                          <div className={`h-8 w-8 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center`}>
                            <feature.icon className={`h-4 w-4 ${feature.color}`} />
                          </div>
                          <span className="text-sm font-medium">{feature.text}</span>
                          <CheckCircle className="h-4 w-4 text-green-500 ml-auto" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          <div className="flex flex-col gap-3 pt-2">
            <Button
              size="lg"
              onClick={() => navigate({ to: '/matching' })}
              className="bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 hover:opacity-90 h-14 text-lg font-bold gap-2"
            >
              Start Matching
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate({ to: '/profile' })}
              className="h-14 text-lg font-bold"
            >
              View Profile
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Thank you for upgrading to premium! Enjoy your enhanced Meowate experience.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
