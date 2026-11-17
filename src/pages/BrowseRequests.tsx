import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, MapPin, BedDouble, Ruler, Building2, Clock,
  Search, Filter, SlidersHorizontal, Inbox, AlertCircle, Users, CheckCircle2, Send, XCircle,
} from "lucide-react";
import { navState } from "@/hooks/useBackNavigation";

import { API_URL } from "@/lib/api";
import { errorMessage, RentalRequest } from "@/types/api";

interface MyOfferSummary {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

const CITIES = [
  "София", "Пловдив", "Варна", "Бургас", "Русе", "Стара Загора",
  "Плевен", "Добрич", "Сливен", "Шумен", "Велико Търново", "Хасково",
  "Перник", "Ямбол", "Пазарджик", "Благоевград", "Враца", "Габрово",
  "Кюстендил", "Видин", "Монтана", "Кърджали", "Ловеч", "Разград",
  "Силистра", "Смолян", "Търговище",
];

const propertyLabel = (t: string) =>
  t === "apartment" ? "Апартамент" : t === "house" ? "Къща" : "Всеки тип";
const rentalLabel = (t: string) =>
  t === "long_term" ? "Дългосрочен" : t === "short_term" ? "Краткосрочен" : "Гъвкав";
const brokersLabel = (t: string) =>
  t === "both" ? "Всички" : t === "owners_only" ? "Само собственици" : "Само брокери";

const BrowseRequests = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [requests, setRequests] = useState<RentalRequest[]>([]);
  const [respondedMap, setRespondedMap] = useState<Record<string, MyOfferSummary>>({});
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [filterCity, setFilterCity] = useState("");
  const [filterBudgetMin, setFilterBudgetMin] = useState("");
  const [filterBudgetMax, setFilterBudgetMax] = useState("");
  const [filterPropertyType, setFilterPropertyType] = useState("");
  const [filterRentalType, setFilterRentalType] = useState("");
  const [filterBedrooms, setFilterBedrooms] = useState("");
  const [filterMinArea, setFilterMinArea] = useState("");

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setError(null);
      try {
        const token = localStorage.getItem("token");
        const headers = { "Authorization": `Bearer ${token}` };

        // Изтегляме всички заявки и офертите на брокера едновременно
        const [requestsRes, offersRes] = await Promise.all([
          fetch(`${API_URL}/requests`, { headers }),
          fetch(`${API_URL}/offers/provider/${user.id}`, { headers })
        ]);

        if (!requestsRes.ok || !offersRes.ok) throw new Error("Грешка при комуникация със сървъра");

        const data = await requestsRes.json();
        const myResponses = await offersRes.json();

        // Изграждаме картата със статистики за направените оферти
        const respMap: Record<string, MyOfferSummary> = {};
        if (myResponses && myResponses.length > 0) {
          for (const resp of myResponses) {
            const status = resp.contact_status || "pending";
            const reqId = resp.request_id;
            
            if (!respMap[reqId]) {
              respMap[reqId] = { total: 0, pending: 0, approved: 0, rejected: 0 };
            }
            respMap[reqId].total++;
            if (status === "approved") respMap[reqId].approved++;
            else if (status === "rejected") respMap[reqId].rejected++;
            else respMap[reqId].pending++;
          }
        }
        setRespondedMap(respMap);

        const now = Date.now();
        const active = (data || []).filter(
          (r: RentalRequest) => new Date(r.expires_at).getTime() > now
        );
        setRequests(active);
      } catch (e) {
        setError(errorMessage(e, "Грешка при зареждане на данните"));
      } finally {
        setFetching(false);
      }
    };
    load();
  }, [user]);

  const filtered = useMemo(() => {
    let result = requests;

    if (profile) {
      result = result.filter((r) => {
        if (r.allow_brokers === "both") return true;
        if (r.allow_brokers === "owners_only" && profile.role === "owner") return true;
        if (r.allow_brokers === "owners_only" && profile.role === "broker") return false;
        if (r.allow_brokers === "yes" && profile.role === "broker") return true;
        if (r.allow_brokers === "yes" && profile.role === "owner") return false;
        return true;
      });
    }

    // Използваме новите вложени свойства от MongoDB (specs, budget)
    if (filterCity) result = result.filter((r) => r.city === filterCity);
    if (filterPropertyType) result = result.filter((r) => r.property_type === filterPropertyType);
    if (filterRentalType) result = result.filter((r) => r.rental_type === filterRentalType);
    if (filterBedrooms) result = result.filter((r) => r.specs?.bedrooms === Number(filterBedrooms));
    if (filterBudgetMin) result = result.filter((r) => r.budget?.max >= Number(filterBudgetMin));
    if (filterBudgetMax) result = result.filter((r) => r.budget?.min <= Number(filterBudgetMax));
    if (filterMinArea) result = result.filter((r) => r.specs?.min_area_sqm && r.specs.min_area_sqm >= Number(filterMinArea));

    return result;
  }, [requests, profile, filterCity, filterPropertyType, filterRentalType, filterBedrooms, filterBudgetMin, filterBudgetMax, filterMinArea]);

  const clearFilters = () => {
    setFilterCity("");
    setFilterBudgetMin("");
    setFilterBudgetMax("");
    setFilterPropertyType("");
    setFilterRentalType("");
    setFilterBedrooms("");
    setFilterMinArea("");
  };

  const hasActiveFilters = filterCity || filterBudgetMin || filterBudgetMax || filterPropertyType || filterRentalType || filterBedrooms || filterMinArea;

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Зареждане...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 text-muted-foreground">
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm font-medium">Табло</span>
          </button>
          <span className="text-sm font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            HomeMatch<span className="text-primary">.bg</span>
          </span>
          <div className="w-16" />
        </div>
      </nav>

      <main className="mx-auto max-w-2xl px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Активни заявки</h1>
          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            className="gap-1.5"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Филтри
            {hasActiveFilters && <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary-foreground text-primary text-[10px] font-bold">!</span>}
          </Button>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <Card className="mb-4">
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Град</Label>
                  <Select value={filterCity || "__all__"} onValueChange={(v) => setFilterCity(v === "__all__" ? "" : v)}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Всички" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Всички</SelectItem>
                      {CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Тип имот</Label>
                  <Select value={filterPropertyType || "__all__"} onValueChange={(v) => setFilterPropertyType(v === "__all__" ? "" : v)}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Всички" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Всички</SelectItem>
                      <SelectItem value="apartment">Апартамент</SelectItem>
                      <SelectItem value="house">Къща</SelectItem>
                      <SelectItem value="either">Без значение</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Вид наем</Label>
                  <Select value={filterRentalType || "__all__"} onValueChange={(v) => setFilterRentalType(v === "__all__" ? "" : v)}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Всички" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Всички</SelectItem>
                      <SelectItem value="long_term">Дългосрочен</SelectItem>
                      <SelectItem value="short_term">Краткосрочен</SelectItem>
                      <SelectItem value="flexible">Гъвкав</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Стаи</Label>
                  <Select value={filterBedrooms || "__all__"} onValueChange={(v) => setFilterBedrooms(v === "__all__" ? "" : v)}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Всички" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Всички</SelectItem>
                      {["1", "2", "3", "4", "5"].map((n) => (
                        <SelectItem key={n} value={n}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Бюджет от (€)</Label>
                  <Input type="number" className="h-9 text-xs" placeholder="Мин" value={filterBudgetMin} onChange={(e) => setFilterBudgetMin(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Бюджет до (€)</Label>
                  <Input type="number" className="h-9 text-xs" placeholder="Макс" value={filterBudgetMax} onChange={(e) => setFilterBudgetMax(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Мин. площ от (м²)</Label>
                  <Input type="number" className="h-9 text-xs" placeholder="напр. 40" value={filterMinArea} onChange={(e) => setFilterMinArea(e.target.value)} />
                </div>
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs">
                  Изчисти филтрите
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {fetching ? (
          <div className="flex items-center justify-center py-16">
            <span className="text-muted-foreground">Зареждане...</span>
          </div>
        ) : error ? (
          <Card className="border-destructive/30">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <AlertCircle className="mb-3 h-10 w-10 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => window.location.reload()}>
                Опитай отново
              </Button>
            </CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <Inbox className="mb-4 h-12 w-12 text-muted-foreground/30" />
              <h3 className="mb-2 font-bold">Няма намерени заявки</h3>
              <p className="text-sm text-muted-foreground">
                {hasActiveFilters
                  ? "Опитайте да промените филтрите."
                  : "В момента няма активни заявки за търсене на жилище."}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>
                  Изчисти филтрите
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            <p className="mb-3 text-xs text-muted-foreground">{filtered.length} заявки</p>
            <div className="space-y-3">
              {filtered.map((req) => {
                const daysLeft = Math.max(0, Math.ceil((new Date(req.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
                const summary = respondedMap[req._id];

                return (
                  <Card
                    key={req._id}
                    className="cursor-pointer transition-colors hover:bg-muted/30"
                    onClick={() => navigate(`/requests/${req._id}`, navState("browse"))}
                  >
                    <CardContent className="p-4">
                      <div className="mb-2 flex items-start justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="default">Активна</Badge>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" /> {daysLeft} дни
                          </span>
                        </div>
                        <Badge variant="outline" className="gap-1 text-[10px]">
                          <Users className="h-3 w-3" />
                          {brokersLabel(req.allow_brokers)}
                        </Badge>
                      </div>

                      <h3 className="mb-1 font-bold">
                        {propertyLabel(req.property_type)} в {req.city}
                      </h3>

                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {req.city}
                        </span>
                        <span className="flex items-center gap-1">
                          <BedDouble className="h-3 w-3" /> {req.specs?.bedrooms} стаи
                        </span>
                        {req.specs?.min_area_sqm > 0 && (
                          <span className="flex items-center gap-1">
                            <Ruler className="h-3 w-3" /> ≥{req.specs.min_area_sqm} м²
                          </span>
                        )}
                        <span className="font-medium text-foreground">
                          {req.budget?.min} – {req.budget?.max} €/мес
                        </span>
                        <span>{rentalLabel(req.rental_type)}</span>
                      </div>

                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{req.description}</p>

                      {/* Broker offer summary */}
                      {summary && (
                        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                          <Badge variant="outline" className="gap-1 text-[10px]">
                            <Send className="h-3 w-3" /> Изпратени: {summary.total}
                          </Badge>
                          {summary.approved > 0 && (
                            <Badge variant="outline" className="gap-1 text-[10px] border-green-500/30 text-green-600 bg-green-500/5">
                              <CheckCircle2 className="h-3 w-3" /> {summary.approved} одобр.
                            </Badge>
                          )}
                          {summary.rejected > 0 && (
                            <Badge variant="outline" className="gap-1 text-[10px] border-destructive/30 text-destructive bg-destructive/5">
                              <XCircle className="h-3 w-3" /> {summary.rejected} отхвърл.
                            </Badge>
                          )}
                          {summary.pending > 0 && (
                            <Badge variant="outline" className="gap-1 text-[10px] border-primary/30 text-primary bg-primary/5">
                              <Clock className="h-3 w-3" /> {summary.pending} изчакв.
                            </Badge>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default BrowseRequests;
