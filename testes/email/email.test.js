
jest.mock("nodemailer", () => ({
    createTransport: jest.fn()
}));

const nodemailer = require("nodemailer");
const emailService = require("../../src/services/emailService");

describe("emailService", () => {
    let transporter;

    beforeEach(() => {
        jest.clearAllMocks();

        process.env.MAIL_HOST = "smtp-relay.brevo.com";
        process.env.MAIL_PORT = "587";
        process.env.MAIL_USER = "usuario-teste";
        process.env.MAIL_PASS = "senha-teste";
        process.env.MAIL_FROM = "noreply@example.com";
        process.env.MAIL_FROM_NAME = "Order API";

        transporter = {
            verify: jest.fn().mockResolvedValue(true),
            sendMail: jest.fn().mockResolvedValue({
                accepted: ["destinatario@example.com"],
                rejected: [],
                messageId: "mensagem-teste"
            })
        };

        nodemailer.createTransport.mockReturnValue(transporter);
    });

    test("configura o transporte com os dados SMTP da Brevo", async () => {
        await expect(
            emailService.verificarConexaoEmail()
        ).resolves.toBe(true);

        expect(nodemailer.createTransport).toHaveBeenCalledWith({
            host: "smtp-relay.brevo.com",
            port: 587,
            secure: false,
            auth: {
                user: "usuario-teste",
                pass: "senha-teste"
            }
        });

        expect(transporter.verify).toHaveBeenCalledTimes(1);
    });

    test("envia e-mail de boas-vindas sem acessar servidor SMTP real", async () => {
        const dados = {
            nome: "Maria",
            email: "destinatario@example.com"
        };

        await emailService.enviarEmailBoasVindas(dados);

        expect(nodemailer.createTransport).toHaveBeenCalledTimes(1);

        expect(transporter.sendMail).toHaveBeenCalledWith({
            from: '"Order API" <noreply@example.com>',
            to: "destinatario@example.com",
            subject: "Bem-vindo!",
            html: expect.stringContaining("Maria")
        });
    });

    test("envia e-mail de recuperação com o PIN", async () => {
        const dados = {
            nome: "João",
            email: "destinatario@example.com",
            pin: "123456"
        };

        await emailService.enviarEmailRecuperacaoSenha(dados);

        expect(nodemailer.createTransport).toHaveBeenCalledTimes(1);

        expect(transporter.sendMail).toHaveBeenCalledWith({
            from: '"Order API" <noreply@example.com>',
            to: "destinatario@example.com",
            subject: "Recuperação de senha",
            html: expect.stringContaining("123456")
        });
    });

    test("informa quais configurações obrigatórias estão ausentes", async () => {
        delete process.env.MAIL_USER;
        delete process.env.MAIL_PASS;
        delete process.env.MAIL_FROM;

        await expect(
            emailService.verificarConexaoEmail()
        ).rejects.toThrow(
            "Configurações de e-mail ausentes: MAIL_USER, MAIL_PASS, MAIL_FROM"
        );

        expect(nodemailer.createTransport).not.toHaveBeenCalled();
        expect(transporter.verify).not.toHaveBeenCalled();
    });
});
