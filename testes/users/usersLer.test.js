const userRepository = require("../../src/repositories/userRepository");
const usersLer = require("../../src/controllers/users/usersLer");

jest.mock("../../src/repositories/userRepository", () => ({
    lerTudo: jest.fn()
}));

describe("usersLer", () => {
    let req;
    let res;

    beforeEach(() => {
        jest.clearAllMocks();

        req = {};

        res = {
            writeHead: jest.fn(),
            end: jest.fn()
        };
    });

    test("deve retornar 200 e a lista de usuários", async () => {
        const usuarios = [
            {
                id: 1,
                nome: "Maria Silva",
                email: "maria@example.com"
            },
            {
                id: 2,
                nome: "João Santos",
                email: "joao@example.com"
            }
        ];

        userRepository.lerTudo.mockResolvedValue({
            rows: usuarios
        });

        await usersLer(req, res);

        expect(userRepository.lerTudo).toHaveBeenCalledTimes(1);

        expect(res.writeHead).toHaveBeenCalledWith(200, {
            "Content-Type": "application/json"
        });

        expect(res.end).toHaveBeenCalledWith(
            JSON.stringify(usuarios)
        );
    });

    test("deve retornar uma lista vazia quando não houver usuários", async () => {
        userRepository.lerTudo.mockResolvedValue({
            rows: []
        });

        await usersLer(req, res);

        expect(res.writeHead).toHaveBeenCalledWith(200, {
            "Content-Type": "application/json"
        });

        expect(res.end).toHaveBeenCalledWith("[]");
    });

    test("deve retornar os usuários exatamente como recebidos do repositório", async () => {
        const usuarios = [
            { id: 10, nome: "Ana", ativo: true }
        ];

        userRepository.lerTudo.mockResolvedValue({
            rows: usuarios
        });

        await usersLer(req, res);

        const resposta = JSON.parse(res.end.mock.calls[0][0]);

        expect(resposta).toEqual(usuarios);
    });
});
