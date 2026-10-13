const enderecoRepository = require("../../repositories/enderecoRepository");

const enderecoDeletar = async (req, res) => {
  const id = req.url.split("/")[3];

  const enderecoExiste = await enderecoRepository.ler(id);

  if (enderecoExiste.rows.length === 0) {
    res.writeHead(404, {
      "Content-Type": "application/json"
    });

    res.end(JSON.stringify({
      mensagem: "Endereço não encontrado"
    }));

    return;
  }

  const resultado = await enderecoRepository.deletar(id);

  res.writeHead(200, {
    "Content-Type": "application/json"
  });

  res.end(JSON.stringify({
    mensagem: "Endereço excluído com sucesso",
    endereco: resultado.rows[0]
  }));
};

module.exports = enderecoDeletar;