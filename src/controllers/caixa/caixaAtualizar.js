const caixaRepository = require("../../repositories/caixaRepository");

const responder = (res, status, dados) => {
    if (res.writableEnded || res.headersSent) return;

    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify(dados));
};

const caixaAtualizar = (req, res) => {
    const pathname = new URL(req.url, "http://localhost").pathname;
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

    let body = "";

    req.on("error", (erro) => {
        console.error("[ERRO AO RECEBER DADOS DO CAIXA]", erro);

        responder(res, 400, {
            mensagem: "Erro ao receber os dados da requisição."
        });
    });

    req.on("data", (chunk) => {
        body += chunk.toString();

        if (body.length > 1_000_000) {
            responder(res, 413, {
                mensagem: "Corpo da requisição muito grande."
            });
            req.destroy();
        }
    });

    req.on("end", async () => {
        if (res.writableEnded) return;

        try {
            let dados;

            try {
                dados = JSON.parse(body);
            } catch {
                responder(res, 400, {
                    mensagem: "JSON inválido."
                });
                return;
            }

            if (
                !dados ||
                typeof dados !== "object" ||
                Array.isArray(dados)
            ) {
                responder(res, 400, {
                    mensagem: "Os dados enviados são inválidos."
                });
                return;
            }

            const {
                user_id,
                pedido_id,
                tipo_movimentacao_id,
                subtotal,
                desconto,
                frete,
                acrescimo,
                total,
                forma_pagamento_id,
                pagamento_status_id,
                descricao
            } = dados;

            const caixaExiste = await caixaRepository.ler(id);

            if (!caixaExiste.rows || caixaExiste.rows.length === 0) {
                responder(res, 404, {
                    mensagem: "Movimentação do caixa não encontrada."
                });
                return;
            }

            const resultado = await caixaRepository.atualizar(
                id,
                user_id,
                pedido_id,
                tipo_movimentacao_id,
                subtotal,
                desconto,
                frete,
                acrescimo,
                total,
                forma_pagamento_id,
                pagamento_status_id,
                descricao
            );

            if (!resultado.rows || resultado.rows.length === 0) {
                responder(res, 404, {
                    mensagem: "Movimentação do caixa não encontrada."
                });
                return;
            }

            responder(res, 200, resultado.rows[0]);
        } catch (erro) {
            console.error("[ERRO AO ATUALIZAR CAIXA]", erro);

            responder(res, 500, {
                mensagem: "Erro interno ao atualizar a movimentação do caixa."
            });
        }
    });
};

module.exports = caixaAtualizar;