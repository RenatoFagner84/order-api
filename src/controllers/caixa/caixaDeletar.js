const caixaRepository = require("../../repositories/caixaRepository");

const responder = (res, status, dados) => {
    if (res.writableEnded || res.headersSent) return;

    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify(dados));
};

const caixaDeletar = async (req, res) => {
    const pathname = new URL(
        req.url,
        "http://localhost"
    ).pathname;

    const idTexto = pathname.split("/")[3];
    const id = Number(idTexto);

    if (
        !/^\d+$/.test(idTexto || "") ||
        !Number.isSafeInteger(id) ||
        id <= 0
    ) {
        responder(res, 400, {
            mensagem: "ID da movimentação inválido."
        });
        return;
    }

    try {
        const caixaExiste = await caixaRepository.ler(id);

        if (!caixaExiste.rows || caixaExiste.rows.length === 0) {
            responder(res, 404, {
                mensagem: "Movimentação do caixa não encontrada."
            });
            return;
        }

        const resultado = await caixaRepository.deletar(id);

        if (!resultado.rows || resultado.rows.length === 0) {
            responder(res, 404, {
                mensagem: "Movimentação do caixa não encontrada."
            });
            return;
        }

        responder(res, 200, {
            mensagem: "Movimentação do caixa excluída com sucesso.",
            caixa: resultado.rows[0]
        });
    } catch (erro) {
        console.error("[ERRO AO EXCLUIR MOVIMENTAÇÃO DO CAIXA]", erro);

        responder(res, 500, {
            mensagem: "Erro interno ao excluir a movimentação do caixa."
        });
    }
};

module.exports = caixaDeletar;