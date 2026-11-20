const userRepository = require("../../src/repositories/userRepository");
const usersBuscar = require("../../src/controllers/users/usersBuscar");

jest.mock("../../src/repositories/userRepository", () => ({
    buscarPorNome: jest.fn()
}));

describe("usersBuscar", () => {
    let req;
    let res;

    beforeEach(() => {
        jest.clearAllMocks();

        req = {
            query: { nome: "Joao" }
        };

        res = {
            writableEnded: false,
            headersSent: false,
            writeHead: jest.fn(),
            end: jest.fn()
        };
    });

    const esperarResposta = (status, corpo) => {
        expect(res.writeHead).toHaveBeenCalledWith(status, {
            "Content-Type": "application/json; charset=utf-8"
        });

        expect(res.end).toHaveBeenCalledWith(JSON.stringify(corpo));
    };

    describe("validação dos parâmetros", () => {
        test("retorna 400 quando o nome não for informado", async () => {
            req.query = {};

            await usersBuscar(req, res);

            esperarResposta(400, {
                mensagem: "Informe o nome do user"
            });

            expect(userRepository.buscarPorNome).not.toHaveBeenCalled();
        });

        test("retorna 400 quando o nome estiver vazio", async () => {
            req.query = { nome: "   " };

            await usersBuscar(req, res);

            esperarResposta(400, {
                mensagem: "Informe o nome do user"
            });

            expect(userRepository.buscarPorNome).not.toHaveBeenCalled();
        });

        test("retorna 400 quando houver outros parâmetros, mas não nome", async () => {
            req.query = { email: "joao@email.com" };

            await usersBuscar(req, res);

            esperarResposta(400, {
                mensagem: "Informe o nome do user"
            });

            expect(userRepository.buscarPorNome).not.toHaveBeenCalled();
        });
    });

    describe("busca de usuários", () => {
        test("retorna 200 e os usuários encontrados", async () => {
            const usuarios = [
                {
                    id: 1,
                    nome: "Joao Silva",
                    email: "joao@email.com"
                },
                {
                    id: 2,
                    nome: "Joao Santos",
                    email: "santos@email.com"
                }
            ];

            userRepository.buscarPorNome.mockResolvedValue({
                rows: usuarios
            });

            await usersBuscar(req, res);

            expect(userRepository.buscarPorNome).toHaveBeenCalledWith("Joao");
            esperarResposta(200, usuarios);
        });

        test("retorna 404 quando nenhum usuário for encontrado", async () => {
            userRepository.buscarPorNome.mockResolvedValue({
                rows: []
            });

            await usersBuscar(req, res);

            expect(userRepository.buscarPorNome).toHaveBeenCalledWith("Joao");

            esperarResposta(404, {
                mensagem: "User não encontrado"
            });
        });

        test("usa o nome já decodificado pelo parser de query", async () => {
            req.query = {
                nome: "João Silva"
            };

            userRepository.buscarPorNome.mockResolvedValue({
                rows: [
                    {
                        id: 1,
                        nome: "João Silva"
                    }
                ]
            });

            await usersBuscar(req, res);

            expect(userRepository.buscarPorNome).toHaveBeenCalledWith("João Silva");

            expect(res.writeHead).toHaveBeenCalledWith(
                200,
                expect.any(Object)
            );
        });

        test("ignora outros parâmetros e busca pelo nome", async () => {
            req.query = {
                nome: "Maria",
                ativo: "true"
            };

            userRepository.buscarPorNome.mockResolvedValue({
                rows: [
                    {
                        id: 3,
                        nome: "Maria"
                    }
                ]
            });

            await usersBuscar(req, res);

            expect(userRepository.buscarPorNome).toHaveBeenCalledWith("Maria");

            expect(res.writeHead).toHaveBeenCalledWith(
                200,
                expect.any(Object)
            );
        });
    });

    describe("tratamento de erros", () => {
        test("retorna HTTP 500 quando o repositório falhar", async () => {
            const erro = new Error("Erro no banco de dados");

            userRepository.buscarPorNome.mockRejectedValue(erro);

            const spyErro = jest
                .spyOn(console, "error")
                .mockImplementation(() => {});

            try {
                await usersBuscar(req, res);

                esperarResposta(500, {
                    mensagem: "Erro interno ao buscar usuários."
                });

                expect(spyErro).toHaveBeenCalledWith(
                    "[ERRO AO BUSCAR USUÁRIOS]",
                    erro
                );
            } finally {
                spyErro.mockRestore();
            }
        });
    });
});
