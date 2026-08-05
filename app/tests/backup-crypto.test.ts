import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { randomBytes } from "node:crypto";
import { encryptFileStream, decryptFileStream, getOrCreateBackupFileKey } from "@/lib/backup-crypto";
import { createTestClinicWithDoctor } from "./helpers";

let tempDir: string;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "backup-crypto-test-"));
});

afterEach(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe("encryptFileStream / decryptFileStream", () => {
  it("round-trips an arbitrary binary file", async () => {
    const original = randomBytes(500_000);
    const srcPath = path.join(tempDir, "plain.bin");
    const encPath = path.join(tempDir, "enc.bin");
    const decPath = path.join(tempDir, "dec.bin");
    fs.writeFileSync(srcPath, original);

    const key = randomBytes(32);
    await encryptFileStream(srcPath, encPath, key);
    await decryptFileStream(encPath, decPath, key);

    expect(Buffer.compare(original, fs.readFileSync(decPath))).toBe(0);
  });

  it("round-trips a tiny (1-byte) and an empty file", async () => {
    const key = randomBytes(32);
    for (const size of [0, 1]) {
      const original = randomBytes(size);
      const srcPath = path.join(tempDir, `plain-${size}.bin`);
      const encPath = path.join(tempDir, `enc-${size}.bin`);
      const decPath = path.join(tempDir, `dec-${size}.bin`);
      fs.writeFileSync(srcPath, original);

      await encryptFileStream(srcPath, encPath, key);
      await decryptFileStream(encPath, decPath, key);

      expect(Buffer.compare(original, fs.readFileSync(decPath))).toBe(0);
    }
  });

  it("produces different ciphertext for the same content each time (random IV)", async () => {
    const original = randomBytes(1000);
    const srcPath = path.join(tempDir, "plain.bin");
    const encPathA = path.join(tempDir, "enc-a.bin");
    const encPathB = path.join(tempDir, "enc-b.bin");
    fs.writeFileSync(srcPath, original);

    const key = randomBytes(32);
    await encryptFileStream(srcPath, encPathA, key);
    await encryptFileStream(srcPath, encPathB, key);

    expect(Buffer.compare(fs.readFileSync(encPathA), fs.readFileSync(encPathB))).not.toBe(0);
  });

  it("rejects a tampered ciphertext (auth tag check fails)", async () => {
    const original = randomBytes(1000);
    const srcPath = path.join(tempDir, "plain.bin");
    const encPath = path.join(tempDir, "enc.bin");
    const decPath = path.join(tempDir, "dec.bin");
    fs.writeFileSync(srcPath, original);

    const key = randomBytes(32);
    await encryptFileStream(srcPath, encPath, key);

    const bytes = fs.readFileSync(encPath);
    bytes[20] ^= 0xff;
    fs.writeFileSync(encPath, bytes);

    await expect(decryptFileStream(encPath, decPath, key)).rejects.toThrow();
  });

  it("fails to decrypt with the wrong key", async () => {
    const original = randomBytes(1000);
    const srcPath = path.join(tempDir, "plain.bin");
    const encPath = path.join(tempDir, "enc.bin");
    const decPath = path.join(tempDir, "dec.bin");
    fs.writeFileSync(srcPath, original);

    await encryptFileStream(srcPath, encPath, randomBytes(32));
    await expect(decryptFileStream(encPath, decPath, randomBytes(32))).rejects.toThrow();
  });
});

describe("getOrCreateBackupFileKey", () => {
  it("creates a 32-byte key once and returns the same key on subsequent calls", async () => {
    const { clinic } = await createTestClinicWithDoctor();

    const first = await getOrCreateBackupFileKey(clinic.id);
    expect(first).toHaveLength(32);

    const second = await getOrCreateBackupFileKey(clinic.id);
    expect(Buffer.compare(first, second)).toBe(0);
  });

  it("uses a different key per clinic", async () => {
    const { clinic: clinicA } = await createTestClinicWithDoctor();
    const { clinic: clinicB } = await createTestClinicWithDoctor();

    const keyA = await getOrCreateBackupFileKey(clinicA.id);
    const keyB = await getOrCreateBackupFileKey(clinicB.id);

    expect(Buffer.compare(keyA, keyB)).not.toBe(0);
  });
});
