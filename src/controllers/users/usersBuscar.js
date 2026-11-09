const userRepository = require("../../repositories/userRepository");

const responder = (res, status, dados) => {
    if (res.writableEnded || res.headersSent) return;

    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify(dados));
};

const usersBuscar = async (req, res) => {
    const nome = String(req.query?.nome || "").trim();

    if (!nome) {
        responder(res, 400, {
            mensagem: "Informe o nome do user"
        });
        return;
    }

    try {
        const resultado = await userRepository.buscarPorNome(nome);

        if (resultado.rows.length === 0) {
            responder(res, 404, {
                mensagem: "User não encontrado"
            });
            return;
        }

        responder(res, 200, resultado.rows);
    } catch (erro) {
        console.error("[ERRO AO BUSCAR USUÁRIOS]", erro);

        responder(res, 500, {
            mensagem: "Erro interno ao buscar usuários."
        });
    }
};

module.exports = usersBuscar;