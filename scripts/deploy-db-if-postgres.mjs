import { spawnSync } from "node:child_process";

const databaseUrl = process.env.DATABASE_URL || "";

if (!databaseUrl.startsWith("postgres://") && !databaseUrl.startsWith("postgresql://")) {
  console.log("DATABASE_URL nao e Postgres; pulando prisma migrate deploy.");
  process.exit(0);
}

const result = spawnSync(
  "npx",
  ["prisma", "migrate", "deploy", "--schema=prisma/postgres/schema.prisma"],
  {
    shell: true,
    stdio: "inherit"
  }
);

process.exit(result.status ?? 1);
