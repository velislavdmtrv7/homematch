import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { User, Building2, Star } from "lucide-react";
import { useProviderRating } from "@/hooks/useProviderRating";

import { API_URL } from "@/lib/api";
import { PublicProfile, Review } from "@/types/api";

interface ProviderProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: Pick<PublicProfile, "full_name" | "role"> | null;
  providerId?: string;
}

const ProviderProfileDialog = ({ open, onOpenChange, provider, providerId }: ProviderProfileDialogProps) => {
  const { rating } = useProviderRating(providerId);
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    if (!open || !providerId) { setReviews([]); return; }
    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/reviews/provider/${providerId}`);
        const data = await res.json();
        setReviews(data);
      } catch (err) { console.error(err); }
    };
    load();
  }, [open, providerId]);

  if (!provider) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs">
        <DialogHeader><DialogTitle className="text-base">Профил на предлагащ</DialogTitle></DialogHeader>
        <div className="flex flex-col items-center gap-3 py-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            {provider.role === "broker" ? <Building2 className="h-6 w-6" /> : <User className="h-6 w-6" />}
          </div>
          <div className="text-center space-y-1">
            <p className="font-bold">{provider.full_name}</p>
            <Badge variant="secondary" className="text-xs">{provider.role === "broker" ? "Брокер" : "Собственик"}</Badge>
            {rating && rating.count > 0 && (
              <div className="flex items-center justify-center gap-1.5 pt-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-semibold">{rating.avg}</span>
                <span className="text-xs text-muted-foreground">({rating.count} отзива)</span>
              </div>
            )}
          </div>
        </div>
        {reviews.length > 0 && (
          <div className="border-t border-border pt-3 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground">Последни отзиви</p>
            {reviews.map((rev) => (
              <div key={rev._id} className="space-y-0.5">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold">{rev.reviewer_id?.full_name}</span>
                  <div className="flex ml-auto">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-2 w-2 ${i < rev.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{rev.text}</p>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ProviderProfileDialog;
