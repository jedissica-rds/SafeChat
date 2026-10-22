import type { Credentials, SignupData } from "../types/chat";

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

export interface User {
  username: string;
  [key: string]: unknown;
}

export interface LoginResponse {
  access_token?: string;
  token?: string;
  [key: string]: unknown;
}

// GET /api/users/{username}/salt
export async function getUserSalt(username: string): Promise<unknown> {
  if (!username.trim()) {
    throw new Error("Informe o nome de usuário.");
  }

  return request(
    `/api/users/${encodeURIComponent(username.trim())}/salt`
  );
}

// POST /api/login
export async function login({
  user,
  password,
}: Credentials): Promise<LoginResponse> {
  if (!user.trim() || !password) {
    throw new Error("Preencha todos os campos.");
  }

  return request<LoginResponse>("/api/login", {
    method: "POST",
    body: JSON.stringify({
      username: user.trim(),
      password,
    }),
  });
}

// POST /api/register
export async function signup({
  user,
  password,
  confirm,
}: SignupData): Promise<void> {
  if (!user.trim() || !password || !confirm) {
    throw new Error("Preencha todos os campos.");
  }

  if (password !== confirm) {
    throw new Error("As senhas não coincidem.");
  }

  await request("/api/register", {
    method: "POST",
    body: JSON.stringify({
      username: user.trim(),
      password,
    }),
  });
}

// GET /api/users/{username}
export async function getUser(username: string): Promise<User> {
  if (!username.trim()) {
    throw new Error("Informe o nome de usuário.");
  }

  return request<User>(
    `/api/users/${encodeURIComponent(username.trim())}`
  );
}