
const pool = require("../../db");
const roleRepository = require("../../repositories/roleRepository");
const pedidosRepository = require("../../repositories/pedidosRepository");

const responder = (res, status, dados) => {
    if (res.writableEnded || res.headersSent) return;

    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify(dados));
};

const pedidosCancelarProduto = async (req, res) => {
    const pathname = new URL(req.url, "http://localhost").pathname;
    const rota = pathname.match(
        /^\/pedido\/(\d+)\/produtos\/(\d+)$/
    );

    if (!rota) {
        responder(res, 400, {
            mensagem: "Informe IDs válidos para o pedido e o produto."
        });
        return;
    }

    const pedidoId = Number(rota[1]);
    const produtoId = Number(rota[2]);
    const userId = Number(req.usuario?.id);

    if (
        !Number.isSafeInteger(pedidoId) ||
        pedidoId <= 0 ||
        !Number.isSafeInteger(produtoId) ||
        produtoId <= 0
    ) {
        responder(res, 400, {
            mensagem: "Informe IDs válidos para o pedido e o produto."
        });
        return;
    }

    if (!Number.isSafeInteger(userId) || userId <= 0) {
        responder(res, 401, {
            mensagem: "Usuário não autenticado."
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

        const rolesResult = await roleRepository.lerPorUser(userId);
        const papeis = Array.isArray(rolesResult.rows)
            ? rolesResult.rows.map((role) =>
                String(role.role || "").trim().toLowerCase()
            )
            : [];

        const podeAlterarPedidoAlheio = papeis.some(
            (role) => ["admin", "manager"].includes(role)
        );

        if (
            Number(pedido.user_id) !== userId &&
            !podeAlterarPedidoAlheio
        ) {
            responder(res, 403, {
                mensagem: "Você não tem permissão para alterar este pedido."
            });
            return;
        }

        if (pedido.oculto === true) {
            responder(res, 404, {
                mensagem: "Pedido não encontrado."
            });
            return;
        }

        if (Number(pedido.status_id) !== 200) {
            responder(res, 409, {
                mensagem: "Somente pedidos pendentes podem ter produtos removidos."
            });
            return;
        }

        const resultado = await pedidosRepository.deletarProduto(
            pedidoId,
            produtoId
        );

        if (resultado.rows.length === 0) {
            responder(res, 404, {
                mensagem: "Produto não encontrado neste pedido."
            });
            return;
        }

        responder(res, 200, {
            mensagem: "Produto removido do pedido com sucesso."
        });
    } catch (erro) {
        console.error("[ERRO AO REMOVER PRODUTO DO PEDIDO]", erro);

        responder(res, 500, {
            mensagem: "Erro interno ao remover o produto do pedido."
        });
    }
};

const pedidosCancelar = async (req, res) => {
    if (req.method === "DELETE") {
        await pedidosCancelarProduto(req, res);
        return;
    }

    const pathname = new URL(
        req.url,
        "http://localhost"
    ).pathname;

    const pedidoIdTexto = pathname.split("/")[2];
    const pedidoId = Number(pedidoIdTexto);
    const userId = Number(req.usuario?.id);

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

    if (!Number.isSafeInteger(userId) || userId <= 0) {
        responder(res, 401, {
            mensagem: "Usuário não autenticado."
        });
        return;
    }

    let client;
    let transacaoIniciada = false;

    try {
        client = await pool.connect();

        await client.query("BEGIN");
        transacaoIniciada = true;

        const pedidoResult = await client.query(
            `SELECT id, user_id, status_id, oculto
             FROM pedidos
             WHERE id = $1
             FOR UPDATE`,
            [pedidoId]
        );

        if (pedidoResult.rows.length === 0) {
            await client.query("ROLLBACK");
            transacaoIniciada = false;

            responder(res, 404, {
                mensagem: "Pedido não encontrado."
            });
            return;
        }

        const pedido = pedidoResult.rows[0];

        const rolesResult = await roleRepository.lerPorUser(userId);
        const papeis = Array.isArray(rolesResult.rows)
            ? rolesResult.rows.map((role) =>
                String(role.role || "").trim().toLowerCase()
            )
            : [];

        const podeCancelarPedidoAlheio = papeis.some(
            (role) => ["admin", "manager"].includes(role)
        );

        if (
            Number(pedido.user_id) !== userId &&
            !podeCancelarPedidoAlheio
        ) {
            await client.query("ROLLBACK");
            transacaoIniciada = false;

            responder(res, 403, {
                mensagem: "Você não tem permissão para cancelar este pedido."
            });
            return;
        }

        if (pedido.oculto === true) {
            await client.query("ROLLBACK");
            transacaoIniciada = false;

            responder(res, 404, {
                mensagem: "Pedido não encontrado."
            });
            return;
        }

        if (Number(pedido.status_id) !== 200) {
            await client.query("ROLLBACK");
            transacaoIniciada = false;

            responder(res, 409, {
                mensagem: "Somente pedidos pendentes podem ser cancelados."
            });
            return;
        }

        const produtosResult = await client.query(
            `SELECT produto_id, quantidade
             FROM produtos_pedido
             WHERE pedido_id = $1
             ORDER BY produto_id`,
            [pedidoId]
        );

        if (produtosResult.rows.length === 0) {
            await client.query("ROLLBACK");
            transacaoIniciada = false;

            responder(res, 409, {
                mensagem: "O pedido não possui produtos para devolver ao estoque."
            });
            return;
        }

        const idsProdutos = [
            ...new Set(
                produtosResult.rows.map(
                    (produto) => Number(produto.produto_id)
                )
            )
        ].sort((a, b) => a - b);

        const estoqueBloqueado = await client.query(
            `SELECT id
             FROM produtos
             WHERE id = ANY($1::integer[])
             ORDER BY id
             FOR UPDATE`,
            [idsProdutos]
        );

        if (estoqueBloqueado.rows.length !== idsProdutos.length) {
            throw new Error(
                "Um ou mais produtos do pedido não existem no estoque."
            );
        }

        const estoqueAtualizado = [];

        for (const produto of produtosResult.rows) {
            const quantidade = Number(produto.quantidade);
            const produtoId = Number(produto.produto_id);

            if (
                !Number.isSafeInteger(quantidade) ||
                quantidade <= 0
            ) {
                throw new Error(
                    `Quantidade inválida para o produto ${produtoId}.`
                );
            }

            const resultadoEstoque = await client.query(
                `UPDATE produtos
                 SET quantidade = quantidade + $1
                 WHERE id = $2
                 RETURNING id, nome, quantidade`,
                [quantidade, produtoId]
            );

            if (resultadoEstoque.rows.length === 0) {
                throw new Error(
                    `Não foi possível devolver o produto ${produtoId} ao estoque.`
                );
            }

            estoqueAtualizado.push({
                produto_id: produtoId,
                quantidade_devolvida: quantidade,
                estoque_atual: resultadoEstoque.rows[0].quantidade
            });
        }

        const cancelamentoResult = await client.query(
            `UPDATE pedidos
             SET status_id = 204
             WHERE id = $1
               AND status_id = 200
               AND oculto = FALSE
             RETURNING id, user_id, data_pedido, status_id, oculto`,
            [pedidoId]
        );

        if (cancelamentoResult.rows.length === 0) {
            throw new Error(
                "O pedido deixou de estar pendente durante o cancelamento."
            );
        }

        await client.query("COMMIT");
        transacaoIniciada = false;

        responder(res, 200, {
            mensagem: "Pedido cancelado e estoque atualizado com sucesso.",
            pedido: cancelamentoResult.rows[0],
            produtos_devolvidos: estoqueAtualizado
        });
    } catch (erro) {
        if (client && transacaoIniciada) {
            try {
                await client.query("ROLLBACK");
            } catch (erroRollback) {
                console.error("[ERRO AO DESFAZER TRANSAÇÃO]", erroRollback);
            }
        }

        console.error("[ERRO AO CANCELAR PEDIDO]", erro);

        responder(res, 500, {
            mensagem: "Erro interno ao cancelar o pedido."
        });
    } finally {
        if (client) {
            client.release();
        }
    }
};

module.exports = pedidosCancelar;
