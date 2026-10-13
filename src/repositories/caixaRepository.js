const pool = require("../db");

const inserir = async (
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
    const resultado = await pool.query(
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
        RETURNING id`,
        [
            user_id || null,
            pedido_id || null,
            tipo_movimentacao_id,
            subtotal || 0,
            desconto || 0,
            frete || 0,
            acrescimo || 0,
            total || 0,
            forma_pagamento_id || null,
            pagamento_status_id || null,
            descricao || null
        ]
    );

    return await pool.query(
        `
        SELECT
            c.id,
            c.user_id,
            c.pedido_id,
            tm.nome AS tipo_movimentacao,
            c.subtotal,
            c.desconto,
            c.frete,
            c.acrescimo,
            c.total,
            fp.nome AS forma_pagamento,
            ps.nome AS pagamento_status,
            c.descricao
        FROM caixa c
        LEFT JOIN tipo_movimentacao_caixa tm_id
            ON tm_id.id = c.tipo_movimentacao_id
        LEFT JOIN status tm
            ON tm.id = tm_id.id
        LEFT JOIN forma_de_pagamento fp_id
            ON fp_id.id = c.forma_pagamento_id
        LEFT JOIN status fp
            ON fp.id = fp_id.id
        LEFT JOIN pagamentos_status ps_id
            ON ps_id.id = c.pagamento_status_id
        LEFT JOIN status ps
            ON ps.id = ps_id.id
        WHERE c.id = $1
        `,
        [resultado.rows[0].id]
    );
};

const listar = async () => {
    return await pool.query(`
        SELECT
            c.id,
            c.user_id,
            c.pedido_id,
            tm.nome AS tipo_movimentacao,
            c.subtotal,
            c.desconto,
            c.frete,
            c.acrescimo,
            c.total,
            fp.nome AS forma_pagamento,
            ps.nome AS pagamento_status,
            c.descricao
        FROM caixa c
        LEFT JOIN tipo_movimentacao_caixa tm_id
            ON tm_id.id = c.tipo_movimentacao_id
        LEFT JOIN status tm
            ON tm.id = tm_id.id
        LEFT JOIN forma_de_pagamento fp_id
            ON fp_id.id = c.forma_pagamento_id
        LEFT JOIN status fp
            ON fp.id = fp_id.id
        LEFT JOIN pagamentos_status ps_id
            ON ps_id.id = c.pagamento_status_id
        LEFT JOIN status ps
            ON ps.id = ps_id.id
        ORDER BY c.id DESC
    `);
};

const ler = async (id) => {
    return await pool.query(
        `
        SELECT
            c.id,
            c.user_id,
            c.pedido_id,
            tm.nome AS tipo_movimentacao,
            c.subtotal,
            c.desconto,
            c.frete,
            c.acrescimo,
            c.total,
            fp.nome AS forma_pagamento,
            ps.nome AS pagamento_status,
            c.descricao
        FROM caixa c
        LEFT JOIN tipo_movimentacao_caixa tm_id
            ON tm_id.id = c.tipo_movimentacao_id
        LEFT JOIN status tm
            ON tm.id = tm_id.id
        LEFT JOIN forma_de_pagamento fp_id
            ON fp_id.id = c.forma_pagamento_id
        LEFT JOIN status fp
            ON fp.id = fp_id.id
        LEFT JOIN pagamentos_status ps_id
            ON ps_id.id = c.pagamento_status_id
        LEFT JOIN status ps
            ON ps.id = ps_id.id
        WHERE c.id = $1
        `,
        [id]
    );
};

const listarPorUser = async (user_id) => {
    return await pool.query(
        `
        SELECT
            c.id,
            c.user_id,
            c.pedido_id,
            tm.nome AS tipo_movimentacao,
            c.subtotal,
            c.desconto,
            c.frete,
            c.acrescimo,
            c.total,
            fp.nome AS forma_pagamento,
            ps.nome AS pagamento_status,
            c.descricao
        FROM caixa c
        LEFT JOIN tipo_movimentacao_caixa tm_id
            ON tm_id.id = c.tipo_movimentacao_id
        LEFT JOIN status tm
            ON tm.id = tm_id.id
        LEFT JOIN forma_de_pagamento fp_id
            ON fp_id.id = c.forma_pagamento_id
        LEFT JOIN status fp
            ON fp.id = fp_id.id
        LEFT JOIN pagamentos_status ps_id
            ON ps_id.id = c.pagamento_status_id
        LEFT JOIN status ps
            ON ps.id = ps_id.id
        WHERE c.user_id = $1
        ORDER BY c.id DESC
        `,
        [user_id]
    );
};

const listarPorPedido = async (pedido_id) => {
    return await pool.query(
        `
        SELECT
            c.id,
            c.user_id,
            c.pedido_id,
            tm.nome AS tipo_movimentacao,
            c.subtotal,
            c.desconto,
            c.frete,
            c.acrescimo,
            c.total,
            fp.nome AS forma_pagamento,
            ps.nome AS pagamento_status,
            c.descricao
        FROM caixa c
        LEFT JOIN tipo_movimentacao_caixa tm_id
            ON tm_id.id = c.tipo_movimentacao_id
        LEFT JOIN status tm
            ON tm.id = tm_id.id
        LEFT JOIN forma_de_pagamento fp_id
            ON fp_id.id = c.forma_pagamento_id
        LEFT JOIN status fp
            ON fp.id = fp_id.id
        LEFT JOIN pagamentos_status ps_id
            ON ps_id.id = c.pagamento_status_id
        LEFT JOIN status ps
            ON ps.id = ps_id.id
        WHERE c.pedido_id = $1
        ORDER BY c.id DESC
        `,
        [pedido_id]
    );
};

const atualizar = async (
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
    await pool.query(
        `
        UPDATE caixa
        SET
            user_id = $1,
            pedido_id = $2,
            tipo_movimentacao_id = $3,
            subtotal = $4,
            desconto = $5,
            frete = $6,
            acrescimo = $7,
            total = $8,
            forma_pagamento_id = $9,
            pagamento_status_id = $10,
            descricao = $11
        WHERE id = $12
        `,
        [
            user_id || null,
            pedido_id || null,
            tipo_movimentacao_id,
            subtotal || 0,
            desconto || 0,
            frete || 0,
            acrescimo || 0,
            total || 0,
            forma_pagamento_id || null,
            pagamento_status_id || null,
            descricao || null,
            id
        ]
    );

    return await pool.query(
        `
        SELECT
            c.id,
            c.user_id,
            c.pedido_id,
            tm.nome AS tipo_movimentacao,
            c.subtotal,
            c.desconto,
            c.frete,
            c.acrescimo,
            c.total,
            fp.nome AS forma_pagamento,
            ps.nome AS pagamento_status,
            c.descricao
        FROM caixa c
        LEFT JOIN tipo_movimentacao_caixa tm_id
            ON tm_id.id = c.tipo_movimentacao_id
        LEFT JOIN status tm
            ON tm.id = tm_id.id
        LEFT JOIN forma_de_pagamento fp_id
            ON fp_id.id = c.forma_pagamento_id
        LEFT JOIN status fp
            ON fp.id = fp_id.id
        LEFT JOIN pagamentos_status ps_id
            ON ps_id.id = c.pagamento_status_id
        LEFT JOIN status ps
            ON ps.id = ps_id.id
        WHERE c.id = $1
        `,
        [id]
    );
};

const deletar = async (id) => {
    return await pool.query(
        `
        DELETE FROM caixa
        WHERE id = $1
        RETURNING *
        `,
        [id]
    );
};

module.exports = {
    inserir,
    listar,
    ler,
    listarPorUser,
    listarPorPedido,
    atualizar,
    deletar
};