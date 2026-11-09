
const pool = require("../db");

async function buscarPermissaoPorRotaEMetodo(url, metodo) {
    const sql = `
        SELECT id, url, metodo
        FROM permissions
        WHERE url = $1
          AND UPPER(metodo) = UPPER($2)
        LIMIT 1
    `;

    const resultado = await pool.query(sql, [url, metodo]);

    return resultado.rows[0] || null;
}

async function usuarioTemPermissao(userId, url, metodo) {
    const sql = `
        SELECT EXISTS (
            SELECT 1
            FROM users u
            INNER JOIN users_roles ur
                ON ur.user_id = u.id
            INNER JOIN roles_permissions rp
                ON rp.role_id = ur.role_id
            INNER JOIN permissions p
                ON p.id = rp.permission_id
            WHERE u.id = $1
              AND u.ativo = TRUE
              AND p.url = $2
              AND UPPER(p.metodo) = UPPER($3)
        ) AS permitido
    `;

    const resultado = await pool.query(sql, [
        userId,
        url,
        metodo
    ]);

    return resultado.rows[0]?.permitido === true;
}

async function lerPorUser(userId) {
    const sql = `
        SELECT DISTINCT
            p.id,
            p.url,
            p.metodo
        FROM users u
        INNER JOIN users_roles ur
            ON ur.user_id = u.id
        INNER JOIN roles_permissions rp
            ON rp.role_id = ur.role_id
        INNER JOIN permissions p
            ON p.id = rp.permission_id
        WHERE u.id = $1
          AND u.ativo = TRUE
        ORDER BY p.id
    `;

    return await pool.query(sql, [userId]);
}

module.exports = {
    buscarPermissaoPorRotaEMetodo,
    usuarioTemPermissao,
    lerPorUser
};
