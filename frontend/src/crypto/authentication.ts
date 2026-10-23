
import { bytesToBase64, utf8ToBytes } from "./encoding";

const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const HMAC_LENGTH = 32;
const HKDF_INFO = utf8ToBytes("SafeChat/message-keys/v1");

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return new Uint8Array(bytes).buffer as ArrayBuffer;
}

export type MessageKeys = {
  encryptionKey: Uint8Array;
  authenticationKey: Uint8Array;
};

export type MessageAuthContext = {
  messageId: string;
  chatId: string;
  fromId: string;
  toId: string;
  salt: Uint8Array;
  wrappedSessionKeyFrom: string;
  wrappedSessionKeyTo: string;
};

function validateLength(
  value: Uint8Array,
  expectedLength: number,
  name: string,
): void {
  if (!(value instanceof Uint8Array) || value.length !== expectedLength) {
    throw new RangeError(`${name} deve ter ${expectedLength} bytes.`);
  }
}

function validateContext(context: MessageAuthContext): void {
  for (const [name, value] of Object.entries({
    messageId: context.messageId,
    chatId: context.chatId,
    fromId: context.fromId,
    toId: context.toId,
    wrappedSessionKeyFrom: context.wrappedSessionKeyFrom,
    wrappedSessionKeyTo: context.wrappedSessionKeyTo,
  })) {
    if (typeof value !== "string" || value.length === 0) {
      throw new TypeError(`${name} deve ser uma string não vazia.`);
    }
  }

  validateLength(context.salt, SALT_LENGTH, "Salt HKDF");
}

function canonicalMessage(
  context: MessageAuthContext,
  iv: Uint8Array,
  ciphertext: Uint8Array,
): Uint8Array {
  validateContext(context);
  validateLength(iv, IV_LENGTH, "IV");

  if (!(ciphertext instanceof Uint8Array)) {
    throw new TypeError("O texto cifrado deve ser um Uint8Array.");
  }

  // A ordem e os nomes dos campos são parte do protocolo v1.
  const canonical = JSON.stringify({
    protocol: "SafeChat",
    version: 1,
    messageId: context.messageId,
    chatId: context.chatId,
    fromId: context.fromId,
    toId: context.toId,
    salt: bytesToBase64(context.salt),
    wrappedSessionKeyFrom: context.wrappedSessionKeyFrom,
    wrappedSessionKeyTo: context.wrappedSessionKeyTo,
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(ciphertext),
  });

  return utf8ToBytes(canonical);
}

export async function deriveMessageKeys(
  sessionKey: Uint8Array,
  salt: Uint8Array,
): Promise<MessageKeys> {
  validateLength(sessionKey, KEY_LENGTH, "Chave de sessão");
  validateLength(salt, SALT_LENGTH, "Salt HKDF");

  const material = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(sessionKey),
    "HKDF",
    false,
    ["deriveBits"],
  );

  const derived = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: toArrayBuffer(salt),
      info: toArrayBuffer(HKDF_INFO),
    },
    material,
    512,
  );

  const bytes = new Uint8Array(derived);

  return {
    encryptionKey: bytes.slice(0, KEY_LENGTH),
    authenticationKey: bytes.slice(KEY_LENGTH, KEY_LENGTH * 2),
  };
}

async function importHmacKey(
  authenticationKey: Uint8Array,
): Promise<CryptoKey> {
  validateLength(authenticationKey, KEY_LENGTH, "Chave HMAC");

  return crypto.subtle.importKey(
    "raw",
    toArrayBuffer(authenticationKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function createMessageHmac(
  authenticationKey: Uint8Array,
  context: MessageAuthContext,
  iv: Uint8Array,
  ciphertext: Uint8Array,
): Promise<Uint8Array> {
  const key = await importHmacKey(authenticationKey);
  const data = canonicalMessage(context, iv, ciphertext);

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    toArrayBuffer(data),
  );

  return new Uint8Array(signature);
}

export async function verifyMessageHmac(
  authenticationKey: Uint8Array,
  context: MessageAuthContext,
  iv: Uint8Array,
  ciphertext: Uint8Array,
  receivedTag: Uint8Array,
): Promise<boolean> {
  if (
    !(receivedTag instanceof Uint8Array) ||
    receivedTag.length !== HMAC_LENGTH
  ) {
    return false;
  }

  const key = await importHmacKey(authenticationKey);
  const data = canonicalMessage(context, iv, ciphertext);

  return crypto.subtle.verify(
    "HMAC",
    key,
    toArrayBuffer(receivedTag),
    toArrayBuffer(data),
  );
}
