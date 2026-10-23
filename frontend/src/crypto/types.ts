// types.ts

export type SendEncryptedMessageDto = {
  id: string;
  chatId: string;
  wrappedSessionKeyFrom: string;
  wrappedSessionKeyTo: string;
  iv: string;
  keyDerivationSalt: string;
  ciphertext: string;
  hmac: string;
  sentAt: string;
};

export type EncryptedMessageEnvelope = SendEncryptedMessageDto & {
  fromId: string;
  toId: string;
  seq: number;
  status: "stored" | "delivered" | "read";
};

export type RecipientPublicKey = {
  userId: string;
  publicKey: string;
};

export type MessageKeys = {
  encryptionKey: Uint8Array;
  authenticationKey: Uint8Array;
};

export type GeneratedUserKeys = {
  publicKey: string;
  encryptedPrivateKey: string;
  salt: string;
  authKey: string;
};

export type WrappedSessionKeys = {
  wrappedSessionKeyFrom: string;
  wrappedSessionKeyTo: string;
};
