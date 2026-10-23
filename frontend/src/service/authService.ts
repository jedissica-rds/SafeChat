
import type { Credentials, SignupData } from "../types/chat";
import {
  deriveKeys,
  decryptPrivateKey,
  encryptPrivateKey,
  generateKeyPair,
  generateSalt,
} from "./authEnconding";
import { request, setAccessToken } from "./Http";

interface ApiResponse<T> {
  status: string;
  code: string;
  message: string;
  data: T;
}

export interface LoginResponse {
  id: string;
  name: string;
  username: string;
  salt: string;
  publicKey: string;
  encryptedPrivateKey: string;
  accessToken: string;
}

export interface User {
  name: string;
  username: string;
  publicKey: string;
}

export type SignupPayload = SignupData & {
  name: string;
};

let session: {
  user: LoginResponse;
  privateKey: CryptoKey;
} | null = null;

export function getSession() {
  return session;
}

export function getCurrentUser(): LoginResponse | null {
  return session?.user ?? null;
}

export function getPrivateKey(): CryptoKey | null {
  return session?.privateKey ?? null;
}

export function logout() {
  session = null;
  setAccessToken(null);
}

function validateUsername(value: string): string {
  const username = value.trim();

  if (!username) {
    throw new Error("Informe o nome de usuário.");
  }

  if (username.length < 3 || username.length > 30) {
    throw new Error("O usuário deve ter entre 3 e 30 caracteres.");
  }

  if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
    throw new Error(
      'O usuário só pode conter letras, números, ".", "_" e "-".',
    );
  }

  return username;
}

export async function getUserSalt(
  usernameInput: string,
): Promise<string> {
  const username = validateUsername(usernameInput);

  const response = await request<
    ApiResponse<{ salt: string }> | { salt: string } | string
  >(`/api/users/${encodeURIComponent(username)}/salt`);

  let salt: string | undefined;

  if (typeof response === "string") {
    salt = response;
  } else if ("data" in response) {
    salt = response.data?.salt;
  } else {
    salt = response.salt;
  }

  if (!salt) {
    throw new Error("O backend não retornou o salt do usuário.");
  }

  return salt;
}

export async function login({
  user,
  password,
}: Credentials): Promise<LoginResponse> {
  if (!user.trim() || !password) {
    throw new Error("Preencha todos os campos.");
  }

  const username = validateUsername(user);
  const salt = await getUserSalt(username);
  const { authKey, encKey } = await deriveKeys(password, salt);

  const response = await request<ApiResponse<LoginResponse>>("/api/login", {
    method: "POST",
    body: JSON.stringify({ username, authKey }),
  });

  const data = response.data;

  if (!data?.accessToken) {
    throw new Error("O backend não retornou o token de acesso.");
  }

  if (!data.id) {
    throw new Error(
      "O backend não retornou o ID do usuário. Atualize a resposta do login.",
    );
  }

  if (!data.encryptedPrivateKey || !data.publicKey) {
    throw new Error(
      "O backend não retornou as chaves necessárias para a sessão.",
    );
  }

  const privateKey = await decryptPrivateKey(
    data.encryptedPrivateKey,
    encKey,
  );

  setAccessToken(data.accessToken);
  session = { user: data, privateKey };

  return data;
}

export async function signup({
  name,
  user,
  password,
  confirm,
}: SignupPayload): Promise<void> {
  if (!name.trim() || !user.trim() || !password || !confirm) {
    throw new Error("Preencha todos os campos.");
  }

  if (name.trim().length > 100) {
    throw new Error("O nome deve ter no máximo 100 caracteres.");
  }

  if (password !== confirm) {
    throw new Error("As senhas não coincidem.");
  }

  const username = validateUsername(user);
  const salt = generateSalt();
  const { authKey, encKey } = await deriveKeys(password, salt);
  const { publicKey, privateKeyPkcs8 } = await generateKeyPair();

  const encryptedPrivateKey = await encryptPrivateKey(
    privateKeyPkcs8,
    encKey,
  );

  await request("/api/register", {
    method: "POST",
    body: JSON.stringify({
      name: name.trim(),
      username,
      salt,
      publicKey,
      encryptedPrivateKey,
      authKey,
    }),
  });
}

export async function getUser(
  usernameInput: string,
): Promise<User> {
  const username = validateUsername(usernameInput);

  const response = await request<ApiResponse<User>>(
    `/api/users/${encodeURIComponent(username)}`,
  );

  return response.data;
}