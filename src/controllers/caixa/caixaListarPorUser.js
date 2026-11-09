const caixaRepository = require("../../repositories/caixaRepository");

const responder = (res, status, dados) => {
    if (res.writableEnded || res.headersSent) return;

    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify(dados));
};

const caixaListarPorUser = async (req, res) => {
    const pathname = new URL(
        req.url,
        "http://localhost"
    ).pathname;

    const userIdTexto = pathname.split("/")[3];
    const userId = Number(userIdTexto);

    if (
        !/^\d+$/.test(userIdTexto || "") ||
        !Number.isSafeInteger(userId) ||
        userId <= 0
    ) {
        responder(res, 400, {
            mensagem: "ID do usuário inválido."
        });
        return;
    }

    try {
        const resultado = await caixaRepository.listarPorUser(userId);

        responder(res, 200, resultado.rows);
    } catch (erro) {
        console.error("[ERRO AO LISTAR MOVIMENTAÇÕES POR USUÁRIO]", erro);

        responder(res, 500, {
            mensagem: "Erro interno ao listar as movimentações do usuário."
        });
    }
};

module.exports = caixaListarPorUser;