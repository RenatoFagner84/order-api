const caixaRepository = require("../../repositories/caixaRepository");

const caixaListarPorUser = async (req, res) => {
  const user_id = req.url.split("/")[3];

  const resultado = await caixaRepository.listarPorUser(user_id);

  res.writeHead(200, {
    "Content-Type": "application/json"
  });

  res.end(JSON.stringify(resultado.rows));
};

module.exports = caixaListarPorUser;