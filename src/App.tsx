import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { lazy, Suspense } from "react";
import ScrollToTop from "@/components/ScrollToTop";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";

// Lazy load secondary pages
const NewRequest = lazy(() => import("./pages/NewRequest"));
const MyRequests = lazy(() => import("./pages/MyRequests"));
const RequestDetail = lazy(() => import("./pages/RequestDetail"));
const BrowseRequests = lazy(() => import("./pages/BrowseRequests"));
const SubmitResponse = lazy(() => import("./pages/SubmitResponse"));
const MyResponses = lazy(() => import("./pages/MyResponses"));
const MyProperties = lazy(() => import("./pages/MyProperties"));
const SavedPropertyForm = lazy(() => import("./pages/SavedPropertyForm"));
const Notifications = lazy(() => import("./pages/Notifications"));
const BrokerOfferDetail = lazy(() => import("./pages/BrokerOfferDetail"));
const MyReceivedOffers = lazy(() => import("./pages/MyReceivedOffers"));
const SeekerOfferDetail = lazy(() => import("./pages/SeekerOfferDetail"));
const Profile = lazy(() => import("./pages/Profile"));

const queryClient = new QueryClient();

const LazyFallback = () => (
  <div className="flex min-h-screen items-center justify-center">
    <span className="text-muted-foreground">Зареждане...</span>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ScrollToTop />
          <div id="app-scroll" data-scroll-container="app" className="h-screen overflow-y-auto">
            <Suspense fallback={<LazyFallback />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/requests/new" element={<NewRequest />} />
                <Route path="/requests/:id/edit" element={<NewRequest />} />
                <Route path="/requests/:id/respond" element={<SubmitResponse />} />
                <Route path="/my-requests" element={<MyRequests />} />
                <Route path="/requests/:id" element={<RequestDetail />} />
                <Route path="/browse" element={<BrowseRequests />} />
                <Route path="/my-responses" element={<MyResponses />} />
                <Route path="/properties" element={<MyProperties />} />
                <Route path="/properties/new" element={<SavedPropertyForm />} />
                <Route path="/properties/:id/edit" element={<SavedPropertyForm />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/offers/:requestId" element={<BrokerOfferDetail />} />
                <Route path="/my-received-offers" element={<MyReceivedOffers />} />
                <Route path="/offer/:responseId" element={<SeekerOfferDetail />} />
                <Route path="/profile" element={<Profile />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </div>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
