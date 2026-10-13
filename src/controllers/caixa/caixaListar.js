const caixaRepository = require("../../repositories/caixaRepository");

const caixaListar = async (req, res) => {
  const resultado = await caixaRepository.listar();

  res.writeHead(200, {
    "Content-Type": "application/json"
  });

  res.end(JSON.stringify(resultado.rows));
};

module.exports = caixaListar;