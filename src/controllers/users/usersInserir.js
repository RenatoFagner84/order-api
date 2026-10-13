
const bcrypt = require("bcryptjs");
const userRepository = require("../../repositories/userRepository");

const usersInserir = async (req, res) => {
    let body = "";

    req.on("data", (chunk) => {
        body += chunk.toString();
    });

    req.on("end", async () => {
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

            const usuarioExiste =
                await userRepository.verificarEmail(email.trim());

            if (usuarioExiste.rows.length > 0) {
                res.writeHead(400, {
                    "Content-Type": "application/json; charset=utf-8"
                });
                res.end(JSON.stringify({
                    mensagem: "Usuário já existe."
                }));
                return;
            }

            const senhaHash = await bcrypt.hash(senha, 10);

            const resultado = await userRepository.inserirUsuario(
                nome.trim(),
                email.trim(),
                telefone,
                senhaHash
            );

            res.writeHead(201, {
                "Content-Type": "application/json; charset=utf-8"
            });
            res.end(JSON.stringify(resultado.rows[0]));
        } catch (erro) {
            console.error("[ERRO AO CADASTRAR USUÁRIO]", erro.message);

            if (!res.headersSent) {
                res.writeHead(400, {
                    "Content-Type": "application/json; charset=utf-8"
                });
            }

            res.end(JSON.stringify({
                mensagem: "Não foi possível cadastrar o usuário."
            }));
        }
    });
};

module.exports = usersInserir;
