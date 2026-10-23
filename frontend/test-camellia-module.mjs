import { opensslmod } from "openssl-browser";

const openssl = opensslmod({ echo: false });
await openssl.run("-v");

const key = crypto.getRandomValues(new Uint8Array(32));
const iv = crypto.getRandomValues(new Uint8Array(16));
const original = new TextEncoder().encode("SafeChat module test");

const toHex = (bytes) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

await openssl.writefile.uint8("/safechat-input.bin", original);

await openssl.run(
  `enc -camellia-256-ctr -K ${toHex(key)} -iv ${toHex(iv)} ` +
  "-in /safechat-input.bin -out /safechat-output.bin"
);

const encrypted = openssl.readfile.uint8("/safechat-output.bin");

if (encrypted.error || !encrypted.uint8) {
  throw new Error("Falha na criptografia: " + encrypted.error);
}

await openssl.writefile.uint8("/safechat-input.bin", encrypted.uint8);

await openssl.run(
  `enc -camellia-256-ctr -d -K ${toHex(key)} -iv ${toHex(iv)} ` +
  "-in /safechat-input.bin -out /safechat-output.bin"
);

const decrypted = openssl.readfile.uint8("/safechat-output.bin");

if (decrypted.error || !decrypted.uint8) {
  throw new Error("Falha na descriptografia: " + decrypted.error);
}

const matches =
  original.length === decrypted.uint8.length &&
  original.every((byte, i) => byte === decrypted.uint8[i]);

console.log("Camellia module test:", matches ? "PASSOU" : "FALHOU");

if (!matches) {
  throw new Error("Os bytes recuperados não correspondem aos originais.");
}