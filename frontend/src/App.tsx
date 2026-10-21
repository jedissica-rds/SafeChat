
import { useState } from "react";
import LoginScreen from "./pages/loginScreen";
import ChatScreen from "./pages/chatScreen";
import type { Screen } from "./types/chat";

export default function App() {
  const [screen, setScreen] = useState<Screen>("login");

  return screen === "login" ? (
    <LoginScreen onLogin={() => setScreen("chat")} />
  ) : (
    <ChatScreen onLogout={() => setScreen("login")} />
  );
}
