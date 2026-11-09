const pedidosRepository = require("../../repositories/pedidosRepository.js");

const responder = (res, status, dados) => {
    if (res.writableEnded || res.headersSent) return;

    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify(dados));
};

const lerBody = async (req) => {
    let body = "";

    for await (const chunk of req) {
        body += chunk.toString();

        if (Buffer.byteLength(body, "utf8") > 1024 * 1024) {
            const erro = new Error("Corpo da requisição muito grande.");
            erro.status = 413;
            throw erro;
        }
    }

    try {
        return JSON.parse(body);
    } catch {
        const erro = new Error("Corpo da requisição JSON inválido.");
        erro.status = 400;
        throw erro;
    }
};

const pedidosCriar = async (req, res) => {
    const idRecebido = req.usuario?.id;

    if (
        idRecebido === undefined ||
        idRecebido === null ||
        idRecebido === "" ||
        idRecebido === 0 ||
        idRecebido === "0"
    ) {
        responder(res, 401, {
            mensagem: "Usuário não autenticado."
        });
        return;
    }

    const usuarioId = Number(idRecebido);

    if (!Number.isSafeInteger(usuarioId) || usuarioId <= 0) {
        responder(res, 401, {
            mensagem: "Usuário autenticado inválido."
        });
        return;
    }

    const pathname = new URL(req.url, "http://localhost").pathname;
    const rotaProduto = pathname.match(/^\/pedido\/(\d+)\/produtos$/);

    if (rotaProduto) {
        const pedidoId = Number(rotaProduto[1]);

        let dados;

        try {
            dados = await lerBody(req);
        } catch (erro) {
            responder(res, erro.status || 400, {
                mensagem: erro.message
            });
            return;
        }

        if (!dados || typeof dados !== "object" || Array.isArray(dados)) {
            responder(res, 400, {
                mensagem: "O corpo da requisição deve ser um objeto JSON."
            });
            return;
        }

        const { produto_id, quantidade, valor_unitario } = dados;

        if (
            !Number.isSafeInteger(produto_id) ||
            produto_id <= 0 ||
            !Number.isSafeInteger(quantidade) ||
            quantidade <= 0 ||
            typeof valor_unitario !== "number" ||
            !Number.isFinite(valor_unitario) ||
            valor_unitario < 0
        ) {
            responder(res, 400, {
                mensagem: "Informe produto_id, quantidade e valor_unitario válidos."
            });
            return;
        }

        try {
            const pedidoResult = await pedidosRepository.consultar(pedidoId);
            const pedido = pedidoResult?.rows?.[0];

            if (!pedido) {
                responder(res, 404, {
                    mensagem: "Pedido não encontrado."
                });
                return;
            }

            if (Number(pedido.user_id) !== usuarioId) {
                responder(res, 403, {
                    mensagem: "Você não tem permissão para alterar este pedido."
                });
                return;
            }

            if (pedido.oculto === true || Number(pedido.status_id) !== 200) {
                responder(res, 409, {
                    mensagem: "Não é possível adicionar produtos a este pedido."
                });
                return;
            }

            const resultado = await pedidosRepository.inserirProduto(
                pedidoId,
                produto_id,
                quantidade,
                valor_unitario
            );

            if (!resultado?.rows?.[0]) {
                responder(res, 500, {
                    mensagem: "Não foi possível adicionar o produto ao pedido."
                });
                return;
            }

            responder(res, 201, resultado.rows[0]);
        } catch (erro) {
            console.error("[ERRO AO ADICIONAR PRODUTO AO PEDIDO]", erro);

            if (erro.code === "23503") {
                responder(res, 404, {
                    mensagem: "Pedido ou produto não encontrado."
                });
                return;
            }

            if (erro.code === "23505") {
                responder(res, 409, {
                    mensagem: "Este produto já está associado ao pedido."
                });
                return;
            }

            responder(res, 500, {
                mensagem: "Erro interno ao adicionar produto ao pedido."
            });
        }

        return;
    }

    let body = "";

    try {
        for await (const chunk of req) {
            body += chunk.toString();

            if (Buffer.byteLength(body, "utf8") > 1024 * 1024) {
                responder(res, 413, {
                    mensagem: "Corpo da requisição muito grande."
                });
                return;
            }
        }
    } catch (erro) {
        console.error("[ERRO AO RECEBER REQUISIÇÃO]", erro);

        responder(res, 400, {
            mensagem: "Erro ao receber os dados da requisição."
        });
        return;
    }

    if (body.trim()) {
        try {
            const dados = JSON.parse(body);

            if (!dados || typeof dados !== "object" || Array.isArray(dados)) {
                responder(res, 400, {
                    mensagem: "O corpo da requisição deve ser um objeto JSON."
                });
                return;
            }
        } catch {
            responder(res, 400, {
                mensagem: "Corpo da requisição JSON inválido."
            });
            return;
        }
    }

    try {
        const resultado = await pedidosRepository.criar(usuarioId);

        if (!resultado?.rows?.length) {
            responder(res, 500, {
                mensagem: "Não foi possível criar o pedido."
            });
            return;
        }

        responder(res, 201, resultado.rows[0]);
    } catch (erro) {
        console.error("[ERRO AO CRIAR PEDIDO]", erro);

        responder(res, 500, {
            mensagem: "Erro interno ao criar o pedido."
        });
    }
};

module.exports = pedidosCriar;