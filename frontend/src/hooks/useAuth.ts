

import { useState } from "react";
import { login, signup } from "../service/authService";
import type { AuthMode } from "../types/chat";

export function useAuth(onLogin: () => void) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError("");
    setPassword("");
    setConfirm("");
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      if (mode === "login") {
        await login({ user, password });
        onLogin();
      } else {
        await signup({ user, password, confirm });
        switchMode("login");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocorreu um erro. Tente novamente."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return {
    mode,
    user,
    password,
    confirm,
    showPassword,
    submitting,
    error,
    setUser,
    setPassword,
    setConfirm,
    setShowPassword,
    switchMode,
    submit,
  };
}
