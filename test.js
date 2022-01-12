import { assertEquals } from "https://deno.land/std/testing/asserts.ts";
import sql from "./mod.js";

Deno.test("simple query", () => {
  const stmt = sql`SELECT * FROM customer`;
  assertEquals(stmt.parametrize(), ["SELECT * FROM customer", []]);
});

Deno.test("query with values", () => {
  const active = true;
  const date = "2021-01-09";
  const stmt = sql`
    SELECT * FROM account
    WHERE created_at > ${date}
    AND is_active = ${active}`;

  const [query, values] = stmt.parametrize();

  assertEquals(
    query,
    `
    SELECT * FROM account
    WHERE created_at > ?
    AND is_active = ?`,
  );
  assertEquals(values, [date, active]);
  assertEquals(
    stmt.parametrize("pg")[0],
    `
    SELECT * FROM account
    WHERE created_at > $1
    AND is_active = $2`,
  );
});

Deno.test("query with raw value", () => {
  const raw = 123;
  const stmt = sql`SELECT ${sql.raw(raw)}`;
  const [query, values] = stmt.parametrize();
  assertEquals(query, "SELECT 123");
  assertEquals(values, []);
});

Deno.test("sql identifier", () => {
  const stmt = sql`SELECT * FROM ${sql.identifier("table")}`;
  const [query, values] = stmt.parametrize();
  assertEquals(query, 'SELECT * FROM "table"');
  assertEquals(values, []);

  const [mysql_query, _] = stmt.parametrize("mysql");
  assertEquals(mysql_query, "SELECT * FROM `table`");
});

Deno.test("sql identifier containing separator", () => {
  const stmt = sql`SELECT * FROM ${sql.identifier("schema.table")}`;
  const [query, values] = stmt.parametrize();
  assertEquals(query, 'SELECT * FROM "schema"."table"');
  assertEquals(values, []);

  const [mysql_query, _] = stmt.parametrize("mysql");
  assertEquals(mysql_query, "SELECT * FROM `schema`.`table`");
});

Deno.test("sql identifier containing escapes", () => {
  const stmt = sql`SELECT * FROM ${sql.identifier('new"table')}`;
  const [query, values] = stmt.parametrize();
  assertEquals(query, 'SELECT * FROM "new""table"');
  assertEquals(values, []);
});

Deno.test("mysql identifier containing escapes", () => {
  const stmt = sql`SELECT * FROM ${sql.identifier("new`table")}`;
  const [query, values] = stmt.parametrize("mysql");
  assertEquals(query, "SELECT * FROM `new``table`");
  assertEquals(values, []);
});

Deno.test("sql identifier containing escapes and separator", () => {
  const stmt = sql`SELECT * FROM ${sql.identifier('schema.new"table')}`;
  const [query, values] = stmt.parametrize();
  assertEquals(query, 'SELECT * FROM "schema"."new""table"');
  assertEquals(values, []);
});

Deno.test("array values", () => {
  const stmt = sql`SELECT * FROM table WHERE col1 IN ${[
    1,
    2,
    3,
  ]} AND col2 = ${"foo"}`;
  assertEquals(
    stmt.parametrize(),
    ["SELECT * FROM table WHERE col1 IN (?, ?, ?) AND col2 = ?", [
      1,
      2,
      3,
      "foo",
    ]],
  );
  assertEquals(
    stmt.parametrize("pg"),
    ["SELECT * FROM table WHERE col1 IN $1 AND col2 = $2", [[1, 2, 3], "foo"]],
  );
});

Deno.test("nested statement", () => {
  const inner2 = sql`SELECT MAX(col2) FROM table`;
  const inner1 = sql`SELECT AVG(col1) FROM table WHERE col1 > (${inner2})`;
  const stmt = sql`SELECT * FROM table WHERE col1 > (${inner1})`;
  const [query, values] = stmt.parametrize();
  assertEquals(
    query,
    "SELECT * FROM table WHERE col1 > (" +
      "SELECT AVG(col1) FROM table WHERE col1 > (" +
      "SELECT MAX(col2) FROM table))",
  );
  assertEquals(values, []);
});

Deno.test("nested statement with values", () => {
  const foo = "foo";
  const bar = "bar";
  const inner1 = sql`SELECT SUM(*) FROM table WHERE foo = ${foo}`;
  const stmt = sql
    `SELECT * FROM table WHERE col > (${inner1}) AND bar = ${bar}`;
  const [query, values] = stmt.parametrize();
  assertEquals(
    query,
    "SELECT * FROM table WHERE col > (" +
      "SELECT SUM(*) FROM table WHERE foo = ?) " +
      "AND bar = ?",
  );
  assertEquals(values, [foo, bar]);
});

Deno.test("append string", () => {
  const stmt = sql`SELECT col FROM table`;
  stmt.append("ORDER BY col DESC");
  assertEquals(stmt.parametrize(), [
    "SELECT col FROM table ORDER BY col DESC",
    [],
  ]);
});

Deno.test("append sql statement", () => {
  const stmt = sql`SELECT col FROM table`;
  const foo = "foo";

  stmt.append(sql`WHERE col > ${foo}`)
    .append(sql`ORDER BY col DESC`);

  assertEquals(stmt.parametrize(), [
    "SELECT col FROM table WHERE col > ? ORDER BY col DESC",
    ["foo"],
  ]);
});
