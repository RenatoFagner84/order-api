const pool = require("../db");

const ler = async (id) => {
    return await pool.query(
        `SELECT *
         FROM users
         WHERE id = $1
           AND ativo = TRUE`,
        [id]
    );
};

const lerTudo = async () => {
    return await pool.query(
        `SELECT *
         FROM users
         WHERE ativo = TRUE`
    );
};

const buscarPorNome = async (nome) => {
    const palavras = nome
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    const busca = palavras
        .map(palavra => `${palavra}:*`)
        .join(" & ");

    return await pool.query(
        `SELECT *
         FROM users
         WHERE ativo = TRUE
           AND to_tsvector('simple', nome)
               @@ to_tsquery('simple', $1)`,
        [busca]
    );
};

const verificarEmail = async (email) => {
    return await pool.query(
        `SELECT *
         FROM users
         WHERE LOWER(email) = LOWER($1)
           AND ativo = TRUE`,
        [email]
    );
};

// Busca um usuário pelo e-mail para realizar o login.
// Inclui usuários inativos para que o login possa rejeitá-los
// com a mesma mensagem usada para credenciais inválidas.
const buscarPorEmailParaLogin = async (email) => {
    return await pool.query(
        `SELECT
            id,
            nome,
            email,
            senha_hash,
            ativo
         FROM users
         WHERE LOWER(email) = LOWER($1)`,
        [email]
    );
};

const inserirUsuario = async (nome, email, telefone, senhaHash) => {
    return await pool.query(
        `INSERT INTO users
            (nome, email, telefone, senha_hash, ativo)
         VALUES ($1, $2, $3, $4, TRUE)
         RETURNING id, nome, email, telefone, ativo`,
        [nome, email, telefone || null, senhaHash]
    );
};

const atualizar = async (
    id,
    nome,
    email,
    telefone,
    status_id
) => {
    await pool.query(
        `UPDATE users
         SET nome = $1,
             email = $2,
             telefone = $3,
             status_id = $4
         WHERE id = $5
           AND ativo = TRUE`,
        [nome, email, telefone || null, status_id, id]
    );

    return await pool.query(
        `SELECT
            u.id,
            u.nome,
            u.email,
            u.telefone,
            s.nome AS status
         FROM users u
         LEFT JOIN status s
            ON s.id = u.status_id
         WHERE u.id = $1
           AND u.ativo = TRUE`,
        [id]
    );
};

const deletar = async (id) => {
    const resultado = await pool.query(
        `UPDATE users
         SET ativo = FALSE
         WHERE id = $1
           AND ativo = TRUE
         RETURNING *`,
        [id]
    );

    if (resultado.rowCount === 0) {
        return {
            sucesso: false,
            mensagem: "Usuário não encontrado ou já está desativado."
        };
    }

    return {
        sucesso: true,
        mensagem: "Usuário desativado com sucesso.",
        user: resultado.rows[0]
    };
};

const lerHistoricoStatus = async (id) => {
    return await pool.query(
        `SELECT
            h.id,
            h.user_id,
            h.status_anterior_id,
            sa.nome AS status_anterior,
            h.status_novo_id,
            sn.nome AS status_novo,
            h.data_alteracao
         FROM users_status_historico h
         LEFT JOIN status sa
            ON sa.id = h.status_anterior_id
         LEFT JOIN status sn
            ON sn.id = h.status_novo_id
         WHERE h.user_id = $1
         ORDER BY h.data_alteracao ASC`,
        [id]
    );
};

module.exports = {
    ler,
    lerTudo,
    buscarPorNome,
    verificarEmail,
    buscarPorEmailParaLogin,
    inserirUsuario,
    atualizar,
    deletar,
    lerHistoricoStatus
};
