import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dbPath = join(root, "prisma", "dev.db");
const migrationPath = join(root, "prisma", "migrations", "202605011_init", "migration.sql");

mkdirSync(dirname(dbPath), { recursive: true });

const db = new DatabaseSync(dbPath);
db.exec("PRAGMA foreign_keys = ON;");
db.exec(readFileSync(migrationPath, "utf8"));
db.close();

console.log(`SQLite criado em ${dbPath}`);
