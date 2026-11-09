const caixaRepository = require("../../repositories/caixaRepository");

const responder = (res, status, dados) => {
    if (res.writableEnded || res.headersSent) return;

    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify(dados));
};

const caixaListarPorPedido = async (req, res) => {
    const pathname = new URL(
        req.url,
        "http://localhost"
    ).pathname;

    const pedidoIdTexto = pathname.split("/")[3];
    const pedidoId = Number(pedidoIdTexto);

    if (
        !/^\d+$/.test(pedidoIdTexto || "") ||
        !Number.isSafeInteger(pedidoId) ||
        pedidoId <= 0
    ) {
        responder(res, 400, {
            mensagem: "ID do pedido inválido."
        });
        return;
    }

    try {
        const resultado = await caixaRepository.listarPorPedido(pedidoId);

        responder(res, 200, resultado.rows);
    } catch (erro) {
        console.error("[ERRO AO LISTAR MOVIMENTAÇÕES POR PEDIDO]", erro);

        responder(res, 500, {
            mensagem: "Erro interno ao listar as movimentações do pedido."
        });
    }
};

module.exports = caixaListarPorPedido;