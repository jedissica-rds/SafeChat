
import {
    base64ToBytes,
    bytesToBase64,
} from "./encoding";

import type { WrappedSessionKeys } from "./types";

const RSA_MODULUS_LENGTH = 3072;
const SESSION_KEY_LENGTH = 32;
const HASH = "SHA-256";

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
    return new Uint8Array(bytes).buffer as ArrayBuffer;
}

function validateSessionKey(sessionKey: Uint8Array): void {
    if (
        !(sessionKey instanceof Uint8Array) ||
        sessionKey.length !== SESSION_KEY_LENGTH
    ) {
        throw new RangeError("A chave de sessão deve ter 32 bytes.");
    }
}

/**
 * Gera um par RSA-OAEP.
 *
 * A chave pública é exportada como DER/SPKI em Base64.
 * A chave privada é exportada como DER/PKCS8 em bytes.
 *
 * A chave privada retornada NÃO está criptografada.
 * Ela deve ser protegida antes de ser persistida.
 */
export async function generateRsaKeyPair(): Promise<{
    publicKey: string;
    privateKeyPkcs8: Uint8Array;
}> {
    const keyPair = await crypto.subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: RSA_MODULUS_LENGTH,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: HASH,
        },
        true,
        ["encrypt", "decrypt"],
    );

    const publicDer = await crypto.subtle.exportKey(
        "spki",
        keyPair.publicKey,
    );

    const privateDer = await crypto.subtle.exportKey(
        "pkcs8",
        keyPair.privateKey,
    );

    return {
        publicKey: bytesToBase64(new Uint8Array(publicDer)),
        privateKeyPkcs8: new Uint8Array(privateDer),
    };
}

/** Importa uma chave pública DER/SPKI codificada em Base64. */
export async function importRsaPublicKey(
    publicKeyBase64: string,
): Promise<CryptoKey> {
    const der = base64ToBytes(publicKeyBase64);

    return crypto.subtle.importKey(
        "spki",
        toArrayBuffer(der),
        {
            name: "RSA-OAEP",
            hash: HASH,
        },
        false,
        ["encrypt"],
    );
}

/**
 * Importa uma chave privada DER/PKCS8.
 * Recebe bytes já descriptografados pelo mecanismo de proteção local.
 */
export async function importRsaPrivateKey(
    privateKeyPkcs8: Uint8Array,
): Promise<CryptoKey> {
    if (!(privateKeyPkcs8 instanceof Uint8Array) ||
        privateKeyPkcs8.length === 0) {
        throw new TypeError("A chave privada PKCS8 é inválida.");
    }

    return crypto.subtle.importKey(
        "pkcs8",
        toArrayBuffer(privateKeyPkcs8),
        {
            name: "RSA-OAEP",
            hash: HASH,
        },
        false,
        ["decrypt"],
    );
}

/** Encapsula a chave de sessão com a chave pública do participante. */
export async function wrapSessionKey(
    publicKeyBase64: string,
    sessionKey: Uint8Array,
): Promise<string> {
    validateSessionKey(sessionKey);

    const publicKey = await importRsaPublicKey(publicKeyBase64);

    const wrapped = await crypto.subtle.encrypt(
        { name: "RSA-OAEP" },
        publicKey,
        toArrayBuffer(sessionKey),
    );

    return bytesToBase64(new Uint8Array(wrapped));
}

/** Recupera a chave de sessão com a chave privada do participante. */
export async function unwrapSessionKey(
    privateKeyPkcs8: Uint8Array,
    wrappedSessionKeyBase64: string,
): Promise<Uint8Array> {
    const privateKey = await importRsaPrivateKey(privateKeyPkcs8);
    const wrapped = base64ToBytes(wrappedSessionKeyBase64);

    const decrypted = await crypto.subtle.decrypt(
        { name: "RSA-OAEP" },
        privateKey,
        toArrayBuffer(wrapped),
    );

    const sessionKey = new Uint8Array(decrypted);
    validateSessionKey(sessionKey);

    return sessionKey;
}


/**
 * Cria os dois encapsulamentos da mesma chave de sessão:
 * um para o remetente e outro para o destinatário.
 */
export async function wrapSessionKeyForParticipants(
    senderPublicKeyBase64: string,
    recipientPublicKeyBase64: string,
    sessionKey: Uint8Array,
): Promise<WrappedSessionKeys> {
    const [wrappedSessionKeyFrom, wrappedSessionKeyTo] =
        await Promise.all([
            wrapSessionKey(senderPublicKeyBase64, sessionKey),
            wrapSessionKey(recipientPublicKeyBase64, sessionKey),
        ]);

    return {
        wrappedSessionKeyFrom,
        wrappedSessionKeyTo,
    };
}
