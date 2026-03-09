import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedApp } from "./components/ProtectedApp";
import { AuthCallback } from "./components/screens/AuthCallback";
import { LoginScreen } from "./components/screens/Login";
import { SignupScreen } from "./components/screens/Signup";
import { WelcomeScreen } from "./components/screens/Welcome";
import { OnboardingUsernameScreen } from "./components/screens/OnboardingUsername";
import { ItemsScreen } from "./components/screens/Items";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<WelcomeScreen />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/signup" element={<SignupScreen />} />
          <Route path="/onboarding/username" element={<OnboardingUsernameScreen />} />
          <Route path="/app" element={<ProtectedApp />} />
          <Route path="/app/items" element={<ItemsScreen />} />
          <Route path="/*" element={<ProtectedApp />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
