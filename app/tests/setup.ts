import path from "node:path";

process.env.DATABASE_URL = `file:${path.resolve(__dirname, "../prisma/test.db")}`;
