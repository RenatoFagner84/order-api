const roleRepository = require("../../repositories/roleRepository");

const roleAtribuir = async (req, res) => {
    const userId = req.url.split("/")[3];

    const body = await new Promise((resolve) => {
        let data = "";

        req.on("data", (chunk) => {
            data += chunk;
        });

        req.on("end", () => {
            resolve(JSON.parse(data));
        });
    });

    const resultado = await roleRepository.atribuir(
        userId,
        body.role_id
    );

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(resultado.rows));
};

module.exports = roleAtribuir;