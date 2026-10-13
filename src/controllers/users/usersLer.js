const userRepository = require("../../repositories/userRepository");

const usersLer = async (req, res) => {

  const result = await userRepository.lerTudo();

  res.writeHead(200, {
    "Content-Type": "application/json"
  });

  res.end(JSON.stringify(result.rows));

};

module.exports = usersLer;

