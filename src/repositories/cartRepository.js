const pool = require("../db");

const listarTodos = async () => {
    return pool.query(`
        SELECT
            c.id,
            c.user_id,
            c.data_pedido,
            c.oculto,
            c.status_id,
            s.nome AS status,
            COALESCE(SUM(p.valor * pc.quantidade), 0) AS valor_total
        FROM carrinho c
        LEFT JOIN status s ON s.id = c.status_id
        LEFT JOIN produtos_carrinho pc ON pc.carrinho_id = c.id
        LEFT JOIN produtos p ON p.id = pc.produto_id
        GROUP BY
            c.id,
            c.user_id,
            c.data_pedido,
            c.oculto,
            c.status_id,
            s.nome
        ORDER BY c.id
    `);
};

const listarPorUser = async (userId) => {
    return pool.query(`
        SELECT
            c.id,
            c.user_id,
            c.data_pedido,
            c.oculto,
            c.status_id,
            s.nome AS status,
            COALESCE(SUM(p.valor * pc.quantidade), 0) AS valor_total
        FROM carrinho c
        LEFT JOIN status s ON s.id = c.status_id
        LEFT JOIN produtos_carrinho pc ON pc.carrinho_id = c.id
        LEFT JOIN produtos p ON p.id = pc.produto_id
        WHERE c.user_id = $1
        GROUP BY
            c.id,
            c.user_id,
            c.data_pedido,
            c.oculto,
            c.status_id,
            s.nome
        ORDER BY c.id
    `, [userId]);
};

const consultar = async (id) => {
    return pool.query(`
        SELECT
            c.id,
            c.user_id,
            c.data_pedido,
            c.oculto,
            c.status_id,
            s.nome AS status,
            COALESCE(SUM(p.valor * pc.quantidade), 0) AS valor_total
        FROM carrinho c
        LEFT JOIN status s ON s.id = c.status_id
        LEFT JOIN produtos_carrinho pc ON pc.carrinho_id = c.id
        LEFT JOIN produtos p ON p.id = pc.produto_id
        WHERE c.id = $1
        GROUP BY
            c.id,
            c.user_id,
            c.data_pedido,
            c.oculto,
            c.status_id,
            s.nome
    `, [id]);
};

const consultarItens = async (carrinhoId) => {
    return pool.query(`
        SELECT
            pc.carrinho_id,
            pc.produto_id,
            p.nome,
            p.valor,
            pc.quantidade,
            (p.valor * pc.quantidade) AS subtotal
        FROM produtos_carrinho pc
        INNER JOIN produtos p ON p.id = pc.produto_id
        WHERE pc.carrinho_id = $1
        ORDER BY pc.produto_id
    `, [carrinhoId]);
};

const consultarItem = async (carrinhoId, produtoId) => {
    return pool.query(`
        SELECT
            pc.carrinho_id,
            pc.produto_id,
            pc.quantidade
        FROM produtos_carrinho pc
        WHERE pc.carrinho_id = $1
          AND pc.produto_id = $2
    `, [carrinhoId, produtoId]);
};

const criar = async (userId) => {
    const insercao = await pool.query(`
        INSERT INTO carrinho (user_id, status_id)
        VALUES (
            $1,
            (
                SELECT id
                FROM status
                WHERE LOWER(nome) = 'aberto'
                LIMIT 1
            )
        )
        RETURNING id
    `, [userId]);

    if (insercao.rows.length === 0) {
        throw new Error(
            "Não foi possível criar o carrinho. Verifique se o status 'aberto' existe na tabela status."
        );
    }

    return consultar(insercao.rows[0].id);
};

const atualizar = async (id, statusId) => {
    if (typeof statusId === "string") {
        return pool.query(`
            UPDATE carrinho
            SET status_id = (
                SELECT id
                FROM status
                WHERE LOWER(nome) = LOWER($1)
                LIMIT 1
            )
            WHERE id = $2
            RETURNING *
        `, [statusId, id]);
    }

    return pool.query(`
        UPDATE carrinho
        SET status_id = $1
        WHERE id = $2
        RETURNING *
    `, [statusId, id]);
};

const adicionarProduto = async (
    carrinhoId,
    produtoId,
    quantidade
) => {
    return pool.query(`
        INSERT INTO produtos_carrinho (
            carrinho_id,
            produto_id,
            quantidade
        )
        VALUES ($1, $2, $3)
        ON CONFLICT (carrinho_id, produto_id)
        DO UPDATE SET
            quantidade = produtos_carrinho.quantidade + EXCLUDED.quantidade
        RETURNING *
    `, [carrinhoId, produtoId, quantidade]);
};

const verificarEstoque = async (produtoId, quantidade) => {
    return pool.query(`
        SELECT id, nome, quantidade
        FROM produtos
        WHERE id = $1
          AND quantidade >= $2
    `, [produtoId, quantidade]);
};

const atualizarQuantidade = async (
    carrinhoId,
    produtoId,
    quantidade
) => {
    return pool.query(`
        UPDATE produtos_carrinho
        SET quantidade = $1
        WHERE carrinho_id = $2
          AND produto_id = $3
        RETURNING *
    `, [quantidade, carrinhoId, produtoId]);
};

const removerProduto = async (carrinhoId, produtoId) => {
    return pool.query(`
        DELETE FROM produtos_carrinho
        WHERE carrinho_id = $1
          AND produto_id = $2
        RETURNING *
    `, [carrinhoId, produtoId]);
};

module.exports = {
    listarTodos,
    listarPorUser,
    consultar,
    consultarItens,
    consultarItem,
    criar,
    atualizar,
    adicionarProduto,
    verificarEstoque,
    atualizarQuantidade,
    removerProduto
};