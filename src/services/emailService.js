
require("dotenv").config();

const nodemailer = require("nodemailer");

const MAIL_HOST = process.env.MAIL_HOST || "smtp-relay.brevo.com";
const MAIL_PORT = Number(process.env.MAIL_PORT || 587);
const MAIL_USER = process.env.MAIL_USER;
const MAIL_PASS = process.env.MAIL_PASS;
const MAIL_FROM = process.env.MAIL_FROM;
const MAIL_FROM_NAME =
    process.env.MAIL_FROM_NAME || "Minha Aplicação";

const validarConfiguracao = () => {
    const ausentes = [];

    if (!MAIL_HOST) ausentes.push("MAIL_HOST");
    if (!MAIL_PORT || !Number.isInteger(MAIL_PORT)) {
        ausentes.push("MAIL_PORT");
    }
    if (!MAIL_USER) ausentes.push("MAIL_USER");
    if (!MAIL_PASS) ausentes.push("MAIL_PASS");
    if (!MAIL_FROM) ausentes.push("MAIL_FROM");

    if (ausentes.length > 0) {
        throw new Error(
            `Configurações de e-mail ausentes: ${ausentes.join(", ")}`
        );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(MAIL_FROM)) {
        throw new Error("MAIL_FROM não é um endereço de e-mail válido.");
    }
};

validarConfiguracao();

const transporter = nodemailer.createTransport({
    host: MAIL_HOST,
    port: MAIL_PORT,
    secure: MAIL_PORT === 465,

    auth: {
        user: MAIL_USER,
        pass: MAIL_PASS
    },

    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000
});

const remetente = {
    name: MAIL_FROM_NAME,
    address: MAIL_FROM
};

const escaparHtml = (texto = "") => {
    return String(texto).replace(/[&<>"']/g, (caractere) => {
        const caracteres = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        };

        return caracteres[caractere];
    });
};

const verificarConexaoEmail = async () => {
    try {
        validarConfiguracao();

        await transporter.verify();

        console.log("[EMAIL] Conexão SMTP da Brevo estabelecida.");

        return true;
    } catch (erro) {
        console.error("[EMAIL] Falha na conexão SMTP:", {
            mensagem: erro.message,
            codigo: erro.code,
            resposta: erro.response,
            codigoResposta: erro.responseCode
        });

        throw erro;
    }
};

const enviarEmailBoasVindas = async ({ nome, email }) => {
    const nomeSeguro = escaparHtml(nome);

    const opcoes = {
        from: remetente,
        to: email,
        subject: "Bem-vindo(a) à Minha Aplicação!",

        text: `Olá, ${nome}! Seja bem-vindo(a) à Minha Aplicação.`,

        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
                <h2>Olá, ${nomeSeguro}!</h2>
                <p>Seja muito bem-vindo(a) à Minha Aplicação.</p>
                <p>Estamos felizes em ter você conosco!</p>
            </div>
        `
    };

    try {
        const resultado = await transporter.sendMail(opcoes);

        console.log("[EMAIL] Boas-vindas:", {
            messageId: resultado.messageId,
            accepted: resultado.accepted,
            rejected: resultado.rejected
        });

        return resultado;
    } catch (erro) {
        console.error("[EMAIL] Falha no envio de boas-vindas:", erro);
        throw erro;
    }
};

const enviarEmailRecuperacaoSenha = async ({
    nome,
    email,
    pin
}) => {
    if (!nome || !email || !pin) {
        throw new Error(
            "Nome, e-mail e PIN são obrigatórios."
        );
    }

    const nomeSeguro = escaparHtml(nome);
    const pinSeguro = escaparHtml(pin);

    const opcoes = {
        from: remetente,
        to: email,
        subject: "Código para recuperação de senha",

        text: `
Olá, ${nome}!

Recebemos uma solicitação para recuperar sua senha.

Seu código de recuperação é: ${pin}

Esse código expira em 10 minutos.

Se você não solicitou a recuperação, ignore este e-mail.
        `.trim(),

        html: `
            <div style="
                font-family: Arial, sans-serif;
                padding: 25px;
                max-width: 500px;
                margin: auto;
                color: #333;
            ">
                <h2>Olá, ${nomeSeguro}!</h2>

                <p>Recebemos uma solicitação para recuperar sua senha.</p>

                <p>Seu código de recuperação é:</p>

                <div style="
                    padding: 15px;
                    text-align: center;
                    background: #f2f2f2;
                    border-radius: 8px;
                    margin: 20px 0;
                ">
                    <h1 style="letter-spacing: 8px; margin: 0;">
                        ${pinSeguro}
                    </h1>
                </div>

                <p>Esse código expira em <strong>10 minutos</strong>.</p>

                <p>Se você não solicitou a recuperação, ignore este e-mail.</p>
            </div>
        `
    };

    try {
        const resultado = await transporter.sendMail(opcoes);

        console.log("[EMAIL] Resultado do envio do PIN:", {
            messageId: resultado.messageId,
            accepted: resultado.accepted,
            rejected: resultado.rejected,
            response: resultado.response
        });

        if (
            !resultado.accepted ||
            resultado.accepted.length === 0
        ) {
            throw new Error(
                "A Brevo não confirmou o recebimento do destinatário."
            );
        }

        return resultado;

    } catch (erro) {
        console.error("[EMAIL] Erro no envio do PIN:", {
            mensagem: erro.message,
            codigo: erro.code,
            resposta: erro.response,
            codigoResposta: erro.responseCode,
            comando: erro.command
        });

        throw erro;
    }
};

module.exports = {
    enviarEmailBoasVindas,
    enviarEmailRecuperacaoSenha,
    verificarConexaoEmail
};
