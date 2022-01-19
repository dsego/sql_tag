const escape = (value, delimiter) => (
  delimiter +
  String(value)
    .replace(delimiter, delimiter + delimiter)
    .replace(".", `${delimiter}.${delimiter}`) +
  delimiter
);

class SqlStatement {
  constructor(strings, values) {
    this.strings = strings;
    this.values = values;
  }

  // target "" | "mysql" | "pg"
  prepare(target = "") {
    const strings = [...this.strings];
    const values = [...this.values];
    let i = 0;
    let query = "";
    let params = [];
    while (i < strings.length) {
      query += strings[i];

      if (i < values.length) {
        // support nested tagged template literals
        if (values[i] instanceof SqlStatement) {
          strings.splice(i + 1, 0, ...values[i].strings);
          values.splice(i, 1, sql.raw(""), ...values[i].values, sql.raw(""));

          // escape sql identifiers
        } else if (values[i] instanceof SqlIdentifier) {
          const delimiter = target === "mysql" ? "`" : '"';
          query += escape(values[i].toString(), delimiter);

          // embed raw strings
        } else if (values[i] instanceof SqlRawValue) {
          query += values[i].toString();

          // parametrize values
        } else {
          if (target === "pg") {
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
    return [query, params];
  }

  append(statement) {
    if (statement instanceof SqlStatement) {
      this.strings = [...this.strings, ...statement.strings];
      this.values = [...this.values, sql.raw(" "), ...statement.values];
    } else {
      this.strings = [...this.strings, String(statement)];
      this.values = [...this.values, sql.raw(" ")];
    }
    return this;
  }
}

export default function sql(strings, ...values) {
  return new SqlStatement(strings, values);
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
