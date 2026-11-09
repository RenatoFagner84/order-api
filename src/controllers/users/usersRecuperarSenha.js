const bcrypt = require("bcryptjs");
const { randomInt } = require("crypto");

const userRepository = require("../../repositories/userRepository");

const {
    enviarEmailRecuperacaoSenha
} = require("../../services/emailService");

const responder = (res, status, mensagem) => {
    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify({
        mensagem
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

const usersRecuperarSenha = async (req, res) => {
    try {
        const dados = await lerCorpoRequisicao(req);

        if (!dados || !dados.email) {
            return responder(
                res,
                400,
                "Informe um endereço de e-mail válido."
            );
        }

        const email = String(dados.email).trim().toLowerCase();

        if (
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ) {
            return responder(
                res,
                400,
                "Informe um endereço de e-mail válido."
            );
        }

        const resultadoUsuario =
            await userRepository.buscarUsuarioParaRecuperacao(email);

        // Não revela se o e-mail está cadastrado.
        if (resultadoUsuario.rowCount === 0) {
            return responder(
                res,
                200,
                "Se o e-mail estiver cadastrado, você receberá um código de recuperação."
            );
        }

        const usuario = resultadoUsuario.rows[0];

        // Gera um PIN aleatório de 6 dígitos.
        const pin = String(randomInt(100000, 1000000));

        // Criptografa o PIN antes de salvar no banco.
        const pinHash = await bcrypt.hash(pin, 10);

        // O PIN terá validade de 10 minutos.
        const expiresAt = new Date(
            Date.now() + 10 * 60 * 1000
        );

        // Invalida solicitações anteriores.
        await userRepository.invalidarRecuperacoesAnteriores(
            usuario.id
        );

        // Salva o novo PIN no banco de dados.
        await userRepository.criarRecuperacaoSenha(
            usuario.id,
            pinHash,
            expiresAt
        );

        // Envia o PIN para o e-mail do usuário.
        await enviarEmailRecuperacaoSenha({
            nome: usuario.nome,
            email: usuario.email,
            pin
        });

        return responder(
            res,
            200,
            "Se o e-mail estiver cadastrado, você receberá um código de recuperação."
        );

    } catch (erro) {
        console.error(
            "[ERRO AO SOLICITAR RECUPERAÇÃO DE SENHA]",
            erro
        );

        return responder(
            res,
            500,
            "Não foi possível solicitar a recuperação de senha."
        );
    }
};

module.exports = usersRecuperarSenha;
