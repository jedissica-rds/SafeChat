
/**
 * Gera bytes aleatórios criptograficamente seguros.
 *
 * O tamanho deve ser um inteiro entre 1 e 1 MiB.
 * getRandomValues aceita até 65.536 bytes por chamada,
 * então dividimos solicitações maiores em blocos.
 */
export function randomBytes(length: number): Uint8Array {
  if (!Number.isSafeInteger(length) || length < 1 || length > 1024 * 1024) {
    throw new RangeError("Invalid random byte length.");
  }

  const result = new Uint8Array(length);
  const chunkSize = 65_536;

  for (let offset = 0; offset < length; offset += chunkSize) {
    const chunk = result.subarray(offset, Math.min(offset + chunkSize, length));

    crypto.getRandomValues(chunk);
  }

  return result;
}

/**
 * Gera um UUID para identificar uma mensagem.
 */
export function randomMessageId(): string {
  return crypto.randomUUID();
}
