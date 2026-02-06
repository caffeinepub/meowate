import { useState, useEffect } from 'react';
import { useGetCallerSubscription, useCreateRazorpayOrder, useIsRazorpayConfigured, useVerifyRazorpayPayment } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Check, Sparkles, AlertCircle, Loader2, Settings } from 'lucide-react';
import { toast } from 'sonner';
import RazorpayConfigModal from '../components/RazorpayConfigModal';

// Define subscription plans with their features
const SUBSCRIPTION_PLANS = [
  {
    id: 'basicPremium',
    name: 'Basic Premium',
    price: 23,
    currency: 'INR',
    interval: 'month',
    description: 'Unlimited voice duration',
    features: [
      'Unlimited voice duration',
      'All free features',
    ],
  },
  {
    id: 'globalMatching',
    name: 'Global Matching',
    price: 99,
    currency: 'INR',
    interval: 'month',
    description: 'Match with users worldwide',
    features: [
      'Match with users worldwide',
      'Unlimited voice duration',
    ],
  },
  {
    id: 'adFree',
    name: 'Ad-Free',
    price: 49,
    currency: 'INR',
    interval: 'month',
    description: 'No advertisements',
    features: [
      'No advertisements',
      'Clean experience',
    ],
  },
  {
    id: 'videoCalling',
    name: 'Video Calling',
    price: 23,
    currency: 'INR',
    interval: '3 months',
    description: 'Video calls with friends',
    features: [
      'Video calls with friends',
      '3 months access',
    ],
    requiresKyc: true,
  },
  {
    id: 'premiumBundle',
    name: 'Premium Bundle',
    price: 249,
    currency: 'INR',
    interval: 'month',
    description: 'All premium features',
    features: [
      'Unlimited voice duration',
      'Global matchmaking',
      'Ad-free experience',
      'Video calling (with KYC)',
      'All premium features',
    ],
    isBestValue: true,
  },
];

// Load Razorpay script
const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function SubscriptionPage() {
  const { identity } = useInternetIdentity();
  const { data: subscription, isLoading: subscriptionLoading } = useGetCallerSubscription();
  const { data: isRazorpayConfigured, isLoading: razorpayConfigLoading } = useIsRazorpayConfigured();
  const createOrder = useCreateRazorpayOrder();
  const verifyPayment = useVerifyRazorpayPayment();
  const [showRazorpayConfig, setShowRazorpayConfig] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const isAuthenticated = !!identity;
  const isPremium = subscription?.isActive || false;

  useEffect(() => {
    // Preload Razorpay script
    loadRazorpayScript();
  }, []);

  const handleSubscribe = async (plan: typeof SUBSCRIPTION_PLANS[0]) => {
    if (!isAuthenticated) {
      toast.error('Please log in to subscribe');
      return;
    }

    if (!isRazorpayConfigured) {
      toast.error('Payment system is not configured. Please contact support.');
      return;
    }

    setIsProcessing(true);

    try {
      // Load Razorpay script if not already loaded
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast.error('Failed to load payment gateway. Please check your internet connection.');
        setIsProcessing(false);
        return;
      }

      // Create order on backend
      toast.loading('Creating payment order...');
      const orderId = await createOrder.mutateAsync({
        amount: plan.price * 100, // Convert to paise
        currency: plan.currency,
      });
      toast.dismiss();

      // Configure Razorpay options
      const options = {
        key: 'rzp_test_YOUR_KEY_ID', // This should come from backend config
        amount: plan.price * 100,
        currency: plan.currency,
        name: 'Meowate',
        description: `${plan.name} Subscription - ${plan.description}`,
        order_id: orderId,
        handler: async function (response: any) {
          try {
            toast.loading('Verifying payment...');
            
            // Verify payment on backend
            await verifyPayment.mutateAsync({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });

            toast.dismiss();
            toast.success('Payment successful!');
            
            // Redirect to success page
            window.location.href = `/payment-success?order_id=${response.razorpay_order_id}&payment_id=${response.razorpay_payment_id}`;
          } catch (error) {
            toast.dismiss();
            toast.error('Payment verification failed. Please contact support.');
            console.error('Payment verification error:', error);
            window.location.href = '/payment-failure';
          }
        },
        prefill: {
          name: identity?.getPrincipal().toString().substring(0, 10) || 'User',
          email: '',
          contact: '',
        },
        theme: {
          color: '#8b5cf6', // Purple color matching the theme
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false);
            toast.info('Payment cancelled');
          },
        },
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.on('payment.failed', function (response: any) {
        toast.error('Payment failed. Please try again.');
        console.error('Payment failed:', response.error);
        window.location.href = '/payment-failure';
      });
      
      paymentObject.open();
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to initiate payment. Please try again.');
      console.error('Payment initiation error:', error);
      setIsProcessing(false);
    }
  };

  if (subscriptionLoading || razorpayConfigLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-16 h-16 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground text-lg">Loading subscription plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 sm:py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            Choose Your Plan
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground">
            Unlock premium features and enhance your Meowate experience
          </p>
        </div>

        {!isRazorpayConfigured && (
          <Alert className="mb-8 border-yellow-500/50 bg-yellow-500/10">
            <AlertCircle className="h-4 w-4 text-yellow-500" />
            <AlertDescription className="text-yellow-700 dark:text-yellow-400 flex items-center justify-between">
              <span>Payment system is currently being configured. Please check back soon or contact support.</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRazorpayConfig(true)}
                className="ml-4"
              >
                <Settings className="h-4 w-4 mr-2" />
                Configure
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {isPremium && (
          <Card className="mb-8 border-2 border-primary bg-primary/5">
            <CardContent className="p-6 text-center">
              <Sparkles className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-lg font-semibold">You're a Premium Member!</p>
              <p className="text-sm text-muted-foreground">Enjoy all premium features</p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SUBSCRIPTION_PLANS.map((plan) => (
            <Card 
              key={plan.id}
              className={`border-2 hover:border-primary/50 transition-all ${
                plan.isBestValue ? 'border-primary bg-primary/5 md:col-span-2 lg:col-span-1 relative' : ''
              }`}
            >
              {plan.isBestValue && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-pink-500 to-purple-500 text-white border-0 text-sm px-4 py-1.5">
                    BEST VALUE
                  </Badge>
                </div>
              )}
              <CardHeader className="p-6">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <div className="text-4xl font-bold mt-2">
                  ₹{plan.price}<span className="text-lg text-muted-foreground font-normal">/{plan.interval === 'month' ? 'mo' : plan.interval}</span>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-0 space-y-4">
                {plan.requiresKyc && (
                  <Badge variant="outline" className="mb-2">Requires KYC</Badge>
                )}
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check className={`h-5 w-5 mt-0.5 flex-shrink-0 ${plan.isBestValue ? 'text-primary' : 'text-green-500'}`} />
                      <span className="text-base">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => handleSubscribe(plan)}
                  disabled={isProcessing || isPremium || !isRazorpayConfigured || !isAuthenticated}
                  size="lg"
                  className={`w-full h-12 text-base font-bold ${
                    plan.isBestValue 
                      ? 'bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 hover:opacity-90' 
                      : ''
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : isPremium ? (
                    'Active'
                  ) : !isAuthenticated ? (
                    'Login to Subscribe'
                  ) : (
                    plan.isBestValue ? 'Pay with Razorpay' : 'Subscribe'
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            All prices are in Indian Rupees (INR). Secure payment powered by Razorpay.
          </p>
        </div>
      </div>

      <RazorpayConfigModal 
        open={showRazorpayConfig} 
        onOpenChange={setShowRazorpayConfig}
      />
    </div>
  );
}
