import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Building2, User, ChevronRight, Star } from "lucide-react";
import { useProviderRating } from "@/hooks/useProviderRating";

interface ProviderMiniCardProps {
  provider: {
    full_name: string;
    role: string;
    company_name?: string | null;
  };
  providerId?: string;
  onClick: () => void;
}

const roleLabel = (r: string) =>
  r === "broker" ? "Брокер / Агенция" : r === "owner" ? "Частен собственик" : r;

const ProviderMiniCard = ({ provider, providerId, onClick }: ProviderMiniCardProps) => {
  const { rating } = useProviderRating(providerId);

  const initials = provider.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="w-full flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 p-3 text-left transition-colors hover:bg-muted/60 active:scale-[0.99]"
    >
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
          {provider.role === "broker" ? (
            <Building2 className="h-4 w-4" />
          ) : initials ? (
            initials
          ) : (
            <User className="h-4 w-4" />
          )}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-tight truncate">
          {provider.full_name}
        </p>
        <p className="text-xs text-muted-foreground leading-tight mt-0.5">
          {roleLabel(provider.role)}
          {provider.role === "broker" && provider.company_name
            ? ` · ${provider.company_name}`
            : ""}
        </p>
        {rating && rating.count > 0 && (
          <div className="flex items-center gap-1 mt-1">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            <span className="text-xs font-medium">{rating.avg}</span>
            <span className="text-xs text-muted-foreground">({rating.count})</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0 text-xs text-muted-foreground">
        <span className="hidden sm:inline">Виж профил</span>
        <ChevronRight className="h-4 w-4" />
      </div>
    </button>
  );
};

export default ProviderMiniCard;
