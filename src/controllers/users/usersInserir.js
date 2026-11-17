
const bcrypt = require("bcryptjs");
const pool = require("../../db");
const userRepository = require("../../repositories/userRepository");
const { enviarEmailBoasVindas } = require("../../services/emailService");

const usersInserir = async (req, res) => {
    let client;
    let transacaoIniciada = false;

    try {
        // O express.json() já interpreta o JSON.
        // Não ler novamente o fluxo da requisição.
        const dados = req.body;

        if (
            !dados ||
            typeof dados !== "object" ||
            Array.isArray(dados)
        ) {
            return res.status(400).json({
                mensagem: "O corpo da requisição deve ser um objeto JSON."
            });
        }

        const { nome, email, telefone, senha } = dados;

        // Validação dos campos obrigatórios
        if (
            typeof nome !== "string" ||
            !nome.trim() ||
            typeof email !== "string" ||
            !email.trim() ||
            typeof senha !== "string" ||
            senha.length < 8
        ) {
            return res.status(400).json({
                mensagem: "Informe nome, e-mail e senha com pelo menos 8 caracteres."
            });
        }

        if (
            telefone !== undefined &&
            telefone !== null &&
            typeof telefone !== "string"
        ) {
            return res.status(400).json({
                mensagem: "O telefone deve ser uma string."
            });
        }

        const nomeNormalizado = nome.trim();
        const emailNormalizado = email.trim().toLowerCase();
        const telefoneNormalizado = telefone ? telefone.trim() : null;

        // Criptografa a senha antes de armazenar
        const senhaHash = await bcrypt.hash(senha, 10);

        client = await pool.connect();

        await client.query("BEGIN");
        transacaoIniciada = true;

        // Verifica se o e-mail já está cadastrado
        const usuarioExiste =
            await userRepository.verificarEmailExistente(
                emailNormalizado,
                client
            );

        if (usuarioExiste.rowCount > 0) {
            await client.query("ROLLBACK");
            transacaoIniciada = false;

            return res.status(409).json({
                mensagem: "Já existe um usuário com este e-mail."
            });
        }

        // Busca a role padrão de cliente
        const resultadoRole = await userRepository.buscarRoleClient(client);

        if (resultadoRole.rowCount === 0) {
            await client.query("ROLLBACK");
            transacaoIniciada = false;

            return res.status(500).json({
                mensagem: "A role client não está cadastrada no banco."
            });
        }

        const roleClient = resultadoRole.rows[0];

        // Insere o usuário
        const resultadoUsuario = await client.query(
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

        const usuario = resultadoUsuario.rows[0];

        // Associa o usuário à role padrão
        await userRepository.associarUsuarioRole(
            usuario.id,
            roleClient.id,
            client
        );

        await client.query("COMMIT");
        transacaoIniciada = false;

        // O envio do e-mail não desfaz o cadastro caso falhe
        try {
            await enviarEmailBoasVindas(usuario);
        } catch (erroEmail) {
            console.error(
                "[ERRO AO ENVIAR EMAIL DE BOAS-VINDAS]",
                erroEmail
            );
        }

        return res.status(201).json({
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
            return res.status(409).json({
                mensagem: "Já existe um usuário com estes dados únicos."
            });
        }

        return res.status(500).json({
            mensagem: "Não foi possível cadastrar o usuário."
        });

    } finally {
        if (client) {
            client.release();
        }
    }
};

module.exports = usersInserir;
