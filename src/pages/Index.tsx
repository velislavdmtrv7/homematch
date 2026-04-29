import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Home, Building2, Search, ArrowRight, MapPin, BedDouble, Ruler, Shield, Star, ShieldCheck, Eye, Send } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const navigate = useNavigate();
  const { user, setActiveMode, profile } = useAuth();

  const handleSeeker = async () => {
    if (user) {
      await setActiveMode("seeker");
      navigate("/dashboard");
    } else {
      navigate("/auth?mode=signup");
    }
  };

  const handleProvider = async () => {
    if (user) {
      const hasProviderRole = profile?.role === "broker" || profile?.role === "owner" || !!(profile as any)?.provider_type;
      if (hasProviderRole) {
        await setActiveMode("provider");
        navigate("/dashboard");
      } else {
        navigate("/dashboard?addProvider=true");
      }
    } else {
      navigate("/auth?mode=signup");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Home className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              HomeMatch<span className="text-primary">.bg</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <Button onClick={() => navigate("/dashboard")}>Табло</Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate("/auth?mode=login")}>Вход</Button>
                <Button onClick={() => navigate("/auth?mode=signup")}>Регистрация</Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-16 md:py-28">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <Badge className="mb-6 bg-primary/10 text-primary hover:bg-primary/10 border-primary/20">
              🇧🇬 Платформа за наеми по заявка
            </Badge>
            <h1 className="mb-4 text-4xl font-bold leading-tight tracking-tight md:text-5xl">
              Намерете жилище без да търсите.
            </h1>
            <p className="mb-8 text-lg text-muted-foreground">
              Опишете нуждите си. Получете реални предложения.
            </p>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button size="lg" className="gap-2 px-8" onClick={handleSeeker}>
                <Search className="h-5 w-5" />
                Търся жилище
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="gap-2 px-8" onClick={handleProvider}>
                <Building2 className="h-5 w-5" />
                Предлагам имот
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Demo cards */}
      <section className="border-t border-border/40 py-14 md:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-10 text-center text-2xl font-bold md:text-3xl">
            Как изглежда на практика
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-6">
                <Badge className="mb-3 bg-primary text-primary-foreground">Заявка</Badge>
                <h3 className="mb-2 text-lg font-bold">Двустаен в София</h3>
                <div className="space-y-1.5 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Лозенец / Изток</div>
                  <div className="flex items-center gap-2"><BedDouble className="h-4 w-4" /> 2 стаи • Обзаведен</div>
                  <div className="font-semibold text-foreground">600 – 900 €/мес</div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-border/40">
              <div className="h-32 bg-muted flex items-center justify-center">
                <Home className="h-8 w-8 text-muted-foreground/30" />
              </div>
              <CardContent className="p-6">
                <div className="mb-2 flex items-center justify-between">
                  <Badge variant="outline">Оферта</Badge>
                  <span className="text-lg font-bold text-primary">780 €/мес</span>
                </div>
                <div className="mb-2 flex gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><BedDouble className="h-3 w-3" /> 2 стаи</span>
                  <span className="flex items-center gap-1"><Ruler className="h-3 w-3" /> 65 м²</span>
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> до метро</span>
                </div>
                <p className="text-sm text-muted-foreground">Обзаведен, нови уреди, тераса. 5 мин от метро.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Why HomeMatch */}
      <section className="border-t border-border/40 bg-primary/5 py-14 md:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-10 text-center text-2xl font-bold md:text-3xl">
            Защо HomeMatch е по-удобен?
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: <Send className="h-6 w-6" />, title: "Публикувай веднъж", desc: "Създайте една заявка и получавайте предложения от множество наемодатели." },
              { icon: <ShieldCheck className="h-6 w-6" />, title: "Контрол върху контакта", desc: "Телефонът ви се споделя само след ваше одобрение." },
              { icon: <Eye className="h-6 w-6" />, title: "Виждате кой ви пише", desc: "Брокер, агенция или частен собственик — ясно от първия момент." },
              { icon: <Shield className="h-6 w-6" />, title: "По-лесно от стандартното", desc: "Без безкрайно скролване на обяви. Офертите идват при вас." },
            ].map((item, i) => (
              <div key={i} className="rounded-xl border border-border/40 bg-background p-5 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  {item.icon}
                </div>
                <h3 className="mb-1 text-sm font-bold">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border/40 py-14 md:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-10 text-center text-2xl font-bold md:text-3xl">Как работи</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { step: "1", title: "Опишете", desc: "Какво търсите — град, бюджет, стаи.", icon: <Search className="h-5 w-5" /> },
              { step: "2", title: "Получете оферти", desc: "Собственици и брокери ви пишат.", icon: <Building2 className="h-5 w-5" /> },
              { step: "3", title: "Изберете", desc: "Одобрете контакт и се свържете.", icon: <Star className="h-5 w-5" /> },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-4 rounded-lg bg-background p-5 border border-border/40">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {item.icon}
                </div>
                <div>
                  <h3 className="font-bold">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-6">
        <div className="mx-auto max-w-6xl px-4 text-center text-xs text-muted-foreground">
          © 2026 HomeMatch.bg
        </div>
      </footer>
    </div>
  );
};

export default Index;
