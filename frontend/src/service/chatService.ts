import type { Message } from "../types/chat";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);

    throw new Error(
      error?.message ?? "Não foi possível concluir a requisição."
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export interface Chat {
  id: number | string;
  [key: string]: unknown;
}

export interface CreateChatData {
  [key: string]: unknown;
}

export interface SendMessageData {
  chatId: number | string;
  text: string;
  [key: string]: unknown;
}

// POST /api/chats
export async function createChat(
  data: CreateChatData
): Promise<Chat> {
  return request<Chat>("/api/chats", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// GET /api/chats
export async function getChats(): Promise<Chat[]> {
  return request<Chat[]>("/api/chats");
}

// POST /api/messages
export async function sendMessage(
  data: SendMessageData
): Promise<Message> {
  return request<Message>("/api/messages", {
    method: "POST",
    body: JSON.stringify({
      ...data,
      text: data.text.trim(),
    }),
  });
}

// GET /api/messages
export async function getMessages(
  chatId?: number | string
): Promise<Message[]> {
  const query = chatId !== undefined
    ? `?chatId=${encodeURIComponent(String(chatId))}`
    : "";

  return request<Message[]>(`/api/messages${query}`);
}

// PATCH /api/messages/{id}/status
export async function updateMessageStatusOnServer(
  messageId: number | string,
  status: Message["status"]
): Promise<Message> {
  return request<Message>(
    `/api/messages/${encodeURIComponent(String(messageId))}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }
  );
}

// Mantém a criação local de mensagens, útil para pré-visualização.
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

// Atualiza o estado local das mensagens.
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