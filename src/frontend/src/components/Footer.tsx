import { Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-border/50 glass-effect relative z-10">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img
              src="/assets/generated/cat-paw-icon-transparent.dim_64x64.png"
              alt=""
              className="h-6 w-6 animate-paw-print"
            />
            <p className="text-sm text-muted-foreground text-center sm:text-left">
              © 2025 Meowate. Built with{' '}
              <Heart className="inline h-4 w-4 text-pink-500 fill-pink-500 animate-pulse" /> using{' '}
              <a
                href="https://caffeine.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-semibold focus:outline-none focus:ring-2 focus:ring-ring rounded"
              >
                caffeine.ai
              </a>
            </p>
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <button className="hover:text-foreground transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-ring rounded px-1">
              Privacy
            </button>
            <button className="hover:text-foreground transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-ring rounded px-1">
              Terms
            </button>
            <button className="hover:text-foreground transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-ring rounded px-1">
              Support
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}

