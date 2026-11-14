import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useBackNavigation, navState } from "@/hooks/useBackNavigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, MapPin, BedDouble, Calendar, PawPrint,
  Building2, Clock, Ruler, Armchair, MessageSquare, Inbox,
  Pencil, AlertTriangle, Send, CheckCircle, XCircle, Phone,
} from "lucide-react";

import { API_URL } from "@/lib/api";

const label = {
  property: (t: string) => t === "apartment" ? "Апартамент" : t === "house" ? "Къща" : "Без значение",
  rental: (t: string) => t === "long_term" ? "Дългосрочен" : t === "short_term" ? "Краткосрочен" : "Гъвкав",
  furnished: (t: string) => t === "yes" ? "Да" : t === "no" ? "Не" : "Без значение",
  pets: (t: string) => t === "yes" ? "Да" : t === "no" ? "Не" : "По договаряне",
  brokers: (t: string) => t === "both" ? "Всички" : t === "owners_only" ? "Само собственици" : "Само брокери",
};

const RequestDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get("highlight");
  const { user, profile, loading: authLoading } = useAuth();
  
  const backNav = useBackNavigation({
    fallbackLabel: highlightId ? "Моите оферти" : "Заявки",
    fallbackPath: highlightId ? "/my-responses" : "/browse",
  });
  
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Статистики за създателя (Seeker)
  const [offerCounts, setOfferCounts] = useState({ all: 0, pending: 0, approved: 0, rejected: 0 });

  // Оферти, направени от този брокер по тази заявка
  const [brokerResponses, setBrokerResponses] = useState<any[]>([]);
  const [seekerPhone, setSeekerPhone] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user || !id) return;
    const load = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { "Authorization": `Bearer ${token}` };

        // 1. Взимаме заявката
        const reqRes = await fetch(`${API_URL}/requests/${id}`, { headers });
        if (!reqRes.ok) throw new Error("Not found");
        const reqData = await reqRes.json();
        setRequest(reqData);

        // 2. Взимаме всички оферти по тази заявка
        const offersRes = await fetch(`${API_URL}/offers/request/${id}`, { headers });
        if (offersRes.ok) {
          const offersData = await offersRes.json();
          
          // Изчисляваме бройки за търсещия
          let pending = 0, approved = 0, rejected = 0;
          offersData.forEach((r: any) => {
            const s = r.contact_status || "pending";
            if (s === "approved") approved++;
            else if (s === "rejected") rejected++;
            else pending++;
          });
          setOfferCounts({ all: offersData.length, pending, approved, rejected });

          // Филтрираме само офертите на текущия брокер
          const myResps = offersData.filter((r: any) => r.responder_id === user.id);
          setBrokerResponses(myResps);

          // Ако има одобрена оферта, взимаме телефона през защитения summary endpoint
          const hasApproved = myResps.some((r: any) => r.contact_status === "approved");
          if (hasApproved) {
            const summaryRes = await fetch(`${API_URL}/offers/request-summary/${id}/${user.id}`, { headers });
            if (summaryRes.ok) {
              const summaryData = await summaryRes.json();
              setSeekerPhone(summaryData.seekerPhone || null);
            }
          }
        }
      } catch (err) {
        setRequest(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, id]);

  if (authLoading || loading) return <div className="flex min-h-screen items-center justify-center">Зареждане...</div>;

  if (!request) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <span className="text-muted-foreground">Заявката не е намерена.</span>
        <Button variant="outline" onClick={() => navigate(-1 as any)}>Назад</Button>
      </div>
    );
  }

  const isOwner = request.seeker_id === user?.id;
  const isProviderRole = profile?.role === "broker" || profile?.role === "owner";
  const daysLeft = Math.max(0, Math.ceil((new Date(request.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  const isActive = request.status === "active" && daysLeft > 0;

  const canRespond = isProviderRole && isActive && !isOwner && (
    request.allow_brokers === "both" ||
    (request.allow_brokers === "owners_only" && profile?.role === "owner") ||
    (request.allow_brokers === "yes" && profile?.role === "broker")
  );

  const blockedReason = isProviderRole && !isOwner && !canRespond && isActive
    ? request.allow_brokers === "owners_only" && profile?.role === "broker"
      ? "Тази заявка е само за собственици."
      : request.allow_brokers === "yes" && profile?.role === "owner"
        ? "Тази заявка е само за брокери."
        : null
    : null;

  const Row = ({ icon, label: l, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) => (
    <div className="flex items-start gap-3 py-2">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted-foreground">{l}</div>
        <div className="text-sm font-medium">{value}</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <button onClick={backNav.goBack} className="flex items-center gap-2 text-muted-foreground">
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm font-medium">{backNav.label}</span>
          </button>
          <button onClick={() => navigate("/")} className="text-sm font-bold">HomeMatch<span className="text-primary">.bg</span></button>
          <div className="w-24" />
        </div>
      </nav>

      <main className="mx-auto max-w-2xl px-4 py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant={isActive ? "default" : "secondary"}>
              {isActive ? "Активна" : "Затворена"}
            </Badge>
            {isActive && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" /> Остават {daysLeft} дни
              </span>
            )}
          </div>
          {isOwner && isActive && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate(`/requests/${id}/edit`, navState("request-detail", `/requests/${id}`))}>
              <Pencil className="h-3.5 w-3.5" /> Редактирай
            </Button>
          )}
        </div>

        <h1 className="text-xl font-bold">
          {label.property(request.property_type)} в {request.city}
        </h1>

        {/* Брокер: Вижда собствените си оферти */}
        {!isOwner && brokerResponses.length > 0 && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4 space-y-3">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Send className="h-4 w-4 text-primary" />
                Вашите изпратени оферти по тази заявка
                <Badge variant="outline" className="text-[10px]">{brokerResponses.length}</Badge>
              </h3>

              {brokerResponses.map((br) => (
                <div key={br._id} className="rounded-md border border-border/50 bg-background p-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="font-medium">{br.price} €/мес</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground">{br.size_sqm} м²</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground">{br.bedrooms} стаи</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground">{br.approx_location}</span>
                  </div>

                  {br.contact_status === "approved" ? (
                    <div className="space-y-2">
                      <div className="rounded-md border border-green-500/30 bg-green-500/10 p-2 space-y-1">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-700">Контакт одобрен</span>
                        </div>
                        {seekerPhone && (
                          <p className="flex items-center gap-1.5 text-sm font-medium">
                            <Phone className="h-3.5 w-3.5" /> {seekerPhone}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : br.contact_status === "rejected" ? (
                    <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-2">
                      <XCircle className="h-4 w-4 text-destructive" />
                      <span className="text-sm text-muted-foreground">Офертата е отхвърлена</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 p-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Изчакване на отговор</span>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {blockedReason && (
          <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/5 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
            <div>
              <p className="text-sm font-medium">{blockedReason}</p>
              <p className="text-xs text-muted-foreground">Нямате право да изпратите предложение за тази заявка.</p>
            </div>
          </div>
        )}

        {/* Детайли */}
        <Card>
          <CardContent className="p-5 space-y-1">
            <Row icon={<MapPin className="h-4 w-4" />} label="Град" value={request.city} />
            <Row icon={<Building2 className="h-4 w-4" />} label="Тип имот" value={label.property(request.property_type)} />
            <Row icon={<Clock className="h-4 w-4" />} label="Вид наем" value={label.rental(request.rental_type)} />
            <Row icon={<span className="text-sm font-bold">€</span>} label="Бюджет" value={`${request.budget?.min} – ${request.budget?.max} €/мес`} />
            <Row icon={<BedDouble className="h-4 w-4" />} label="Стаи" value={request.specs?.bedrooms} />
            {request.specs?.min_area_sqm > 0 && (
              <Row icon={<Ruler className="h-4 w-4" />} label="Минимална площ" value={`${request.specs?.min_area_sqm} м²`} />
            )}
            <Row icon={<Armchair className="h-4 w-4" />} label="Обзавеждане" value={label.furnished(request.specs?.furnished)} />
            <Row icon={<PawPrint className="h-4 w-4" />} label="Домашни любимци" value={label.pets(request.specs?.pets)} />
            <Row icon={<Building2 className="h-4 w-4" />} label="Кой може да отговори" value={label.brokers(request.allow_brokers)} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h3 className="mb-2 text-sm font-bold">Описание</h3>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{request.description}</p>
          </CardContent>
        </Card>

        {canRespond && (
          <Button className="w-full gap-2" size="lg" onClick={() => navigate(`/requests/${id}/respond`)}>
            <Send className="h-4 w-4" /> Изпрати предложение
          </Button>
        )}
      </main>
    </div>
  );
};

export default RequestDetail;

