
const userRepository = require("../../src/repositories/userRepository");
const usersAtualizar = require("../../src/controllers/users/usersAtualizar");

jest.mock("../../src/repositories/userRepository", () => ({
    ler: jest.fn(),
    atualizar: jest.fn()
}));

describe("usersAtualizar", () => {
    let req;
    let res;

    const dadosValidos = {
        nome: "João Silva",
        email: "joao@email.com",
        telefone: "11999999999",
        status_id: 1
    };

    beforeEach(() => {
        jest.clearAllMocks();

        req = {
            params: { id: "10" },
            body: { ...dadosValidos }
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    test("deve atualizar o usuário e retornar status 200", async () => {
        userRepository.ler.mockResolvedValue({
            rows: [{ id: 10 }]
        });

        const usuarioAtualizado = {
            id: 10,
            ...dadosValidos
        };

        userRepository.atualizar.mockResolvedValue({
            rows: [usuarioAtualizado]
        });

        await usersAtualizar(req, res);

        expect(userRepository.ler).toHaveBeenCalledWith(10);

        expect(userRepository.atualizar).toHaveBeenCalledWith(
            10,
            "João Silva",
            "joao@email.com",
            "11999999999",
            1,
            undefined
        );

        expect(res.status).toHaveBeenCalledWith(200);

        expect(res.json).toHaveBeenCalledWith({
            mensagem: "Usuário atualizado com sucesso.",
            usuario: usuarioAtualizado
        });
    });

    test("deve retornar 404 quando o usuário não existir", async () => {
        userRepository.ler.mockResolvedValue({
            rows: []
        });

        await usersAtualizar(req, res);

        expect(res.status).toHaveBeenCalledWith(404);

        expect(res.json).toHaveBeenCalledWith({
            mensagem: "Usuário não encontrado."
        });

        expect(userRepository.atualizar).not.toHaveBeenCalled();
    });

    test("deve extrair o ID correto dos parâmetros da rota", async () => {
        req.params.id = "25";
        req.body = { nome: "Maria" };

        userRepository.ler.mockResolvedValue({
            rows: [{ id: 25 }]
        });

        userRepository.atualizar.mockResolvedValue({
            rows: [{ id: 25, nome: "Maria" }]
        });

        await usersAtualizar(req, res);

        expect(userRepository.ler).toHaveBeenCalledWith(25);

        expect(userRepository.atualizar).toHaveBeenCalledWith(
            25,
            "Maria",
            null,
            null,
            null,
            undefined
        );

        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("deve aceitar um corpo vazio", async () => {
        req.body = {};

        userRepository.ler.mockResolvedValue({
            rows: [{ id: 10 }]
        });

        userRepository.atualizar.mockResolvedValue({
            rows: [{ id: 10 }]
        });

        await usersAtualizar(req, res);

        expect(userRepository.atualizar).toHaveBeenCalledWith(
            10,
            null,
            null,
            null,
            null,
            undefined
        );

        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("deve retornar 500 quando a leitura do usuário falhar", async () => {
        userRepository.ler.mockRejectedValue(
            new Error("Erro ao consultar usuário")
        );

        const erroOriginal = console.error;
        console.error = jest.fn();

        try {
            await usersAtualizar(req, res);
        } finally {
            console.error = erroOriginal;
        }

        expect(res.status).toHaveBeenCalledWith(500);

        expect(res.json).toHaveBeenCalledWith({
            mensagem: "Erro interno ao atualizar usuário."
        });
    });

    test("deve retornar 500 quando a atualização falhar", async () => {
        userRepository.ler.mockResolvedValue({
            rows: [{ id: 10 }]
        });

        userRepository.atualizar.mockRejectedValue(
            new Error("Erro ao atualizar usuário")
        );

        const erroOriginal = console.error;
        console.error = jest.fn();

        try {
            await usersAtualizar(req, res);
        } finally {
            console.error = erroOriginal;
        }

        expect(res.status).toHaveBeenCalledWith(500);

        expect(res.json).toHaveBeenCalledWith({
            mensagem: "Erro interno ao atualizar usuário."
        });
    });

    test("deve retornar somente o primeiro registro", async () => {
        userRepository.ler.mockResolvedValue({
            rows: [{ id: 10 }]
        });

        userRepository.atualizar.mockResolvedValue({
            rows: [
                { id: 10, nome: "João" },
                { id: 11, nome: "Maria" }
            ]
        });

        await usersAtualizar(req, res);

        expect(res.json).toHaveBeenCalledWith({
            mensagem: "Usuário atualizado com sucesso.",
            usuario: { id: 10, nome: "João" }
        });
    });

    test("deve retornar 400 quando o ID for inválido", async () => {
        req.params.id = "abc";

        await usersAtualizar(req, res);

        expect(res.status).toHaveBeenCalledWith(400);

        expect(userRepository.ler).not.toHaveBeenCalled();
        expect(userRepository.atualizar).not.toHaveBeenCalled();
    });
});
