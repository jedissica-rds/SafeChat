// camellia.ts
import { opensslmod } from "openssl-browser";

const KEY_LENGTH = 32;
const IV_LENGTH = 16;

type OpenSSLInstance = ReturnType<typeof opensslmod>;

let instancePromise: Promise<OpenSSLInstance> | undefined;

// Serializa operações para evitar colisões nos arquivos temporários
// do sistema de arquivos virtual do WebAssembly.
let operationQueue: Promise<void> = Promise.resolve();

async function getOpenSSL(): Promise<OpenSSLInstance> {
    if (!instancePromise) {
        instancePromise = (async () => {
            const openssl = opensslmod({ echo: false, df: false });

            // Inicializa o módulo WASM antes de acessar seus arquivos.
            await openssl.run("-v");

            return openssl;
        })().catch((error: unknown) => {
            instancePromise = undefined;
            throw error;
        });
    }

    return instancePromise;
}

function toHex(bytes: Uint8Array): string {
    return Array.from(bytes, (byte) =>
        byte.toString(16).padStart(2, "0")
    ).join("");
}

function validateInputs(
    input: Uint8Array,
    key: Uint8Array,
    iv: Uint8Array
): void {
    if (!(input instanceof Uint8Array)) {
        throw new TypeError("O conteúdo deve ser um Uint8Array.");
    }

    if (!(key instanceof Uint8Array) || key.length !== KEY_LENGTH) {
        throw new RangeError("A chave Camellia deve ter 32 bytes.");
    }

    if (!(iv instanceof Uint8Array) || iv.length !== IV_LENGTH) {
        throw new RangeError("O IV Camellia deve ter 16 bytes.");
    }
}

async function execute(
    input: Uint8Array,
    key: Uint8Array,
    iv: Uint8Array,
    decrypt: boolean
): Promise<Uint8Array> {
    validateInputs(input, key, iv);

    const openssl = await getOpenSSL();

    const inputPath = "/safechat-input.bin";
    const outputPath = "/safechat-output.bin";

    const written = await openssl.writefile.uint8(
        inputPath,
        new Uint8Array(input)
    );

    if (written.error) {
        throw new Error(`Não foi possível gravar a entrada: ${written.error}`);
    }

    const direction = decrypt ? " -d" : "";
    const command =
        `enc -camellia-256-ctr${direction}` +
        ` -K ${toHex(key)}` +
        ` -iv ${toHex(iv)}` +
        ` -in ${inputPath}` +
        ` -out ${outputPath}`;

    await openssl.run(command);

    const result = openssl.readfile.uint8(outputPath);

    if (result.error || !result.uint8) {
        throw new Error(
            `Não foi possível ler a saída criptográfica: ${result.error ?? "saída vazia"}`
        );
    }

    // Retorna uma cópia independente do buffer interno do WASM.
    return new Uint8Array(result.uint8);
}

function enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = operationQueue.then(operation);

    operationQueue = result.then(
        () => undefined,
        () => undefined
    );

    return result;
}

/**
 * Criptografa bytes com Camellia-256-CTR.
 *
 * A chave deve ter 32 bytes e o IV, 16 bytes.
 * O IV não deve ser reutilizado com a mesma chave.
 */
export function encryptCamellia(
    plaintext: Uint8Array,
    key: Uint8Array,
    iv: Uint8Array
): Promise<Uint8Array> {
    return enqueue(() => execute(plaintext, key, iv, false));
}

/**
 * Descriptografa bytes com Camellia-256-CTR.
 *
 * Esta função não verifica a autenticidade do conteúdo.
 * A aplicação deve verificar o HMAC antes de confiar na mensagem.
 */
export function decryptCamellia(
    ciphertext: Uint8Array,
    key: Uint8Array,
    iv: Uint8Array
): Promise<Uint8Array> {
    return enqueue(() => execute(ciphertext, key, iv, true));
}
