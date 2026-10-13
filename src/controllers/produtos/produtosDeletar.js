const produtoRepository = require("../../repositories/produtoRepository");

const produtosDeletar = async (req, res) => {
  const id = req.url.split("/")[3];

  const result = await produtoRepository.deletar(id);

  if (result.rows.length === 0) {
    res.writeHead(404, {
      "Content-Type": "application/json"
    });

    res.end(JSON.stringify({
      mensagem: "Produto não encontrado"
    }));

    return;
  }

  res.writeHead(200, {
    "Content-Type": "application/json"
  });

  res.end(JSON.stringify({
    mensagem: "Produto deletado com sucesso",
    produto: result.rows[0]
  }));
};

module.exports = produtosDeletar;