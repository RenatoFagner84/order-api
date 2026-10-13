const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const authRepository = require("../../repositories/authRepository");

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

            if (
                typeof email !== "string" ||
                typeof senha !== "string" ||
                !email.trim() ||
                !senha
            ) {
                res.writeHead(400, {
                    "Content-Type": "application/json"
                });
                res.end(JSON.stringify({
                    mensagem: "Informe o e-mail e a senha."
                }));
                return;
            }

            const resultado =
                await authRepository.buscarPorEmailParaLogin(email.trim());

            if (resultado.rows.length === 0) {
                res.writeHead(401, {
                    "Content-Type": "application/json"
                });
                res.end(JSON.stringify({
                    mensagem: "E-mail ou senha inválidos."
                }));
                return;
            }

            const usuario = resultado.rows[0];

            if (
                usuario.ativo !== true ||
                !usuario.senha_hash
            ) {
                res.writeHead(401, {
                    "Content-Type": "application/json"
                });
                res.end(JSON.stringify({
                    mensagem: "E-mail ou senha inválidos."
                }));
                return;
            }

            const senhaCorreta = await bcrypt.compare(
                senha,
                usuario.senha_hash
            );

            if (!senhaCorreta) {
                res.writeHead(401, {
                    "Content-Type": "application/json"
                });
                res.end(JSON.stringify({
                    mensagem: "E-mail ou senha inválidos."
                }));
                return;
            }

            const segredo = process.env.JWT_SECRET;

            if (!segredo) {
                throw new Error("JWT_SECRET não configurado.");
            }

            const token = jwt.sign(
                { sub: String(usuario.id) },
                segredo,
                { expiresIn: "2h" }
            );

            res.writeHead(200, {
                "Content-Type": "application/json"
            });
            res.end(JSON.stringify({
                mensagem: "Login realizado com sucesso.",
                token,
                usuario: {
                    id: usuario.id,
                    nome: usuario.nome,
                    email: usuario.email
                }
            }));
        } catch (erro) {
            console.error("[ERRO NO LOGIN]", erro.message);

            if (!res.headersSent) {
                res.writeHead(500, {
                    "Content-Type": "application/json"
                });
            }
            res.end(JSON.stringify({
                mensagem: "Erro interno ao realizar login."
            }));
        }
    });
};

module.exports = usersLogin;