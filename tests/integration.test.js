import { DB as Sqlite } from "https://deno.land/x/sqlite@v3.2.0/mod.ts";
import { Client as PgClient } from "https://deno.land/x/postgres@v0.15.0/mod.ts";
import { Client as MysqlClient } from "https://deno.land/x/mysql@v2.10.2/mod.ts";
import { assertEquals } from "https://deno.land/std/testing/asserts.ts";
import sql from "../mod.js";

Deno.test("mysql", async () => {
  const db = await new MysqlClient().connect({
    username: "deno",
    password: "deno",
    db: "test",
  });

  const query = async (sql) => db.execute(...sql.prepare("mysql"));

  await query(sql`DROP TABLE IF EXISTS person`);
  await query(sql`CREATE TABLE person (name varchar(255), age int)`);
  await query(sql`INSERT INTO person (name, age)
    VALUES
    (${"Jay"}, ${34}),
    (${"Brian"}, ${19}),
    (${"Lizzy"}, ${72}),
    (${"Lara"}, ${45})
  `);

  const { rows } = await query(
    sql`SELECT * FROM person WHERE name LIKE ${"%L%"} and age > ${50}`,
  );
  assertEquals(rows, [{ name: "Lizzy", age: 72 }]);

  await db.close();
});

Deno.test("postgres", async () => {
  const db = new PgClient({
    hostname: "localhost",
    port: 5431,
    user: "deno",
    password: "deno",
    database: "test",
  });
  await db.connect();

  const query = async (q) => db.queryArray(...q.prepare("pg"));

  await query(sql`DROP TABLE IF EXISTS person`);
  await query(sql`CREATE TABLE person (name varchar(255), age int)`);
  await query(sql`INSERT INTO person (name, age)
    VALUES
    (${"Jay"}, ${34}),
    (${"Brian"}, ${19}),
    (${"Lizzy"}, ${72}),
    (${"Lara"}, ${45})
  `);

  const { rows } = await query(
    sql`SELECT * FROM person WHERE name LIKE ${"%L%"} and age > ${50}`,
  );
  assertEquals(rows, [["Lizzy", 72]]);
  await db.end();
});

Deno.test("sqlite", async () => {
  const query = async (q) => db.query(...q.prepare());
  const db = new Sqlite("./test.db");

  await query(sql`DROP TABLE IF EXISTS person`);
  await query(sql`CREATE TABLE person (name varchar(255), age int)`);
  await query(sql`INSERT INTO person (name, age)
    VALUES
    (${"Jay"}, ${34}),
    (${"Brian"}, ${19}),
    (${"Lizzy"}, ${72}),
    (${"Lara"}, ${45})
  `);

  const rows = await query(
    sql`SELECT * FROM person WHERE name LIKE ${"%L%"} and age > ${50}`,
  );
  assertEquals(rows, [["Lizzy", 72]]);
  db.close();
});
