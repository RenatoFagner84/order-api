require("dotenv").config();

const nodemailer = require("nodemailer");

describe("Conexão com Mailtrap", () => {
    test("deve conectar ao servidor SMTP e enviar um email de teste", async () => {
        const transporter = nodemailer.createTransport({
            host: process.env.MAILTRAP_HOST,
            port: Number(process.env.MAILTRAP_PORT || 2525),
            secure: Number(process.env.MAILTRAP_PORT) === 465,
            auth: {
                user: process.env.MAILTRAP_USER,
                pass: process.env.MAILTRAP_PASS
            }
        });

        await transporter.verify();

        const resultado = await transporter.sendMail({
            from: {
                name: process.env.MAIL_FROM_NAME || "Minha Aplicação",
                address: process.env.MAIL_FROM
            },
            to: "teste@exemplo.com",
            subject: "Teste de conexão com Mailtrap",
            text: "Se você está vendo esta mensagem no Mailtrap, a configuração funcionou."
        });

        expect(resultado.accepted).toContain("teste@exemplo.com");
    });
});