const pool = require("../../db");

const responder = (res, status, dados) => {
    if (res.writableEnded || res.headersSent) return;

    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify(dados));
};

const pedidosFinalizar = async (req, res) => {
    if (
        !req.usuario ||
        req.usuario.id === undefined ||
        req.usuario.id === null
    ) {
        responder(res, 401, {
            mensagem: "Usuário não autenticado."
        });
        return;
    }

    const partes = new URL(
        req.url,
        "http://localhost"
    ).pathname.split("/");

    const carrinhoIdTexto = partes[2];
    const carrinhoId = Number(carrinhoIdTexto);
    const userId = Number(req.usuario.id);

    if (
        !/^\d+$/.test(carrinhoIdTexto || "") ||
        !Number.isSafeInteger(carrinhoId) ||
        carrinhoId <= 0
    ) {
        responder(res, 400, {
            mensagem: "ID do carrinho inválido."
        });
        return;
    }

    if (
        !Number.isSafeInteger(userId) ||
        userId <= 0
    ) {
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

        const carrinhoResult = await client.query(
            `SELECT id, user_id, status_id, oculto
             FROM carrinho
             WHERE id = $1
             FOR UPDATE`,
            [carrinhoId]
        );

        if (!carrinhoResult || !Array.isArray(carrinhoResult.rows)) {
            throw new Error("Resposta inválida ao consultar o carrinho.");
        }

        if (carrinhoResult.rows.length === 0) {
            await client.query("ROLLBACK");
            transacaoIniciada = false;

            responder(res, 404, {
                mensagem: "Carrinho não encontrado."
            });
            return;
        }

        const carrinho = carrinhoResult.rows[0];

        if (Number(carrinho.user_id) !== userId) {
            await client.query("ROLLBACK");
            transacaoIniciada = false;

            responder(res, 403, {
                mensagem: "Você não tem permissão para finalizar este carrinho."
            });
            return;
        }

        if (carrinho.oculto) {
            await client.query("ROLLBACK");
            transacaoIniciada = false;

            responder(res, 409, {
                mensagem: "Este carrinho não está disponível."
            });
            return;
        }

        if (Number(carrinho.status_id) === 401) {
            await client.query("ROLLBACK");
            transacaoIniciada = false;

            responder(res, 409, {
                mensagem: "Este carrinho já foi finalizado."
            });
            return;
        }

        const produtosResult = await client.query(
            `SELECT
                pc.produto_id,
                pc.quantidade,
                p.nome,
                p.valor,
                p.quantidade AS quantidade_estoque
             FROM produtos_carrinho pc
             INNER JOIN produtos p ON p.id = pc.produto_id
             WHERE pc.carrinho_id = $1
             ORDER BY pc.produto_id
             FOR UPDATE OF p`,
            [carrinhoId]
        );

        if (!produtosResult || !Array.isArray(produtosResult.rows)) {
            throw new Error("Resposta inválida ao consultar os produtos.");
        }

        if (produtosResult.rows.length === 0) {
            await client.query("ROLLBACK");
            transacaoIniciada = false;

            responder(res, 400, {
                mensagem: "Não é possível finalizar um carrinho vazio."
            });
            return;
        }

        const produtosInvalidos = produtosResult.rows.filter((produto) => {
            const quantidade = Number(produto.quantidade);
            const estoque = Number(produto.quantidade_estoque);

            return (
                !Number.isSafeInteger(quantidade) ||
                quantidade <= 0 ||
                !Number.isSafeInteger(estoque) ||
                estoque < 0 ||
                quantidade > estoque
            );
        });

        if (produtosInvalidos.length > 0) {
            await client.query("ROLLBACK");
            transacaoIniciada = false;

            responder(res, 409, {
                mensagem: "Estoque insuficiente ou quantidade inválida.",
                produtos: produtosInvalidos.map((produto) => ({
                    produto_id: produto.produto_id,
                    nome: produto.nome,
                    quantidade_solicitada: produto.quantidade,
                    quantidade_estoque: produto.quantidade_estoque
                }))
            });
            return;
        }

        const pedidoResult = await client.query(
            `INSERT INTO pedidos (user_id, status_id, oculto)
             VALUES ($1, $2, false)
             RETURNING id, user_id, data_pedido, status_id, oculto`,
            [userId, 200]
        );

        if (!pedidoResult || !Array.isArray(pedidoResult.rows) || !pedidoResult.rows[0]) {
            throw new Error("Não foi possível criar o pedido.");
        }

        const pedido = pedidoResult.rows[0];
        const produtosPedido = [];

        for (const produto of produtosResult.rows) {
            const quantidade = Number(produto.quantidade);
            const valorUnitario = Number(produto.valor);

            if (!Number.isFinite(valorUnitario) || valorUnitario < 0) {
                throw new Error(
                    `Valor inválido para o produto ${produto.produto_id}.`
                );
            }

            const produtoPedidoResult = await client.query(
                `INSERT INTO produtos_pedido
                    (pedido_id, produto_id, quantidade, valor_unitario)
                 VALUES ($1, $2, $3, $4)
                 RETURNING *`,
                [
                    pedido.id,
                    produto.produto_id,
                    quantidade,
                    valorUnitario
                ]
            );

            if (
                !produtoPedidoResult ||
                !Array.isArray(produtoPedidoResult.rows) ||
                !produtoPedidoResult.rows[0]
            ) {
                throw new Error(
                    `Não foi possível adicionar o produto ${produto.produto_id} ao pedido.`
                );
            }

            const estoqueResult = await client.query(
                `UPDATE produtos
                 SET quantidade = quantidade - $1
                 WHERE id = $2
                   AND quantidade >= $1
                 RETURNING id, nome, quantidade`,
                [quantidade, produto.produto_id]
            );

            if (
                !estoqueResult ||
                !Array.isArray(estoqueResult.rows) ||
                estoqueResult.rows.length === 0
            ) {
                throw new Error(
                    `Não foi possível atualizar o estoque do produto ${produto.produto_id}.`
                );
            }

            produtosPedido.push({
                ...produtoPedidoResult.rows[0],
                nome: produto.nome,
                estoque_atual: estoqueResult.rows[0].quantidade
            });
        }

        await client.query(
            `UPDATE carrinho
             SET status_id = 401
             WHERE id = $1`,
            [carrinhoId]
        );

        await client.query("COMMIT");
        transacaoIniciada = false;

        responder(res, 201, {
            mensagem: "Pedido finalizado com sucesso.",
            pedido: {
                ...pedido,
                produtos: produtosPedido
            }
        });
    } catch (erro) {
        if (client && transacaoIniciada) {
            try {
                await client.query("ROLLBACK");
            } catch (erroRollback) {
                console.error("[ERRO AO DESFAZER TRANSAÇÃO]", erroRollback);
            }
        }

        console.error("[ERRO AO FINALIZAR PEDIDO]", erro);

        responder(res, 500, {
            mensagem: "Erro interno ao finalizar o pedido."
        });
    } finally {
        if (client) {
            client.release();
        }
    }
};

module.exports = pedidosFinalizar;
