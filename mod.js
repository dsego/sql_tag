const escape = (value, delimiter) => (
  delimiter +
  String(value)
    .replace(delimiter, delimiter + delimiter)
    .replace(".", `${delimiter}.${delimiter}`) +
  delimiter
);

class SqlStatement {
  // target "" | "mysql" | "pgsql"
  constructor(strings = [], values = [], target = "") {
    let i = 0;
    let query = "";
    let params = [];

    while (i < strings.length) {
      query += strings[i];

      if (i < values.length) {
        // support nested tagged template literals
        if (values[i] instanceof SqlStatement) {
          query += values[i].query;
          params = params.concat(values[i].params);

          // escape sql identifiers
        } else if (values[i] instanceof SqlIdentifier) {
          const delimiter = target === "mysql" ? "`" : '"';
          query += escape(values[i].toString(), delimiter);

          // embed raw strings
        } else if (values[i] instanceof SqlRawValue) {
          query += values[i].toString();

          // parametrize values
        } else {
          if (target === "pgsql") {
            query += `\$${i + 1}`;
            params.push(values[i]);
          } else {
            if (Array.isArray(values[i])) {
              query += `(${values[i].map((_) => "?").join(", ")})`;
              params.push(...values[i]);
            } else {
              query += "?";
              params.push(values[i]);
            }
          }
        }
      }
      i += 1;
    }

    this.query = query;
    this.params = params;
  }

  parenWrap() {
    this.query = `(${this.query})`;
    return this;
  }

  append(statement) {
    if (!(statement instanceof SqlStatement)) {
      throw new Error("you can only append sql statements");
    }
    this.query += " " + statement.query;
    this.params = this.params.concat(statement.params);
    return this;
  }
}

export function sql(strings, ...values) {
  return new SqlStatement(strings, values);
}

export function mysql(strings, ...values) {
  return new SqlStatement(strings, values, "mysql");
}

export function pgsql(strings, ...values) {
  return new SqlStatement(strings, values, "pgsql");
}

class SqlValueWrapper {
  constructor(value) {
    this.value = value;
  }
  valueOf() {
    return this.value;
  }
  toString() {
    return String(this.value);
  }
}
class SqlRawValue extends SqlValueWrapper {}
class SqlIdentifier extends SqlValueWrapper {}

sql.raw = (v) => new SqlRawValue(v);
sql.identifier = (v) => new SqlIdentifier(v);
sql.table = (v) => new SqlIdentifier(v);
sql.column = (v) => new SqlIdentifier(v);

// accepts a list of SqlStatement objects and a glue string
sql.join = (statements, glue = "") => {
  let queries = [];
  let values = [];

  for (const s of statements) {
    if (!(s instanceof SqlStatement)) {
      throw new Error("you can only join sql statements");
    }
    queries = queries.concat(s.query);
    values = values.concat(s.params);
  }

  const result = new SqlStatement();
  result.query = queries.join(glue);
  result.params = values;
  return result;
};

sql.and = (...statements) => sql.join(statements, " AND ").parenWrap();
sql.or = (...statements) => sql.join(statements, " OR ").parenWrap();
sql.comma = (...statements) => sql.join(statements, ", ");
