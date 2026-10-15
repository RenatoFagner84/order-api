const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const userRepository = require("../../repositories/userRepository");
const roleRepository = require("../../repositories/roleRepository");
const permissionRepository = require("../../repositories/permissionRepository");

const usersLogin = async (req, res) => {
    let body = "";

    req.on("data", (chunk) => {
        body += chunk.toString();
    });

    req.on("end", async () => {
        try {
            const dados = body ? JSON.parse(body) : {};

            const email = dados.email;
            const senha = dados.senha;

            // Valida o e-mail e a senha recebidos
            if (
                typeof email !== "string" ||
                typeof senha !== "string" ||
                !email.trim() ||
                !senha
            ) {
                res.writeHead(400, {
                    "Content-Type": "application/json; charset=utf-8"
                });

                res.end(JSON.stringify({
                    mensagem: "Informe o e-mail e a senha."
                }));

                return;
            }

            // Busca o usuário pelo e-mail no userRepository
            const resultado =
                await userRepository.buscarPorEmailParaLogin(
                    email.trim()
                );

            // Verifica se o usuário existe
            if (resultado.rows.length === 0) {
                res.writeHead(401, {
                    "Content-Type": "application/json; charset=utf-8"
                });

                res.end(JSON.stringify({
                    mensagem: "E-mail ou senha inválidos."
                }));

                return;
            }

            const usuario = resultado.rows[0];

            // Verifica se o usuário está ativo e possui senha cadastrada
            if (
                usuario.ativo !== true ||
                !usuario.senha_hash
            ) {
                res.writeHead(401, {
                    "Content-Type": "application/json; charset=utf-8"
                });

                res.end(JSON.stringify({
                    mensagem: "E-mail ou senha inválidos."
                }));

                return;
            }

            // Compara a senha digitada com a senha criptografada
            const senhaCorreta = await bcrypt.compare(
                senha,
                usuario.senha_hash
            );

            if (!senhaCorreta) {
                res.writeHead(401, {
                    "Content-Type": "application/json; charset=utf-8"
                });

                res.end(JSON.stringify({
                    mensagem: "E-mail ou senha inválidos."
                }));

                return;
            }

            // Busca as roles associadas ao usuário
            const resultadoRoles =
                await roleRepository.lerPorUser(usuario.id);

            const roles = resultadoRoles.rows;

            // Busca as permissões associadas às roles
            const resultadoPermissions =
                await permissionRepository.lerPorUser(usuario.id);

            const permissions = resultadoPermissions.rows;

            // Verifica se o segredo do JWT está configurado
            const segredo = process.env.JWT_SECRET;

            if (!segredo) {
                throw new Error("JWT_SECRET não configurado.");
            }

            // Cria o token de autenticação com validade de duas horas
            const token = jwt.sign(
                {
                    sub: String(usuario.id)
                },
                segredo,
                {
                    expiresIn: "2h"
                }
            );

            // Disponibiliza o ID para o registro de logs
            req.usuario = {
                id: usuario.id
            };

            req.logMensagem = "Login realizado com sucesso.";

            // Retorna o token, o usuário, as roles e as permissões
            res.writeHead(200, {
                "Content-Type": "application/json; charset=utf-8"
            });

            res.end(JSON.stringify({
                mensagem: "Login realizado com sucesso.",
                token,
                usuario: {
                    id: usuario.id,
                    nome: usuario.nome,
                    email: usuario.email
                },
                roles,
                permissions
            }));

        } catch (erro) {
            console.error("[ERRO NO LOGIN]", erro.message);

            if (!res.headersSent) {
                res.writeHead(500, {
                    "Content-Type": "application/json; charset=utf-8"
                });
            }

            if (!res.writableEnded) {
                res.end(JSON.stringify({
                    mensagem: "Erro interno ao realizar login."
                }));
            }
        }
    });
};

module.exports = usersLogin;
