const pool = require("../../db");

const responder = (res, status, dados) => {
    if (res.writableEnded) return;

    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify(dados));
};

const pedidosCancelar = async (req, res) => {
    const partes = new URL(
        req.url,
        "http://localhost:3000"
    ).pathname.split("/");

    const pedidoId = Number(partes[2]);
    const userId = Number(req.usuario?.id);

    if (!Number.isInteger(pedidoId) || pedidoId <= 0) {
        return responder(res, 400, {
            mensagem: "ID do pedido inválido."
        });
    }

    if (!Number.isInteger(userId) || userId <= 0) {
        return responder(res, 401, {
            mensagem: "Usuário não autenticado."
        });
    }

    let client;

    try {
        client = await pool.connect();

        await client.query("BEGIN");

        // Bloqueia o pedido para evitar cancelamentos simultâneos.
        const pedidoResult = await client.query(
            `SELECT id, user_id, status_id, oculto
             FROM pedidos
             WHERE id = $1
             FOR UPDATE`,
            [pedidoId]
        );

        if (pedidoResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return responder(res, 404, {
                mensagem: "Pedido não encontrado."
            });
        }

        const pedido = pedidoResult.rows[0];

        if (Number(pedido.user_id) !== userId) {
            await client.query("ROLLBACK");

            return responder(res, 403, {
                mensagem: "Você não tem permissão para cancelar este pedido."
            });
        }

        if (pedido.oculto) {
            await client.query("ROLLBACK");

            return responder(res, 404, {
                mensagem: "Pedido não encontrado."
            });
        }

        // Só pedidos pendentes podem ser cancelados.
        if (Number(pedido.status_id) !== 200) {
            await client.query("ROLLBACK");

            return responder(res, 409, {
                mensagem: "Somente pedidos pendentes podem ser cancelados."
            });
        }

        // Busca os produtos que pertencem ao pedido.
        const produtosResult = await client.query(
            `SELECT produto_id, quantidade
             FROM produtos_pedido
             WHERE pedido_id = $1
             ORDER BY produto_id`,
            [pedidoId]
        );

        if (produtosResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return responder(res, 409, {
                mensagem: "O pedido não possui produtos para devolver ao estoque."
            });
        }

        // Bloqueia os produtos em ordem para evitar conflitos de estoque.
        const idsProdutos = [
            ...new Set(
                produtosResult.rows.map(
                    produto => Number(produto.produto_id)
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

        // Devolve cada quantidade ao estoque.
        const estoqueAtualizado = [];

        for (const produto of produtosResult.rows) {
            const quantidade = Number(produto.quantidade);
            const produtoId = Number(produto.produto_id);

            if (!Number.isInteger(quantidade) || quantidade <= 0) {
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

        // Atualiza o status somente se ainda estiver pendente.
        const cancelamentoResult = await client.query(
            `UPDATE pedidos
             SET status_id = 204
             WHERE id = $1
               AND user_id = $2
               AND status_id = 200
               AND oculto = false
             RETURNING id, user_id, data_pedido, status_id, oculto`,
            [pedidoId, userId]
        );

        if (cancelamentoResult.rows.length === 0) {
            throw new Error(
                "O pedido deixou de estar pendente durante o cancelamento."
            );
        }

        await client.query("COMMIT");

        return responder(res, 200, {
            mensagem: "Pedido cancelado e estoque atualizado com sucesso.",
            pedido: cancelamentoResult.rows[0],
            produtos_devolvidos: estoqueAtualizado
        });
    } catch (erro) {
        if (client) {
            try {
                await client.query("ROLLBACK");
            } catch (erroRollback) {
                console.error(
                    "Erro ao desfazer transação:",
                    erroRollback
                );
            }
        }

        console.error("Erro ao cancelar pedido:", erro);

        return responder(res, 500, {
            mensagem: "Erro interno ao cancelar o pedido."
        });
    } finally {
        if (client) {
            client.release();
        }
    }
};

module.exports = pedidosCancelar;
