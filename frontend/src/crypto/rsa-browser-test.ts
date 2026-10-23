
import { randomBytes } from "./random";
import {
    generateRsaKeyPair,
    unwrapSessionKey,
    wrapSessionKey,
} from "./rsa";

async function main(): Promise<void> {
    console.log("Gerando par RSA-OAEP de 3072 bits...");

    const alice = await generateRsaKeyPair();
    const bob = await generateRsaKeyPair();

    const sessionKey = randomBytes(32);

    // A mesma chave de sessão pode ser recuperada por cada participante.
    const wrappedForAlice = await wrapSessionKey(
        alice.publicKey,
        sessionKey,
    );

    const wrappedForBob = await wrapSessionKey(
        bob.publicKey,
        sessionKey,
    );

    const recoveredByAlice = await unwrapSessionKey(
        alice.privateKeyPkcs8,
        wrappedForAlice,
    );

    const recoveredByBob = await unwrapSessionKey(
        bob.privateKeyPkcs8,
        wrappedForBob,
    );

    const equal = (a: Uint8Array, b: Uint8Array) =>
        a.length === b.length &&
        a.every((byte, index) => byte === b[index]);

    if (!equal(sessionKey, recoveredByAlice)) {
        throw new Error("Alice não recuperou a chave de sessão.");
    }

    console.log("[PASSOU] Alice recuperou a chave de sessão.");

    if (!equal(sessionKey, recoveredByBob)) {
        throw new Error("Bob não recuperou a chave de sessão.");
    }

    console.log("[PASSOU] Bob recuperou a chave de sessão.");

    let wrongKeyRejected = false;

    try {
        await unwrapSessionKey(bob.privateKeyPkcs8, wrappedForAlice);
    } catch {
        wrongKeyRejected = true;
    }

    if (!wrongKeyRejected) {
        throw new Error("A chave privada errada não foi rejeitada.");
    }

    console.log("[PASSOU] Chave privada incorreta rejeitada.");
    console.log("Todos os testes RSA-OAEP passaram.");

    // Limpeza best-effort dos buffers de teste.
    sessionKey.fill(0);
    recoveredByAlice.fill(0);
    recoveredByBob.fill(0);
}

main().catch((error: unknown) => {
    console.error("Falha no teste RSA:", error);
});
