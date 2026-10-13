const userRepository = require("../../repositories/userRepository");

const usersBuscar = async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const nome = url.searchParams.get("nome");

  if (!nome) {
    res.writeHead(400, {
      "Content-Type": "application/json"
    });

    res.end(JSON.stringify({
      mensagem: "Informe o nome do user"
    }));

    return;
  }

  const result = await userRepository.buscarPorNome(nome);

  if (result.rows.length === 0) {
    res.writeHead(404, {
      "Content-Type": "application/json"
    });

    res.end(JSON.stringify({
      mensagem: "User não encontrado"
    }));

    return;
  }

  res.writeHead(200, {
    "Content-Type": "application/json"
  });

  res.end(JSON.stringify(result.rows));
};

module.exports = usersBuscar;