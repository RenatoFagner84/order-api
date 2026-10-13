const caixaRepository = require("../../repositories/caixaRepository");

const caixaLer = async (req, res) => {
  const id = req.url.split("/")[3];

  const resultado = await caixaRepository.ler(id);

  if (resultado.rows.length === 0) {
    res.writeHead(404, {
      "Content-Type": "application/json"
    });

    res.end(JSON.stringify({
      mensagem: "Movimentação do caixa não encontrada"
    }));

    return;
  }

  res.writeHead(200, {
    "Content-Type": "application/json"
  });

  res.end(JSON.stringify(resultado.rows[0]));
};

module.exports = caixaLer;