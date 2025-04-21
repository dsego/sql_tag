import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std/testing/asserts.ts";
import { mysql, pgsql, sql } from "../mod.js";

Deno.test("simple query", () => {
  const { query, params } = sql`SELECT * FROM customer`;
  assertEquals(query, "SELECT * FROM customer");
  assertEquals(params, []);
});

Deno.test("query with values", () => {
  const active = true;
  const date = "2021-01-09";
  const example = sql`
    SELECT * FROM account
    WHERE created_at > ${date}
    AND is_active = ${active}`;

  assertEquals(
    example.query,
    `
    SELECT * FROM account
    WHERE created_at > ?
    AND is_active = ?`,
  );
  assertEquals(example.params, [date, active]);

  const pgExample = pgsql`
    SELECT * FROM account
    WHERE created_at > ${date}
    AND is_active = ${active}`;

  assertEquals(
    pgExample.query,
    `
    SELECT * FROM account
    WHERE created_at > $1
    AND is_active = $2`,
  );
});

Deno.test("query with raw value", () => {
  const raw = 123;
  const example = sql`SELECT ${sql.raw(raw)}`;
  assertEquals(example.query, "SELECT 123");
  assertEquals(example.params, []);
});

Deno.test("sql identifier", () => {
  const example = sql`SELECT * FROM ${sql.identifier("table")}`;
  assertEquals(example.query, 'SELECT * FROM "table"');
  assertEquals(example.params, []);

  const mysqlExample = mysql`SELECT * FROM ${sql.identifier("table")}`;
  assertEquals(mysqlExample.query, "SELECT * FROM `table`");
});

Deno.test("sql identifier containing separator", () => {
  const example = sql`SELECT * FROM ${sql.identifier("schema.table")}`;
  assertEquals(example.query, 'SELECT * FROM "schema"."table"');
  assertEquals(example.params, []);

  const mysqlExample = mysql`SELECT * FROM ${sql.identifier("schema.table")}`;
  assertEquals(mysqlExample.query, "SELECT * FROM `schema`.`table`");
});

Deno.test("sql identifier containing escapes", () => {
  const example = sql`SELECT * FROM ${sql.identifier('new"table')}`;
  assertEquals(example.query, 'SELECT * FROM "new""table"');
  assertEquals(example.params, []);
});

Deno.test("mysql identifier containing escapes", () => {
  const example = mysql`SELECT * FROM ${sql.identifier("new`table")}`;
  assertEquals(example.query, "SELECT * FROM `new``table`");
  assertEquals(example.params, []);
});

Deno.test("sql identifier containing escapes and separator", () => {
  const example = sql`SELECT * FROM ${sql.identifier('schema.new"table')}`;
  assertEquals(example.query, 'SELECT * FROM "schema"."new""table"');
  assertEquals(example.params, []);
});

Deno.test("array values", () => {
  const example = sql`SELECT * FROM table WHERE col1 IN ${[
    1,
    2,
    3,
  ]} AND col2 = ${"foo"}`;
  assertEquals(
    example.query,
    "SELECT * FROM table WHERE col1 IN (?, ?, ?) AND col2 = ?",
  );
  assertEquals(example.params, [1, 2, 3, "foo"]);

  const pgExample = pgsql`SELECT * FROM table WHERE col1 IN ${[
    1,
    2,
    3,
  ]} AND col2 = ${"foo"}`;
  assertEquals(
    pgExample.query,
    "SELECT * FROM table WHERE col1 IN $1 AND col2 = $2",
  );
  assertEquals(pgExample.params, [[1, 2, 3], "foo"]);
});

Deno.test("nested statement", () => {
  const inner2 = sql`SELECT MAX(col2) FROM table`;
  const inner1 = sql`SELECT AVG(col1) FROM table WHERE col1 > (${inner2})`;
  const example = sql`SELECT * FROM table WHERE col1 > (${inner1})`;
  assertEquals(
    example.query,
    "SELECT * FROM table WHERE col1 > (" +
      "SELECT AVG(col1) FROM table WHERE col1 > (" +
      "SELECT MAX(col2) FROM table))",
  );
  assertEquals(example.params, []);
});

Deno.test("nested statement with values", () => {
  const foo = "foo";
  const bar = "bar";
  const inner1 = sql`SELECT SUM(*) FROM table WHERE foo = ${foo}`;
  const example = sql
    `SELECT * FROM table WHERE col > (${inner1}) AND bar = ${bar}`;
  assertEquals(
    example.query,
    "SELECT * FROM table WHERE col > (" +
      "SELECT SUM(*) FROM table WHERE foo = ?) " +
      "AND bar = ?",
  );
  assertEquals(example.params, [foo, bar]);
});

Deno.test("append sql statement", () => {
  const example = sql`SELECT col FROM table`;
  const foo = "foo";

  example.append(sql`WHERE col > ${foo}`)
    .append(sql`ORDER BY col DESC`);

  assertEquals(
    example.query,
    "SELECT col FROM table WHERE col > ? ORDER BY col DESC",
  );
  assertEquals(example.params, ["foo"]);
});

Deno.test("appending other stuff throws", () => {
  const example = sql`SELECT col FROM table`;
  assertThrows(() => example.append(""));
  assertThrows(() => example.append(123));
  assertThrows(() => example.append(() => null));
  assertThrows(() => example.append(new Date()));
});

Deno.test("join sql statements", () => {
  const example = sql.join([
    sql`col1 = ${"foo"}`,
    sql`col2 = ${"bar"}`,
  ], " AND ");

  assertEquals(example.query, "col1 = ? AND col2 = ?");
  assertEquals(example.params, ["foo", "bar"]);
});

Deno.test("and sql statements", () => {
  const example = sql.and(
    sql`col1 = ${"foo"}`,
    sql`col2 = ${"bar"}`,
  );

  assertEquals(example.query, "(col1 = ? AND col2 = ?)");
  assertEquals(example.params, ["foo", "bar"]);
});

Deno.test("and sql statements", () => {
  const example = sql.or(
    sql`col1 = ${"foo"}`,
    sql`col2 = ${"bar"}`,
    sql.and(sql`a`, sql`b`),
  );
  assertEquals(example.query, "(col1 = ? OR col2 = ? OR (a AND b))");
  assertEquals(example.params, ["foo", "bar"]);
});

Deno.test("comma sql statements", () => {
  const example = sql.comma(
    sql`col1 = ${"foo"}`,
    sql`col2 = ${"bar"}`,
  );

  assertEquals(example.query, "col1 = ?, col2 = ?");
  assertEquals(example.params, ["foo", "bar"]);
});
