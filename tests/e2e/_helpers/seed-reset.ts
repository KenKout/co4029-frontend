import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { Client } from "pg";
import { databaseUrl } from "./env";

const HERE = dirname(fileURLToPath(import.meta.url));
const SEED_SQL_PATH = resolve(HERE, "..", "seed.sql");

const SEED_USER_IDS = [
  "00000000-0000-0000-0000-00000000aaaa",
  "00000000-0000-0000-0000-00000000bbbb",
  "00000000-0000-0000-0000-00000000cccc",
] as const;

const SEED_ORG_ID = "00000000-0000-0000-0000-00000000a001";
const SEED_COURSE_ID = "00000000-0000-0000-0000-00000000c001";
const SEED_MODULE_ID = "00000000-0000-0000-0000-00000000e001";
const SEED_LESSON_ID = "00000000-0000-0000-0000-00000000f001";

export async function resetSeed(): Promise<void> {
  const client = new Client({ connectionString: databaseUrl() });
  await client.connect();

  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.actor_id', $1, true);", [
      SEED_USER_IDS[0],
    ]);

    await client.query(
      "DELETE FROM course_enrollments WHERE course_id = $1 OR student_id = ANY($2::uuid[]);",
      [SEED_COURSE_ID, SEED_USER_IDS],
    );
    await client.query(
      "DELETE FROM lesson_resources WHERE lesson_id = $1;",
      [SEED_LESSON_ID],
    );
    await client.query("DELETE FROM lessons WHERE module_id = $1;", [
      SEED_MODULE_ID,
    ]);
    await client.query("DELETE FROM modules WHERE course_id = $1;", [
      SEED_COURSE_ID,
    ]);
    await client.query("DELETE FROM courses WHERE id = $1;", [SEED_COURSE_ID]);
    await client.query(
      "DELETE FROM user_role_assignments WHERE user_id = ANY($1::uuid[]);",
      [SEED_USER_IDS],
    );
    await client.query(
      "DELETE FROM organization_memberships WHERE user_id = ANY($1::uuid[]) OR organization_id = $2;",
      [SEED_USER_IDS, SEED_ORG_ID],
    );
    await client.query(
      "DELETE FROM user_profiles WHERE user_id = ANY($1::uuid[]);",
      [SEED_USER_IDS],
    );
    await client.query(
      "DELETE FROM auth_sessions WHERE user_id = ANY($1::uuid[]);",
      [SEED_USER_IDS],
    );

    await client.query(
      "UPDATE users SET status = 'active' WHERE id = ANY($1::uuid[]) AND status <> 'active';",
      [SEED_USER_IDS],
    );
    await client.query(
      "UPDATE organizations SET status = 'active' WHERE id = $1 AND status <> 'active';",
      [SEED_ORG_ID],
    );

    await client.query("COMMIT");

    const sql = await readFile(SEED_SQL_PATH, "utf8");
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    await client.end();
  }
}
