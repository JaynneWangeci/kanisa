import { Routes, Route } from "react-router-dom";
import { LangProvider } from "./context/LanguageContext";
import HomePage from "./pages/HomePage";
import JackPortfolio from "./pages/JackPortfolio";
import AdminLogin from "./pages/AdminLogin";
import AdminSetup from "./pages/AdminSetup";
import AdminDashboard from "./pages/AdminDashboard";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

export default function App() {
  return (
    <LangProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/jack" element={<JackPortfolio />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/forgot-password" element={<ForgotPassword />} />
        <Route path="/admin/reset-password" element={<ResetPassword />} />
        <Route path="/admin/setup" element={<AdminSetup />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
      </Routes>
    </LangProvider>
  );
}
