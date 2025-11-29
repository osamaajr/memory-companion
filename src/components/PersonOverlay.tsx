import { User, Heart, X } from 'lucide-react';

interface PersonInfo {
  name: string;
  relationship: string;
  photoUrl?: string;
  summary: string;
}

interface PersonOverlayProps {
  person: PersonInfo | null;
  isLoading: boolean;
  onDismiss: () => void;
}

export function PersonOverlay({ person, isLoading, onDismiss }: PersonOverlayProps) {
  if (!person && !isLoading) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 slide-up">
      <div className="overlay-card rounded-t-3xl p-6 pb-safe-bottom">
        {/* Dismiss handle */}
        <div className="flex justify-center mb-4">
          <button
            onClick={onDismiss}
            className="w-12 h-1.5 bg-primary-foreground/30 rounded-full hover:bg-primary-foreground/50 transition-colors"
            aria-label="Dismiss"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center gap-4 animate-pulse">
            <div className="w-20 h-20 rounded-2xl bg-primary-foreground/20" />
            <div className="flex-1 space-y-3">
              <div className="h-6 bg-primary-foreground/20 rounded-lg w-32" />
              <div className="h-4 bg-primary-foreground/20 rounded-lg w-24" />
              <div className="h-4 bg-primary-foreground/20 rounded-lg w-full" />
            </div>
          </div>
        ) : person ? (
          <div className="fade-in">
            <div className="flex items-start gap-5 mb-4">
              {/* Photo */}
              <div className="relative">
                {person.photoUrl ? (
                  <img
                    src={person.photoUrl}
                    alt={person.name}
                    className="w-24 h-24 rounded-2xl object-cover border-2 border-primary-foreground/20"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-primary/30 flex items-center justify-center">
                    <User className="w-12 h-12 text-primary-foreground" />
                  </div>
                )}
                <div className="absolute -bottom-2 -right-2 bg-primary rounded-full p-1.5">
                  <Heart className="w-4 h-4 text-primary-foreground" fill="currentColor" />
                </div>
              </div>

              {/* Name and relationship */}
              <div className="flex-1 pt-1">
                <h2 className="text-3xl font-bold text-primary-foreground mb-1">
                  {person.name}
                </h2>
                <p className="text-xl text-primary/80 font-medium">
                  Your {person.relationship}
                </p>
              </div>

              {/* Close button */}
              <button
                onClick={onDismiss}
                className="p-2 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors"
                aria-label="Close"
              >
                <X className="w-6 h-6 text-primary-foreground" />
              </button>
            </div>

            {/* Summary */}
            <div className="bg-primary-foreground/10 rounded-2xl p-5">
              <p className="text-lg text-primary-foreground leading-relaxed">
                {person.summary}
              </p>
            </div>

            {/* Reassurance message */}
            <p className="text-center text-primary-foreground/60 text-sm mt-4">
              Tap anywhere or wait to continue looking
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
