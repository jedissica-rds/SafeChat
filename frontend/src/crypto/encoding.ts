// encoding.ts
const textEncoder = new TextEncoder();

/**
 * Converte texto em bytes UTF-8.
 */
export function utf8ToBytes(value: string): Uint8Array {
  return textEncoder.encode(value);
}

/**
 * Converte bytes em texto UTF-8.
 * Lança um erro se os bytes não representarem UTF-8 válido.
 */
export function bytesToUtf8(value: Uint8Array): string {
  return new TextDecoder("utf-8", { fatal: true }).decode(value);
}

/**
 * Converte bytes em Base64 para transporte pela API.
 * Funciona também com arrays grandes, sem usar spread em todos os bytes.
 */
export function bytesToBase64(value: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = "";

  for (let offset = 0; offset < value.length; offset += chunkSize) {
    const chunk = value.subarray(
      offset,
      Math.min(offset + chunkSize, value.length),
    );

    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

/**
 * Converte Base64 válido em bytes.
 * Rejeita caracteres inválidos e representações não canônicas.
 */
export function base64ToBytes(value: string): Uint8Array {
  const validBase64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

  if (!validBase64.test(value)) {
    throw new Error("Invalid Base64 input.");
  }

  let binary: string;

  try {
    binary = atob(value);
  } catch {
    throw new Error("Invalid Base64 input.");
  }

  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  // Garante que a representação recebida é canônica.
  if (bytesToBase64(bytes) !== value) {
    throw new Error("Non-canonical Base64 input.");
  }

  return bytes;
}

/**
 * Concatena vários arrays de bytes em um único Uint8Array.
 */
export function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const totalLength = parts.reduce(
    (total, part) => total + part.length,
    0,
  );

  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }

  return result;
}
