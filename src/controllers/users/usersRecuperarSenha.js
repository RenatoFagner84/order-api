const bcrypt = require("bcryptjs");
const { randomInt } = require("crypto");

const userRepository = require("../../repositories/userRepository");
const {
    enviarEmailRecuperacaoSenha
} = require("../../services/emailService");

const MENSAGEM_PADRAO =
    "Você receberá um código de recuperação.";

const usersRecuperarSenha = async (req, res) => {
    try {
        // O express.json() já interpreta o corpo da requisição.
        const dados = req.body;

        if (
            !dados ||
            typeof dados !== "object" ||
            Array.isArray(dados) ||
            typeof dados.email !== "string"
        ) {
            return res.status(400).json({
                mensagem: "Verique os dados e tente novamente."
            });
        }

        const email = dados.email.trim().toLowerCase();

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({
                mensagem: "Verique os dados e tente novamente."
            });
        }

        const resultadoUsuario =
            await userRepository.buscarUsuarioParaRecuperacao(email);

        if (!resultadoUsuario || resultadoUsuario.rowCount === 0) {
            return res.status(200).json({
                mensagem: MENSAGEM_PADRAO
            });
        }

        const usuario = resultadoUsuario.rows[0];

        const pin = String(randomInt(100000, 1000000));
        const pinHash = await bcrypt.hash(pin, 10);

        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await userRepository.invalidarRecuperacoesAnteriores(
            usuario.id
        );

        await userRepository.criarRecuperacaoSenha(
            usuario.id,
            pinHash,
            expiresAt
        );

        try {
            const resultadoEmail = await enviarEmailRecuperacaoSenha({
                nome: usuario.nome,
                email: usuario.email,
                pin
            });

            console.log("[RECUPERAÇÃO] Resultado do envio:", {
                messageId: resultadoEmail.messageId,
                accepted: resultadoEmail.accepted,
                rejected: resultadoEmail.rejected,
                response: resultadoEmail.response
            });

            if (
                !resultadoEmail.accepted ||
                !resultadoEmail.accepted.length
            ) {
                console.error(
                    "[RECUPERAÇÃO] O servidor SMTP não aceitou o destinatário."
                );
            }
        } catch (erroEmail) {
            console.error("[FALHA NO ENVIO DO PIN]", {
                mensagem: erroEmail.message,
                codigo: erroEmail.code,
                resposta: erroEmail.response,
                codigoResposta: erroEmail.responseCode,
                comando: erroEmail.command
            });
        }

        // Resposta genérica para não revelar a existência da conta.
        return res.status(200).json({
            mensagem: MENSAGEM_PADRAO
        });

    } catch (erro) {
        console.error("[ERRO NA RECUPERAÇÃO DE SENHA]", erro);

        return res.status(500).json({
            mensagem: "Não foi possível processar a solicitação."
        });
    }
};

module.exports = usersRecuperarSenha;
