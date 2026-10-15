
const bcrypt = require("bcryptjs");
const pool = require("../../db");

const usersInserir = async (req, res) => {
    let body = "";

    req.on("data", (chunk) => {
        body += chunk.toString();
    });

    req.on("end", async () => {
        let client;

        try {
            const dados = body ? JSON.parse(body) : {};
            const { nome, email, telefone, senha } = dados;

            if (
                typeof nome !== "string" ||
                !nome.trim() ||
                typeof email !== "string" ||
                !email.trim() ||
                typeof senha !== "string" ||
                senha.length < 8
            ) {
                res.writeHead(400, {
                    "Content-Type": "application/json; charset=utf-8"
                });

                res.end(JSON.stringify({
                    mensagem: "Informe nome, e-mail e senha com pelo menos 8 caracteres."
                }));

                return;
            }

            if (
                telefone !== undefined &&
                telefone !== null &&
                typeof telefone !== "string"
            ) {
                res.writeHead(400, {
                    "Content-Type": "application/json; charset=utf-8"
                });

                res.end(JSON.stringify({
                    mensagem: "O telefone deve ser uma string."
                }));

                return;
            }

            const nomeNormalizado = nome.trim();
            const emailNormalizado = email.trim();
            const senhaHash = await bcrypt.hash(senha, 10);

            client = await pool.connect();
            await client.query("BEGIN");

            const usuarioExiste = await client.query(
                `SELECT id
                 FROM users
                 WHERE LOWER(email) = LOWER($1)
                 LIMIT 1`,
                [emailNormalizado]
            );

            if (usuarioExiste.rowCount > 0) {
                await client.query("ROLLBACK");

                res.writeHead(409, {
                    "Content-Type": "application/json; charset=utf-8"
                });

                res.end(JSON.stringify({
                    mensagem: "Já existe um usuário com este e-mail."
                }));

                return;
            }

            const resultadoRole = await client.query(
                `SELECT id, role
                 FROM roles
                 WHERE LOWER(role) = 'client'
                 LIMIT 1`
            );

            if (resultadoRole.rowCount === 0) {
                await client.query("ROLLBACK");

                res.writeHead(500, {
                    "Content-Type": "application/json; charset=utf-8"
                });

                res.end(JSON.stringify({
                    mensagem: "A role client não está cadastrada no banco."
                }));

                return;
            }

            const roleClient = resultadoRole.rows[0];

            const resultadoUsuario = await client.query(
                `INSERT INTO users
                    (nome, email, telefone, senha_hash, ativo)
                 VALUES ($1, $2, $3, $4, TRUE)
                 RETURNING id, nome, email, telefone, ativo`,
                [
                    nomeNormalizado,
                    emailNormalizado,
                    telefone || null,
                    senhaHash
                ]
            );

            const usuario = resultadoUsuario.rows[0];

            await client.query(
                `INSERT INTO users_roles (user_id, role_id)
                 VALUES ($1, $2)`,
                [usuario.id, roleClient.id]
            );

            await client.query("COMMIT");

            res.writeHead(201, {
                "Content-Type": "application/json; charset=utf-8"
            });

            res.end(JSON.stringify({
                mensagem: "Usuário cadastrado com sucesso.",
                usuario,
                roles: [
                    {
                        id: roleClient.id,
                        role: roleClient.role
                    }
                ]
            }));
        } catch (erro) {
            if (client) {
                try {
                    await client.query("ROLLBACK");
                } catch (erroRollback) {
                    console.error(erroRollback.message);
                }
            }

            console.error("[ERRO AO CADASTRAR USUÁRIO]", erro.message);

            if (!res.headersSent) {
                const conflito = erro.code === "23505";

                res.writeHead(conflito ? 409 : 500, {
                    "Content-Type": "application/json; charset=utf-8"
                });

                res.end(JSON.stringify({
                    mensagem: conflito
                        ? "Já existe um usuário com estes dados únicos."
                        : "Não foi possível cadastrar o usuário."
                }));
            }
        } finally {
            if (client) {
                client.release();
            }
        }
    });
};

module.exports = usersInserir;
