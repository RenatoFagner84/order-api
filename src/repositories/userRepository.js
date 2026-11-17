
const pool = require("../db");

const ler = async (id) => {
    return await pool.query(
        `SELECT
            id, nome, email, telefone, status_id, ativo
         FROM users
         WHERE id = $1 AND ativo = TRUE`,
        [id]
    );
};

const lerTudo = async () => {
    return await pool.query(
        `SELECT
            id, nome, email, telefone, status_id, ativo
         FROM users
         WHERE ativo = TRUE
         ORDER BY id`
    );
};

const buscarPorNome = async (nome) => {
    const palavras = String(nome || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (palavras.length === 0) {
        return { rows: [], rowCount: 0 };
    }

    const busca = palavras
        .map((palavra) =>
            `${palavra.replace(/[^\p{L}\p{N}_]/gu, "")}:*`
        )
        .filter((palavra) => palavra !== ":*")
        .join(" & ");

    if (!busca) {
        return { rows: [], rowCount: 0 };
    }

    return await pool.query(
        `SELECT
            id, nome, email, telefone, status_id, ativo
         FROM users
         WHERE ativo = TRUE
           AND to_tsvector('simple', nome)
               @@ to_tsquery('simple', $1)
         ORDER BY nome`,
        [busca]
    );
};

const verificarEmail = async (email) => {
    return await pool.query(
        `SELECT
            id, nome, email, telefone, status_id, ativo
         FROM users
         WHERE LOWER(email) = LOWER($1)
           AND ativo = TRUE`,
        [email]
    );
};

const verificarEmailExistente = async (email, client = pool) => {
    return await client.query(
        `SELECT id
         FROM users
         WHERE LOWER(email) = LOWER($1)
         LIMIT 1`,
        [email]
    );
};

const buscarRoleClient = async (client = pool) => {
    return await client.query(
        `SELECT id, role
         FROM roles
         WHERE LOWER(role) = 'client'
         LIMIT 1`
    );
};

const associarUsuarioRole = async (
    userId,
    roleId,
    client = pool
) => {
    return await client.query(
        `INSERT INTO users_roles (user_id, role_id)
         VALUES ($1, $2)`,
        [userId, roleId]
    );
};

const buscarPorEmailParaLogin = async (email) => {
    return await pool.query(
        `SELECT
            id, nome, email, senha_hash, ativo
         FROM users
         WHERE LOWER(email) = LOWER($1)`,
        [email]
    );
};

const inserirUsuario = async (
    nome,
    email,
    telefone,
    senhaHash
) => {
    return await pool.query(
        `INSERT INTO users (
            nome, email, telefone, senha_hash, ativo
        )
        VALUES ($1, $2, $3, $4, TRUE)
        RETURNING
            id, nome, email, telefone, status_id, ativo`,
        [nome, email, telefone || null, senhaHash]
    );
};

const atualizar = async (
    id,
    nome,
    email,
    telefone,
    statusId,
    enderecos
) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const usuario = await client.query(
            `UPDATE users
             SET
                nome = COALESCE($1, nome),
                email = COALESCE($2, email),
                telefone = COALESCE($3, telefone),
                status_id = COALESCE($4, status_id)
             WHERE id = $5
               AND ativo = TRUE
             RETURNING id, nome, email, telefone, status_id, ativo`,
            [nome, email, telefone, statusId, id]
        );

        if (usuario.rowCount === 0) {
            await client.query("ROLLBACK");
            return { rows: [], rowCount: 0 };
        }

        if (enderecos !== undefined) {
            for (const endereco of enderecos) {
                await client.query(
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
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                    [
                        id,
                        endereco.cep,
                        endereco.logradouro,
                        endereco.numero,
                        endereco.complemento ?? null,
                        endereco.bairro,
                        endereco.cidade,
                        endereco.estado
                    ]
                );
            }
        }

        const resultado = await client.query(
            `SELECT
                u.id,
                u.nome,
                u.email,
                u.telefone,
                u.status_id,
                u.ativo,
                COALESCE(
                    (
                        SELECT json_agg(
                            json_build_object(
                                'id', e.id,
                                'cep', e.cep,
                                'logradouro', e.logradouro,
                                'numero', e.numero,
                                'complemento', e.complemento,
                                'bairro', e.bairro,
                                'cidade', e.cidade,
                                'estado', e.estado
                            )
                            ORDER BY e.id
                        )
                        FROM enderecos e
                        WHERE e.user_id = u.id
                    ),
                    '[]'::json
                ) AS enderecos
             FROM users u
             WHERE u.id = $1`,
            [id]
        );

        await client.query("COMMIT");

        return resultado;
    } catch (erro) {
        await client.query("ROLLBACK");
        throw erro;
    } finally {
        client.release();
    }
};

const deletar = async (id) => {
    const resultado = await pool.query(
        `UPDATE users
         SET ativo = FALSE
         WHERE id = $1
           AND ativo = TRUE
         RETURNING
            id, nome, email, telefone, status_id, ativo`,
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
         LEFT JOIN status sa ON sa.id = h.status_anterior_id
         LEFT JOIN status sn ON sn.id = h.status_novo_id
         WHERE h.user_id = $1
         ORDER BY h.data_alteracao ASC, h.id ASC`,
        [id]
    );
};

const buscarUsuarioParaRecuperacao = async (email) => {
    return await pool.query(
        `SELECT id, nome, email
         FROM users
         WHERE LOWER(email) = LOWER($1)
           AND ativo = TRUE`,
        [email]
    );
};

const invalidarRecuperacoesAnteriores = async (userId) => {
    return await pool.query(
        `UPDATE password_resets
         SET utilizado = TRUE
         WHERE user_id = $1
           AND utilizado = FALSE`,
        [userId]
    );
};

const criarRecuperacaoSenha = async (
    userId,
    pinHash,
    expiresAt
) => {
    return await pool.query(
        `INSERT INTO password_resets (
            user_id,
            pin_hash,
            expires_at,
            tentativas,
            utilizado
        )
        VALUES ($1, $2, $3, 0, FALSE)
        RETURNING id, user_id, expires_at`,
        [userId, pinHash, expiresAt]
    );
};

const buscarRecuperacaoAtiva = async (email) => {
    return await pool.query(
        `SELECT
            pr.id,
            pr.user_id,
            pr.pin_hash,
            pr.expires_at,
            pr.tentativas,
            pr.utilizado
         FROM password_resets pr
         INNER JOIN users u ON u.id = pr.user_id
         WHERE LOWER(u.email) = LOWER($1)
           AND u.ativo = TRUE
           AND pr.utilizado = FALSE
         ORDER BY pr.criado_em DESC, pr.id DESC
         LIMIT 1`,
        [email]
    );
};

const registrarTentativaRecuperacao = async (id) => {
    return await pool.query(
        `UPDATE password_resets
         SET
            tentativas = tentativas + 1,
            utilizado = CASE
                WHEN tentativas + 1 >= 5 THEN TRUE
                ELSE utilizado
            END
         WHERE id = $1
           AND utilizado = FALSE
         RETURNING tentativas, utilizado`,
        [id]
    );
};

const invalidarRecuperacao = async (id) => {
    return await pool.query(
        `UPDATE password_resets
         SET utilizado = TRUE
         WHERE id = $1`,
        [id]
    );
};

const redefinirSenhaComToken = async (
    userId,
    resetId,
    senhaHash
) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const recuperacao = await client.query(
            `SELECT id, user_id, expires_at, utilizado
             FROM password_resets
             WHERE id = $1
               AND user_id = $2
             FOR UPDATE`,
            [resetId, userId]
        );

        if (recuperacao.rowCount === 0) {
            await client.query("ROLLBACK");
            return { sucesso: false, motivo: "invalido" };
        }

        const registro = recuperacao.rows[0];

        if (registro.utilizado) {
            await client.query("ROLLBACK");
            return { sucesso: false, motivo: "utilizado" };
        }

        if (new Date(registro.expires_at).getTime() <= Date.now()) {
            await client.query(
                `UPDATE password_resets
                 SET utilizado = TRUE
                 WHERE id = $1`,
                [resetId]
            );

            await client.query("COMMIT");
            return { sucesso: false, motivo: "expirado" };
        }

        const atualizacao = await client.query(
            `UPDATE users
             SET senha_hash = $1
             WHERE id = $2
               AND ativo = TRUE
             RETURNING id`,
            [senhaHash, userId]
        );

        if (atualizacao.rowCount === 0) {
            await client.query("ROLLBACK");
            return { sucesso: false, motivo: "usuario" };
        }

        await client.query(
            `UPDATE password_resets
             SET utilizado = TRUE
             WHERE id = $1`,
            [resetId]
        );

        await client.query("COMMIT");

        return { sucesso: true };

    } catch (erro) {
        await client.query("ROLLBACK");
        throw erro;
    } finally {
        client.release();
    }
};

module.exports = {
    ler,
    lerTudo,
    buscarPorNome,
    verificarEmail,
    verificarEmailExistente,
    buscarRoleClient,
    associarUsuarioRole,
    buscarPorEmailParaLogin,
    inserirUsuario,
    atualizar,
    deletar,
    lerHistoricoStatus,
    buscarUsuarioParaRecuperacao,
    invalidarRecuperacoesAnteriores,
    criarRecuperacaoSenha,
    buscarRecuperacaoAtiva,
    registrarTentativaRecuperacao,
    invalidarRecuperacao,
    redefinirSenhaComToken
};
