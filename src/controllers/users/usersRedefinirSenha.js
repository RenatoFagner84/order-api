
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const userRepository = require("../../repositories/userRepository");

const responder = (res, status, mensagem) => {
    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify({ mensagem }));
};

const lerCorpoRequisicao = async (req) => {
    let corpo = "";

    for await (const parte of req) {
        corpo += parte;
    }

    try {
        return JSON.parse(corpo);
    } catch {
        return null;
    }
};

const usersRedefinirSenha = async (req, res) => {
    try {
        const dados = await lerCorpoRequisicao(req);

        if (!dados || !dados.token || !dados.senha) {
            return responder(
                res,
                400,
                "Informe o token e a nova senha."
            );
        }

        const senha = String(dados.senha);

        if (senha.length < 8) {
            return responder(
                res,
                400,
                "A senha deve ter pelo menos 8 caracteres."
            );
        }

        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET não configurado.");
        }

        let payload;

        try {
            payload = jwt.verify(
                dados.token,
                process.env.JWT_SECRET
            );
        } catch {
            return responder(
                res,
                401,
                "Token inválido ou expirado. Solicite uma nova recuperação."
            );
        }

        if (
            payload.purpose !== "password_reset" ||
            !payload.sub ||
            !Number.isInteger(payload.resetId)
        ) {
            return responder(
                res,
                401,
                "Token de recuperação inválido."
            );
        }

        const userId = Number(payload.sub);

        if (!Number.isSafeInteger(userId) || userId <= 0) {
            return responder(
                res,
                401,
                "Token de recuperação inválido."
            );
        }

        const senhaHash = await bcrypt.hash(senha, 10);

        const resultado =
            await userRepository.redefinirSenhaComToken(
                userId,
                payload.resetId,
                senhaHash
            );

        if (!resultado.sucesso) {
            const mensagens = {
                invalido: "Solicitação de recuperação não encontrada.",
                utilizado: "Este código de recuperação já foi utilizado.",
                expirado: "O prazo de recuperação expirou. Solicite um novo código.",
                usuario: "Usuário não encontrado ou desativado."
            };

            return responder(
                res,
                400,
                mensagens[resultado.motivo] ||
                    "Não foi possível redefinir a senha."
            );
        }

        return responder(
            res,
            200,
            "Senha redefinida com sucesso. Você já pode fazer login."
        );

    } catch (erro) {
        console.error(
            "[ERRO AO REDEFINIR SENHA]",
            erro
        );

        return responder(
            res,
            500,
            "Não foi possível redefinir a senha."
        );
    }
};

module.exports = usersRedefinirSenha;
