const enderecoRepository = require("../../repositories/enderecoRepository");

const responder = (res, status, dados) => {
    if (res.writableEnded || res.headersSent) return;

    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify(dados));
};

const enderecoListarPorUser = async (req, res) => {
    const userId = Number(req.params?.userId);

    if (!Number.isSafeInteger(userId) || userId <= 0) {
        responder(res, 400, {
            mensagem: "ID do usuário inválido."
        });
        return;
    }

    try {
        const resultado = await enderecoRepository.listarPorUser(userId);

        responder(res, 200, resultado.rows);
    } catch (erro) {
        console.error("[ERRO AO LISTAR ENDEREÇOS DO USUÁRIO]", erro);

        responder(res, 500, {
            mensagem: "Erro interno ao listar os endereços."
        });
    }
};

module.exports = enderecoListarPorUser;