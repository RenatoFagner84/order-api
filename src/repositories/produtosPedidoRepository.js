const pool = require("../db");

const lerTudo = async () => {

    const result = await pool.query(`
        SELECT *
        FROM produtos_pedido
        ORDER BY pedido_id DESC, produto_id DESC
    `);

    return result;
};

const inserir = async (
    pedido_id,
    produto_id,
    quantidade,
    valor_unitario
) => {

    const result = await pool.query(`
        INSERT INTO produtos_pedido
        (
            pedido_id,
            produto_id,
            quantidade,
            valor_unitario
        )
        VALUES ($1, $2, $3, $4)
        RETURNING *
    `, [
        pedido_id,
        produto_id,
        quantidade,
        valor_unitario
    ]);

    return result;
};
const atualizar = async (
    pedido_id,
    produto_id,
    quantidade,
    valor_unitario
) => {

    const result = await pool.query(`
        UPDATE produtos_pedido
        SET
            quantidade = $1,
            valor_unitario = $2
        WHERE pedido_id = $3
        AND produto_id = $4
        RETURNING *
    `, [
        quantidade,
        valor_unitario,
        pedido_id,
        produto_id
    ]);

    return result;
};

const deletar = async (
    pedido_id,
    produto_id
) => {

    const result = await pool.query(`
        DELETE FROM produtos_pedido
        WHERE pedido_id = $1
        AND produto_id = $2
        RETURNING *
    `, [
        pedido_id,
        produto_id
    ]);

    return result;
};


module.exports = {
    lerTudo,
    inserir,
    atualizar,
    deletar
};