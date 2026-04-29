import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { toast } from "sonner";

const API_URL = "http://localhost:5000/api";

interface ReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providerId: string;
  responseId?: string;
  onSuccess?: () => void; // <--- ДОБАВЯМЕ ТОВА
}

const ReviewDialog = ({ open, onOpenChange, providerId, responseId, onSuccess }: ReviewDialogProps) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return toast.error("Моля, изберете оценка от 1 до 5 звезди.");
    if (!user) return toast.error("Трябва да сте влезли в профила си.");

    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          reviewer_id: user.id,
          provider_id: providerId,
          response_id: responseId || null,
          rating,
          comment: comment.trim()
        })
      });

      if (!res.ok) throw new Error("Възникна грешка при запазване на отзива.");

      toast.success("Отзивът ви е записан успешно!");
      onOpenChange(false);
      if (onSuccess) onSuccess(); // <--- ДОБАВЯМЕ ТОВА
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Оценете брокера</DialogTitle>
          <DialogDescription>
            Вашата оценка помага на други търсещи да намерят коректни партньори.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex flex-col items-center justify-center space-y-2">
            <span className="text-sm font-medium">Оценка (задължително)</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="p-1 transition-transform hover:scale-110 active:scale-95"
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= (hoveredRating || rating)
                        ? "fill-amber-400 text-amber-500"
                        : "text-muted-foreground/30"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Коментар (по избор)</label>
            <Textarea
              placeholder="Как мина комуникацията? Отговаряше ли имотът на описанието?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Отказ
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || rating === 0}>
            {submitting ? "Изпращане..." : "Изпрати отзив"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewDialog;