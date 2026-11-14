import { useState } from "react";
import { MessageSquareText } from "lucide-react";
import { toast } from "sonner";

import { API_URL, authHeaders } from "@/lib/api";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const feedbackTypes = [
  { value: "confusing", label: "Нещо е неясно" },
  { value: "bug", label: "Проблем или грешка" },
  { value: "idea", label: "Идея за подобрение" },
  { value: "other", label: "Друго" },
] as const;

type FeedbackType = (typeof feedbackTypes)[number]["value"];

type FeedbackDialogProps = {
  triggerLabel?: string;
  triggerLabelClassName?: string;
  triggerClassName?: string;
  triggerVariant?: ButtonProps["variant"];
  triggerSize?: ButtonProps["size"];
};

const FeedbackDialog = ({
  triggerLabel = "Обратна връзка",
  triggerLabelClassName,
  triggerClassName,
  triggerVariant = "ghost",
  triggerSize = "sm",
}: FeedbackDialogProps) => {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("confusing");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmed = message.trim();
    if (!trimmed) return;

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          type,
          message: trimmed,
          page: window.location.pathname,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Не успяхме да изпратим обратната връзка.");
      }

      toast.success("Благодарим! Записахме обратната връзка.");
      setMessage("");
      setType("confusing");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не успяхме да изпратим обратната връзка.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={triggerVariant}
          size={triggerSize}
          className={triggerClassName}
          aria-label={triggerLabel}
        >
          <MessageSquareText className="h-4 w-4" />
          {triggerLabel && <span className={triggerLabelClassName}>{triggerLabel}</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Обратна връзка</DialogTitle>
          <DialogDescription>
            Кажете ни кое ви забави, обърка или липсваше. Това ще помогне за следващата версия.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Select value={type} onValueChange={(value) => setType(value as FeedbackType)}>
            <SelectTrigger>
              <SelectValue placeholder="Тип обратна връзка" />
            </SelectTrigger>
            <SelectContent>
              {feedbackTypes.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={2000}
            rows={5}
            placeholder="Например: не разбрах как да одобря контакт, бутонът не беше ясен..."
          />
          <div className="text-right text-xs text-muted-foreground">{message.length}/2000</div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Отказ
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !message.trim()}>
            {submitting ? "Изпращане..." : "Изпрати"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackDialog;
