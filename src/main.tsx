import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import App from "./App.tsx";
import { AuthCallback } from "./components/screens/AuthCallback";
import { LoginScreen } from "./components/screens/Login";
import { SignupScreen } from "./components/screens/Signup";
import { WelcomeScreen } from "./components/screens/Welcome";
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
          <Route path="/app" element={<App />} />
          <Route path="/app/items" element={<ItemsScreen />} />
          <Route path="/*" element={<App />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
