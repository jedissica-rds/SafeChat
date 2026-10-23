
import { encryptCamellia } from "./camellia";
import {
    createMessageHmac,
    deriveMessageKeys,
    verifyMessageHmac,
    type MessageAuthContext,
} from "./authentication";

function assert(condition: boolean, message: string): void {
    if (!condition) throw new Error(`FALHOU: ${message}`);
    console.log(`[PASSOU] ${message}`);
}

async function main(): Promise<void> {
    const sessionKey = crypto.getRandomValues(new Uint8Array(32));
    const salt = crypto.getRandomValues(new Uint8Array(32));
    const iv = crypto.getRandomValues(new Uint8Array(16));

    const context: MessageAuthContext = {
        messageId: crypto.randomUUID(),
        chatId: "test-chat",
        fromId: "alice",
        toId: "bob",
        salt,
        wrappedSessionKeyFrom: "test-wrapped-key-from",
        wrappedSessionKeyTo: "test-wrapped-key-to",
    };
    const plaintext = new TextEncoder().encode(
        "Mensagem de teste do SafeChat",
    );

    const keys = await deriveMessageKeys(sessionKey, salt);
    const ciphertext = await encryptCamellia(
        plaintext,
        keys.encryptionKey,
        iv,
    );

    const tag = await createMessageHmac(
        keys.authenticationKey,
        context,
        iv,
        ciphertext,
    );

    const valid = await verifyMessageHmac(
        keys.authenticationKey,
        context,
        iv,
        ciphertext,
        tag,
    );

    const alteredWrappedKeyAccepted = await verifyMessageHmac(
        keys.authenticationKey,
        {
            ...context,
            wrappedSessionKeyTo: "altered-wrapped-key",
        },
        iv,
        ciphertext,
        tag,
    );

    assert(
        !alteredWrappedKeyAccepted,
        "Alteração da chave encapsulada é rejeitada",
    );

    assert(valid, "Mensagem legítima é autenticada");

    const alteredCiphertext = ciphertext.slice();
    alteredCiphertext[0] ^= 1;

    const alteredContentAccepted = await verifyMessageHmac(
        keys.authenticationKey,
        context,
        iv,
        alteredCiphertext,
        tag,
    );

    assert(
        !alteredContentAccepted,
        "Alteração do texto cifrado é rejeitada",
    );

    const alteredContext = {
        ...context,
        toId: "mallory",
    };

    const alteredContextAccepted = await verifyMessageHmac(
        keys.authenticationKey,
        alteredContext,
        iv,
        ciphertext,
        tag,
    );

    assert(
        !alteredContextAccepted,
        "Alteração do destinatário é rejeitada",
    );

    const shortTagAccepted = await verifyMessageHmac(
        keys.authenticationKey,
        context,
        iv,
        ciphertext,
        new Uint8Array(8),
    );

    assert(!shortTagAccepted, "Tag de tamanho inválido é rejeitada");

    console.log("Todos os testes de autenticação passaram.");
}

main().catch((error: unknown) => {
    console.error("Erro no teste HMAC:", error);
});
