import { useState } from 'react';
import { useSetRazorpayConfiguration, useIsRazorpayConfigured } from '../hooks/useQueries';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreditCard, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface RazorpayConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function RazorpayConfigModal({ open, onOpenChange }: RazorpayConfigModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const setRazorpayConfig = useSetRazorpayConfiguration();
  const { data: isConfigured } = useIsRazorpayConfigured();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!apiKey.trim()) {
      toast.error('Please enter your Razorpay API key');
      return;
    }

    if (!secretKey.trim()) {
      toast.error('Please enter your Razorpay secret key');
      return;
    }

    try {
      await setRazorpayConfig.mutateAsync({
        apiKey: apiKey.trim(),
        secretKey: secretKey.trim(),
      });

      toast.success('Razorpay configuration saved successfully!');
      setApiKey('');
      setSecretKey('');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save Razorpay configuration:', error);
      toast.error('Failed to save Razorpay configuration. Please try again.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <CreditCard className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-2xl">Configure Razorpay Payment</DialogTitle>
              <DialogDescription className="text-base mt-1">
                Set up your Razorpay integration to enable premium subscriptions
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isConfigured && (
          <Alert className="border-green-500/50 bg-green-500/10">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-700 dark:text-green-400">
              Razorpay is already configured. You can update the configuration below.
            </AlertDescription>
          </Alert>
        )}

        <Alert className="border-blue-500/50 bg-blue-500/10">
          <AlertCircle className="h-4 w-4 text-blue-500" />
          <AlertDescription className="text-sm text-blue-700 dark:text-blue-400">
            <strong className="font-semibold">Important:</strong> Keep your Razorpay keys secure. 
            Get your keys from the{' '}
            <a 
              href="https://dashboard.razorpay.com/app/keys" 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline hover:text-blue-600"
            >
              Razorpay Dashboard
            </a>.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="apiKey" className="text-base font-semibold">
              Razorpay API Key <span className="text-destructive">*</span>
            </Label>
            <Input
              id="apiKey"
              type="text"
              placeholder="rzp_test_... or rzp_live_..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="h-12 text-base"
              required
            />
            <p className="text-sm text-muted-foreground">
              Your Razorpay API key (starts with rzp_test_ or rzp_live_)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="secretKey" className="text-base font-semibold">
              Razorpay Secret Key <span className="text-destructive">*</span>
            </Label>
            <Input
              id="secretKey"
              type="password"
              placeholder="Enter your secret key"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              className="h-12 text-base"
              required
            />
            <p className="text-sm text-muted-foreground">
              Your Razorpay secret key (keep this confidential)
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              disabled={setRazorpayConfig.isPending}
              className="flex-1 h-12 text-base font-bold"
            >
              {setRazorpayConfig.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Configuration'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={setRazorpayConfig.isPending}
              className="h-12 text-base font-bold"
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
