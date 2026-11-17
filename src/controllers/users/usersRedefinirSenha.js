
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const userRepository = require("../../repositories/userRepository");

const responder = (res, status, mensagem) => {
    return res.status(status).json({ mensagem });
};

const usersRedefinirSenha = async (req, res) => {
    try {
        const token = req.body?.token;
        const senhaRecebida = req.body?.senha;

        if (typeof token !== "string" || typeof senhaRecebida !== "string" || !token || !senhaRecebida) {
            return responder(res, 400, "Informe o token e a nova senha.");
        }

        if (senhaRecebida.length < 8) {
            return responder(res, 400, "A senha deve ter pelo menos 8 caracteres.");
        }

        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET não configurado.");
        }

        let payload;
        try {
            payload = jwt.verify(token, process.env.JWT_SECRET);
        } catch {
            return responder(
                res,
                400,
                "Não foi possível concluir a redefinição. Solicite um novo código e tente novamente."
            );
        }

        if (
            payload.purpose !== "password_reset" ||
            !payload.sub ||
            !Number.isInteger(payload.resetId)
        ) {
            return responder(
                res,
                400,
                "Não foi possível concluir a redefinição. Solicite um novo código e tente novamente."
            );
        }

        const userId = Number(payload.sub);
        if (!Number.isSafeInteger(userId) || userId <= 0) {
            return responder(
                res,
                400,
                "Não foi possível concluir a redefinição. Solicite um novo código e tente novamente."
            );
        }

        const senhaHash = await bcrypt.hash(senhaRecebida, 10);
        const resultado = await userRepository.redefinirSenhaComToken(
            userId,
            payload.resetId,
            senhaHash
        );

        if (!resultado.sucesso) {
            // Não diferencia token inexistente, expirado, utilizado ou usuário inativo.
            return responder(
                res,
                400,
                "Não foi possível concluir a redefinição. Solicite um novo código e tente novamente."
            );
        }

        return responder(
            res,
            200,
            "Senha redefinida com sucesso. Você já pode fazer login."
        );
    } catch (erro) {
        console.error("[ERRO AO REDEFINIR SENHA]", erro);
        return responder(
            res,
            500,
            "Não foi possível redefinir a senha. Tente novamente mais tarde."
        );
    }
};

module.exports = usersRedefinirSenha;
