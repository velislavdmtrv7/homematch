import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight,
  BedDouble,
  Building2,
  CheckCircle2,
  Clock3,
  Eye,
  Home,
  MapPin,
  MessageSquareText,
  PhoneOff,
  Ruler,
  Search,
  Send,
  ShieldCheck,
  Star,
} from "lucide-react";
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
      const hasProviderRole = profile?.role === "broker" || profile?.role === "owner" || !!profile?.provider_type;
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

  const valuePoints = [
    {
      icon: <PhoneOff className="h-4 w-4" />,
      title: "Контрол върху контакта",
      text: "Телефонът остава скрит, докато не одобрите конкретна оферта.",
    },
    {
      icon: <ShieldCheck className="h-4 w-4" />,
      title: "По-малко шум",
      text: "Предлагащите виждат ясна заявка и отговарят само ако имат подходящ имот.",
    },
    {
      icon: <Star className="h-4 w-4" />,
      title: "Репутация за добрите",
      text: "Отзивите помагат коректните брокери и собственици да изпъкнат.",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 transition-opacity hover:opacity-75">
            <Home className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              HomeMatch<span className="text-primary">.bg</span>
            </span>
          </button>
          <div className="flex items-center gap-2">
            {user ? (
              <Button onClick={() => navigate("/dashboard")}>Табло</Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate("/auth?mode=login")}>
                  Вход
                </Button>
                <Button onClick={() => navigate("/auth?mode=signup")}>Регистрация</Button>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        <section className="border-b border-border/50 bg-[linear-gradient(180deg,hsl(var(--background)),hsl(var(--muted)/0.45))]">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 md:grid-cols-[1.02fr_0.98fr] md:items-center md:py-16">
            <div>
              <Badge className="mb-5 border-primary/20 bg-primary/10 text-primary hover:bg-primary/10">
                MVP тестова версия
              </Badge>
              <h1 className="max-w-xl text-4xl font-bold leading-tight tracking-tight md:text-5xl">
                Платформа за наеми по заявка
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
                Опишете какво търсите веднъж. Собственици и брокери изпращат подходящи предложения, а вие избирате кога да дадете контакт.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" className="gap-2 px-7" onClick={handleSeeker}>
                  <Search className="h-5 w-5" />
                  Пусни заявка
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" className="gap-2 px-7" onClick={handleProvider}>
                  <Building2 className="h-5 w-5" />
                  Предложи имот
                </Button>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {valuePoints.map((item) => (
                  <div key={item.title} className="rounded-lg border border-border/60 bg-background p-3">
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">{item.icon}</span>
                      {item.title}
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="md:pl-4">
              <div className="rounded-lg border border-border/70 bg-background p-4 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">Активна заявка</p>
                    <h2 className="text-xl font-bold">Двустаен под наем в София</h2>
                  </div>
                  <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">3 оферти</Badge>
                </div>

                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <div className="flex items-center gap-2 rounded-md bg-muted/60 p-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    Лозенец, Изток, Център
                  </div>
                  <div className="flex items-center gap-2 rounded-md bg-muted/60 p-2">
                    <BedDouble className="h-4 w-4 text-primary" />
                    2 стаи, обзаведен
                  </div>
                  <div className="flex items-center gap-2 rounded-md bg-muted/60 p-2">
                    <Ruler className="h-4 w-4 text-primary" />
                    от 55 кв.м.
                  </div>
                  <div className="flex items-center gap-2 rounded-md bg-muted/60 p-2 font-semibold">
                    <Clock3 className="h-4 w-4 text-primary" />
                    до 900 EUR/месец
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <Badge variant="outline" className="border-sky-300 bg-white text-sky-800">
                      Нова оферта
                    </Badge>
                    <span className="text-lg font-bold text-sky-950">780 EUR</span>
                  </div>
                  <h3 className="font-semibold text-sky-950">Апартамент до метростанция</h3>
                  <p className="mt-1 text-sm leading-relaxed text-sky-900/80">
                    Собственикът предлага реален имот, снимки и кратка бележка. Контактът се отключва само след одобрение.
                  </p>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <Button size="sm" className="gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Одобри контакт
                    </Button>
                    <Button size="sm" variant="outline">
                      Виж детайли
                    </Button>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                <Eye className="h-4 w-4 shrink-0 text-amber-700" />
                Първо виждате предложението. После решавате дали да говорите с човека отсреща.
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 md:py-16">
          <div className="mx-auto max-w-6xl px-4">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-bold md:text-3xl">Обърнат процес, по-малко губене на време</h2>
              <p className="mt-3 text-muted-foreground">
                HomeMatch не започва с хиляди обяви. Започва с намерението на човека, който търси жилище.
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                {
                  icon: <Send className="h-5 w-5" />,
                  title: "Една ясна заявка",
                  text: "Град, квартали, бюджет, стаи, обзавеждане и важни условия на едно място.",
                },
                {
                  icon: <Building2 className="h-5 w-5" />,
                  title: "Конкретни предложения",
                  text: "Брокери и собственици отговарят със съществуващ имот, цена и кратко обяснение.",
                },
                {
                  icon: <ShieldCheck className="h-5 w-5" />,
                  title: "Контакт след избор",
                  text: "Търсещият преценява офертата преди да сподели телефон или да продължи разговора.",
                },
              ].map((item) => (
                <Card key={item.title} className="border-border/70">
                  <CardContent className="p-5">
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      {item.icon}
                    </div>
                    <h3 className="font-bold">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-border/50 bg-muted/35 py-12 md:py-16">
          <div className="mx-auto grid max-w-6xl gap-4 px-4 md:grid-cols-2">
            <Card className="border-primary/20 bg-background">
              <CardContent className="p-6">
                <Badge className="mb-4 bg-primary text-primary-foreground">За търсещи</Badge>
                <h2 className="text-2xl font-bold">По-малко скролване, повече релевантни оферти</h2>
                <p className="mt-3 leading-relaxed text-muted-foreground">
                  Заявката ви работи като филтър за пазара. Вместо да пишете на десетки обяви, получавате предложения от хора, които вече знаят основните ви условия.
                </p>
                <div className="mt-5 space-y-2 text-sm">
                  <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Телефонът не е публичен.</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Офертите са вързани към конкретна заявка.</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Можете да откажете оферта без последващ натиск.</div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-sky-200 bg-background">
              <CardContent className="p-6">
                <Badge variant="outline" className="mb-4 border-sky-300 bg-sky-50 text-sky-800">За предлагащи</Badge>
                <h2 className="text-2xl font-bold">По-добри клиенти за коректните брокери и собственици</h2>
                <p className="mt-3 leading-relaxed text-muted-foreground">
                  Вместо студени обаждания и неясен интерес, виждате активни заявки с бюджет и предпочитания. Ако имотът пасва, изпращате директна оферта.
                </p>
                <div className="mt-5 space-y-2 text-sm">
                  <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-sky-700" /> По-малко разговори без шанс за сделка.</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-sky-700" /> Профил и отзиви изграждат доверие.</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-sky-700" /> Може да запазвате имоти и да ги предлагате бързо.</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="py-12 md:py-16">
          <div className="mx-auto max-w-6xl px-4">
            <div className="grid gap-8 md:grid-cols-[0.85fr_1.15fr] md:items-start">
              <div>
                <h2 className="text-2xl font-bold md:text-3xl">Какво трябва да се усеща различно</h2>
                <p className="mt-3 leading-relaxed text-muted-foreground">
                  MVP версията трябва да докаже, че заявката спестява време и намалява лошите практики, без да прави процеса сложен.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { icon: <Search className="h-4 w-4" />, title: "По-малко търсене", text: "Потребителят не започва от списък с обяви, а от собствените си критерии." },
                  { icon: <PhoneOff className="h-4 w-4" />, title: "По-малко натиск", text: "Контактът се дава след избор, което намалява нежеланите обаждания." },
                  { icon: <MessageSquareText className="h-4 w-4" />, title: "Повече контекст", text: "Всяка оферта идва като отговор на конкретна нужда, не като случайна обява." },
                  { icon: <Star className="h-4 w-4" />, title: "Повече доверие", text: "Добрата репутация става видима и полезна за следващите потребители." },
                ].map((item) => (
                  <div key={item.title} className="rounded-lg border border-border/70 bg-background p-4">
                    <div className="mb-2 flex items-center gap-2 font-semibold">
                      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-primary">{item.icon}</span>
                      {item.title}
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/50 py-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 HomeMatch.bg</span>
          <span>Наеми по заявка за българския пазар</span>
        </div>
      </footer>
    </div>
  );
};

export default Index;
