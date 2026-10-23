import { request } from "./Http";

/* -------------------------------------------------------------------------- */
/* Tipos                                                                      */
/* -------------------------------------------------------------------------- */

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
  fromId: string;
  ciphertext: string;
  iv: string;
  hmac: string;
  wrappedSessionKeyFrom: string;
  wrappedSessionKeyTo: string;
  sentAt: string;
  status: string;
}

export interface SendMessageData {
  id: string;
  chatId: string;
  wrappedSessionKeyFrom: string;
  wrappedSessionKeyTo: string;
  iv: string;
  ciphertext: string;
  hmac: string;
  sentAt: string;
}

/* -------------------------------------------------------------------------- */
/* Conversas                                                                  */
/* -------------------------------------------------------------------------- */

// GET /api/chats
export async function getChats(): Promise<Chat[]> {
  const response = await request<ApiResponse<Chat[]>>("/api/chats");
  return response.data;
}

// POST /api/chats
export async function createChat(data: { username: string }): Promise<Chat> {
  const response = await request<ApiResponse<Chat>>("/api/chats", {
    method: "POST",
    body: JSON.stringify(data),
  });

  return response.data;
}

/* -------------------------------------------------------------------------- */
/* Mensagens                                                                  */
/* -------------------------------------------------------------------------- */

// GET /api/messages?chatId={chatId}
export async function getMessages(chatId: string): Promise<StoredMessage[]> {
  const response = await request<ApiResponse<StoredMessage[]>>(
    `/api/messages?chatId=${encodeURIComponent(chatId)}`
  );

  return response.data;
}

// POST /api/messages  (a mensagem já chega criptografada)
export async function sendMessage(
  data: SendMessageData
): Promise<StoredMessage> {
  const response = await request<ApiResponse<StoredMessage>>("/api/messages", {
    method: "POST",
    body: JSON.stringify(data),
  });

  return response.data;
}