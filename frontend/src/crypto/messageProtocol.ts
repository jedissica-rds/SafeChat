// messageProtocol.ts

import {
    base64ToBytes,
    bytesToBase64,
    utf8ToBytes,
    bytesToUtf8,
} from "./encoding";
import { randomBytes, randomMessageId } from "./random";
import { encryptCamellia, decryptCamellia } from "./camellia";
import {
    createMessageHmac,
    deriveMessageKeys,
    verifyMessageHmac,
    type MessageAuthContext,
} from "./authentication";
import type {
    EncryptedMessageEnvelope,
    SendEncryptedMessageDto,
    WrappedSessionKeys,
} from "./types";

const SESSION_KEY_LENGTH = 32;
const SALT_LENGTH = 32;
const IV_LENGTH = 16;
const HMAC_LENGTH = 32;

export type MessageIdentity = {
    chatId: string;
    fromId: string;
    toId: string;
};

export type SessionKeyWrapper = (
    sessionKey: Uint8Array,
) => Promise<WrappedSessionKeys>;

function validateIdentity(identity: MessageIdentity): void {
    for (const [name, value] of Object.entries(identity)) {
        if (typeof value !== "string" || value.trim().length === 0) {
            throw new TypeError(`${name} não pode estar vazio.`);
        }
    }

    if (identity.fromId === identity.toId) {
        throw new Error("Remetente e destinatário não podem ser iguais.");
    }
}

function makeAuthContext(
    envelope: Pick<
        SendEncryptedMessageDto,
        | "id"
        | "chatId"
        | "keyDerivationSalt"
        | "wrappedSessionKeyFrom"
        | "wrappedSessionKeyTo"
    > & { fromId: string; toId: string },
): MessageAuthContext {
    return {
        messageId: envelope.id,
        chatId: envelope.chatId,
        fromId: envelope.fromId,
        toId: envelope.toId,
        salt: base64ToBytes(envelope.keyDerivationSalt),
        wrappedSessionKeyFrom: envelope.wrappedSessionKeyFrom,
        wrappedSessionKeyTo: envelope.wrappedSessionKeyTo,
    };
}

/**
 * Cria um envelope criptografado.
 *
 * wrapSessionKey deve encapsular a mesma chave de sessão para
 * o remetente e o destinatário usando suas respectivas chaves públicas.
 */
export async function createEncryptedMessage(
    plaintext: string,
    identity: MessageIdentity,
    wrapSessionKey: SessionKeyWrapper,
): Promise<SendEncryptedMessageDto> {
    validateIdentity(identity);

    if (typeof plaintext !== "string") {
        throw new TypeError("A mensagem deve ser texto.");
    }

    const sessionKey = randomBytes(SESSION_KEY_LENGTH);
    const salt = randomBytes(SALT_LENGTH);
    const iv = randomBytes(IV_LENGTH);

    try {
        const wrappedKeys = await wrapSessionKey(sessionKey);

        if (
            !wrappedKeys.wrappedSessionKeyFrom ||
            !wrappedKeys.wrappedSessionKeyTo
        ) {
            throw new Error("O encapsulamento das chaves não foi concluído.");
        }

        const keys = await deriveMessageKeys(sessionKey, salt);
        const ciphertext = await encryptCamellia(
            utf8ToBytes(plaintext),
            keys.encryptionKey,
            iv,
        );

        const id = randomMessageId();
        const sentAt = new Date().toISOString();

        const authContext: MessageAuthContext = {
            messageId: id,
            chatId: identity.chatId,
            fromId: identity.fromId,
            toId: identity.toId,
            salt,
            wrappedSessionKeyFrom: wrappedKeys.wrappedSessionKeyFrom,
            wrappedSessionKeyTo: wrappedKeys.wrappedSessionKeyTo,
        };

        const hmac = await createMessageHmac(
            keys.authenticationKey,
            authContext,
            iv,
            ciphertext,
        );

        return {
            id,
            chatId: identity.chatId,
            ...wrappedKeys,
            keyDerivationSalt: bytesToBase64(salt),
            iv: bytesToBase64(iv),
            ciphertext: bytesToBase64(ciphertext),
            hmac: bytesToBase64(hmac),
            sentAt,
        };
    } finally {
        // Best effort: JavaScript não garante apagamento físico da memória.
        sessionKey.fill(0);
    }
}

/**
 * Verifica a autenticação antes de descriptografar.
 * O chamador deve fornecer a chave de sessão recuperada localmente
 * a partir do campo encapsulado correspondente ao usuário.
 */
export async function decryptReceivedMessage(
    envelope: EncryptedMessageEnvelope,
    sessionKey: Uint8Array,
): Promise<string> {
    if (!(sessionKey instanceof Uint8Array) ||
        sessionKey.length !== SESSION_KEY_LENGTH) {
        throw new RangeError("A chave de sessão deve ter 32 bytes.");
    }

    if (!envelope || typeof envelope !== "object") {
        throw new TypeError("Envelope inválido.");
    }

    const salt = base64ToBytes(envelope.keyDerivationSalt);
    const iv = base64ToBytes(envelope.iv);
    const ciphertext = base64ToBytes(envelope.ciphertext);
    const receivedTag = base64ToBytes(envelope.hmac);

    if (salt.length !== SALT_LENGTH) {
        throw new Error("Salt inválido.");
    }

    if (iv.length !== IV_LENGTH) {
        throw new Error("IV inválido.");
    }

    if (receivedTag.length !== HMAC_LENGTH) {
        throw new Error("Tag HMAC inválida.");
    }

    const keys = await deriveMessageKeys(sessionKey, salt);
    const context = makeAuthContext(envelope);

    const valid = await verifyMessageHmac(
        keys.authenticationKey,
        context,
        iv,
        ciphertext,
        receivedTag,
    );

    if (!valid) {
        throw new Error(
            "Autenticação da mensagem falhou; a descriptografia foi cancelada.",
        );
    }

    const plaintext = await decryptCamellia(
        ciphertext,
        keys.encryptionKey,
        iv,
    );

    return bytesToUtf8(plaintext);
}
