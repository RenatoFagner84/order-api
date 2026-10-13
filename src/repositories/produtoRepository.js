const pool = require("../db");

const ler = async (id) => {
    return await pool.query(
        `SELECT
            p.id,
            p.nome,
            p.quantidade,
            p.valor,
            s.nome AS status
         FROM produtos p
         LEFT JOIN status s
            ON s.id = p.status_id
         WHERE p.id = $1`,
        [id]
    );
};

const lerTudo = async () => {
    return await pool.query(
        `SELECT
            p.id,
            p.nome,
            p.quantidade,
            p.valor,
            s.nome AS status
         FROM produtos p
         LEFT JOIN status s
            ON s.id = p.status_id`
    );
};

const inserir = async (nome) => {
    return await pool.query(
        "SELECT * FROM produtos WHERE nome = $1",
        [nome]
    );
};

const inserirProduto = async (nome, quantidade, valor) => {
    return await pool.query(
        `INSERT INTO produtos
        (nome, quantidade, valor)
        VALUES ($1, $2, $3)
        RETURNING *`,
        [nome, quantidade, valor]
    );
};

const atualizar = async (id, nome, quantidade, valor) => {
    return await pool.query(
        `UPDATE produtos
         SET nome = $1,
             quantidade = $2,
             valor = $3
         WHERE id = $4
         RETURNING *`,
        [
            nome,
            quantidade,
            valor,
            id
        ]
    );
};

const buscarPorNome = async (nome) => {
    const termos = nome
        .trim()
        .split(/\s+/)
        .map(termo => `${termo}:*`)
        .join(' & ');

    return await pool.query(
        `
        SELECT *,
               ts_rank(nome_search, to_tsquery('portuguese', $1))
                   AS relevancia
        FROM produtos
        WHERE nome_search @@ to_tsquery('portuguese', $1)
        ORDER BY relevancia DESC
        `,
        [termos]
    );
};

const deletar = async (id) => {
    return await pool.query(
        "DELETE FROM produtos WHERE id = $1 RETURNING *",
        [id]
    );
};

module.exports = {
    ler,
    lerTudo,
    inserir,
    inserirProduto,
    atualizar,
    buscarPorNome,
    deletar
};