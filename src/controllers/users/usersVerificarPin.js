
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const userRepository = require("../../repositories/userRepository");

const responder = (res, status, mensagem, dados = {}) => {
    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify({
        mensagem,
        ...dados
    }));
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

const usersVerificarPin = async (req, res) => {
    try {
        const dados = await lerCorpoRequisicao(req);

        if (!dados || !dados.email || !dados.pin) {
            return responder(
                res,
                400,
                "Informe o e-mail e o código de recuperação."
            );
        }

        const email = String(dados.email).trim().toLowerCase();
        const pin = String(dados.pin).trim();

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return responder(res, 400, "E-mail inválido.");
        }

        if (!/^\d{6}$/.test(pin)) {
            return responder(
                res,
                400,
                "O código deve conter exatamente 6 números."
            );
        }

        const resultado =
            await userRepository.buscarRecuperacaoAtiva(email);

        if (resultado.rowCount === 0) {
            return responder(
                res,
                400,
                "Código inválido ou expirado. Solicite uma nova recuperação."
            );
        }

        const recuperacao = resultado.rows[0];

        if (recuperacao.tentativas >= 5) {
            await userRepository.invalidarRecuperacao(
                recuperacao.id
            );

            return responder(
                res,
                400,
                "Limite de tentativas atingido. Solicite um novo código."
            );
        }

        if (new Date(recuperacao.expires_at).getTime() <= Date.now()) {
            await userRepository.invalidarRecuperacao(
                recuperacao.id
            );

            return responder(
                res,
                400,
                "Código expirado. Solicite uma nova recuperação."
            );
        }

        const pinCorreto = await bcrypt.compare(
            pin,
            recuperacao.pin_hash
        );

        if (!pinCorreto) {
            const tentativa =
                await userRepository.registrarTentativaRecuperacao(
                    recuperacao.id
                );

            const tentativasRestantes = tentativa.rowCount > 0
                ? Math.max(0, 5 - tentativa.rows[0].tentativas)
                : 0;

            if (tentativasRestantes === 0) {
                return responder(
                    res,
                    400,
                    "Limite de tentativas atingido. Solicite um novo código."
                );
            }

            return responder(
                res,
                400,
                `Código incorreto. Você tem ${tentativasRestantes} tentativa(s) restante(s).`
            );
        }

        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET não configurado.");
        }

        const token = jwt.sign(
            {
                sub: String(recuperacao.user_id),
                resetId: recuperacao.id,
                purpose: "password_reset"
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "10m"
            }
        );

        return responder(
            res,
            200,
            "Código verificado com sucesso.",
            { token }
        );

    } catch (erro) {
        console.error(
            "[ERRO AO VERIFICAR PIN DE RECUPERAÇÃO]",
            erro
        );

        return responder(
            res,
            500,
            "Não foi possível verificar o código."
        );
    }
};

module.exports = usersVerificarPin;
