const enderecoRepository = require("../../repositories/enderecoRepository");

const enderecoInserir = async (req, res) => {
  let body = "";

  req.on("data", (chunk) => {
    body += chunk.toString();
  });

  req.on("end", async () => {
    const dados = JSON.parse(body);

    const {
      user_id,
      cep,
      logradouro,
      numero,
      complemento,
      bairro,
      cidade,
      estado
    } = dados;

    const resultado = await enderecoRepository.inserir(
      user_id,
      cep,
      logradouro,
      numero,
      complemento,
      bairro,
      cidade,
      estado
    );

    res.writeHead(201, {
      "Content-Type": "application/json"
    });

    res.end(JSON.stringify(resultado.rows[0]));
  });
};

module.exports = enderecoInserir;