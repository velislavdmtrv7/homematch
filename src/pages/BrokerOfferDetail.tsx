import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useBackNavigation } from "@/hooks/useBackNavigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, MapPin, BedDouble, Building2, Clock, Ruler,
  CheckCircle, XCircle, Phone, Send, Armchair, MessageSquare,
} from "lucide-react";

const API_URL = "http://localhost:5000/api";

const label = {
  property: (t: string) => t === "apartment" ? "Апартамент" : t === "house" ? "Къща" : "Без значение",
  rental: (t: string) => t === "long_term" ? "Дългосрочен" : t === "short_term" ? "Краткосрочен" : "Гъвкав",
  furnished: (t: string) => t === "yes" ? "Обзаведен" : t === "no" ? "Необзаведен" : "По договаряне",
};

const BrokerOfferDetail = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const backNav = useBackNavigation({ fallbackLabel: "Моите оферти", fallbackPath: "/my-responses" });
  
  const [request, setRequest] = useState<any>(null);
  const [myOffers, setMyOffers] = useState<any[]>([]);
  const [seekerPhone, setSeekerPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user || !requestId) return;
    const load = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_URL}/offers/request-summary/${requestId}/${user.id}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });

        if (!res.ok) throw new Error("Неуспешно зареждане");
        const data = await res.json();

        setRequest(data.request);
        setMyOffers(data.offers);
        setSeekerPhone(data.seekerPhone);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, requestId]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-muted-foreground">Зареждане...</span>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <span className="text-muted-foreground">Заявката не е намерена.</span>
        <Button variant="outline" onClick={() => navigate("/my-responses")}>Назад</Button>
      </div>
    );
  }

  const pendingCount = myOffers.filter((o) => o.contact_status === "pending").length;
  const approvedCount = myOffers.filter((o) => o.contact_status === "approved").length;
  const rejectedCount = myOffers.filter((o) => o.contact_status === "rejected").length;

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <button onClick={backNav.goBack} className="flex items-center gap-2 text-muted-foreground">
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm font-medium">{backNav.label}</span>
          </button>
          <span className="text-sm font-bold">HomeMatch<span className="text-primary">.bg</span></span>
          <div className="w-24" />
        </div>
      </nav>

      <main className="mx-auto max-w-2xl px-4 py-6 space-y-4">
        {/* Обобщение на заявката */}
        <Card>
          <CardContent className="p-4 space-y-2">
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Контекст: Заявка</h2>
            <h3 className="font-bold text-lg">
              {label.property(request.property_type)} в {request.city}
            </h3>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{request.budget?.min} – {request.budget?.max} €/мес</span>
              <span className="flex items-center gap-1"><BedDouble className="h-3 w-3" /> {request.specs?.bedrooms} стаи</span>
              <span>{label.rental(request.rental_type)}</span>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Вашите оферти
            <Badge variant="outline">{myOffers.length}</Badge>
          </h2>
        </div>

        {/* Статистика на статусите */}
        <div className="flex gap-2 flex-wrap">
          {pendingCount > 0 && <Badge variant="outline" className="gap-1 text-xs"><Clock className="h-3 w-3" /> {pendingCount} изчакващи</Badge>}
          {approvedCount > 0 && <Badge variant="outline" className="gap-1 text-xs border-green-500/30 text-green-600 bg-green-500/5"><CheckCircle className="h-3 w-3" /> {approvedCount} одобрени</Badge>}
          {rejectedCount > 0 && <Badge variant="outline" className="gap-1 text-xs border-destructive/30 text-destructive bg-destructive/5"><XCircle className="h-3 w-3" /> {rejectedCount} отхвърлени</Badge>}
        </div>

        {/* Списък с изпратените оферти */}
        <div className="space-y-3">
          {myOffers.map((offer) => (
            <Card key={offer._id} className={`${offer.contact_status === "approved" ? "border-green-500/30 ring-1 ring-green-500/10" : ""}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-lg">{offer.price} €/мес</h4>
                  {offer.contact_status === "approved" ? (
                    <Badge className="bg-green-500/10 text-green-600 border-green-500/30 gap-1"><CheckCircle className="h-3 w-3" /> Одобрена</Badge>
                  ) : offer.contact_status === "rejected" ? (
                    <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Отхвърлена</Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> Изчакване</Badge>
                  )}
                </div>

                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><BedDouble className="h-3 w-3" /> {offer.bedrooms} стаи</span>
                  <span className="flex items-center gap-1"><Ruler className="h-3 w-3" /> {offer.size_sqm} м²</span>
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {offer.approx_location}</span>
                </div>

                <p className="text-sm text-muted-foreground line-clamp-3">{offer.description}</p>

                {offer.contact_status === "approved" && (
                  <div className="space-y-2 pt-2 border-t mt-2">
                    <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3 space-y-1">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium">Контактът е отключен</span>
                      </div>
                      {seekerPhone && (
                        <p className="flex items-center gap-1.5 text-sm font-medium">
                          <Phone className="h-3.5 w-3.5" /> {seekerPhone}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default BrokerOfferDetail;