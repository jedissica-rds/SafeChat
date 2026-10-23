
import { argon2id } from "hash-wasm";

const encoder = new TextEncoder();

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

export function base64ToBytes(value: string): Uint8Array {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("Base64 vazio ou inválido.");
  }

  try {
    return Uint8Array.from(
      atob(value.trim()),
      (char) => char.charCodeAt(0),
    );
  } catch {
    throw new Error("Base64 malformado.");
  }
}

// Gera um salt aleatório de 16 bytes.
export function generateSalt(): string {
  return bytesToBase64(crypto.getRandomValues(new Uint8Array(16)));
}

export interface DerivedKeys {
  authKey: string;
  encKey: CryptoKey;
}

async function hkdf(
  master: Uint8Array,
  salt: Uint8Array,
  info: string,
): Promise<Uint8Array> {
  const base = await crypto.subtle.importKey(
    "raw",
    master,
    "HKDF",
    false,
    ["deriveBits"],
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt,
      info: encoder.encode(info),
    },
    base,
    256,
  );

  return new Uint8Array(bits);
}

// Deriva a chave de autenticação e a chave para proteger a chave privada.
export async function deriveKeys(
  password: string,
  saltBase64: string,
): Promise<DerivedKeys> {
  if (!password) {
    throw new Error("A senha não pode estar vazia.");
  }

  if (!saltBase64) {
    throw new Error("O salt não foi recebido.");
  }

  const salt = base64ToBytes(saltBase64);

  const master = new Uint8Array(
    await argon2id({
      password,
      salt,
      parallelism: 1,
      iterations: 3,
      memorySize: 65536,
      hashLength: 32,
      outputType: "binary",
    }),
  );

  const [authBytes, encBytes] = await Promise.all([
    hkdf(master, salt, "auth"),
    hkdf(master, salt, "enc"),
  ]);

  const encKey = await crypto.subtle.importKey(
    "raw",
    encBytes,
    "AES-GCM",
    false,
    ["encrypt", "decrypt"],
  );

  return {
    authKey: bytesToBase64(authBytes),
    encKey,
  };
}

// Gera um par RSA-OAEP de 2048 bits.
// A chave pública é SPKI em Base64.
// A chave privada é retornada em PKCS8 para ser protegida pelo usuário.
export async function generateKeyPair(): Promise<{
  publicKey: string;
  privateKeyPkcs8: Uint8Array;
}> {
  const pair = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"],
  );

  const [spki, pkcs8] = await Promise.all([
    crypto.subtle.exportKey("spki", pair.publicKey),
    crypto.subtle.exportKey("pkcs8", pair.privateKey),
  ]);

  return {
    publicKey: bytesToBase64(new Uint8Array(spki)),
    privateKeyPkcs8: new Uint8Array(pkcs8),
  };
}

// Formato armazenado: Base64(IV de 12 bytes || ciphertext AES-GCM).
export async function encryptPrivateKey(
  pkcs8: Uint8Array,
  encKey: CryptoKey,
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const cipher = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      encKey,
      pkcs8,
    ),
  );

  const payload = new Uint8Array(iv.length + cipher.length);
  payload.set(iv, 0);
  payload.set(cipher, iv.length);

  return bytesToBase64(payload);
}

// Desprotege a chave privada e a importa como não exportável.
export async function decryptPrivateKey(
  encryptedBase64: string,
  encKey: CryptoKey,
): Promise<CryptoKey> {
  const payload = base64ToBytes(encryptedBase64);

  if (payload.length <= 12) {
    throw new Error("Chave privada cifrada inválida.");
  }

  const iv = payload.slice(0, 12);
  const cipher = payload.slice(12);

  const pkcs8 = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    encKey,
    cipher,
  );

  return crypto.subtle.importKey(
    "pkcs8",
    pkcs8,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["decrypt"],
  );
}
