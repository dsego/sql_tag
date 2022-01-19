## `sql` tag

JS tagged template literals for prepared SQL statements.

```js
const q = sql`SELECT * FROM table WHERE foo = ${foo} AND bar = ${bar}`;
q.prepare();
// => ['SELECT * FROM table WHERE foo = ? AND bar = ?, [foo, bar]]

// use numbered placeholders
q.prepare("pg");
// => ['SELECT * FROM table WHERE foo = $1 AND bar = $2, [foo, bar]]

// also supports arrays
sql`SELECT * FROM table WHERE foo IN ${[1, 2, 3]}`;
q.prepare();
// => ['SELECT * FROM table WHERE foo IN (?, ?, ?), [1, 2, 3]]
```

#### Interpolating raw values with `sql.raw`

> Raw values are not sanitized or escaped in any way!!!

```js
const q = sql`SELECT ${sql.raw(1)}`;
q.prepare();
// => SELECT 1
```

#### Escaping identifiers with `sql.identifier`

SQL identifiers are not parameterized. They can be escaped via `sql.identifier`:

```js
const table = "schema.table";
const q = sql`SELECT * FROM ${sql.identifier(table)}`;
q.prepare();
// => SELECT * FROM "schema"."table"

q.prepare("mysql");
// => SELECT * FROM `schema`.`table`
```

#### Statements can be nested

Useful for building dynamic queries.

```js
const q = sql`SELECT * FROM student WHERE score > (${sql
  `SELECT avg(score) FROM student WHERE subject = ${subject}`})`;
q.prepare();
// => [SELECT * FROM student WHERE grade > (
//      SELECT avg(grade) FROM student WHERE subject = ?
//    ),
//   [subject]]
```

#### Append statements or strings

Useful for building complex queries depending on conditions.

```js
const query = svg`SELECT * FROM table`;
if (foo) {
  query.append(svg`WHERE foo = ${foo}`);
}
query.prepare();
// => [SELECT * FROM table WHERE foo = ?, [foo]]
```

### Tests

Unit tests: `deno test tests/unit.test.js`.\
Integrations tests require `docker-compose up` to start the database server
instances for mysql and postgres.\
Then run with:\
`deno test tests/integration.test.js --unstable --allow-read --allow-env --allow-net --allow-write --no-check`

### Inspired by

- [Slonik](https://github.com/gajus/slonik)
- [SQL Template Strings](https://github.com/felixfbecker/node-sql-template-strings)
