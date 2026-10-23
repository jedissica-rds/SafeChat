
import {
    encryptCamellia,
    decryptCamellia,
} from "./camellia";

function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
    return (
        a.length === b.length &&
        a.every((value, index) => value === b[index])
    );
}

async function runTest(
    name: string,
    plaintext: Uint8Array,
    key: Uint8Array,
    iv: Uint8Array,
): Promise<void> {
    const ciphertext = await encryptCamellia(plaintext, key, iv);
    const recovered = await decryptCamellia(ciphertext, key, iv);

    const passed = equalBytes(plaintext, recovered);

    console.log(
        `[${passed ? "PASSOU" : "FALHOU"}] ${name}`,
        `original=${plaintext.length}`,
        `cifrado=${ciphertext.length}`,
    );

    if (!passed) {
        throw new Error(`Falha no teste: ${name}`);
    }
}

async function main(): Promise<void> {
    const key = crypto.getRandomValues(new Uint8Array(32));
    const iv = crypto.getRandomValues(new Uint8Array(16));

    const text = new TextEncoder().encode(
        "SafeChat: teste do módulo Camellia."
    );

    const binary = new Uint8Array([
        0, 1, 2, 127, 128, 254, 255, 0, 42,
    ]);

    const large = crypto.getRandomValues(new Uint8Array(16_384));

    await runTest("Texto UTF-8", text, key, iv);
    await runTest("Bytes binários", binary, key, iv);

    // Usa outra chave e outro IV para o terceiro teste.
    const largeKey = crypto.getRandomValues(new Uint8Array(32));
    const largeIv = crypto.getRandomValues(new Uint8Array(16));

    await runTest("Mensagem de 16 KiB", large, largeKey, largeIv);

    console.log("Todos os testes do módulo foram concluídos.");
}

main().catch((error: unknown) => {
    console.error("Falha no teste do módulo:", error);
});
