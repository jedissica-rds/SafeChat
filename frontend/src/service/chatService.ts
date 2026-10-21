
import type { Message } from "../types/chat";

export function createMessage(text: string): Message {
  return {
    id: Date.now(),
    text: text.trim(),
    mine: true,
    time: new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    status: "sent",
  };
}

export function updateMessageStatus(
  messages: Message[],
  messageId: number,
  status: Message["status"]
): Message[] {
  return messages.map((message) =>
    message.id === messageId
      ? { ...message, status }
      : message
  );
}
