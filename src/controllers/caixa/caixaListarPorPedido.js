const caixaRepository = require("../../repositories/caixaRepository");

const caixaListarPorPedido = async (req, res) => {
  const pedido_id = req.url.split("/")[3];

  const resultado = await caixaRepository.listarPorPedido(pedido_id);

  res.writeHead(200, {
    "Content-Type": "application/json"
  });

  res.end(JSON.stringify(resultado.rows));
};

module.exports = caixaListarPorPedido;