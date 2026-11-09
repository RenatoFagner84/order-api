
const pool = require("../db");

const lerTudo = async () => {
    return await pool.query(`
        SELECT id, role
        FROM roles
        ORDER BY id
    `);
};

const buscarPorId = async (roleId) => {
    const resultado = await pool.query(
        `SELECT id, role
         FROM roles
         WHERE id = $1
         LIMIT 1`,
        [roleId]
    );

    return resultado.rows[0] || null;
};

const lerPorUser = async (userId) => {
    return await pool.query(
        `SELECT r.id, r.role
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
};

const atribuir = async (userId, roleId) => {
    return await pool.query(
        `INSERT INTO users_roles (user_id, role_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, role_id)
         DO NOTHING
         RETURNING user_id, role_id`,
        [userId, roleId]
    );
};

const remover = async (userId, roleId) => {
    return await pool.query(
        `DELETE FROM users_roles
         WHERE user_id = $1
           AND role_id = $2
         RETURNING user_id, role_id`,
        [userId, roleId]
    );
};

const verificarUltimoAdminAtivo = async (userId, roleId) => {
    const resultado = await pool.query(
        `SELECT
            EXISTS (
                SELECT 1
                FROM users_roles ur
                INNER JOIN roles r
                    ON r.id = ur.role_id
                INNER JOIN users u
                    ON u.id = ur.user_id
                WHERE ur.user_id = $1
                  AND ur.role_id = $2
                  AND LOWER(TRIM(r.role)) = 'admin'
                  AND u.ativo = TRUE
            ) AS usuario_e_admin_ativo,
            (
                SELECT COUNT(DISTINCT u.id)::INTEGER
                FROM users_roles ur
                INNER JOIN roles r
                    ON r.id = ur.role_id
                INNER JOIN users u
                    ON u.id = ur.user_id
                WHERE LOWER(TRIM(r.role)) = 'admin'
                  AND u.ativo = TRUE
            ) AS total_admins_ativos`,
        [userId, roleId]
    );

    return resultado.rows[0] || {
        usuario_e_admin_ativo: false,
        total_admins_ativos: 0
    };
};

module.exports = {
    lerTudo,
    buscarPorId,
    lerPorUser,
    atribuir,
    remover,
    verificarUltimoAdminAtivo
};
