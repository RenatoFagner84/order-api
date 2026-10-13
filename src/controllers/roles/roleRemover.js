const roleRepository = require("../../repositories/roleRepository");

const roleRemover = async (req, res) => {
    const userId = req.url.split("/")[3];
    const roleId = req.url.split("/")[4];

    const resultado = await roleRepository.remover(
        userId,
        roleId
    );

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(resultado.rows));
};

module.exports = roleRemover;