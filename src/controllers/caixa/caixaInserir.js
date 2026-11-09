const caixaRepository = require("../../repositories/caixaRepository");

const responder = (res, status, dados) => {
    if (res.writableEnded || res.headersSent) return;

    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify(dados));
};

const caixaInserir = async (req, res) => {
    let body = "";

    req.on("data", (chunk) => {
        if (res.writableEnded) return;

        body += chunk.toString();

        if (body.length > 1_000_000) {
            responder(res, 413, {
                mensagem: "Corpo da requisição muito grande."
            });

            req.destroy();
        }
    });

    req.on("error", (erro) => {
        console.error("[ERRO AO RECEBER DADOS DO CAIXA]", erro);

        responder(res, 400, {
            mensagem: "Erro ao receber os dados da requisição."
        });
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

            if (
                tipo_movimentacao_id === undefined ||
                tipo_movimentacao_id === null ||
                tipo_movimentacao_id === ""
            ) {
                responder(res, 400, {
                    mensagem: "O tipo de movimentação é obrigatório."
                });
                return;
            }

            const valores = [
                subtotal,
                desconto,
                frete,
                acrescimo,
                total
            ];

            if (
                valores.some(
                    (valor) =>
                        valor !== undefined &&
                        (
                            typeof valor !== "number" ||
                            !Number.isFinite(valor) ||
                            valor < 0
                        )
                )
            ) {
                responder(res, 400, {
                    mensagem: "Os valores financeiros devem ser números válidos e não negativos."
                });
                return;
            }

            const resultado = await caixaRepository.inserir(
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
                responder(res, 500, {
                    mensagem: "Não foi possível registrar a movimentação do caixa."
                });
                return;
            }

            responder(res, 201, resultado.rows[0]);
        } catch (erro) {
            console.error(
                "[ERRO AO INSERIR MOVIMENTAÇÃO NO CAIXA]",
                erro
            );

            responder(res, 500, {
                mensagem: "Erro interno ao registrar a movimentação do caixa."
            });
        }
    });
};

module.exports = caixaInserir;