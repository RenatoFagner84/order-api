const roleRepository = require("../../repositories/roleRepository");

const rolesPorUser = async (req, res) => {
    const userId = req.url.split("/")[3];

    const resultado = await roleRepository.lerPorUser(userId);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(resultado.rows));
};

module.exports = rolesPorUser;