const pool = require("../db");

const buscarPorEmailParaLogin = async (email) => {
    return await pool.query(
        `SELECT id, nome, email, senha_hash, ativo
         FROM users
         WHERE LOWER(email) = LOWER($1)
         LIMIT 1`,
        [email]
    );
};

module.exports = {
    buscarPorEmailParaLogin
};