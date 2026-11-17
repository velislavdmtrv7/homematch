import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Flag } from "lucide-react";
import { toast } from "sonner";

import { API_URL } from "@/lib/api";

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reporterId: string;
  targetUserId?: string;
  targetResponseId?: string;
  targetRequestId?: string;
}

const ReportDialog = ({ open, onOpenChange, reporterId, targetUserId, targetResponseId, targetRequestId }: ReportDialogProps) => {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      await fetch(`${API_URL}/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          reporter_id: reporterId,
          reported_user_id: targetUserId || null,
          reported_response_id: targetResponseId || null,
          reported_request_id: targetRequestId || null,
          reason: reason.trim(),
        }),
      });
      toast.success("Сигналът е изпратен успешно.");
      setReason("");
      onOpenChange(false);
    } catch {
      toast.error("Грешка при изпращане.");
    } finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Flag className="h-4 w-4 text-destructive" /> Докладване</DialogTitle>
          <DialogDescription>Опишете причината за вашия сигнал.</DialogDescription>
        </DialogHeader>
        <Textarea placeholder="Причина..." value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
        <Button onClick={handleSubmit} disabled={submitting || !reason.trim()} className="w-full">
          {submitting ? "Изпращане..." : "Изпрати сигнал"}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default ReportDialog;
