const userRepository = require("../../src/repositories/userRepository");
const usersAtualizar = require("../../src/controllers/users/usersAtualizar");

jest.mock("../../src/repositories/userRepository", () => ({
    ler: jest.fn(),
    atualizar: jest.fn()
}));

describe("usersAtualizar", () => {
    let req;
    let res;
    let resposta;
    let statusCode;
    let headers;

    const dadosValidos = {
        nome: "João Silva",
        email: "joao@email.com",
        telefone: "11999999999",
        status_id: 1
    };

    // Simula a requisição e envia o corpo para o controller
    const enviarBody = async (dados, url = "/api/users/10") => {
        req.url = url;

        const promise = usersAtualizar(req, res);

        if (dados !== undefined && dados !== "") {
            req.emit("data", Buffer.from(
                typeof dados === "string"
                    ? dados
                    : JSON.stringify(dados)
            ));
        }

        req.emit("end");

        return promise;
    };

    beforeEach(() => {
        jest.clearAllMocks();

        resposta = "";
        statusCode = null;
        headers = {};


        // Usa os métodos de EventEmitter para simular data e end
        const EventEmitter = require("events");
        const requisicao = new EventEmitter();

        requisicao.url = "/api/users/10";
        req = requisicao;

        res = {
            writeHead: jest.fn((status, cabecalhos) => {
                statusCode = status;
                headers = cabecalhos;
            }),
            end: jest.fn((conteudo) => {
                resposta = conteudo;
            })
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

        await enviarBody(dadosValidos);

        expect(userRepository.ler).toHaveBeenCalledWith("10");

        expect(userRepository.atualizar).toHaveBeenCalledWith(
            "10",
            "João Silva",
            "joao@email.com",
            "11999999999",
            1
        );

        expect(statusCode).toBe(200);
        expect(headers["Content-Type"]).toBe("application/json");
        expect(JSON.parse(resposta)).toEqual(usuarioAtualizado);
    });

    test("deve retornar 404 quando o usuário não existir", async () => {
        userRepository.ler.mockResolvedValue({
            rows: []
        });

        await enviarBody(dadosValidos);

        expect(statusCode).toBe(404);
        expect(JSON.parse(resposta)).toEqual({
            mensagem: "Usuario não encontrado"
        });

        expect(userRepository.atualizar).not.toHaveBeenCalled();
    });

    test("deve extrair o ID correto da URL", async () => {
        userRepository.ler.mockResolvedValue({
            rows: [{ id: 25 }]
        });

        userRepository.atualizar.mockResolvedValue({
            rows: [{ id: 25, nome: "Maria" }]
        });

        await enviarBody(
            { nome: "Maria" },
            "/api/users/25"
        );

        expect(userRepository.ler).toHaveBeenCalledWith("25");
        expect(userRepository.atualizar).toHaveBeenCalledWith(
            "25",
            "Maria",
            undefined,
            undefined,
            undefined
        );
    });

    test("deve aceitar corpo vazio", async () => {
        userRepository.ler.mockResolvedValue({
            rows: [{ id: 10 }]
        });

        userRepository.atualizar.mockResolvedValue({
            rows: [{ id: 10 }]
        });

        await enviarBody("");

        expect(userRepository.atualizar).toHaveBeenCalledWith(
            "10",
            undefined,
            undefined,
            undefined,
            undefined
        );

        expect(statusCode).toBe(200);
    });

    test("deve rejeitar a Promise se a leitura falhar", async () => {
        userRepository.ler.mockRejectedValue(
            new Error("Erro ao consultar usuário")
        );

        await expect(
            enviarBody(dadosValidos)
        ).rejects.toThrow("Erro ao consultar usuário");
    });

    test("deve rejeitar a Promise se a atualização falhar", async () => {
        userRepository.ler.mockResolvedValue({
            rows: [{ id: 10 }]
        });

        userRepository.atualizar.mockRejectedValue(
            new Error("Erro ao atualizar usuário")
        );

        await expect(
            enviarBody(dadosValidos)
        ).rejects.toThrow("Erro ao atualizar usuário");
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

        await enviarBody(dadosValidos);

        expect(JSON.parse(resposta)).toEqual({
            id: 10,
            nome: "João"
        });
    });

    test("deve rejeitar a Promise quando o JSON for inválido", async () => {
        await expect(
            enviarBody("{json inválido")
        ).rejects.toThrow();
    });
});
