
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const userRepository = require("../../repositories/userRepository");
const roleRepository = require("../../repositories/roleRepository");

const responder = (res, status, dados) => {
    if (res.writableEnded || res.headersSent) return;

    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify(dados));
};

const usersLogin = async (req, res) => {
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
        console.error("[ERRO AO RECEBER LOGIN]", erro);

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

    const { email, senha } = dados;

    if (
        typeof email !== "string" ||
        !email.trim() ||
        typeof senha !== "string" ||
        !senha
    ) {
        responder(res, 400, {
            mensagem: "Informe e-mail e senha."
        });
        return;
    }

    try {
        const resultado = await userRepository.buscarPorEmailParaLogin(
            email.trim()
        );

        if (
            !resultado ||
            !resultado.rows ||
            resultado.rows.length === 0
        ) {
            responder(res, 401, {
                mensagem: "E-mail ou senha inválidos."
            });
            return;
        }

        const usuario = resultado.rows[0];

        if (usuario.ativo !== true || !usuario.senha_hash) {
            responder(res, 401, {
                mensagem: "E-mail ou senha inválidos."
            });
            return;
        }

        const senhaValida = await bcrypt.compare(
            senha,
            usuario.senha_hash
        );

        if (!senhaValida) {
            responder(res, 401, {
                mensagem: "E-mail ou senha inválidos."
            });
            return;
        }

        const resultadoRoles = await roleRepository.lerPorUser(
            usuario.id
        );

        const roles = resultadoRoles.rows.map((role) => ({
            id: role.id
        }));

        const segredo = process.env.JWT_SECRET;

        if (!segredo) {
            console.error("[ERRO DE CONFIGURAÇÃO] JWT_SECRET não definido.");

            responder(res, 500, {
                mensagem: "Erro interno ao realizar login."
            });
            return;
        }

        const token = jwt.sign(
            {
                sub: String(usuario.id)
            },
            segredo,
            {
                expiresIn: "2h"
            }
        );

        req.usuario = {
            id: usuario.id
        };

        req.logMensagem = "Login realizado com sucesso.";

        responder(res, 200, {
            mensagem: "Login realizado com sucesso.",
            token,
            usuario: {
                nome: usuario.nome,
                email: usuario.email
            },
            roles
        });
    } catch (erro) {
        console.error("[ERRO AO REALIZAR LOGIN]", erro);

        responder(res, 500, {
            mensagem: "Erro interno ao realizar login."
        });
    }
};

module.exports = usersLogin;
