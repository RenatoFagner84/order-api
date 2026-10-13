const userRepository = require("../../repositories/userRepository");

const usersDeletar = async (req, res) => {
  const id = req.url.split("/")[3];

  const resultado = await userRepository.deletar(id);

  if (!resultado.sucesso) {
    res.writeHead(409, {
      "Content-Type": "application/json"
    });

    res.end(JSON.stringify({
      mensagem: resultado.mensagem
    }));

    return;
  }

  res.writeHead(200, {
    "Content-Type": "application/json"
  });

  res.end(JSON.stringify({
    mensagem: resultado.mensagem,
    user: resultado.user
  }));
};

module.exports = usersDeletar;
