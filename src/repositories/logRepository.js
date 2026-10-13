const pool = require("../db");

const inserir = async (
    metodo,
    rota,
    status_code,
    mensagem,
    ip,
    user_agent
) => {
    return await pool.query(
        `INSERT INTO logs (
            metodo,
            rota,
            status_code,
            mensagem,
            ip,
            user_agent
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *`,
        [
            metodo,
            rota,
            status_code || null,
            mensagem || null,
            ip || null,
            user_agent || null
        ]
    );
};

const listar = async (limite = 100, offset = 0) => {
    return await pool.query(
        `SELECT
            id,
            metodo,
            rota,
            status_code,
            mensagem,
            ip,
            user_agent,
            data_criacao
        FROM logs
        ORDER BY data_criacao DESC, id DESC
        LIMIT $1 OFFSET $2`,
        [limite, offset]
    );
};

const ler = async (id) => {
    return await pool.query(
        `SELECT
            id,
            metodo,
            rota,
            status_code,
            mensagem,
            ip,
            user_agent,
            data_criacao
        FROM logs
        WHERE id = $1`,
        [id]
    );
};

const contar = async () => {
    return await pool.query(
        `SELECT COUNT(*) AS total
         FROM logs`
    );
};

module.exports = {
    inserir,
    listar,
    ler,
    contar
};
