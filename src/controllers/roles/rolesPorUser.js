const roleRepository = require("../../repositories/roleRepository");

const responder = (res, status, dados) => {
    if (res.writableEnded || res.headersSent) return;

    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify(dados));
};

const rolesPorUser = async (req, res) => {
    const partes = new URL(req.url, "http://localhost").pathname.split("/");
    const userIdTexto = partes[3];
    const userId = Number(userIdTexto);

    if (
        !/^\d+$/.test(userIdTexto || "") ||
        !Number.isSafeInteger(userId) ||
        userId <= 0
    ) {
        responder(res, 400, {
            mensagem: "ID de usuário inválido."
        });
        return;
    }

    try {
        const resultado = await roleRepository.lerPorUser(userId);

        responder(res, 200, resultado.rows);
    } catch (erro) {
        console.error("[ERRO AO LISTAR PAPÉIS DO USUÁRIO]", erro);

        responder(res, 500, {
            mensagem: "Erro interno ao listar papéis do usuário."
        });
    }
};

module.exports = rolesPorUser;