import initSqlJs from 'sql.js';

async function run() {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  db.run("CREATE TABLE test (id int, name char)");
  db.run("INSERT INTO test VALUES (1, 'hello')");
  
  try {
    // Try passing params to exec
    const result = db.exec("SELECT * FROM test WHERE name = ?", ["hello"]);
    console.log("exec result:", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("exec error:", err.message);
  }
}
run();
