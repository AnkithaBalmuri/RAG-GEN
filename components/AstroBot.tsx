import { MessageCircle, Sparkles } from "lucide-react";

export function AstroBot({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`astrobot ${compact ? "astrobot-compact" : ""}`} aria-hidden="true">
      <div className="astrobot-helmet">
        <div className="astrobot-face">
          <span className="astrobot-eye" />
          <span className="astrobot-eye" />
          <span className="astrobot-smile" />
        </div>
        <span className="astrobot-antenna">
          <Sparkles className="h-3 w-3" />
        </span>
      </div>
      <div className="astrobot-body">
        <MessageCircle className="h-4 w-4" />
      </div>
      <span className="astrobot-orbit" />
    </div>
  );
}
