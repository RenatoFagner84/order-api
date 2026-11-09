const userRepository = require("../../src/repositories/userRepository");
const usersLerId = require("../../src/controllers/users/usersLerId");

jest.mock("../../src/repositories/userRepository", () => ({
    ler: jest.fn()
}));

describe("usersLerId", () => {
    let req;
    let res;

    beforeEach(() => {
        jest.clearAllMocks();

        req = {
            url: "/api/users/10"
        };

        res = {
            writeHead: jest.fn(),
            end: jest.fn()
        };
    });

    test("deve retornar 200 e os dados do usuário quando ele existir", async () => {
        const usuario = {
            id: 10,
            nome: "Maria Silva",
            email: "maria@example.com",
            ativo: true
        };

        userRepository.ler.mockResolvedValue({
            rows: [usuario]
        });

        await usersLerId(req, res);

        expect(userRepository.ler).toHaveBeenCalledWith("10");

        expect(res.writeHead).toHaveBeenCalledWith(200, {
            "Content-Type": "application/json"
        });

        expect(res.end).toHaveBeenCalledWith(
            JSON.stringify(usuario)
        );
    });

    test("deve retornar 404 quando o usuário não existir", async () => {
        userRepository.ler.mockResolvedValue({
            rows: []
        });

        await usersLerId(req, res);

        expect(userRepository.ler).toHaveBeenCalledWith("10");

        expect(res.writeHead).toHaveBeenCalledWith(404, {
            "Content-Type": "application/json"
        });

        expect(res.end).toHaveBeenCalledWith(
            JSON.stringify({
                mensagem: "User não encontrado"
            })
        );
    });

    test("deve extrair o ID corretamente quando a URL tiver query string", async () => {
        req.url = "/api/users/25?detalhes=true";

        userRepository.ler.mockResolvedValue({
            rows: [{ id: 25, nome: "João" }]
        });

        await usersLerId(req, res);

        expect(userRepository.ler).toHaveBeenCalledWith("25");
        expect(res.writeHead).toHaveBeenCalledWith(
            200,
            { "Content-Type": "application/json" }
        );
    });

    test("deve retornar somente o primeiro usuário encontrado", async () => {
        const primeiroUsuario = {
            id: 10,
            nome: "Maria"
        };

        userRepository.ler.mockResolvedValue({
            rows: [
                primeiroUsuario,
                { id: 10, nome: "Outro registro" }
            ]
        });

        await usersLerId(req, res);

        expect(res.end).toHaveBeenCalledWith(
            JSON.stringify(primeiroUsuario)
        );
    });

    test("deve propagar o erro quando o repositório falhar", async () => {
        userRepository.ler.mockRejectedValue(
            new Error("Erro no banco de dados")
        );

        await expect(usersLerId(req, res)).rejects.toThrow(
            "Erro no banco de dados"
        );

        expect(res.writeHead).not.toHaveBeenCalled();
        expect(res.end).not.toHaveBeenCalled();
    });
});
