const pool = require("../db");

const consultar = async (id) => {
    return await pool.query(`
        SELECT
            p.id,
            p.user_id,
            p.data_pedido,
            p.status_id,
            s.nome AS status,
            p.oculto
        FROM pedidos p
        LEFT JOIN status s
            ON s.id = p.status_id
        WHERE p.id = $1
    `, [id]);
};

const criar = async (user_id) => {
    return await pool.query(`
        INSERT INTO pedidos (user_id)
        VALUES ($1)
        RETURNING *
    `, [user_id]);
};

const consultarProdutosCarrinho = async (carrinho_id) => {
    return await pool.query(`
        SELECT
            pc.carrinho_id,
            pc.produto_id,
            pc.quantidade,
            p.valor
        FROM produtos_carrinho pc
        INNER JOIN produtos p
            ON p.id = pc.produto_id
        WHERE pc.carrinho_id = $1
        ORDER BY pc.produto_id
    `, [carrinho_id]);
};

const verificarEstoqueCarrinho = async (carrinho_id) => {
    return await pool.query(`
        SELECT
            pc.produto_id,
            p.nome,
            pc.quantidade AS quantidade_solicitada,
            p.quantidade AS quantidade_estoque
        FROM produtos_carrinho pc
        INNER JOIN produtos p
            ON p.id = pc.produto_id
        WHERE pc.carrinho_id = $1
          AND pc.quantidade > p.quantidade
        ORDER BY pc.produto_id
    `, [carrinho_id]);
};

const inserirProdutoPedido = async (
    pedido_id,
    produto_id,
    quantidade,
    valor_unitario
) => {
    return await pool.query(`
        INSERT INTO produtos_pedido (
            pedido_id,
            produto_id,
            quantidade,
            valor_unitario
        )
        VALUES ($1, $2, $3, $4)
        RETURNING *
    `, [pedido_id, produto_id, quantidade, valor_unitario]);
};

const baixarEstoque = async (produto_id, quantidade) => {
    return await pool.query(`
        UPDATE produtos
        SET quantidade = quantidade - $1
        WHERE id = $2
          AND quantidade >= $1
        RETURNING id, nome, quantidade
    `, [quantidade, produto_id]);
};

const atualizar = async (id, status_id) => {
    return await pool.query(`
        UPDATE pedidos
        SET status_id = $1
        WHERE id = $2
          AND oculto = false
        RETURNING *
    `, [status_id, id]);
};

const cancelar = async (id, userId) => {
    return await pool.query(`
        UPDATE pedidos
        SET status_id = 204
        WHERE id = $1
          AND user_id = $2
          AND oculto = false
          AND status_id = 200
        RETURNING *
    `, [id, userId]);
};

const lerHistoricoStatus = async (id) => {
    return await pool.query(`
        SELECT
            h.id,
            h.pedido_id,
            h.status_anterior_id,
            sa.nome AS status_anterior,
            h.status_novo_id,
            sn.nome AS status_novo,
            h.data_alteracao
        FROM pedidos_status_historico h
        LEFT JOIN status sa
            ON sa.id = h.status_anterior_id
        LEFT JOIN status sn
            ON sn.id = h.status_novo_id
        WHERE h.pedido_id = $1
        ORDER BY h.data_alteracao ASC
    `, [id]);
};

module.exports = {
    consultar,
    criar,
    atualizar,
    cancelar,
    consultarProdutosCarrinho,
    verificarEstoqueCarrinho,
    inserirProdutoPedido,
    baixarEstoque,
    lerHistoricoStatus
};
