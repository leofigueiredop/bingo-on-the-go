import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Deposits from "./pages/Deposits";
import BingoRoom from "./pages/BingoRoom";
import AdminPanel from "./pages/AdminPanel";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={
              <ProtectedRoute requireAuth={false}>
                <Auth />
              </ProtectedRoute>
            } />
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="profile" element={<Profile />} />
              <Route path="deposits" element={<Deposits />} />
              <Route path="bingo/:roomId" element={<BingoRoom />} />
              <Route path="admin" element={<AdminPanel />} />
              <Route path="history" element={<div className="p-6"><h1>Histórico em desenvolvimento</h1></div>} />
              <Route path="settings" element={<div className="p-6"><h1>Configurações em desenvolvimento</h1></div>} />
              <Route path="admin/users" element={<div className="p-6"><h1>Gestão de usuários em desenvolvimento</h1></div>} />
              <Route path="admin/finance" element={<div className="p-6"><h1>Gestão financeira em desenvolvimento</h1></div>} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
