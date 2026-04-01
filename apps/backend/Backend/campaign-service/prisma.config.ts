import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url:
      process.env["DATABASE_URL"] ??
      `postgresql://${process.env["DB_USER"] ?? "campaign_user"}:${process.env["DB_PASSWORD"] ?? "change_me"}@${process.env["DB_HOST"] ?? "localhost"}:${process.env["DB_PORT"] ?? "5433"}/${process.env["DB_NAME"] ?? "campaign"}?schema=public`,
  },
});
