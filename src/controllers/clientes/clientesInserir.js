const pool = require("../../db");

const clientesInserir = async (req, res) => {
  let body = "";

  req.on("data", (chunk) => {
    body += chunk.toString();
  });

  req.on("end", async () => {
    const dados = JSON.parse(body);

    const { nome, email, telefone } = dados;

    const usuarioExiste = await pool.query(
      "SELECT * FROM clientes WHERE email = $1",
      [email]
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
      "INSERT INTO clientes (nome, email, telefone) VALUES ($1, $2, $3) RETURNING *",
      [nome, email, telefone || null]
    );

    res.writeHead(201, {
      "Content-Type": "application/json"
    });

    res.end(JSON.stringify(resultado.rows[0]));
  });
};

module.exports = clientesInserir;
