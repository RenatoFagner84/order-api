const userRepository = require("../../repositories/userRepository");

const usersLerId = async (req, res) => {
  const id = req.url.split("/")[3].split("?")[0];
  const result = await userRepository.ler(id);

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

  res.end(JSON.stringify(result.rows[0]));
};

module.exports = usersLerId;