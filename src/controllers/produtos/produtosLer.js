const produtosRepository = require("../../repositories/produtoRepository");

const produtosLer = async (req, res) => {
  const result = await produtosRepository.lerTudo();
  res.writeHead(200, {
    "Content-Type": "application/json"
  });

  res.end(JSON.stringify(result.rows));
};

module.exports = produtosLer;