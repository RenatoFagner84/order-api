
const pedidosRepository = require("../../repositories/pedidosRepository");
const roleRepository = require("../../repositories/roleRepository");
const statusRepository = require("../../repositories/statusRepository");

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

        if (body.length > 1024 * 1024) {
            const erro = new Error("Corpo da requisição muito grande.");
            erro.status = 413;
            throw erro;
        }
    }

    try {
        return JSON.parse(body);
    } catch {
        const erro = new Error("JSON inválido.");
        erro.status = 400;
        throw erro;
    }
};

const pedidosAtualizar = async (req, res) => {
    const usuarioId = Number(req.usuario?.id);

    if (!Number.isSafeInteger(usuarioId) || usuarioId <= 0) {
        responder(res, 401, {
            mensagem: "Usuário não autenticado."
        });
        return;
    }

    const pathname = new URL(req.url, "http://localhost").pathname;

    const rotaProduto = pathname.match(
        /^\/pedido\/(\d+)\/produtos\/(\d+)$/
    );

    if (rotaProduto && req.method === "PUT") {
        const pedidoId = Number(rotaProduto[1]);
        const produtoId = Number(rotaProduto[2]);

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

        const { quantidade, valor_unitario } = dados;

        if (
            !Number.isSafeInteger(quantidade) ||
            quantidade <= 0 ||
            typeof valor_unitario !== "number" ||
            !Number.isFinite(valor_unitario) ||
            valor_unitario < 0
        ) {
            responder(res, 400, {
                mensagem: "Informe quantidade e valor unitário válidos."
            });
            return;
        }

        try {
            const pedidoResult = await pedidosRepository.consultar(pedidoId);
            const pedido = pedidoResult.rows[0];

            if (!pedido) {
                responder(res, 404, {
                    mensagem: "Pedido não encontrado."
                });
                return;
            }

            if (Number(pedido.user_id) !== usuarioId) {
                const rolesResult = await roleRepository.lerPorUser(usuarioId);

                const papeis = rolesResult.rows.map((role) =>
                    String(role.role || "").trim().toLowerCase()
                );

                if (!papeis.some((role) => ["admin", "manager"].includes(role))) {
                    responder(res, 403, {
                        mensagem: "Você não tem permissão para alterar este pedido."
                    });
                    return;
                }
            }

            if (pedido.oculto === true || Number(pedido.status_id) !== 200) {
                responder(res, 409, {
                    mensagem: "Não é possível alterar os produtos deste pedido."
                });
                return;
            }

            const resultado = await pedidosRepository.atualizarProduto(
                pedidoId,
                produtoId,
                quantidade,
                valor_unitario
            );

            if (resultado.rows.length === 0) {
                responder(res, 404, {
                    mensagem: "Produto não encontrado neste pedido."
                });
                return;
            }

            responder(res, 200, resultado.rows[0]);
        } catch (erro) {
            console.error("[ERRO AO ATUALIZAR PRODUTO DO PEDIDO]", erro);

            responder(res, 500, {
                mensagem: "Erro interno ao atualizar o produto do pedido."
            });
        }

        return;
    }

    const idTexto = pathname.split("/")[2];
    const id = Number(idTexto);

    if (
        !/^\d+$/.test(idTexto || "") ||
        !Number.isSafeInteger(id) ||
        id <= 0
    ) {
        responder(res, 400, {
            mensagem: "ID do pedido inválido."
        });
        return;
    }

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

    const statusId = dados.status_id;

    if (!Number.isSafeInteger(statusId) || statusId <= 0) {
        responder(res, 400, {
            mensagem: "Informe um status_id válido."
        });
        return;
    }

    try {
        const consulta = await pedidosRepository.consultar(id);
        const pedido = consulta.rows[0];

        if (!pedido) {
            responder(res, 404, {
                mensagem: "Pedido não encontrado."
            });
            return;
        }

        const rolesResult = await roleRepository.lerPorUser(usuarioId);
        const papeis = rolesResult.rows.map((role) =>
            String(role.role || "").trim().toLowerCase()
        );

        if (!papeis.some((role) => ["admin", "manager"].includes(role))) {
            responder(res, 403, {
                mensagem: "Somente admin ou manager pode alterar o status de pedidos."
            });
            return;
        }

        const statusExiste = await statusRepository.consultarStatus(statusId);

        if (statusExiste.rows.length === 0) {
            responder(res, 400, {
                mensagem: "O status informado não existe."
            });
            return;
        }

        if (pedido.oculto === true) {
            responder(res, 409, {
                mensagem: "Não é possível alterar um pedido oculto."
            });
            return;
        }

        const resultado = await pedidosRepository.atualizar(id, statusId);

        if (resultado.rows.length === 0) {
            responder(res, 409, {
                mensagem: "O pedido não foi atualizado. Verifique seu status atual."
            });
            return;
        }

        responder(res, 200, {
            mensagem: "Pedido atualizado com sucesso.",
            pedido: resultado.rows[0]
        });
    } catch (erro) {
        console.error("[ERRO AO ATUALIZAR PEDIDO]", erro);

        responder(res, 500, {
            mensagem: "Erro interno ao atualizar o pedido."
        });
    }
};

module.exports = pedidosAtualizar;
