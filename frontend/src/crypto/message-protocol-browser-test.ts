import { generateRsaKeyPair, unwrapSessionKey } from "./rsa";
import { wrapSessionKeyForParticipants } from "./rsa";
import {
    createEncryptedMessage,
    decryptReceivedMessage,
} from "./messageProtocol";
import type { EncryptedMessageEnvelope } from "./types";

function assert(condition: boolean, message: string): void {
    if (!condition) {
        throw new Error(`FALHOU: ${message}`);
    }

    console.log(`[PASSOU] ${message}`);
}

function alterBase64(value: string): string {
    if (value.length === 0) {
        throw new Error("Não é possível alterar um valor Base64 vazio.");
    }

    const first = value[0];
    const replacement = first === "A" ? "B" : "A";

    return replacement + value.slice(1);
}

async function assertRejected(
    envelope: EncryptedMessageEnvelope,
    sessionKey: Uint8Array,
    description: string,
): Promise<void> {
    let rejected = false;

    try {
        await decryptReceivedMessage(envelope, sessionKey);
    } catch {
        rejected = true;
    }

    assert(rejected, description);
}

async function main(): Promise<void> {
    console.log("Iniciando teste integrado do protocolo SafeChat...");

    const alice = await generateRsaKeyPair();
    const bob = await generateRsaKeyPair();

    const originalMessage =
        "Mensagem de teste do protocolo criptográfico SafeChat.";

    const dto = await createEncryptedMessage(
        originalMessage,
        {
            chatId: "test-chat",
            fromId: "alice",
            toId: "bob",
        },
        (sessionKey) =>
            wrapSessionKeyForParticipants(
                alice.publicKey,
                bob.publicKey,
                sessionKey,
            ),
    );

    console.log("[PASSOU] Envelope criptográfico criado.");

    const envelope: EncryptedMessageEnvelope = {
        ...dto,
        fromId: "alice",
        toId: "bob",
        seq: 1,
        status: "stored",
    };

    const bobSessionKey = await unwrapSessionKey(
        bob.privateKeyPkcs8,
        envelope.wrappedSessionKeyTo,
    );

    const aliceSessionKey = await unwrapSessionKey(
        alice.privateKeyPkcs8,
        envelope.wrappedSessionKeyFrom,
    );

    try {
        const recoveredMessage = await decryptReceivedMessage(
            envelope,
            bobSessionKey,
        );

        assert(
            recoveredMessage === originalMessage,
            "Bob recupera a mensagem original",
        );

        const tamperedCiphertext: EncryptedMessageEnvelope = {
            ...envelope,
            ciphertext: alterBase64(envelope.ciphertext),
        };

        await assertRejected(
            tamperedCiphertext,
            bobSessionKey,
            "Ciphertext adulterado é rejeitado",
        );

        const tamperedHmac: EncryptedMessageEnvelope = {
            ...envelope,
            hmac: alterBase64(envelope.hmac),
        };

        await assertRejected(
            tamperedHmac,
            bobSessionKey,
            "HMAC adulterado é rejeitado",
        );

        const aliceRecoveredMessage = await decryptReceivedMessage(
            envelope,
            aliceSessionKey,
        );

        assert(
            aliceRecoveredMessage === originalMessage,
            "Alice recupera a própria mensagem",
        );
    } finally {
        bobSessionKey.fill(0);
        aliceSessionKey.fill(0);
    }

    console.log("Todos os testes integrados passaram.");
}

main().catch((error: unknown) => {
    console.error("Falha no teste integrado:", error);
});