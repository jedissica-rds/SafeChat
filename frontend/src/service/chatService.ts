
import { request } from "./Http";

interface ApiResponse<T> {
  status: string;
  code: string;
  message: string;
  data: T;
}

export interface Chat {
  id: string;
  createdAt: string;
  contact: {
    id: string;
    username: string;
    name: string;
    publicKey: string;
  };
}

export interface StoredMessage {
  id: string;
  chatId: string;
  fromId: string;
  toId: string;
  ciphertext: string;
  iv: string;
  hmac: string;
  keyDerivationSalt: string;
  wrappedSessionKeyFrom: string;
  wrappedSessionKeyTo: string;
  sentAt: string;
  seq: number;
  status: "stored" | "delivered" | "read";
}

export interface SendMessageData {
  id: string;
  chatId: string;
  wrappedSessionKeyFrom: string;
  wrappedSessionKeyTo: string;
  iv: string;
  keyDerivationSalt: string;
  ciphertext: string;
  hmac: string;
  sentAt: string;
}

export async function getChats(): Promise<Chat[]> {
  const response = await request<ApiResponse<Chat[]>>("/api/chats");
  return response.data;
}

export async function createChat(data: {
  username: string;
}): Promise<Chat> {
  const response = await request<ApiResponse<Chat>>("/api/chats", {
    method: "POST",
    body: JSON.stringify(data),
  });

  return response.data;
}

export async function getMessages(
  chatId: string,
): Promise<StoredMessage[]> {
  const response = await request<ApiResponse<StoredMessage[]>>(
    `/api/messages?chatId=${encodeURIComponent(chatId)}`,
  );

  return response.data;
}

export async function sendMessage(
  data: SendMessageData,
): Promise<StoredMessage> {
  const response = await request<ApiResponse<StoredMessage>>(
    "/api/messages",
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );

  return response.data;
}
