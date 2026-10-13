const userRepository = require("../../repositories/userRepository");

const usersHistoricoStatus = async (req, res) => {
    const id = req.url.split("/")[3];

    const userExiste = await userRepository.ler(id);

    if (userExiste.rows.length === 0) {
        res.writeHead(404, {
            "Content-Type": "application/json"
        });

        res.end(JSON.stringify({
            mensagem: "User não encontrado"
        }));

        return;
    }

    const resultado = await userRepository.lerHistoricoStatus(id);

    res.writeHead(200, {
        "Content-Type": "application/json"
    });

    res.end(JSON.stringify(resultado.rows));
};

module.exports = usersHistoricoStatus;