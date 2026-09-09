const pool = require("../../db");

const clientesDeletar = async (req, res) => {
  const id = req.url.split("/")[3];

  const result = await pool.query(
    "DELETE FROM clientes WHERE id = $1 RETURNING *",
    [id]
  );

  if (result.rows.length === 0) {
    res.writeHead(404, {
      "Content-Type": "application/json"
    });

    res.end(JSON.stringify({
      mensagem: "Cliente não encontrado"
    }));

    return;
  }

  res.writeHead(200, {
    "Content-Type": "application/json"
  });

  res.end(JSON.stringify({
    mensagem: "Cliente deletado com sucesso",
    cliente: result.rows[0]
  }));
};

module.exports = clientesDeletar;