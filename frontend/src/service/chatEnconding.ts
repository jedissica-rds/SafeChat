
import { base64ToBytes, bytesToBase64 } from "./authEnconding";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export interface EncryptedMessage {
  ciphertext: string;
  iv: string;
  hmac: string;
  wrappedSessionKeyFrom: string;
  wrappedSessionKeyTo: string;
}

export interface MessageToDecrypt {
  ciphertext: string;
  iv: string;
  hmac: string;
  wrappedSessionKeys: string[];
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const result = new Uint8Array(a.length + b.length);
  result.set(a, 0);
  result.set(b, a.length);
  return result;
}

async function importPublicKey(spkiBase64: string): Promise<CryptoKey> {
  if (!spkiBase64) {
    throw new Error("A chave pública não foi informada.");
  }

  return crypto.subtle.importKey(
    "spki",
    base64ToBytes(spkiBase64),
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"],
  );
}

async function deriveHmacKey(
  sessionKeyRaw: ArrayBuffer,
): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey(
    "raw",
    sessionKeyRaw,
    "HKDF",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new Uint8Array(0),
      info: encoder.encode("hmac"),
    },
    base,
    { name: "HMAC", hash: "SHA-256", length: 256 },
    false,
    ["sign", "verify"],
  );
}

// Gera uma chave AES por mensagem, cifra o conteúdo,
// protege a chave para ambos os participantes e calcula o HMAC.
export async function encryptMessage(
  text: string,
  senderPublicKey: string,
  recipientPublicKey: string,
): Promise<EncryptedMessage> {
  const sessionKey = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));

  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      sessionKey,
      encoder.encode(text),
    ),
  );

  const sessionKeyRaw = await crypto.subtle.exportKey("raw", sessionKey);

  const [senderKey, recipientKey] = await Promise.all([
    importPublicKey(senderPublicKey),
    importPublicKey(recipientPublicKey),
  ]);

  const [wrappedFrom, wrappedTo] = await Promise.all([
    crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      senderKey,
      sessionKeyRaw,
    ),
    crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      recipientKey,
      sessionKeyRaw,
    ),
  ]);

  const hmacKey = await deriveHmacKey(sessionKeyRaw);

  const mac = new Uint8Array(
    await crypto.subtle.sign(
      "HMAC",
      hmacKey,
      concat(iv, ciphertext),
    ),
  );

  return {
    ciphertext: bytesToBase64(ciphertext),
    iv: bytesToBase64(iv),
    hmac: bytesToBase64(mac),
    wrappedSessionKeyFrom: bytesToBase64(new Uint8Array(wrappedFrom)),
    wrappedSessionKeyTo: bytesToBase64(new Uint8Array(wrappedTo)),
  };
}

// Tenta abrir a chave de sessão com a chave privada do usuário,
// valida o HMAC e só então descriptografa a mensagem.
export async function decryptMessage(
  message: MessageToDecrypt,
  privateKey: CryptoKey,
): Promise<string> {
  let sessionKeyRaw: ArrayBuffer | null = null;

  for (const wrapped of message.wrappedSessionKeys) {
    try {
      sessionKeyRaw = await crypto.subtle.decrypt(
        { name: "RSA-OAEP" },
        privateKey,
        base64ToBytes(wrapped),
      );

      break;
    } catch {
      // A chave pode ter sido cifrada para o outro participante.
    }
  }

  if (!sessionKeyRaw) {
    throw new Error("Não foi possível abrir a chave de sessão.");
  }

  const iv = base64ToBytes(message.iv);
  const ciphertext = base64ToBytes(message.ciphertext);
  const mac = base64ToBytes(message.hmac);

  const hmacKey = await deriveHmacKey(sessionKeyRaw);

  const valid = await crypto.subtle.verify(
    "HMAC",
    hmacKey,
    mac,
    concat(iv, ciphertext),
  );

  if (!valid) {
    throw new Error("HMAC inválido: a mensagem foi alterada.");
  }

  const sessionKey = await crypto.subtle.importKey(
    "raw",
    sessionKeyRaw,
    "AES-GCM",
    false,
    ["decrypt"],
  );

  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    sessionKey,
    ciphertext,
  );

  return decoder.decode(plain);
}
