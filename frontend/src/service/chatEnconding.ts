
import { base64ToBytes, bytesToBase64 } from "../crypto/encoding";
import {
  createEncryptedMessage,
  decryptReceivedMessage,
  type MessageIdentity,
} from "../crypto/messageProtocol";
import type {
  EncryptedMessageEnvelope,
  WrappedSessionKeys,
} from "../crypto/types";

const RSA_ALGORITHM: RsaHashedImportParams = {
  name: "RSA-OAEP",
  hash: "SHA-256",
};

/**
 * Cria um ArrayBuffer independente, compatível com BufferSource
 * nas versões recentes do TypeScript.
 */
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

async function importPublicKey(
  publicKeyBase64: string,
): Promise<CryptoKey> {
  if (!publicKeyBase64) {
    throw new Error("A chave pública não foi informada.");
  }

  const publicKeyBytes = base64ToBytes(publicKeyBase64);

  return crypto.subtle.importKey(
    "spki",
    toArrayBuffer(publicKeyBytes),
    RSA_ALGORITHM,
    false,
    ["encrypt"],
  );
}

async function wrapSessionKey(
  sessionKey: Uint8Array,
  senderPublicKeyBase64: string,
  recipientPublicKeyBase64: string,
): Promise<WrappedSessionKeys> {
  const [senderKey, recipientKey] = await Promise.all([
    importPublicKey(senderPublicKeyBase64),
    importPublicKey(recipientPublicKeyBase64),
  ]);

  const sessionKeyBuffer = toArrayBuffer(sessionKey);

  const [wrappedFrom, wrappedTo] = await Promise.all([
    crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      senderKey,
      sessionKeyBuffer,
    ),
    crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      recipientKey,
      sessionKeyBuffer,
    ),
  ]);

  return {
    wrappedSessionKeyFrom: bytesToBase64(new Uint8Array(wrappedFrom)),
    wrappedSessionKeyTo: bytesToBase64(new Uint8Array(wrappedTo)),
  };
}

export async function encryptMessage(
  text: string,
  identity: MessageIdentity,
  senderPublicKeyBase64: string,
  recipientPublicKeyBase64: string,
) {
  if (typeof text !== "string" || text.trim().length === 0) {
    throw new Error("A mensagem não pode estar vazia.");
  }

  return createEncryptedMessage(text, identity, (sessionKey) =>
    wrapSessionKey(
      sessionKey,
      senderPublicKeyBase64,
      recipientPublicKeyBase64,
    ),
  );
}

export async function decryptMessage(
  envelope: EncryptedMessageEnvelope,
  wrappedSessionKey: string,
  privateKey: CryptoKey,
): Promise<string> {
  if (!wrappedSessionKey) {
    throw new Error("A chave de sessão encapsulada não foi encontrada.");
  }

  if (privateKey.algorithm.name !== "RSA-OAEP") {
    throw new Error("A chave privada não é compatível com RSA-OAEP.");
  }

  const wrappedBytes = base64ToBytes(wrappedSessionKey);

  const rawSessionKey = await crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    toArrayBuffer(wrappedBytes),
  );

  const sessionKey = new Uint8Array(rawSessionKey);

  try {
    return await decryptReceivedMessage(envelope, sessionKey);
  } finally {
    sessionKey.fill(0);
  }
}
