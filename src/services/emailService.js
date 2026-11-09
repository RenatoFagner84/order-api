
require("dotenv").config();

const nodemailer = require("nodemailer");

// Configuração do Brevo SMTP
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || "smtp-relay.brevo.com",
  port: Number(process.env.MAIL_PORT || 587),
  secure: Number(process.env.MAIL_PORT || 587) === 465,

  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

// Remetente dos e-mails
const remetente = {
  name: process.env.MAIL_FROM_NAME || "Minha Aplicação",
  address: process.env.MAIL_FROM,
};

// Evita que conteúdo do usuário seja interpretado como HTML
const escaparHtml = (texto = "") => {
  return String(texto).replace(/[&<>"']/g, (caractere) => {
    const caracteres = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };

    return caracteres[caractere];
  });
};

// Verifica a conexão com o servidor SMTP
const verificarConexaoEmail = async () => {
  try {
    await transporter.verify();
    console.log("Conexão com Brevo SMTP estabelecida!");
    return true;
  } catch (erro) {
    console.error("Erro na conexão com Brevo SMTP:", erro.message);
    throw erro;
  }
};

// E-mail de boas-vindas
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
    `,
  };

  try {
    const resultado = await transporter.sendMail(opcoes);
    return resultado;
  } catch (erro) {
    console.error("Erro ao enviar e-mail de boas-vindas:", erro.message);
    throw erro;
  }
};

// E-mail de recuperação de senha
const enviarEmailRecuperacaoSenha = async ({ nome, email, pin }) => {
  const nomeSeguro = escaparHtml(nome);
  const pinSeguro = escaparHtml(pin);

  const opcoes = {
    from: remetente,
    to: email,
    subject: "Recuperação de senha",
    text: `Olá, ${nome}! Seu código de recuperação é: ${pin}. Ele expira em 10 minutos.`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Olá, ${nomeSeguro}!</h2>
        <p>Recebemos uma solicitação para recuperar sua senha.</p>
        <p>Seu código de recuperação é:</p>

        <h1 style="letter-spacing: 5px;">
          ${pinSeguro}
        </h1>

        <p>Esse código expira em 10 minutos.</p>
        <p>Se você não solicitou a recuperação, ignore este e-mail.</p>
      </div>
    `,
  };

  try {
    const resultado = await transporter.sendMail(opcoes);
    console.log("E-mail de recuperação enviado:", resultado.messageId);
    return resultado;
  } catch (erro) {
    console.error("Erro ao enviar e-mail de recuperação:", erro.message);
    throw erro;
  }
};

module.exports = {
  enviarEmailBoasVindas,
  enviarEmailRecuperacaoSenha,
  verificarConexaoEmail,
};
