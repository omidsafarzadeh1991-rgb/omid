import path from "node:path";

process.env.DATABASE_URL = `file:${path.resolve(__dirname, "../prisma/test.db")}`;
process.env.SUPERADMIN_PASSWORD ??= "test-superadmin-password";
process.env.TOKEN_ENCRYPTION_KEY ??= "test-token-encryption-key";
