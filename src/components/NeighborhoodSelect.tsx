import { useState, useMemo, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Search, MapPin } from "lucide-react";
import { getCityNeighborhoods, hasNeighborhoodData } from "@/data/neighborhoods";

interface NeighborhoodSelectProps {
  city: string;
  selected: string[];
  onChange: (neighborhoods: string[]) => void;
}

const NeighborhoodSelect = ({ city, selected, onChange }: NeighborhoodSelectProps) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [freeText, setFreeText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const hasData = hasNeighborhoodData(city);
  const allNeighborhoods = useMemo(() => getCityNeighborhoods(city), [city]);

  const filtered = useMemo(() => {
    if (!query.trim()) return allNeighborhoods.filter((n) => !selected.includes(n));
    const q = query.toLowerCase();
    return allNeighborhoods.filter(
      (n) => n.toLowerCase().includes(q) && !selected.includes(n)
    );
  }, [query, allNeighborhoods, selected]);

  const addNeighborhood = (n: string) => {
    if (!selected.includes(n)) {
      onChange([...selected, n]);
    }
    setQuery("");
  };

  const removeNeighborhood = (n: string) => {
    onChange(selected.filter((s) => s !== n));
  };

  const handleFreeTextAdd = () => {
    const items = freeText
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s && !selected.includes(s));
    if (items.length > 0) {
      onChange([...selected, ...items]);
      setFreeText("");
    }
  };

  // Fallback: free text input for cities without data
  if (!hasData && city) {
    return (
      <div className="space-y-2">
        <Label>Предпочитани квартали <span className="text-muted-foreground">(по избор)</span></Label>
        <div className="flex gap-2">
          <Input
            placeholder="напр. Център, Нов квартал"
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleFreeTextAdd(); } }}
            maxLength={200}
          />
          <button
            type="button"
            onClick={handleFreeTextAdd}
            className="shrink-0 rounded-md border border-border px-3 text-sm font-medium hover:bg-muted transition-colors"
          >
            Добави
          </button>
        </div>
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {selected.map((n) => (
              <Badge key={n} variant="secondary" className="gap-1 pr-1">
                {n}
                <button type="button" onClick={() => removeNeighborhood(n)} className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">Разделете с запетая или натиснете Enter</p>
      </div>
    );
  }

  if (!city) {
    return (
      <div className="space-y-2">
        <Label>Предпочитани квартали <span className="text-muted-foreground">(по избор)</span></Label>
        <Input disabled placeholder="Първо изберете град" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>Предпочитани квартали <span className="text-muted-foreground">(по избор)</span></Label>

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((n) => (
            <Badge key={n} variant="secondary" className="gap-1 pr-1">
              <MapPin className="h-3 w-3" />
              {n}
              <button type="button" onClick={() => removeNeighborhood(n)} className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder="Търси квартал..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          className="pl-9"
        />
      </div>

      {/* Dropdown */}
      {open && filtered.length > 0 && (
        <div className="max-h-48 overflow-y-auto rounded-md border border-border bg-popover shadow-md">
          {filtered.slice(0, 20).map((n) => (
            <button
              key={n}
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => addNeighborhood(n)}
            >
              <MapPin className="h-3 w-3 text-muted-foreground" />
              {n}
            </button>
          ))}
          {filtered.length > 20 && (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              Показани са първите 20. Въведете текст за филтриране.
            </div>
          )}
        </div>
      )}

      {open && query && filtered.length === 0 && (
        <div className="rounded-md border border-border bg-popover p-3 text-center text-sm text-muted-foreground">
          Няма резултати. 
          <button
            type="button"
            className="ml-1 text-primary hover:underline"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { addNeighborhood(query); }}
          >
            Добави „{query}"
          </button>
        </div>
      )}
    </div>
  );
};

export default NeighborhoodSelect;
