const pool = require("../db");

const inserir = (
    user_id,
    pedido_id,
    tipo_movimentacao_id,
    subtotal,
    desconto,
    frete,
    acrescimo,
    total,
    forma_pagamento_id,
    pagamento_status_id,
    descricao
) => {
    return pool.query(
        `INSERT INTO caixa (
            user_id,
            pedido_id,
            tipo_movimentacao_id,
            subtotal,
            desconto,
            frete,
            acrescimo,
            total,
            forma_pagamento_id,
            pagamento_status_id,
            descricao
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
            user_id,
            pedido_id,
            tipo_movimentacao_id,
            subtotal,
            desconto,
            frete,
            acrescimo,
            total,
            forma_pagamento_id,
            pagamento_status_id,
            descricao
        ]
    );
};

const ler = (id) => {
    return pool.query(
        "SELECT * FROM caixa WHERE id = $1",
        [id]
    );
};

const listar = () => {
    return pool.query(
        "SELECT * FROM caixa ORDER BY id"
    );
};

const atualizar = (
    id,
    user_id,
    pedido_id,
    tipo_movimentacao_id,
    subtotal,
    desconto,
    frete,
    acrescimo,
    total,
    forma_pagamento_id,
    pagamento_status_id,
    descricao
) => {
    return pool.query(
        `UPDATE caixa
         SET user_id = $2,
             pedido_id = $3,
             tipo_movimentacao_id = $4,
             subtotal = $5,
             desconto = $6,
             frete = $7,
             acrescimo = $8,
             total = $9,
             forma_pagamento_id = $10,
             pagamento_status_id = $11,
             descricao = $12
         WHERE id = $1
         RETURNING *`,
        [
            id,
            user_id,
            pedido_id,
            tipo_movimentacao_id,
            subtotal,
            desconto,
            frete,
            acrescimo,
            total,
            forma_pagamento_id,
            pagamento_status_id,
            descricao
        ]
    );
};

const deletar = (id) => {
    return pool.query(
        "DELETE FROM caixa WHERE id = $1 RETURNING *",
        [id]
    );
};

const listarPorUser = (userId) => {
    return pool.query(
        "SELECT * FROM caixa WHERE user_id = $1 ORDER BY id",
        [userId]
    );
};

const listarPorPedido = (pedidoId) => {
    return pool.query(
        "SELECT * FROM caixa WHERE pedido_id = $1 ORDER BY id",
        [pedidoId]
    );
};

module.exports = {
    inserir,
    ler,
    listar,
    atualizar,
    deletar,
    listarPorUser,
    listarPorPedido
};