
const nodemailer = require("nodemailer");

function validarConfiguracao() {
    const obrigatorias = ["MAIL_USER", "MAIL_PASS", "MAIL_FROM"];

    const faltando = obrigatorias.filter(
        (variavel) => !process.env[variavel]
    );

    if (faltando.length > 0) {
        throw new Error(
            `Configurações de e-mail ausentes: ${faltando.join(", ")}`
        );
    }
}

function criarTransporter() {
    validarConfiguracao();

    const porta = Number(process.env.MAIL_PORT || 587);

    return nodemailer.createTransport({
        host: process.env.MAIL_HOST || "smtp-relay.brevo.com",
        port: porta,
        secure: porta === 465,
        auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS
        }
    });
}

function obterRemetente() {
    const nome = process.env.MAIL_FROM_NAME || "Order API";
    const email = process.env.MAIL_FROM;

    return `"${nome}" <${email}>`;
}

async function enviarEmailBoasVindas({ nome, email }) {
    const transporter = criarTransporter();

    return transporter.sendMail({
        from: obterRemetente(),
        to: email,
        subject: "Bem-vindo!",
        html: `
            <h2>Olá, ${nome}!</h2>
            <p>Seja bem-vindo(a) à nossa plataforma.</p>
        `
    });
}

async function enviarEmailRecuperacaoSenha({ nome, email, pin }) {
    const transporter = criarTransporter();

    return transporter.sendMail({
        from: obterRemetente(),
        to: email,
        subject: "Recuperação de senha",
        html: `
            <h2>Olá, ${nome}!</h2>
            <p>Seu código de recuperação de senha é:</p>
            <h1>${pin}</h1>
            <p>Se você não solicitou essa recuperação, ignore este e-mail.</p>
        `
    });
}

async function verificarConexaoEmail() {
    const transporter = criarTransporter();

    return transporter.verify();
}

module.exports = {
    enviarEmailBoasVindas,
    enviarEmailRecuperacaoSenha,
    verificarConexaoEmail
};
