import { Scan, Eye, AlertCircle } from 'lucide-react';

interface StatusIndicatorProps {
  status: 'scanning' | 'recognized' | 'error';
  message?: string;
}

export function StatusIndicator({ status, message }: StatusIndicatorProps) {
  const statusConfig = {
    scanning: {
      icon: Scan,
      text: 'Looking for faces...',
      bgClass: 'bg-primary/90',
      textClass: 'text-primary-foreground',
    },
    recognized: {
      icon: Eye,
      text: 'Person recognized!',
      bgClass: 'bg-success',
      textClass: 'text-primary-foreground',
    },
    error: {
      icon: AlertCircle,
      text: message || 'Something went wrong',
      bgClass: 'bg-warning',
      textClass: 'text-foreground',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className="absolute top-safe-top left-0 right-0 flex justify-center pt-4 px-4">
      <div
        className={`
          flex items-center gap-3 px-5 py-3 rounded-full
          ${config.bgClass} ${config.textClass}
          shadow-card backdrop-blur-sm
          ${status === 'scanning' ? 'animate-pulse-soft' : 'fade-in'}
        `}
      >
        <Icon className={`w-5 h-5 ${status === 'scanning' ? 'animate-spin' : ''}`} />
        <span className="font-medium text-base">{config.text}</span>
      </div>
    </div>
  );
}
