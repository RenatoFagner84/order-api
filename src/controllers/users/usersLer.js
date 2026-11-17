
const userRepository = require("../../repositories/userRepository");

const responder = (res, status, dados) => {
    if (res.writableEnded || res.headersSent) return;

    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify(dados));
};

const usersLer = async (req, res) => {
    try {
        const resultado = await userRepository.lerTudo();

        responder(res, 200, resultado.rows);
    } catch (erro) {
        console.error("[ERRO AO LISTAR USUÁRIOS]", erro);

        responder(res, 500, {
            mensagem: "Não foi possível listar os usuários."
        });
    }
};

module.exports = usersLer;
