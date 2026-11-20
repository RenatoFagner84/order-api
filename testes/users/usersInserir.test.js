
jest.mock("../../src/db", () => ({
    connect: jest.fn()
}));

jest.mock("bcryptjs", () => ({
    hash: jest.fn()
}));

jest.mock("../../src/services/emailService", () => ({
    enviarEmailBoasVindas: jest.fn()
}));

jest.mock("../../src/repositories/userRepository", () => ({
    verificarEmailExistente: jest.fn(),
    buscarRoleClient: jest.fn(),
    associarUsuarioRole: jest.fn()
}));

const pool = require("../../src/db");
const bcrypt = require("bcryptjs");

const {
    enviarEmailBoasVindas
} = require("../../src/services/emailService");

const userRepository = require("../../src/repositories/userRepository");

const usersInserir = require("../../src/controllers/users/usersInserir");

describe("usersInserir - envio de email de boas-vindas", () => {
    let client;
    let req;
    let res;

    const criarRespostaMock = () => {
        const resposta = {};

        resposta.status = jest.fn().mockReturnValue(resposta);
        resposta.json = jest.fn().mockReturnValue(resposta);

        return resposta;
    };

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

        userRepository.verificarEmailExistente.mockResolvedValue({
            rowCount: 0,
            rows: []
        });

        userRepository.buscarRoleClient.mockResolvedValue({
            rowCount: 1,
            rows: [
                {
                    id: 1,
                    role: "client"
                }
            ]
        });

        userRepository.associarUsuarioRole.mockResolvedValue({
            rowCount: 1,
            rows: []
        });

        client.query.mockImplementation(async (sql) => {
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

        req = {
            body: {
                nome: "João Silva",
                email: "joao@email.com",
                senha: "12345678"
            }
        };

        res = criarRespostaMock();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("deve enviar email de boas-vindas após cadastrar o usuário", async () => {
        await usersInserir(req, res);

        expect(res.status).toHaveBeenCalledWith(201);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                mensagem: "Usuário cadastrado com sucesso.",
                usuario: expect.objectContaining({
                    id: 10,
                    nome: "João Silva",
                    email: "joao@email.com"
                }),
                roles: [
                    {
                        id: 1,
                        role: "client"
                    }
                ]
            })
        );

        expect(enviarEmailBoasVindas).toHaveBeenCalledWith(
            expect.objectContaining({
                nome: "João Silva",
                email: "joao@email.com"
            })
        );

        expect(userRepository.verificarEmailExistente).toHaveBeenCalledWith(
            "joao@email.com",
            client
        );

        expect(userRepository.buscarRoleClient).toHaveBeenCalledWith(
            client
        );

        expect(userRepository.associarUsuarioRole).toHaveBeenCalledWith(
            10,
            1,
            client
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

        expect(client.release).toHaveBeenCalledTimes(1);
    });

    it("deve manter o cadastro mesmo se o envio do email falhar", async () => {
        const erroEmail = new Error("Falha no envio do email");

        enviarEmailBoasVindas.mockRejectedValue(erroEmail);

        const consoleErrorSpy = jest
            .spyOn(console, "error")
            .mockImplementation(() => {});

        await usersInserir(req, res);

        expect(res.status).toHaveBeenCalledWith(201);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                mensagem: "Usuário cadastrado com sucesso."
            })
        );

        expect(enviarEmailBoasVindas).toHaveBeenCalledTimes(1);

        expect(client.query).toHaveBeenCalledWith("COMMIT");

        expect(client.query).not.toHaveBeenCalledWith("ROLLBACK");

        expect(consoleErrorSpy).toHaveBeenCalledWith(
            "[ERRO AO ENVIAR EMAIL DE BOAS-VINDAS]",
            erroEmail
        );

        expect(client.release).toHaveBeenCalledTimes(1);
    });

    it("não deve enviar email se o usuário já estiver cadastrado", async () => {
        userRepository.verificarEmailExistente.mockResolvedValue({
            rowCount: 1,
            rows: [
                {
                    id: 10
                }
            ]
        });

        await usersInserir(req, res);

        expect(res.status).toHaveBeenCalledWith(409);

        expect(res.json).toHaveBeenCalledWith({
            mensagem: "Já existe um usuário com este e-mail."
        });

        expect(enviarEmailBoasVindas).not.toHaveBeenCalled();

        expect(client.query).toHaveBeenCalledWith("BEGIN");

        expect(client.query).toHaveBeenCalledWith("ROLLBACK");

        expect(client.query).not.toHaveBeenCalledWith("COMMIT");

        expect(client.release).toHaveBeenCalledTimes(1);
    });
});
