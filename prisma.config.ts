import { defineConfig } from "prisma/config";
import "dotenv/config";

// Keeps `prisma db push` / `prisma studio` / `prisma db seed` config in one
// place instead of the deprecated `package.json#prisma` field.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
