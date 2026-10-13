const pool = require("../db");

const listarTodos = async () => {
    const result = await pool.query(`
        SELECT
            c.id,
            c.user_id,
            s.nome AS status,
            COALESCE(
                SUM(p.valor * pc.quantidade),
                0
            ) AS valor_total
        FROM carrinho c
        LEFT JOIN status s
            ON s.id = c.status_id
        LEFT JOIN produtos_carrinho pc
            ON pc.carrinho_id = c.id
        LEFT JOIN produtos p
            ON p.id = pc.produto_id
        GROUP BY
            c.id,
            c.user_id,
            s.nome
        ORDER BY c.id
    `);

    return result;
};

const consultar = async (id) => {
    const result = await pool.query(`
        SELECT
            c.id,
            c.user_id,
            s.nome AS status,
            COALESCE(
                SUM(p.valor * pc.quantidade),
                0
            ) AS valor_total
        FROM carrinho c
        LEFT JOIN status s
            ON s.id = c.status_id
        LEFT JOIN produtos_carrinho pc
            ON pc.carrinho_id = c.id
        LEFT JOIN produtos p
            ON p.id = pc.produto_id
        WHERE c.id = $1
        GROUP BY
            c.id,
            c.user_id,
            s.nome
    `, [id]);

    return result;
};

const consultarItens = async (carrinho_id) => {
    const result = await pool.query(`
        SELECT
            pc.produto_id,
            p.nome,
            p.valor,
            pc.quantidade,
            (p.valor * pc.quantidade) AS subtotal
        FROM produtos_carrinho pc
        INNER JOIN produtos p
            ON p.id = pc.produto_id
        WHERE pc.carrinho_id = $1
        ORDER BY pc.produto_id
    `, [carrinho_id]);

    return result;
};

const consultarItem = async (
    carrinho_id,
    produto_id
) => {
    const result = await pool.query(`
        SELECT
            pc.carrinho_id,
            pc.produto_id,
            pc.quantidade
        FROM produtos_carrinho pc
        WHERE pc.carrinho_id = $1
        AND pc.produto_id = $2
    `, [
        carrinho_id,
        produto_id
    ]);

    return result;
};

const criar = async (user_id) => {
    await pool.query(`
        INSERT INTO carrinho
        (
            user_id,
            status_id
        )
        VALUES
        (
            $1,
            (
                SELECT id
                FROM status
                WHERE nome = 'aberto'
            )
        )
    `, [user_id]);

    return await pool.query(`
        SELECT
            c.id,
            c.user_id,
            c.data_pedido,
            c.oculto,
            s.nome AS status
        FROM carrinho c
        LEFT JOIN status s
            ON s.id = c.status_id
        WHERE c.user_id = $1
        ORDER BY c.id DESC
        LIMIT 1
    `, [user_id]);
};

const atualizar = async (id, status_id) => {
    let result;

    if (typeof status_id === "string") {
        result = await pool.query(`
            UPDATE carrinho
            SET status_id = (
                SELECT id
                FROM status
                WHERE nome = $1
            )
            WHERE id = $2
            RETURNING *
        `, [
            status_id,
            id
        ]);
    } else {
        result = await pool.query(`
            UPDATE carrinho
            SET status_id = $1
            WHERE id = $2
            RETURNING *
        `, [
            status_id,
            id
        ]);
    }

    return result;
};

const adicionarProduto = async (
    carrinho_id,
    produto_id,
    quantidade
) => {
    const result = await pool.query(`
        INSERT INTO produtos_carrinho
        (
            carrinho_id,
            produto_id,
            quantidade
        )
        VALUES
        (
            $1,
            $2,
            $3
        )
        ON CONFLICT (carrinho_id, produto_id)
        DO UPDATE SET
            quantidade =
                produtos_carrinho.quantidade
                + EXCLUDED.quantidade
        RETURNING *
    `, [
        carrinho_id,
        produto_id,
        quantidade
    ]);

    return result;
};

const verificarEstoque = async (
    produto_id,
    quantidade
) => {
    const result = await pool.query(`
        SELECT
            id,
            nome,
            quantidade
        FROM produtos
        WHERE id = $1
        AND quantidade >= $2
    `, [
        produto_id,
        quantidade
    ]);

    return result;
};

const atualizarQuantidade = async (
    carrinho_id,
    produto_id,
    quantidade
) => {
    const result = await pool.query(`
        UPDATE produtos_carrinho
        SET quantidade = $1
        WHERE carrinho_id = $2
        AND produto_id = $3
        RETURNING *
    `, [
        quantidade,
        carrinho_id,
        produto_id
    ]);

    return result;
};

const removerProduto = async (
    carrinho_id,
    produto_id
) => {
    const result = await pool.query(`
        DELETE FROM produtos_carrinho
        WHERE carrinho_id = $1
        AND produto_id = $2
        RETURNING *
    `, [
        carrinho_id,
        produto_id
    ]);

    return result;
};

module.exports = {
    listarTodos,
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
