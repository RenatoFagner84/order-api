const pool = require("../../db");

const responder = (res, status, dados) => {
    if (res.writableEnded) return;

    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify(dados));
};

const pedidosFinalizar = async (req, res) => {
    const partes = new URL(req.url, "http://localhost:3000").pathname.split("/");
    const carrinhoId = Number(partes[2]);
    const userId = Number(req.usuario?.id);

    if (!Number.isInteger(carrinhoId) || carrinhoId <= 0) {
        return responder(res, 400, {
            mensagem: "ID do carrinho inválido."
        });
    }

    if (!Number.isInteger(userId) || userId <= 0) {
        return responder(res, 401, {
            mensagem: "Usuário não autenticado."
        });
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // Busca e bloqueia o carrinho.
        const carrinhoResult = await client.query(
            `SELECT id, user_id, status_id, oculto
             FROM carrinho
             WHERE id = $1
             FOR UPDATE`,
            [carrinhoId]
        );

        if (carrinhoResult.rows.length === 0) {
            await client.query("ROLLBACK");
            return responder(res, 404, {
                mensagem: "Carrinho não encontrado."
            });
        }

        const carrinho = carrinhoResult.rows[0];

        if (Number(carrinho.user_id) !== userId) {
            await client.query("ROLLBACK");
            return responder(res, 403, {
                mensagem: "Você não tem permissão para finalizar este carrinho."
            });
        }

        if (carrinho.oculto) {
            await client.query("ROLLBACK");
            return responder(res, 409, {
                mensagem: "Este carrinho não está disponível."
            });
        }

        if (Number(carrinho.status_id) === 401) {
            await client.query("ROLLBACK");
            return responder(res, 409, {
                mensagem: "Este carrinho já foi finalizado."
            });
        }

        // Busca os produtos e bloqueia as linhas de estoque.
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

        if (produtosResult.rows.length === 0) {
            await client.query("ROLLBACK");
            return responder(res, 400, {
                mensagem: "Não é possível finalizar um carrinho vazio."
            });
        }

        const produtosInvalidos = produtosResult.rows.filter(produto => {
            const quantidade = Number(produto.quantidade);
            const estoque = Number(produto.quantidade_estoque);

            return (
                !Number.isInteger(quantidade) ||
                quantidade <= 0 ||
                quantidade > estoque
            );
        });

        if (produtosInvalidos.length > 0) {
            await client.query("ROLLBACK");
            return responder(res, 409, {
                mensagem: "Estoque insuficiente ou quantidade inválida.",
                produtos: produtosInvalidos.map(produto => ({
                    produto_id: produto.produto_id,
                    nome: produto.nome,
                    quantidade_solicitada: produto.quantidade,
                    quantidade_estoque: produto.quantidade_estoque
                }))
            });
        }

        // Cria o pedido como pendente (status 200).
        const pedidoResult = await client.query(
            `INSERT INTO pedidos (user_id, status_id, oculto)
             VALUES ($1, $2, false)
             RETURNING id, user_id, data_pedido, status_id, oculto`,
            [userId, 200]
        );

        const pedido = pedidoResult.rows[0];
        const produtosPedido = [];

        for (const produto of produtosResult.rows) {
            const quantidade = Number(produto.quantidade);
            const valorUnitario = Number(produto.valor);

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

            const estoqueResult = await client.query(
                `UPDATE produtos
                 SET quantidade = quantidade - $1
                 WHERE id = $2
                   AND quantidade >= $1
                 RETURNING id, nome, quantidade`,
                [quantidade, produto.produto_id]
            );

            if (estoqueResult.rows.length === 0) {
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

        // Marca o carrinho como finalizado.
        await client.query(
            `UPDATE carrinho
             SET status_id = 401
             WHERE id = $1`,
            [carrinhoId]
        );

        await client.query("COMMIT");

        return responder(res, 201, {
            mensagem: "Pedido finalizado com sucesso.",
            pedido: {
                ...pedido,
                produtos: produtosPedido
            }
        });
    } catch (erro) {
        try {
            await client.query("ROLLBACK");
        } catch (erroRollback) {
            console.error("Erro ao desfazer transação:", erroRollback);
        }

        console.error("Erro ao finalizar pedido:", erro);

        return responder(res, 500, {
            mensagem: "Erro interno ao finalizar o pedido."
        });
    } finally {
        client.release();
    }
};

module.exports = pedidosFinalizar;
