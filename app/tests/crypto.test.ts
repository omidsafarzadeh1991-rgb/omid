import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, maskSecret } from "@/lib/crypto";

describe("encryptSecret / decryptSecret", () => {
  it("round-trips a plaintext token", () => {
    const token = "123456:AAF-fake-telegram-bot-token";
    const encrypted = encryptSecret(token);

    expect(encrypted).not.toBe(token);
    expect(decryptSecret(encrypted)).toBe(token);
  });

  it("produces different ciphertext for the same token each time", () => {
    const token = "same-token";
    const a = encryptSecret(token);
    const b = encryptSecret(token);

    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe(token);
    expect(decryptSecret(b)).toBe(token);
  });

  it("fails to decrypt tampered ciphertext", () => {
    const encrypted = encryptSecret("a-real-token");
    const tampered = encrypted.slice(0, -4) + "abcd";

    expect(() => decryptSecret(tampered)).toThrow();
  });
});

describe("maskSecret", () => {
  it("keeps only the last 4 characters visible", () => {
    expect(maskSecret("123456:AAF-fake-token")).toBe("••••oken");
  });

  it("fully masks very short strings", () => {
    expect(maskSecret("ab")).toBe("••••");
  });
});
