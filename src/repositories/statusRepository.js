const pool = require("../db");

const consultarStatus = (statusId) => pool.query(
    `SELECT id
     FROM status
     WHERE id = $1
     LIMIT 1`,
    [statusId]
);

const consultarStatusPorNome = (nome) => pool.query(
    `SELECT id
     FROM status
     WHERE LOWER(nome) = LOWER($1)
     LIMIT 1`,
    [nome]
);

module.exports = {
    consultarStatus,
    consultarStatusPorNome
};
