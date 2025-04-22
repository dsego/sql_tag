<img width="200px" style src="https://github.com/dsego/sql_tag/raw/main/media/sql_tag.svg" />

## `sql` tag

JS tagged template literals for prepared SQL statements.

```js
const q = sql`SELECT * FROM table WHERE foo = ${foo} AND bar = ${bar}`;
// => {
//      query: 'SELECT * FROM table WHERE foo = ? AND bar = ?',
//      params: [foo, bar]
//    }
```

Use numbered placeholders:

```js
import { pgsql as sql } from "https://deno.land/x/sql_tag/mod.js";
const q = sql`SELECT * FROM table WHERE foo = ${foo} AND bar = ${bar}`;
// => {
//      query: 'SELECT * FROM table WHERE foo = $1 AND bar = $2',
//      params: [foo, bar]
//    }
```

Also supports arrays:

```js
sql`SELECT * FROM table WHERE foo IN ${[1, 2, 3]}`;
// => {
//      query: 'SELECT * FROM table WHERE foo IN (?, ?, ?)',
//      params: [1, 2, 3]
//    }
```

#### Interpolating raw values with `sql.raw`

> Raw values are not sanitized or escaped in any way!!!

```js
const q = sql`SELECT ${sql.raw(1)}`;
// => SELECT 1
```

#### Escaping identifiers with `sql.identifier`

SQL identifiers are not parameterized. They can be escaped via `sql.identifier`:

```js
const table = "schema.table";
const q = sql`SELECT * FROM ${sql.identifier(table)}`;
// => SELECT * FROM "schema"."table"

const q = mysql`SELECT * FROM ${sql.identifier(table)}`;
// => SELECT * FROM `schema`.`table`
```

#### Statements can be nested

Useful for building dynamic queries.

```js
const q = sql`SELECT * FROM student WHERE score > (${sql
  `SELECT avg(score) FROM student WHERE subject = ${subject}`})`;

// => {
//      query: 'SELECT * FROM student WHERE grade > (
//        SELECT avg(grade) FROM student WHERE subject = ?
//      )',
//      params: [subject]
//    }
```

#### Append statements

Build complex queries depending on conditionals.

```js
const query = sql`SELECT * FROM table`;
if (foo) {
  query.append(sql`WHERE foo = ${foo}`);
}

// => { query: 'SELECT * FROM table WHERE foo = ?', params: [foo]}
```

#### Join statements with `sql.join(statements, glue)`

Join a list of sql statements with a glue string.

```js
const query = sql`UPDATE table SET ${
  sql.join([
    sql`col1 = ${foo}`,
    sql`col2 = ${bar}`,
  ], ", ")
} WHERE id = ${id}`;
// => {
//      query: 'UPDATE table SET col1 = ?, col2 = ? WHERE id = ?',
//      params: [foo, bar, id]
//    }

const query = sql`SELECT * FROM table WHERE ${
  sql.join([
    sql`col1 = ${foo}`,
    sql`col2 = ${bar}`,
    sql`col3 = ${baz}`,
  ], " AND ")
}`;
// => {
//      query: 'SELECT * FROM table WHERE col1 = ? AND col2 = ? AND col3 = ?',
//      params: [foo, bar, baz]
//    }
```

#### Join statements with shortcuts

Join a list of sql statements with `sql.and`, `sql.or`, `sql.comma`. The AND/OR
statements are also wrapped in parentheses for easy nesting.

```js
const query = sql`UPDATE table SET
  ${sql.comma(sql`col1 = ${foo}`, sql`col2 = ${bar}`)}
  WHERE id = ${id}`;
// => {
//      query: 'UPDATE table SET col1 = ?, col2 = ? WHERE id = ?',
//      params: [foo, bar, id]
//    }

const query = sql`SELECT * FROM table WHERE ${
  sql.and(
    sql`col1 = ${foo}`,
    sql`col2 = ${bar}`,
    sql`col3 = ${baz}`,
  )
}`;
// => {
//      query: 'SELECT * FROM table WHERE (col1 = ? AND col2 = ? AND col3 = ?)',
//      params: [foo, bar, baz]
//    }
```

### Tests

##### Unit tests

`deno test tests/unit.test.js`.

##### Integrations tests

- Require `docker-compose up` to start the database server instances for mysql
  and postgres.
- Then run with:
  `deno test tests/integration.test.js --unstable --allow-read --allow-env --allow-net --allow-write --no-check`

### Inspired by

- [Slonik](https://github.com/gajus/slonik#slonik-sql-tag)
- [SQL Template Strings](https://github.com/felixfbecker/node-sql-template-strings)
