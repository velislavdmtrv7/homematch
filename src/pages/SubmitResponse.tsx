import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useBackNavigation } from "@/hooks/useBackNavigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Send, Home, Info, CheckCircle2 } from "lucide-react";

import { API_URL } from "@/lib/api";
import { errorMessage, SavedProperty } from "@/types/api";
const MAX_DAILY_RESPONSES = 5;

const SubmitResponse = () => {
  const { id: requestId } = useParams<{ id: string }>(); // Взимаме ID-то на заявката
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedPropertyId = searchParams.get("selectProperty");
  const { user, loading: authLoading } = useAuth();
  const backNav = useBackNavigation({ fallbackLabel: "Към заявката", fallbackPath: `/requests/${requestId}` });

  const [requestCity, setRequestCity] = useState("");
  const [myProperties, setMyProperties] = useState<SavedProperty[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(preselectedPropertyId || "");
  const [customNote, setCustomNote] = useState("");
  
  const [submitting, setSubmitting] = useState(false);
  const [dailyCount, setDailyCount] = useState<number | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  // Зареждане на данните
  useEffect(() => {
    if (!user || !requestId) return;

    const load = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { "Authorization": `Bearer ${token}` };

        // 1. Дневен лимит
        const countRes = await fetch(`${API_URL}/offers/daily-count/${user.id}`, { headers });
        if (countRes.ok) setDailyCount(await countRes.json());

        // 2. Град на заявката
        const reqRes = await fetch(`${API_URL}/requests/${requestId}`, { headers });
        if (reqRes.ok) {
          const reqData = await reqRes.json();
          setRequestCity(reqData.city);
        }

        // 3. Портфолио на брокера
        const propsRes = await fetch(`${API_URL}/properties/saved/user/${user.id}`, { headers });
        if (propsRes.ok) {
          const propsData = await propsRes.json();
          setMyProperties(propsData);
          if (preselectedPropertyId && propsData.some((p: SavedProperty) => p._id === preselectedPropertyId)) {
            setSelectedPropertyId(preselectedPropertyId);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingData(false);
      }
    };
    load();
  }, [user, requestId, preselectedPropertyId]);

  const limitReached = dailyCount !== null && dailyCount >= MAX_DAILY_RESPONSES;
  const remaining = dailyCount !== null ? MAX_DAILY_RESPONSES - dailyCount : null;

  const handleSubmit = async () => {
    if (limitReached) return toast.error("Достигнахте дневния лимит от 5 предложения.");
    if (!selectedPropertyId) return toast.error("Моля, изберете имот от падащото меню.");
    
    const selectedProp = myProperties.find(p => p._id === selectedPropertyId);
    if (!selectedProp) return toast.error("Избраният имот не е намерен.");

    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      
      // ПЕРФЕКТНИЯТ PAYLOAD ЗА MONGODB
      const payload = {
        request_id: requestId,
        responder_id: user!.id,
        saved_property_id: selectedProp._id,
        price: selectedProp.price,
        property_type: selectedProp.property_type,
        rental_type: selectedProp.rental_type,
        size_sqm: selectedProp.size_sqm,
        bedrooms: selectedProp.bedrooms,
        furnished: selectedProp.furnished,
        approx_location: selectedProp.approx_location,
        description: selectedProp.description,
        custom_note: customNote.trim() || null,
        location: selectedProp.location, // Взимаме координатите директно от запазения имот
        photos: selectedProp.photos,     // Взимаме снимките директно от запазения имот
        contact_status: "pending"
      };

      const res = await fetch(`${API_URL}/offers`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Грешка при изпращане на предложението");

      toast.success("Предложението е изпратено успешно!");
      navigate(`/requests/${requestId}`);
    } catch (error) {
      toast.error(errorMessage(error, "Грешка при изпращане"));
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loadingData) return <div className="flex min-h-screen items-center justify-center"><span className="text-muted-foreground">Зареждане...</span></div>;

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <button onClick={backNav.goBack} className="flex items-center gap-2 text-muted-foreground">
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm font-medium">{backNav.label}</span>
          </button>
          <span className="text-sm font-bold">HomeMatch<span className="text-primary">.bg</span></span>
          <div className="w-16" />
        </div>
      </nav>

      <main className="mx-auto max-w-2xl px-4 py-6 pb-24 space-y-4">
        <div>
          <h1 className="text-xl font-bold">Изпрати предложение</h1>
          {requestCity && <p className="text-sm text-muted-foreground">За заявка в <span className="font-medium text-foreground">{requestCity}</span></p>}
        </div>

        <div className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${limitReached ? "border-destructive/30 bg-destructive/5" : "border-border bg-muted/30"}`}>
          <Info className="h-4 w-4 shrink-0" />
          <span>
            {limitReached
              ? "Достигнахте дневния лимит от 5 предложения. Опитайте отново утре."
              : `Оставащи предложения за днес: ${remaining} от ${MAX_DAILY_RESPONSES}`}
          </span>
        </div>

        {!limitReached && (
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold">Изберете имот от вашето портфолио</label>
                <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="-- Изберете запазен имот --" />
                  </SelectTrigger>
                  <SelectContent>
                    {myProperties.map((prop) => (
                      <SelectItem key={prop._id} value={prop._id}>
                        {prop.price} € - {prop.approx_location} ({prop.size_sqm}м²)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-2">
                <Button 
                  variant="outline" 
                  className="w-full gap-2 border-dashed border-2 hover:border-primary/50"
                  onClick={() => navigate(`/properties/new?returnTo=/requests/${requestId}/respond`)}
                >
                  <Home className="h-4 w-4" /> Нямате подходящ? Създайте нов имот (с Карта)
                </Button>
              </div>

              {selectedPropertyId && (
                <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-sm text-green-700 space-y-1">
                  <p className="font-bold flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Имотът е готов</p>
                  <p className="text-xs">Снимките и точните координати (Geospatial) ще бъдат прикачени автоматично към офертата.</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {!limitReached && (
          <Card>
            <CardContent className="p-5 space-y-2">
              <label className="text-sm font-bold">Лично съобщение към клиента (по избор)</label>
              <Textarea 
                placeholder="Напр. Този имот отговаря перфектно на вашите изисквания, защото..." 
                value={customNote} 
                onChange={(e) => setCustomNote(e.target.value)} 
                rows={3} 
              />
            </CardContent>
          </Card>
        )}

        {!limitReached && (
          <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background p-4">
            <Button className="w-full gap-2 max-w-2xl mx-auto flex" size="lg" onClick={handleSubmit} disabled={submitting || !selectedPropertyId}>
              {submitting ? "Изпращане..." : "Изпрати предложение"} <Send className="h-4 w-4" />
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default SubmitResponse;

