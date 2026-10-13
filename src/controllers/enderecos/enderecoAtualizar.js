const enderecoRepository = require("../../repositories/enderecoRepository");

const enderecoAtualizar = async (req, res) => {
  const id = req.url.split("/")[3];

  let body = "";

  req.on("data", (chunk) => {
    body += chunk.toString();
  });

  req.on("end", async () => {
    const dados = JSON.parse(body);

    const {
      cep,
      logradouro,
      numero,
      complemento,
      bairro,
      cidade,
      estado
    } = dados;

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

    const resultado = await enderecoRepository.atualizar(
      id,
      cep,
      logradouro,
      numero,
      complemento,
      bairro,
      cidade,
      estado
    );

    res.writeHead(200, {
      "Content-Type": "application/json"
    });

    res.end(JSON.stringify(resultado.rows[0]));
  });
};

module.exports = enderecoAtualizar;