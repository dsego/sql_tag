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

  parametrize(type = "sql") {
    const strings = [...this.strings];
    const values = [...this.values];
    let i = 0;
    let query = "";
    let params = [];
    while (i < strings.length) {
      query += strings[i];
      if (values[i]) {
        if (values[i] instanceof SqlStatement) {
          strings.splice(i + 1, 0, ...values[i].strings);
          values.splice(i, 1, undefined, ...values[i].values, undefined);
        } else if (Object.hasOwn(values[i], "identifier")) {
          const delimiter = type === "mysql" ? "`" : '"';
          query += escape(values[i].identifier, delimiter);
        } else if (Object.hasOwn(values[i], "raw")) {
          query += values[i].raw;
        } else {
          if (type === "pg") {
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

sql.raw = (raw) => {
  return { raw };
};

sql.identifier = (identifier) => {
  return { identifier };
};
