const roleRepository = require("../../repositories/roleRepository");

const roleLer = async (req, res) => {
    const resultado = await roleRepository.lerTudo();

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(resultado.rows));
};

module.exports = roleLer;