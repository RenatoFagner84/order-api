const pool = require("../../db");

const clientesAtualizar = async (req, res) => {
  const id = req.url.split("/")[3];

  let body = "";

  return new Promise((resolve, reject) => {
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      const dados = JSON.parse(body);

      const { nome, email, telefone } = dados;

      const clienteExiste = await pool.query(
        "SELECT * FROM clientes WHERE id = $1",
        [id]
      );

      if (clienteExiste.rows.length === 0) {
        res.writeHead(404, {
          "Content-Type": "application/json"
        });

        res.end(JSON.stringify({
          mensagem: "Cliente não encontrado"
        }));

        resolve();
        return;
      }

      const emailExiste = await pool.query(
        "SELECT * FROM clientes WHERE email = $1 AND id != $2",
        [email, id]
      );

      if (emailExiste.rows.length > 0) {
        res.writeHead(400, {
          "Content-Type": "application/json"
        });

        res.end(JSON.stringify({
          mensagem: "Este e-mail já está cadastrado"
        }));

        resolve();
        return;
      }

      const result = await pool.query(
        `UPDATE clientes
         SET nome = $1,
             email = $2,
             telefone = $3
         WHERE id = $4
         RETURNING *`,
        [
          nome,
          email,
          telefone || null,
          id
        ]
      );

      res.writeHead(200, {
        "Content-Type": "application/json"
      });

      res.end(JSON.stringify(result.rows[0]));

      resolve();
    });
  });
};

module.exports = clientesAtualizar;