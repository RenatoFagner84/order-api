const enderecoRepository = require("../../repositories/enderecoRepository");

const enderecoListarPorUser = async (req, res) => {
  const user_id = req.url.split("/")[3];

  const resultado = await enderecoRepository.listarPorUser(user_id);

  res.writeHead(200, {
    "Content-Type": "application/json"
  });

  res.end(JSON.stringify(resultado.rows));
};

module.exports = enderecoListarPorUser;