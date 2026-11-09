const pool = require("../db");

const inserir = async (
    user_id,
    cep,
    logradouro,
    numero,
    complemento,
    bairro,
    cidade,
    estado
) => {
    return pool.query(
        `INSERT INTO enderecos (
            user_id,
            cep,
            logradouro,
            numero,
            complemento,
            bairro,
            cidade,
            estado
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
            user_id,
            cep,
            logradouro,
            numero,
            complemento || null,
            bairro,
            cidade,
            estado
        ]
    );
};

const listarPorUser = async (userId) => {
    return pool.query(
        `SELECT *
         FROM enderecos
         WHERE user_id = $1
         ORDER BY id`,
        [userId]
    );
};

const ler = async (id) => {
    return pool.query(
        `SELECT *
         FROM enderecos
         WHERE id = $1`,
        [id]
    );
};

const atualizar = async (
    id,
    cep,
    logradouro,
    numero,
    complemento,
    bairro,
    cidade,
    estado
) => {
    return pool.query(
        `UPDATE enderecos
         SET cep = $1,
             logradouro = $2,
             numero = $3,
             complemento = $4,
             bairro = $5,
             cidade = $6,
             estado = $7
         WHERE id = $8
         RETURNING *`,
        [
            cep,
            logradouro,
            numero,
            complemento || null,
            bairro,
            cidade,
            estado,
            id
        ]
    );
};

const deletar = async (id) => {
    return pool.query(
        `DELETE FROM enderecos
         WHERE id = $1
         RETURNING *`,
        [id]
    );
};

module.exports = {
    inserir,
    listarPorUser,
    ler,
    atualizar,
    deletar
};