import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { XCircle, ArrowRight, AlertCircle, CreditCard, HelpCircle, RefreshCw } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default function PaymentFailurePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-2 shadow-xl">
        <CardHeader className="text-center pb-4">
          <div className="h-20 w-20 mx-auto rounded-full bg-destructive/20 flex items-center justify-center mb-4 animate-in zoom-in duration-500">
            <XCircle className="h-12 w-12 text-destructive" />
          </div>
          <CardTitle className="text-3xl sm:text-4xl font-bold">Payment Failed</CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="text-center space-y-3">
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              We couldn't process your payment. Don't worry, you haven't been charged.
            </p>
          </div>

          <Alert className="border-yellow-500/50 bg-yellow-500/10">
            <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
            <AlertDescription className="text-sm">
              <strong className="font-semibold">Common reasons for payment failure:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                <li>Insufficient funds in account</li>
                <li>Card declined by your bank</li>
                <li>Incorrect card details entered</li>
                <li>Payment cancelled by user</li>
                <li>Card expired or blocked</li>
                <li>International payments not enabled</li>
              </ul>
            </AlertDescription>
          </Alert>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <CreditCard className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-semibold">Try Again</p>
                <p className="text-sm text-muted-foreground">
                  Double-check your payment details and try again. Make sure your card has sufficient funds and is authorized for online payments.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <RefreshCw className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-semibold">Use Different Payment Method</p>
                <p className="text-sm text-muted-foreground">
                  Try using a different card, UPI, or net banking if the issue persists. Razorpay supports multiple payment methods.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <HelpCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-semibold">Contact Your Bank</p>
                <p className="text-sm text-muted-foreground">
                  If the problem continues, contact your bank to ensure your card is authorized for online and international payments.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex flex-col gap-3">
            <Button
              size="lg"
              onClick={() => navigate({ to: '/subscription' })}
              className="bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 hover:opacity-90 h-14 text-lg font-bold gap-2"
            >
              <RefreshCw className="h-5 w-5" />
              Try Again
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate({ to: '/matching' })}
              className="h-14 text-lg font-bold"
            >
              Continue with Free Plan
            </Button>
            <Button
              size="lg"
              variant="ghost"
              onClick={() => navigate({ to: '/' })}
              className="h-12 text-base"
            >
              Go Home
            </Button>
          </div>

          <Alert className="border-primary/50 bg-primary/5">
            <HelpCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong className="font-semibold">Need help?</strong>
              <p className="mt-1 text-muted-foreground">
                Contact our support team if you continue experiencing issues. We're here to help you get started with premium features!
              </p>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
