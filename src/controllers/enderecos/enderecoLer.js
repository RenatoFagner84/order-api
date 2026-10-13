const enderecoRepository = require("../../repositories/enderecoRepository");

const enderecoLer = async (req, res) => {
  const id = req.url.split("/")[3];

  const resultado = await enderecoRepository.ler(id);

  if (resultado.rows.length === 0) {
    res.writeHead(404, {
      "Content-Type": "application/json"
    });

    res.end(JSON.stringify({
      mensagem: "Endereço não encontrado"
    }));

    return;
  }

  res.writeHead(200, {
    "Content-Type": "application/json"
  });

  res.end(JSON.stringify(resultado.rows[0]));
};

module.exports = enderecoLer;