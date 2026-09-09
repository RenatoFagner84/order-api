const pool = require("../../db");

const clientesLer = async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM clientes"
  );

  res.writeHead(200, {
    "Content-Type": "application/json"
  });

  res.end(JSON.stringify(result.rows));
};

module.exports = clientesLer;