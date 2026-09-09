const pool = require("../../db");

const produtosAtualizar = async (req, res) => {
  const id = req.url.split("/")[3];

  let body = "";

  return new Promise((resolve, reject) => {
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      const dados = JSON.parse(body);

      const { nome, quantidade } = dados;

      const produtoExiste = await pool.query(
        "SELECT * FROM produtos WHERE id = $1",
        [id]
      );

      if (produtoExiste.rows.length === 0) {
        res.writeHead(404, {
          "Content-Type": "application/json"
        });

        res.end(JSON.stringify({
          mensagem: "Produto não encontrado"
        }));

        resolve();
        return;
      }

      const nomeExiste = await pool.query(
        "SELECT * FROM produtos WHERE nome = $1 AND id != $2",
        [nome, id]
      );

      if (nomeExiste.rows.length > 0) {
        res.writeHead(400, {
          "Content-Type": "application/json"
        });

        res.end(JSON.stringify({
          mensagem: "Este produto já está cadastrado"
        }));

        resolve();
        return;
      }

      const result = await pool.query(
        `UPDATE produtos
         SET nome = $1,
             quantidade = $2
         WHERE id = $3
         RETURNING *`,
        [
          nome,
          quantidade,
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

module.exports = produtosAtualizar;