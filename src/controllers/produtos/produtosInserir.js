const pool = require("../../db");

const produtosInserir = async (req, res) => {
  let body = "";

  req.on("data", (chunk) => {
    body += chunk.toString();
  });

  req.on("end", async () => {
    const dados = JSON.parse(body);

    const { nome, quantidade } = dados;

    const usuarioExiste = await pool.query(
      "SELECT * FROM produtos WHERE nome = $1",
      [nome]
    );

    if (usuarioExiste.rows.length > 0) {
      res.writeHead(400, {
        "Content-Type": "application/json"
      });

      res.end(
        JSON.stringify({
          mensagem: "Usuário já existe"
        })
      );

      return;
    }

    const resultado = await pool.query(
      "INSERT INTO produtos (nome, quantidade) VALUES ($1, $2) RETURNING *",
      [nome, quantidade || null]
    );

    res.writeHead(201, {
      "Content-Type": "application/json"
    });

    res.end(JSON.stringify(resultado.rows[0]));
  });
};

module.exports = produtosInserir;
