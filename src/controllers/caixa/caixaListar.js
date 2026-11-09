const caixaRepository = require("../../repositories/caixaRepository");

const responder = (res, status, dados) => {
    if (res.writableEnded || res.headersSent) return;

    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify(dados));
};

const caixaListar = async (req, res) => {
    try {
        const resultado = await caixaRepository.listar();

        responder(res, 200, resultado.rows);
    } catch (erro) {
        console.error("[ERRO AO LISTAR MOVIMENTAÇÕES DO CAIXA]", erro);

        responder(res, 500, {
            mensagem: "Erro interno ao listar as movimentações do caixa."
        });
    }
};

module.exports = caixaListar;