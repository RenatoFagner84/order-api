const pool = require("../../db");

const produtosLer = async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM produtos"
  );

  res.writeHead(200, {
    "Content-Type": "application/json"
  });

  res.end(JSON.stringify(result.rows));
};

module.exports = produtosLer;