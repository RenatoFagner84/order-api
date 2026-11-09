const bcrypt = require("bcryptjs");
const pool = require("../../db");
const userRepository = require("../../repositories/userRepository");
const { enviarEmailBoasVindas } = require("../../services/emailService");

const responder = (res, status, dados) => {
    if (res.writableEnded || res.headersSent) return;

    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify(dados));
};

const usersInserir = async (req, res) => {
    let body = "";

    try {
        for await (const chunk of req) {
            body += chunk.toString();

            if (body.length > 1024 * 1024) {
                responder(res, 413, {
                    mensagem: "Corpo da requisição muito grande."
                });
                return;
            }
        }
    } catch (erro) {
        console.error("[ERRO AO RECEBER CADASTRO DE USUÁRIO]", erro);

        responder(res, 400, {
            mensagem: "Erro ao receber os dados da requisição."
        });
        return;
    }

    let dados;

    try {
        dados = JSON.parse(body);
    } catch {
        responder(res, 400, {
            mensagem: "Corpo da requisição JSON inválido."
        });
        return;
    }

    if (
        !dados ||
        typeof dados !== "object" ||
        Array.isArray(dados)
    ) {
        responder(res, 400, {
            mensagem: "O corpo da requisição deve ser um objeto JSON."
        });
        return;
    }

    const { nome, email, telefone, senha } = dados;

    if (
        typeof nome !== "string" ||
        !nome.trim() ||
        typeof email !== "string" ||
        !email.trim() ||
        typeof senha !== "string" ||
        senha.length < 8
    ) {
        responder(res, 400, {
            mensagem: "Informe nome, e-mail e senha com pelo menos 8 caracteres."
        });
        return;
    }

    if (
        telefone !== undefined &&
        telefone !== null &&
        typeof telefone !== "string"
    ) {
        responder(res, 400, {
            mensagem: "O telefone deve ser uma string."
        });
        return;
    }

    let client;
    let transacaoIniciada = false;

    try {
        const nomeNormalizado = nome.trim();
        const emailNormalizado = email.trim();
        const senhaHash = await bcrypt.hash(senha, 10);

        client = await pool.connect();

        await client.query("BEGIN");
        transacaoIniciada = true;

        const usuarioExiste = await userRepository.verificarEmailExistente(
            emailNormalizado,
            client
        );

        if (usuarioExiste.rowCount > 0) {
            await client.query("ROLLBACK");
            transacaoIniciada = false;

            responder(res, 409, {
                mensagem: "Já existe um usuário com este e-mail."
            });
            return;
        }

        // Busca a role client pelo repository.
        const resultadoRole = await userRepository.buscarRoleClient(client);

        if (resultadoRole.rowCount === 0) {
            await client.query("ROLLBACK");
            transacaoIniciada = false;

            responder(res, 500, {
                mensagem: "A role client não está cadastrada no banco."
            });
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

        // Associa o usuário à role pelo repository.
        await userRepository.associarUsuarioRole(
            usuario.id,
            roleClient.id,
            client
        );

        await client.query("COMMIT");
        transacaoIniciada = false;

        try {
            await enviarEmailBoasVindas(usuario);
        } catch (erroEmail) {
            console.error(
                "[ERRO AO ENVIAR EMAIL DE BOAS-VINDAS]",
                erroEmail
            );
        }

        responder(res, 201, {
            mensagem: "Usuário cadastrado com sucesso.",
            usuario,
            roles: [
                {
                    id: roleClient.id,
                    role: roleClient.role
                }
            ]
        });

    } catch (erro) {
        if (client && transacaoIniciada) {
            try {
                await client.query("ROLLBACK");
            } catch (erroRollback) {
                console.error(
                    "[ERRO AO DESFAZER CADASTRO]",
                    erroRollback
                );
            }
        }

        console.error("[ERRO AO CADASTRAR USUÁRIO]", erro);

        if (erro.code === "23505") {
            responder(res, 409, {
                mensagem: "Já existe um usuário com estes dados únicos."
            });
            return;
        }

        responder(res, 500, {
            mensagem: "Não foi possível cadastrar o usuário."
        });

    } finally {
        if (client) {
            client.release();
        }
    }
};

module.exports = usersInserir;