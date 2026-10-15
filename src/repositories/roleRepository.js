
const pool = require("../db");

const lerTudo = async () => {
    const resultado = await pool.query(`
        SELECT
            id,
            role
        FROM roles
        ORDER BY id
    `);

    return resultado;
};

const lerPorUser = async (userId) => {
    const resultado = await pool.query(
        `SELECT
            r.id,
            r.role
         FROM roles r
         INNER JOIN users_roles ur
            ON ur.role_id = r.id
         INNER JOIN users u
            ON u.id = ur.user_id
         WHERE ur.user_id = $1
           AND u.ativo = TRUE
         ORDER BY r.id`,
        [userId]
    );

    return resultado;
};

const atribuir = async (userId, roleId) => {
    const resultado = await pool.query(
        `INSERT INTO users_roles (
            user_id,
            role_id
         )
         VALUES ($1, $2)
         ON CONFLICT (user_id, role_id)
         DO NOTHING
         RETURNING user_id, role_id`,
        [userId, roleId]
    );

    return resultado;
};

const remover = async (userId, roleId) => {
    const resultado = await pool.query(
        `DELETE FROM users_roles
         WHERE user_id = $1
           AND role_id = $2
         RETURNING user_id, role_id`,
        [userId, roleId]
    );

    return resultado;
};

const verificarUltimoAdminAtivo = async (userId) => {
    const resultado = await pool.query(
        `SELECT
            EXISTS (
                SELECT 1
                FROM users_roles ur
                INNER JOIN users u
                    ON u.id = ur.user_id
                WHERE ur.user_id = $1
                  AND ur.role_id = 1
                  AND u.ativo = TRUE
            ) AS usuario_e_admin_ativo,
            (
                SELECT COUNT(*)::INTEGER
                FROM users_roles ur
                INNER JOIN users u
                    ON u.id = ur.user_id
                WHERE ur.role_id = 1
                  AND u.ativo = TRUE
            ) AS total_admins_ativos`,
        [userId]
    );

    return resultado.rows[0];
};

module.exports = {
    lerTudo,
    lerPorUser,
    atribuir,
    remover,
    verificarUltimoAdminAtivo
};
