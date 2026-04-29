import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ArrowLeft, Phone, Mail, User, Check, Shield } from "lucide-react";

const API_URL = "http://localhost:5000/api";

const Profile = () => {
  const navigate = useNavigate();
  const { user, profile, loading, refreshProfile } = useAuth();

  const [phone, setPhone] = useState(profile?.phone || "");
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [saving, setSaving] = useState(false);

  // Phone verification flow state
  const [verificationStep, setVerificationStep] = useState<"idle" | "sent" | "verified">(
    profile?.phone ? "verified" : "idle"
  );
  const [verificationCode, setVerificationCode] = useState("");
  const [sendingCode, setSendingCode] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Зареждане...</div>
      </div>
    );
  }

  if (!user || !profile) {
    navigate("/auth");
    return null;
  }

  const roleLabels: Record<string, string> = {
    seeker: "Търсещ жилище",
    broker: "Брокер / Агенция",
    owner: "Частен собственик",
  };

  const formatE164 = (raw: string): string => {
    let cleaned = raw.replace(/[\s\-()]/g, "");
    if (cleaned.startsWith("00")) cleaned = "+" + cleaned.slice(2);
    if (!cleaned.startsWith("+")) cleaned = "+359" + cleaned.replace(/^0/, "");
    return cleaned;
  };

  // DEV MODE: В MongoDB средата ползваме Dev Mode, тъй като нямаме Supabase SMS интеграция.
  const DEV_PHONE_AUTO_CONFIRM = true;

  const handleSendCode = async () => {
    const formatted = formatE164(phone.trim());
    if (!/^\+\d{10,15}$/.test(formatted)) {
      toast.error("Моля, въведете валиден телефонен номер (напр. +359 88 123 4567)");
      return;
    }
    setPhone(formatted);
    setSendingCode(true);

    try {
      if (DEV_PHONE_AUTO_CONFIRM) {
        // Dev mode: skip OTP, save phone directly to MongoDB
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_URL}/auth/profile/${user.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ full_name: fullName, phone: formatted })
        });

        if (!res.ok) throw new Error("Грешка при запазване на телефона");

        const updatedData = await res.json();
        // Обновяваме localStorage с новите данни от сървъра
        localStorage.setItem("user", JSON.stringify(updatedData));
        
        setVerificationStep("verified");
        await refreshProfile();
        toast.success("Телефонът е запазен успешно!");
      } else {
        // Тук би стояла реална интеграция с Twilio/MessageBird
        setVerificationStep("sent");
        toast.success(`Кодът е изпратен на ${formatted}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Грешка при запазване. Опитайте отново.");
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode.trim()) {
      toast.error("Моля, въведете кода от SMS");
      return;
    }
    // Заглушка: Тук би ставало реалното валидиране, но ние ползваме DEV_PHONE_AUTO_CONFIRM
    setVerificationStep("verified");
    toast.success("Телефонът е потвърден успешно!");
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/auth/profile/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ full_name: fullName.trim(), phone: profile.phone })
      });

      if (!res.ok) throw new Error("Грешка при запазване");

      const updatedData = await res.json();
      localStorage.setItem("user", JSON.stringify(updatedData));
      
      await refreshProfile();
      toast.success("Профилът е обновен!");
    } catch (err: any) {
      toast.error(err.message || "Грешка при запазване");
    } finally {
      setSaving(false);
    }
  };

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

      <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        <h1 className="text-xl font-bold">Моят профил</h1>

        {/* Basic info */}
        <Card className="border-border/50">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center gap-2 text-primary">
              <User className="h-5 w-5" />
              <h2 className="text-lg font-bold">Лични данни</h2>
            </div>
            <Separator />

            <div className="space-y-2">
              <Label>Роля</Label>
              <Badge variant="secondary">{roleLabels[profile?.role || "seeker"]}</Badge>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">Пълно име</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Вашето име"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label>Имейл</Label>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{user.email}</span>
                <Badge variant="outline" className="gap-1 text-xs">
                  <Check className="h-3 w-3" /> Потвърден
                </Badge>
              </div>
            </div>

            <Button onClick={handleSaveProfile} disabled={saving} size="sm">
              {saving ? "Запазване..." : "Запази промените"}
            </Button>
          </CardContent>
        </Card>

        {/* Phone verification */}
        <Card className={`border-border/50 ${verificationStep === "verified" ? "border-primary/30" : ""}`}>
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center gap-2 text-primary">
              <Phone className="h-5 w-5" />
              <h2 className="text-lg font-bold">Телефонен номер</h2>
              {verificationStep === "verified" && (
                <Badge className="ml-auto gap-1 bg-primary/10 text-primary hover:bg-primary/10">
                  <Shield className="h-3 w-3" /> Потвърден
                </Badge>
              )}
            </div>
            <Separator />

            <p className="text-sm text-muted-foreground">
              Потвърденият телефон е необходим за публикуване на заявки. Номерът ви се споделя само след одобрение.
            </p>

            {verificationStep === "idle" && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="phone">Телефонен номер</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+359 88 123 4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    maxLength={20}
                  />
                </div>
                <Button onClick={handleSendCode} disabled={sendingCode} size="sm">
                  {sendingCode ? "Запазване..." : DEV_PHONE_AUTO_CONFIRM ? "Потвърди номер (Автоматично)" : "Изпрати код за потвърждение"}
                </Button>
              </div>
            )}

            {verificationStep === "sent" && (
              <div className="space-y-3">
                <p className="text-sm">
                  Код е изпратен на <strong>{phone}</strong>
                </p>
                <div className="space-y-2">
                  <Label htmlFor="code">Код за потвърждение</Label>
                  <Input
                    id="code"
                    placeholder="Въведете 4-цифрен код"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    maxLength={4}
                  />
                  <p className="text-xs text-muted-foreground">Въведете 6-цифрения код от SMS</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleVerifyCode} size="sm">Потвърди</Button>
                  <Button variant="ghost" size="sm" onClick={() => setVerificationStep("idle")}>
                    Промени номер
                  </Button>
                </div>
              </div>
            )}

            {verificationStep === "verified" && (
              <div className="flex items-center gap-2 rounded-lg bg-primary/10 p-3">
                <Check className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-primary">{profile?.phone || phone}</span>
                <Button variant="ghost" size="sm" className="ml-auto text-xs" onClick={() => setVerificationStep("idle")}>
                  Промени
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Profile;