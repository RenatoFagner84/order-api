const produtoRepository = require("../../repositories/produtoRepository");

const produtosInserir = async (req, res) => {
  let body = "";
let code = 201;
  req.on("data", (chunk) => {
    body += chunk.toString();
  });

  req.on("end", async () => {
    const dados = JSON.parse(body);

    const { nome, quantidade, valor } = dados;

    const produtoExiste = await produtoRepository.inserir(nome);

    if (produtoExiste.rows.length > 0) {
      res.writeHead(400, {
        "Content-Type": "application/json"
      });

      res.end(
        JSON.stringify({
          mensagem: "Produto já existe"
        })
      );

      return;
    }

    const resultado = await produtoRepository.inserirProduto(nome, quantidade, valor ); 

    res.writeHead(201, {
      "Content-Type": "application/json"
    });

    res.end(JSON.stringify(resultado.rows[0]));
  });
};

module.exports = produtosInserir;
