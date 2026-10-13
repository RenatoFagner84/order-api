const caixaRepository = require("../../repositories/caixaRepository");

const caixaDeletar = async (req, res) => {
  const id = req.url.split("/")[3];

  const caixaExiste = await caixaRepository.ler(id);

  if (caixaExiste.rows.length === 0) {
    res.writeHead(404, {
      "Content-Type": "application/json"
    });

    res.end(JSON.stringify({
      mensagem: "Movimentação do caixa não encontrada"
    }));

    return;
  }

  const resultado = await caixaRepository.deletar(id);

  res.writeHead(200, {
    "Content-Type": "application/json"
  });

  res.end(JSON.stringify({
    mensagem: "Movimentação do caixa excluída com sucesso",
    caixa: resultado.rows[0]
  }));
};

module.exports = caixaDeletar;