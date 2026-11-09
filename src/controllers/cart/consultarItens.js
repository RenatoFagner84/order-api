const cartRepository = require("../../repositories/cartRepository");

const responder = (res, status, dados) => {
    if (res.writableEnded || res.headersSent) return;

    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify(dados));
};

const cartConsultarItens = async (req, res) => {
    const pathname = new URL(
        req.url,
        "http://localhost"
    ).pathname;

    const idTexto = pathname.split("/")[2];
    const carrinhoId = Number(idTexto);

    if (
        !/^\d+$/.test(idTexto || "") ||
        !Number.isSafeInteger(carrinhoId) ||
        carrinhoId <= 0
    ) {
        responder(res, 400, {
            mensagem: "ID do carrinho inválido."
        });
        return;
    }

    try {
        const resultado = await cartRepository.consultarItens(carrinhoId);

        responder(res, 200, resultado.rows);
    } catch (erro) {
        console.error("[ERRO AO CONSULTAR ITENS DO CARRINHO]", erro);

        responder(res, 500, {
            mensagem: "Erro interno ao consultar os itens do carrinho."
        });
    }
};

module.exports = cartConsultarItens;