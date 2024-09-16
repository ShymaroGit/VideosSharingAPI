const mysql = require("mysql");
const { DB_HOST, DB_USER, DB_NAME, DB_PASS } = process.env;
const connection = mysql.createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASS,
  database: DB_NAME,
  connectionLimit: 11,
  port: 3306,
  connectTimeout: 28800,
});

connection.getConnection((err, connected) => {
  try {
    if (err) throw err;
    console.log(
      `Connected to mysql DB: \x1b[32m${DB_NAME}\x1b[0m with user \x1b[31m${DB_USER}\x1b[0m@\x1b[33m${DB_HOST}\x1b[0m`
    );
    connected.release();
  } catch (error) {
    console.log(error);
  }
});

const queryDB = (query, values) => {
  return new Promise((resolve, reject) => {
    connection.query(query, values, (err, results, fields) => {
      if (err) {
        return reject({ msg: err.sqlMessage, code: err.code, sql: err.sql });
      }

      fields = Array.isArray(fields[0]) ? fields[0] : fields;

      fields = fields
        .map((f) => (typeof f != "undefined" ? f.name : null))
        .filter((f) => f != null);

      results = Array.isArray(results[0]) ? results[0] : results;
      //results.forEach((r) => console.log("type", typeof r));

      results = results
        .map((r) => (typeof r != "undefined" ? r : null))
        .filter((r) => r != null);

      resolve({ results, fields });
    });
  });
};

module.exports = { queryDB };
