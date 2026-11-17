import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useBackNavigation } from "@/hooks/useBackNavigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import NeighborhoodSelect from "@/components/NeighborhoodSelect";
import {
  ArrowLeft, ArrowRight, Check, MapPin, BedDouble,
  Calendar, PawPrint, Building2, FileText, AlertTriangle
} from "lucide-react";

type PropertyType = "apartment" | "house" | "either";
type RentalType = "long_term" | "short_term" | "flexible";
type FurnishedType = "yes" | "no" | "flexible";
type PetsType = "yes" | "no" | "flexible";
type AllowBrokersType = "both" | "owners_only" | "yes";

import { API_URL } from "@/lib/api";
import { errorMessage } from "@/types/api";

const STEPS = [
  { label: "Основни", icon: <MapPin className="h-4 w-4" /> },
  { label: "Детайли", icon: <BedDouble className="h-4 w-4" /> },
  { label: "Описание", icon: <FileText className="h-4 w-4" /> },
];

const CITIES = [
  "София", "Пловдив", "Варна", "Бургас", "Русе", "Стара Загора",
  "Плевен", "Добрич", "Сливен", "Шумен", "Велико Търново", "Хасково",
  "Перник", "Ямбол", "Пазарджик", "Благоевград", "Враца", "Габрово",
  "Кюстендил", "Видин", "Монтана", "Кърджали", "Ловеч", "Разград",
  "Силистра", "Смолян", "Търговище",
];

const STORAGE_KEY = "homematch_new_request_draft";

interface FormData {
  city: string;
  propertyType: PropertyType;
  rentalType: RentalType;
  budgetMin: string;
  budgetMax: string;
  bedrooms: string;
  minAreaSqm: string;
  furnished: FurnishedType;
  moveInDate: string;
  pets: PetsType;
  allowBrokers: AllowBrokersType;
  neighborhoods: string[];
  locationPreferences: string;
  description: string;
  notes: string;
}

const defaultFormData: FormData = {
  city: "",
  propertyType: "apartment",
  rentalType: "long_term",
  budgetMin: "",
  budgetMax: "",
  bedrooms: "1",
  minAreaSqm: "",
  furnished: "flexible",
  moveInDate: "",
  pets: "no",
  allowBrokers: "both",
  neighborhoods: [],
  locationPreferences: "",
  description: "",
  notes: "",
};

const loadDraft = (): FormData => {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) return { ...defaultFormData, ...JSON.parse(saved) };
  } catch {
    // Повреден запис в sessionStorage: започваме с празна форма.
  }
  return defaultFormData;
};

const NewRequest = () => {
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id: string }>();
  const location = useLocation();
  const isEditing = !!editId;
  
  const backNav = useBackNavigation({
    fallbackLabel: "Назад",
    fallbackPath: isEditing ? `/requests/${editId}` : "/dashboard",
  });

  const { user, profile, loading } = useAuth();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(isEditing);

  const [form, setForm] = useState<FormData>(isEditing ? defaultFormData : loadDraft);

  // Зареждане на съществуваща заявка при редакция
  useEffect(() => {
    if (!isEditing || !user || !editId) return;
    const loadRequest = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_URL}/requests/${editId}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          // Проверяваме дали текущият потребител е собственик
          if (data.seeker_id !== user.id) {
            toast.error("Нямате права за редакция на тази заявка");
            navigate("/my-requests");
            return;
          }

          setForm({
            city: data.city || "",
            propertyType: data.property_type || "apartment",
            rentalType: data.rental_type || "long_term",
            budgetMin: data.budget?.min ? String(data.budget.min) : "",
            budgetMax: data.budget?.max ? String(data.budget.max) : "",
            bedrooms: data.specs?.bedrooms ? String(data.specs.bedrooms) : "1",
            minAreaSqm: data.specs?.min_area_sqm ? String(data.specs.min_area_sqm) : "",
            furnished: data.specs?.furnished || "flexible",
            moveInDate: data.move_in_date ? new Date(data.move_in_date).toISOString().split("T")[0] : "",
            pets: data.specs?.pets || "no",
            allowBrokers: data.allow_brokers || "both",
            neighborhoods: data.neighborhoods || [],
            locationPreferences: data.location_preferences || "",
            description: data.description || "",
            notes: data.notes || "",
          });
        } else {
          toast.error("Заявката не е намерена");
          navigate("/my-requests");
        }
      } catch (err) {
        toast.error("Възникна грешка при зареждане");
        navigate("/my-requests");
      } finally {
        setLoadingEdit(false);
      }
    };
    loadRequest();
  }, [isEditing, editId, user]);

  useEffect(() => {
    if (!isEditing) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    }
  }, [form, isEditing]);

  const updateField = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  if (!loading && !user) {
    navigate("/auth");
    return null;
  }

  const validateStep = (s: number): string | null => {
    if (s === 0) {
      if (!form.city) return "Изберете град";
      if (!form.budgetMin || !form.budgetMax) return "Въведете бюджет";
      if (Number(form.budgetMin) >= Number(form.budgetMax)) return "Минималният бюджет трябва да е по-малък от максималния";
      if (Number(form.budgetMin) < 0) return "Бюджетът не може да е отрицателен";
    }
    if (s === 2) {
      if (!form.description.trim() || form.description.trim().length < 20) return "Описанието трябва да е поне 20 символа";
    }
    return null;
  };

  const nextStep = () => {
    const err = validateStep(step);
    if (err) { toast.error(err); return; }
    setStep((s) => Math.min(s + 1, 2));
  };

  const prevStep = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    const err = validateStep(2);
    if (err) { toast.error(err); return; }

    setSubmitting(true);
    try {
      const payload = {
        city: form.city,
        property_type: form.propertyType,
        rental_type: form.rentalType,
        budget: {
          min: Number(form.budgetMin),
          max: Number(form.budgetMax),
        },
        specs: {
          bedrooms: Number(form.bedrooms),
          min_area_sqm: form.minAreaSqm ? Number(form.minAreaSqm) : undefined,
          furnished: form.furnished,
          pets: form.pets,
        },
        move_in_date: form.moveInDate || null,
        allow_brokers: form.allowBrokers,
        description: form.description.trim(),
        notes: form.notes.trim() || null,
        neighborhoods: form.neighborhoods.length > 0 ? form.neighborhoods : [],
        location_preferences: form.locationPreferences.trim() || null,
      };

      const token = localStorage.getItem("token");
      
      if (isEditing) {
        const res = await fetch(`${API_URL}/requests/${editId}`, {
          method: "PUT", // ВАЖНО: Редакция!
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Грешка при обновяване");
        
        toast.success("Заявката е обновена успешно!");
        navigate(`/requests/${editId}`);
      } else {
        const res = await fetch(`${API_URL}/requests`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({
            ...payload,
            seeker_id: user!.id,
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // +30 дни
          }),
        });
        if (!res.ok) throw new Error("Грешка при създаване");

        sessionStorage.removeItem(STORAGE_KEY);
        toast.success("Заявката е публикувана успешно!");
        navigate("/my-requests");
      }
    } catch (error) {
      toast.error(errorMessage(error, "Грешка при публикуване"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingEdit) {
    return <div className="flex min-h-screen items-center justify-center"><span className="text-muted-foreground">Зареждане...</span></div>;
  }

  const progressValue = ((step + 1) / 3) * 100;

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <button onClick={backNav.goBack} className="flex items-center gap-2 text-muted-foreground">
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm font-medium">{backNav.label}</span>
          </button>
          <span className="text-sm font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            HomeMatch<span className="text-primary">.bg</span>
          </span>
          <div className="w-16" />
        </div>
      </nav>

      <main className="mx-auto max-w-2xl px-4 py-6 pb-24">
        <h1 className="mb-1 text-xl font-bold md:text-2xl">
          {isEditing ? "Редактиране на заявка" : "Нова заявка за жилище"}
        </h1>
        <p className="mb-6 text-sm text-muted-foreground">
          {isEditing ? "Променете данните и запазете" : "Опишете какво търсите и получете оферти"}
        </p>

        {/* Progress */}
        <div className="mb-6">
          <Progress value={progressValue} className="mb-3 h-2" />
          <div className="flex justify-between">
            {STEPS.map((s, i) => (
              <button
                key={i}
                onClick={() => { if (i < step) setStep(i); }}
                className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                  i === step ? "text-primary" : i < step ? "text-foreground cursor-pointer" : "text-muted-foreground"
                }`}
              >
                <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                  i < step ? "bg-primary text-primary-foreground" : i === step ? "border-2 border-primary text-primary" : "border border-muted-foreground/30 text-muted-foreground"
                }`}>
                  {i < step ? <Check className="h-3 w-3" /> : i + 1}
                </div>
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Step 1 */}
        {step === 0 && (
          <Card className="border-border/50">
            <CardContent className="space-y-5 p-5">
              <div className="flex items-center gap-2 text-primary">
                <MapPin className="h-5 w-5" />
                <h2 className="text-lg font-bold">Основни параметри</h2>
              </div>
              <Separator />

              <div className="space-y-2">
                <Label>Град *</Label>
                <Select value={form.city} onValueChange={(v) => { updateField("city", v); updateField("neighborhoods", []); }}>
                  <SelectTrigger><SelectValue placeholder="Изберете град" /></SelectTrigger>
                  <SelectContent>
                    {CITIES.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Тип имот *</Label>
                <RadioGroup value={form.propertyType} onValueChange={(v) => updateField("propertyType", v as PropertyType)} className="grid grid-cols-3 gap-2">
                  <label className={`flex cursor-pointer items-center justify-center rounded-lg border p-3 text-center text-sm font-medium transition-colors ${form.propertyType === "apartment" ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/30"}`}>
                    <RadioGroupItem value="apartment" className="sr-only" /> Апартамент
                  </label>
                  <label className={`flex cursor-pointer items-center justify-center rounded-lg border p-3 text-center text-sm font-medium transition-colors ${form.propertyType === "house" ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/30"}`}>
                    <RadioGroupItem value="house" className="sr-only" /> Къща
                  </label>
                  <label className={`flex cursor-pointer items-center justify-center rounded-lg border p-3 text-center text-sm font-medium transition-colors ${form.propertyType === "either" ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/30"}`}>
                    <RadioGroupItem value="either" className="sr-only" /> Без значение
                  </label>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>Вид наем *</Label>
                <RadioGroup value={form.rentalType} onValueChange={(v) => updateField("rentalType", v as RentalType)} className="grid grid-cols-3 gap-2">
                  <label className={`flex cursor-pointer items-center justify-center rounded-lg border p-3 text-center text-sm font-medium transition-colors ${form.rentalType === "long_term" ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/30"}`}>
                    <RadioGroupItem value="long_term" className="sr-only" /> Дългосрочен
                  </label>
                  <label className={`flex cursor-pointer items-center justify-center rounded-lg border p-3 text-center text-sm font-medium transition-colors ${form.rentalType === "short_term" ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/30"}`}>
                    <RadioGroupItem value="short_term" className="sr-only" /> Краткосрочен
                  </label>
                  <label className={`flex cursor-pointer items-center justify-center rounded-lg border p-3 text-center text-sm font-medium transition-colors ${form.rentalType === "flexible" ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/30"}`}>
                    <RadioGroupItem value="flexible" className="sr-only" /> Гъвкав
                  </label>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>Бюджет (€/мес) *</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Input type="number" placeholder="Мин" value={form.budgetMin} onChange={(e) => updateField("budgetMin", e.target.value)} min={0} />
                  <Input type="number" placeholder="Макс" value={form.budgetMax} onChange={(e) => updateField("budgetMax", e.target.value)} min={0} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Брой стаи *</Label>
                <Select value={form.bedrooms} onValueChange={(v) => updateField("bedrooms", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["1", "2", "3", "4", "5"].map((n) => (
                      <SelectItem key={n} value={n}>{n} {Number(n) === 1 ? "стая" : "стаи"}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Минимална площ (м²) <span className="text-muted-foreground">(по избор)</span></Label>
                <Input type="number" placeholder="напр. 50" value={form.minAreaSqm} onChange={(e) => updateField("minAreaSqm", e.target.value)} min={0} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2 */}
        {step === 1 && (
          <Card className="border-border/50">
            <CardContent className="space-y-5 p-5">
              <div className="flex items-center gap-2 text-primary">
                <BedDouble className="h-5 w-5" />
                <h2 className="text-lg font-bold">Допълнителни детайли</h2>
              </div>
              <Separator />

              <div className="space-y-2">
                <Label>Обзавеждане *</Label>
                <RadioGroup value={form.furnished} onValueChange={(v) => updateField("furnished", v as FurnishedType)} className="grid grid-cols-3 gap-2">
                  <label className={`flex cursor-pointer items-center justify-center rounded-lg border p-3 text-center text-sm font-medium transition-colors ${form.furnished === "yes" ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/30"}`}>
                    <RadioGroupItem value="yes" className="sr-only" /> Обзаведен
                  </label>
                  <label className={`flex cursor-pointer items-center justify-center rounded-lg border p-3 text-center text-sm font-medium transition-colors ${form.furnished === "no" ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/30"}`}>
                    <RadioGroupItem value="no" className="sr-only" /> Необзаведен
                  </label>
                  <label className={`flex cursor-pointer items-center justify-center rounded-lg border p-3 text-center text-sm font-medium transition-colors ${form.furnished === "flexible" ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/30"}`}>
                    <RadioGroupItem value="flexible" className="sr-only" /> Без значение
                  </label>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /> Дата на нанасяне <span className="text-muted-foreground">(по избор)</span></Label>
                <Input type="date" value={form.moveInDate} onChange={(e) => updateField("moveInDate", e.target.value)} min={new Date().toISOString().split("T")[0]} />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><PawPrint className="h-4 w-4" /> Домашни любимци *</Label>
                <RadioGroup value={form.pets} onValueChange={(v) => updateField("pets", v as PetsType)} className="grid grid-cols-3 gap-2">
                  <label className={`flex cursor-pointer items-center justify-center rounded-lg border p-3 text-center text-sm font-medium transition-colors ${form.pets === "yes" ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/30"}`}>
                    <RadioGroupItem value="yes" className="sr-only" /> Да
                  </label>
                  <label className={`flex cursor-pointer items-center justify-center rounded-lg border p-3 text-center text-sm font-medium transition-colors ${form.pets === "no" ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/30"}`}>
                    <RadioGroupItem value="no" className="sr-only" /> Не
                  </label>
                  <label className={`flex cursor-pointer items-center justify-center rounded-lg border p-3 text-center text-sm font-medium transition-colors ${form.pets === "flexible" ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/30"}`}>
                    <RadioGroupItem value="flexible" className="sr-only" /> По договаряне
                  </label>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><Building2 className="h-4 w-4" /> Кой може да отговори? *</Label>
                <RadioGroup value={form.allowBrokers} onValueChange={(v) => updateField("allowBrokers", v as AllowBrokersType)} className="space-y-2">
                  <label className={`flex cursor-pointer items-center rounded-lg border p-3 text-sm font-medium transition-colors ${form.allowBrokers === "both" ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/30"}`}>
                    <RadioGroupItem value="both" className="mr-2" /> Всички (брокери и собственици)
                  </label>
                  <label className={`flex cursor-pointer items-center rounded-lg border p-3 text-sm font-medium transition-colors ${form.allowBrokers === "owners_only" ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/30"}`}>
                    <RadioGroupItem value="owners_only" className="mr-2" /> Само собственици
                  </label>
                  <label className={`flex cursor-pointer items-center rounded-lg border p-3 text-sm font-medium transition-colors ${form.allowBrokers === "yes" ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/30"}`}>
                    <RadioGroupItem value="yes" className="mr-2" /> Само брокери
                  </label>
                </RadioGroup>
              </div>

              <NeighborhoodSelect city={form.city} selected={form.neighborhoods} onChange={(n) => updateField("neighborhoods", n)} />

              <div className="space-y-2">
                <Label>Други предпочитания за локация <span className="text-muted-foreground">(по избор)</span></Label>
                <Input placeholder="напр. близо до метро, парк, училище" value={form.locationPreferences} onChange={(e) => updateField("locationPreferences", e.target.value)} maxLength={300} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3 */}
        {step === 2 && (
          <Card className="border-border/50">
            <CardContent className="space-y-5 p-5">
              <div className="flex items-center gap-2 text-primary">
                <FileText className="h-5 w-5" />
                <h2 className="text-lg font-bold">Описание и публикуване</h2>
              </div>
              <Separator />

              <div className="space-y-2">
                <Label>Описание на търсенето *</Label>
                <Textarea placeholder="Опишете какво търсите..." value={form.description} onChange={(e) => updateField("description", e.target.value)} rows={5} maxLength={2000} />
                <p className="text-xs text-muted-foreground">{form.description.length}/2000 символа (мин. 20)</p>
              </div>

              <div className="space-y-2">
                <Label>Допълнителни бележки <span className="text-muted-foreground">(по избор)</span></Label>
                <Textarea value={form.notes} onChange={(e) => updateField("notes", e.target.value)} rows={3} maxLength={1000} />
              </div>

              {/* Summary */}
              <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
                <h3 className="mb-3 text-sm font-bold">Преглед на заявката</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-muted-foreground">Град:</div><div className="font-medium">{form.city || "—"}</div>
                  <div className="text-muted-foreground">Бюджет:</div><div className="font-medium">{form.budgetMin} – {form.budgetMax} €/мес</div>
                  <div className="text-muted-foreground">Стаи:</div><div className="font-medium">{form.bedrooms}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mt-6 flex gap-3">
          {step > 0 && <Button variant="outline" onClick={prevStep} className="flex-1 gap-2"><ArrowLeft className="h-4 w-4" /> Назад</Button>}
          {step < 2 ? (
            <Button onClick={nextStep} className="flex-1 gap-2">Напред <ArrowRight className="h-4 w-4" /></Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting} className="flex-1 gap-2">
              {submitting ? (isEditing ? "Запазване..." : "Публикуване...") : (isEditing ? "Запази промените" : "Публикувай заявка")} <Check className="h-4 w-4" />
            </Button>
          )}
        </div>
      </main>
    </div>
  );
};

export default NewRequest;

