
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

    // Simula os campos que o backend acrescentaria à resposta.
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

    const recoveredMessage = await decryptReceivedMessage(
        envelope,
        bobSessionKey,
    );

    assert(
        recoveredMessage === originalMessage,
        "Bob recupera a mensagem original",
    );

    // Testa se a alteração do texto cifrado é detectada.
    const tamperedEnvelope: EncryptedMessageEnvelope = {
        ...envelope,
        ciphertext: `${envelope.ciphertext.slice(0, -4)}AAAA`,
    };

    let tamperingRejected = false;

    try {
        await decryptReceivedMessage(tamperedEnvelope, bobSessionKey);
    } catch {
        tamperingRejected = true;
    }

    assert(
        tamperingRejected,
        "Mensagem adulterada é rejeitada antes da descriptografia",
    );

    // Testa também a recuperação da chave pelo remetente.
    const aliceSessionKey = await unwrapSessionKey(
        alice.privateKeyPkcs8,
        envelope.wrappedSessionKeyFrom,
    );

    const aliceRecoveredMessage = await decryptReceivedMessage(
        envelope,
        aliceSessionKey,
    );

    assert(
        aliceRecoveredMessage === originalMessage,
        "Alice recupera a própria mensagem",
    );

    bobSessionKey.fill(0);
    aliceSessionKey.fill(0);

    console.log("Todos os testes integrados passaram.");
}

main().catch((error: unknown) => {
    console.error("Falha no teste integrado:", error);
});
