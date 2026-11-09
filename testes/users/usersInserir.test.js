
const { Readable } = require("stream");

jest.mock("../../src/db", () => ({
    connect: jest.fn()
}));

jest.mock("bcryptjs", () => ({
    hash: jest.fn()
}));

jest.mock(
    "../../src/services/emailService",
    () => ({
        enviarEmailBoasVindas: jest.fn()
    }),
    { virtual: true }
);

const pool = require("../../src/db");
const bcrypt = require("bcryptjs");

const {
    enviarEmailBoasVindas
} = require("../../src/services/emailService");

const usersInserir = require("../../src/controllers/users/usersInserir");

describe("usersInserir - envio de email de boas-vindas", () => {
    let client;
    let req;
    let res;

    beforeEach(() => {
        jest.clearAllMocks();

        client = {
            query: jest.fn(),
            release: jest.fn()
        };

        pool.connect.mockResolvedValue(client);

        bcrypt.hash.mockResolvedValue("senha_criptografada");

        enviarEmailBoasVindas.mockResolvedValue({
            messageId: "email-teste-123"
        });

        client.query.mockImplementation(async (sql) => {
            if (sql.includes("FROM users")) {
                return {
                    rowCount: 0,
                    rows: []
                };
            }

            if (sql.includes("FROM roles")) {
                return {
                    rowCount: 1,
                    rows: [
                        {
                            id: 1,
                            role: "client"
                        }
                    ]
                };
            }

            if (sql.includes("INSERT INTO users_roles")) {
                return {
                    rowCount: 1,
                    rows: []
                };
            }

            if (sql.includes("INSERT INTO users")) {
                return {
                    rowCount: 1,
                    rows: [
                        {
                            id: 10,
                            nome: "João Silva",
                            email: "joao@email.com",
                            telefone: null,
                            ativo: true
                        }
                    ]
                };
            }

            return {
                rowCount: 1,
                rows: []
            };
        });

        req = Readable.from([
            JSON.stringify({
                nome: "João Silva",
                email: "joao@email.com",
                senha: "12345678"
            })
        ]);

        res = {
            writableEnded: false,
            headersSent: false,
            writeHead: jest.fn(),
            end: jest.fn(function (dados) {
                this.writableEnded = true;
                this.body = JSON.parse(dados);
            })
        };
    });

    it("deve enviar email de boas-vindas após cadastrar o usuário", async () => {
        await usersInserir(req, res);

        expect(res.writeHead).toHaveBeenCalledWith(
            201,
            expect.objectContaining({
                "Content-Type": "application/json; charset=utf-8"
            })
        );

        expect(enviarEmailBoasVindas).toHaveBeenCalledWith(
            expect.objectContaining({
                nome: "João Silva",
                email: "joao@email.com"
            })
        );

        const commitCall = client.query.mock.calls.findIndex(
            ([sql]) => sql === "COMMIT"
        );

        expect(commitCall).not.toBe(-1);

        const commitOrder =
            client.query.mock.invocationCallOrder[commitCall];

        const emailOrder =
            enviarEmailBoasVindas.mock.invocationCallOrder[0];

        expect(commitOrder).toBeLessThan(emailOrder);
    });

    it("deve manter o cadastro mesmo se o envio do email falhar", async () => {
        enviarEmailBoasVindas.mockRejectedValue(
            new Error("Falha no envio do email")
        );

        await usersInserir(req, res);

        expect(res.writeHead).toHaveBeenCalledWith(
            201,
            expect.any(Object)
        );

        expect(res.body.mensagem).toBe(
            "Usuário cadastrado com sucesso."
        );

        expect(enviarEmailBoasVindas).toHaveBeenCalledTimes(1);

        expect(client.query).toHaveBeenCalledWith("COMMIT");
    });

    it("não deve enviar email se o usuário já estiver cadastrado", async () => {
        client.query.mockImplementation(async (sql) => {
            if (sql.includes("FROM users")) {
                return {
                    rowCount: 1,
                    rows: [{ id: 10 }]
                };
            }

            return {
                rowCount: 1,
                rows: []
            };
        });

        await usersInserir(req, res);

        expect(enviarEmailBoasVindas).not.toHaveBeenCalled();

        expect(res.writeHead).toHaveBeenCalledWith(
            409,
            expect.any(Object)
        );

        expect(client.query).toHaveBeenCalledWith("ROLLBACK");
    });
});
