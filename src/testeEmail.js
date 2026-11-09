
require("dotenv").config();

const {
  verificarConexaoEmail,
  enviarEmailBoasVindas,
} = require("./services/emailService");

async function testarEmail() {
  try {
    await verificarConexaoEmail();

    await enviarEmailBoasVindas({
      nome: "Teste",
      email: "SEU_EMAIL_PESSOAL@gmail.com",
    });

    console.log("Teste de envio concluído!");
  } catch (erro) {
    console.error("Falha no teste:", erro.message);
  }
}

testarEmail();
