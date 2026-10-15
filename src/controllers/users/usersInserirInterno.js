
const bcrypt = require("bcryptjs");
const pool = require("../../db");

const responder = (res, status, dados) => {
    if (res.writableEnded) {
        return;
    }

    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify(dados));
};

const usersInserirInterno = async (req, res) => {
    let conexao;
    let transacaoIniciada = false;

    try {
        const body = await new Promise((resolve, reject) => {
            let dados = "";

            req.on("data", (chunk) => {
                dados += chunk.toString();
            });

            req.on("end", () => {
                try {
                    resolve(JSON.parse(dados));
                } catch {
                    reject(new Error("JSON_INVALIDO"));
                }
            });

            req.on("error", reject);
        });

        if (!body || typeof body !== "object" || Array.isArray(body)) {
            responder(res, 400, {
                mensagem: "Envie um objeto JSON válido."
            });
            return;
        }

        const { nome, email, telefone, senha, role_id } = body;

        if (
            typeof nome !== "string" ||
            !nome.trim() ||
            nome.trim().length > 100
        ) {
            responder(res, 400, {
                mensagem: "O nome é obrigatório e deve ter até 100 caracteres."
            });
            return;
        }

        if (
            typeof email !== "string" ||
            !email.trim() ||
            email.trim().length > 150 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
        ) {
            responder(res, 400, {
                mensagem: "Informe um e-mail válido com até 150 caracteres."
            });
            return;
        }

        if (typeof senha !== "string" || senha.length < 8) {
            responder(res, 400, {
                mensagem: "A senha deve ter pelo menos 8 caracteres."
            });
            return;
        }

        if (
            telefone !== undefined &&
            telefone !== null &&
            (typeof telefone !== "string" || telefone.trim().length > 20)
        ) {
            responder(res, 400, {
                mensagem: "O telefone deve ser um texto com até 20 caracteres."
            });
            return;
        }

        if (!Number.isInteger(role_id) || role_id <= 0) {
            responder(res, 400, {
                mensagem: "Informe um role_id inteiro e válido."
            });
            return;
        }

        const nomeNormalizado = nome.trim();
        const emailNormalizado = email.trim().toLowerCase();
        const telefoneNormalizado =
            typeof telefone === "string" && telefone.trim()
                ? telefone.trim()
                : null;

        conexao = await pool.connect();

        await conexao.query("BEGIN");
        transacaoIniciada = true;

        const role = await conexao.query(
            `SELECT id, role
             FROM roles
             WHERE id = $1`,
            [role_id]
        );

        if (role.rows.length === 0) {
            await conexao.query("ROLLBACK");
            transacaoIniciada = false;

            responder(res, 404, {
                mensagem: "Role não encontrada."
            });
            return;
        }

        const usuarioExistente = await conexao.query(
            `SELECT id
             FROM users
             WHERE LOWER(email) = $1`,
            [emailNormalizado]
        );

        if (usuarioExistente.rows.length > 0) {
            await conexao.query("ROLLBACK");
            transacaoIniciada = false;

            responder(res, 409, {
                mensagem: "Já existe um usuário com este e-mail."
            });
            return;
        }

        const senhaHash = await bcrypt.hash(senha, 10);

        const usuario = await conexao.query(
            `INSERT INTO users
                (nome, email, telefone, senha_hash, ativo)
             VALUES ($1, $2, $3, $4, TRUE)
             RETURNING id, nome, email, telefone, ativo`,
            [
                nomeNormalizado,
                emailNormalizado,
                telefoneNormalizado,
                senhaHash
            ]
        );

        const novoUsuario = usuario.rows[0];

        await conexao.query(
            `INSERT INTO users_roles (user_id, role_id)
             VALUES ($1, $2)`,
            [novoUsuario.id, role_id]
        );

        await conexao.query("COMMIT");
        transacaoIniciada = false;

        responder(res, 201, {
            mensagem: "Usuário interno criado com sucesso.",
            usuario: novoUsuario,
            role: role.rows[0]
        });
    } catch (erro) {
        if (conexao && transacaoIniciada) {
            try {
                await conexao.query("ROLLBACK");
            } catch {}
        }

        if (erro.message === "JSON_INVALIDO") {
            responder(res, 400, {
                mensagem: "O corpo da requisição contém um JSON inválido."
            });
            return;
        }

        if (erro.code === "23505") {
            responder(res, 409, {
                mensagem: "Já existe um usuário com estes dados únicos."
            });
            return;
        }

        console.error(
            "[ERRO AO CADASTRAR USUÁRIO INTERNO]",
            erro.message
        );

        responder(res, 500, {
            mensagem: "Não foi possível cadastrar o usuário interno."
        });
    } finally {
        if (conexao) {
            conexao.release();
        }
    }
};

module.exports = usersInserirInterno;
