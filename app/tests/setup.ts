import path from "node:path";

process.env.DATABASE_URL = `file:${path.resolve(__dirname, "../prisma/test.db")}`;
process.env.SETUP_PASSWORD ??= "test-setup-password";
process.env.TOKEN_ENCRYPTION_KEY ??= "test-token-encryption-key";
