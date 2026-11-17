
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const userRepository = require("../../repositories/userRepository");

const MENSAGEM_FALHA =
    "Não foi possível validar o código. Confira os dados ou solicite um novo código.";

const responder = (res, status, mensagem, dados = {}) => {
    return res.status(status).json({ mensagem, ...dados });
};

// Hash fictício usado para executar uma comparação também quando não há
// recuperação encontrada, reduzindo diferenças grosseiras de tempo de resposta.
const hashFicticioPromise = bcrypt.hash("codigo-ficticio-de-recuperacao", 10);

const usersVerificarPin = async (req, res) => {
    try {
        const emailRecebido = req.body?.email;
        const pinRecebido = req.body?.pin;

        if (typeof emailRecebido !== "string" || pinRecebido === undefined || pinRecebido === null) {
            return responder(res, 400, "Informe o e-mail e o código de recuperação.");
        }

        const email = emailRecebido.trim().toLowerCase();
        const pin = String(pinRecebido).trim();

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return responder(res, 400, MENSAGEM_FALHA);
        }

        if (!/^\d{6}$/.test(pin)) {
            return responder(res, 400, MENSAGEM_FALHA);
        }

        const resultado = await userRepository.buscarRecuperacaoAtiva(email);

        if (resultado.rowCount === 0) {
            const hashFicticio = await hashFicticioPromise;
            await bcrypt.compare(pin, hashFicticio);
            return responder(res, 400, MENSAGEM_FALHA);
        }

        const recuperacao = resultado.rows[0];

        if (
            recuperacao.tentativas >= 5 ||
            new Date(recuperacao.expires_at).getTime() <= Date.now()
        ) {
            await userRepository.invalidarRecuperacao(recuperacao.id);
            return responder(res, 400, MENSAGEM_FALHA);
        }

        const pinCorreto = await bcrypt.compare(pin, recuperacao.pin_hash);

        if (!pinCorreto) {
            await userRepository.registrarTentativaRecuperacao(recuperacao.id);
            return responder(res, 400, MENSAGEM_FALHA);
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
            { expiresIn: "10m" }
        );

        return responder(res, 200, "Código verificado com sucesso.", { token });
    } catch (erro) {
        console.error("[ERRO AO VERIFICAR PIN DE RECUPERAÇÃO]", erro);
        return responder(
            res,
            500,
            "Não foi possível validar o código. Tente novamente mais tarde."
        );
    }
};

module.exports = usersVerificarPin;
