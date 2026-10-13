const produtoRepository = require("../../repositories/produtoRepository");

const produtosAtualizar = async (req, res) => {
  const id = req.url.split("/")[3];

  let body = "";

  return new Promise((resolve, reject) => {
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      const dados = JSON.parse(body);

      const { nome, quantidade, valor } = dados;

      const produtoExiste = await produtoRepository.ler(id);

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

      const result = await produtoRepository.atualizar(
        id,
        nome,
        quantidade,
        valor
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