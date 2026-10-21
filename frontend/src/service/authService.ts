
import type { Credentials, SignupData } from "../types/chat";

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function login({ user, password }: Credentials): Promise<void> {
  await delay(850);

  if (!user.trim() || !password) {
    throw new Error("Preencha todos os campos.");
  }

  // Simulação mantida do código original.
  if (user.trim().toLowerCase() === "erro") {
    throw new Error("Usuário ou senha inválidos.");
  }

  // Substituir pela requisição real ao backend.
}

export async function signup({
  user,
  password,
  confirm,
}: SignupData): Promise<void> {
  await delay(850);

  if (!user.trim() || !password || !confirm) {
    throw new Error("Preencha todos os campos.");
  }

  if (password !== confirm) {
    throw new Error("As senhas não coincidem.");
  }

  // Simulação mantida do código original.
  if (user.trim().toLowerCase() === "joana") {
    throw new Error("Usuário já existe.");
  }

  // Substituir pela requisição real ao backend.
}
