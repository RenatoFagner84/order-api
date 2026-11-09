
const pool = require("../../src/db");
const pedidosRepository = require("../../src/repositories/pedidosRepository");
const roleRepository = require("../../src/repositories/roleRepository");

jest.mock("../../src/db", () => ({
    connect: jest.fn()
}));

jest.mock("../../src/repositories/pedidosRepository", () => ({
    consultar: jest.fn(),
    deletarProduto: jest.fn()
}));

jest.mock("../../src/repositories/roleRepository", () => ({
    lerPorUser: jest.fn()
}));

const pedidosCancelar = require("../../src/controllers/pedidos/pedidosCancelar");

const criarReq = ({
    url = "/pedido/10/cancelar",
    method = "PATCH",
    usuarioId = 1
} = {}) => ({
    url,
    method,
    usuario: usuarioId === null ? undefined : { id: usuarioId }
});

const criarRes = () => {
    const res = {
        writableEnded: false,
        headersSent: false,
        statusCode: null,
        body: null,
        writeHead: jest.fn((status, headers) => {
            res.statusCode = status;
            res.headers = headers;
            res.headersSent = true;
        }),
        end: jest.fn((body) => {
            res.body = body;
            res.writableEnded = true;
        })
    };

    return res;
};

const lerResposta = (res) => JSON.parse(res.body);

describe("pedidosCancelar", () => {
    let client;
    let queryMock;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, "error").mockImplementation(() => {});

        queryMock = jest.fn();
        client = {
            query: queryMock,
            release: jest.fn()
        };

        pool.connect.mockResolvedValue(client);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("remover produto do pedido", () => {
        test("deve remover produto com sucesso", async () => {
            pedidosRepository.consultar.mockResolvedValue({
                rows: [{
                    id: 10,
                    user_id: 1,
                    status_id: 200,
                    oculto: false
                }]
            });

            roleRepository.lerPorUser.mockResolvedValue({
                rows: [{ role: "user" }]
            });

            pedidosRepository.deletarProduto.mockResolvedValue({
                rows: [{ pedido_id: 10, produto_id: 5 }]
            });

            const req = criarReq({
                url: "/pedido/10/produtos/5",
                method: "DELETE"
            });
            const res = criarRes();

            await pedidosCancelar(req, res);

            expect(res.statusCode).toBe(200);
            expect(lerResposta(res).mensagem).toBe(
                "Produto removido do pedido com sucesso."
            );
            expect(pedidosRepository.deletarProduto).toHaveBeenCalledWith(10, 5);
        });

        test("deve retornar 400 para IDs inválidos", async () => {
            const req = criarReq({
                url: "/pedido/abc/produtos/5",
                method: "DELETE"
            });
            const res = criarRes();

            await pedidosCancelar(req, res);

            expect(res.statusCode).toBe(400);
            expect(lerResposta(res).mensagem).toBe(
                "Informe IDs válidos para o pedido e o produto."
            );
        });

        test("deve retornar 401 quando usuário não estiver autenticado", async () => {
            const req = criarReq({
                url: "/pedido/10/produtos/5",
                method: "DELETE",
                usuarioId: null
            });
            const res = criarRes();

            await pedidosCancelar(req, res);

            expect(res.statusCode).toBe(401);
            expect(lerResposta(res).mensagem).toBe(
                "Usuário não autenticado."
            );
        });

        test("deve retornar 404 quando pedido não existir", async () => {
            pedidosRepository.consultar.mockResolvedValue({ rows: [] });

            const req = criarReq({
                url: "/pedido/10/produtos/5",
                method: "DELETE"
            });
            const res = criarRes();

            await pedidosCancelar(req, res);

            expect(res.statusCode).toBe(404);
            expect(lerResposta(res).mensagem).toBe("Pedido não encontrado.");
        });

        test("deve negar a remoção por usuário sem permissão", async () => {
            pedidosRepository.consultar.mockResolvedValue({
                rows: [{
                    id: 10,
                    user_id: 99,
                    status_id: 200,
                    oculto: false
                }]
            });

            roleRepository.lerPorUser.mockResolvedValue({
                rows: [{ role: "user" }]
            });

            const req = criarReq({
                url: "/pedido/10/produtos/5",
                method: "DELETE"
            });
            const res = criarRes();

            await pedidosCancelar(req, res);

            expect(res.statusCode).toBe(403);
            expect(pedidosRepository.deletarProduto).not.toHaveBeenCalled();
        });

        test("deve retornar 409 se o pedido não estiver pendente", async () => {
            pedidosRepository.consultar.mockResolvedValue({
                rows: [{
                    id: 10,
                    user_id: 1,
                    status_id: 204,
                    oculto: false
                }]
            });

            roleRepository.lerPorUser.mockResolvedValue({
                rows: [{ role: "user" }]
            });

            const req = criarReq({
                url: "/pedido/10/produtos/5",
                method: "DELETE"
            });
            const res = criarRes();

            await pedidosCancelar(req, res);

            expect(res.statusCode).toBe(409);
            expect(pedidosRepository.deletarProduto).not.toHaveBeenCalled();
        });

        test("deve retornar 404 se o produto não estiver no pedido", async () => {
            pedidosRepository.consultar.mockResolvedValue({
                rows: [{
                    id: 10,
                    user_id: 1,
                    status_id: 200,
                    oculto: false
                }]
            });

            roleRepository.lerPorUser.mockResolvedValue({
                rows: [{ role: "user" }]
            });

            pedidosRepository.deletarProduto.mockResolvedValue({ rows: [] });

            const req = criarReq({
                url: "/pedido/10/produtos/5",
                method: "DELETE"
            });
            const res = criarRes();

            await pedidosCancelar(req, res);

            expect(res.statusCode).toBe(404);
            expect(lerResposta(res).mensagem).toBe(
                "Produto não encontrado neste pedido."
            );
        });

        test("deve retornar 500 quando repository falhar", async () => {
            pedidosRepository.consultar.mockRejectedValue(
                new Error("Falha no banco")
            );

            const req = criarReq({
                url: "/pedido/10/produtos/5",
                method: "DELETE"
            });
            const res = criarRes();

            await pedidosCancelar(req, res);

            expect(res.statusCode).toBe(500);
        });
    });

    describe("cancelar pedido", () => {
        test("deve cancelar pedido e devolver produtos ao estoque", async () => {
            queryMock
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({
                    rows: [{
                        id: 10,
                        user_id: 1,
                        status_id: 200,
                        oculto: false
                    }]
                })
                .mockResolvedValueOnce({
                    rows: [{ produto_id: 5, quantidade: 2 }]
                })
                .mockResolvedValueOnce({
                    rows: [{ id: 5 }]
                })
                .mockResolvedValueOnce({
                    rows: [{ id: 5, nome: "Produto", quantidade: 12 }]
                })
                .mockResolvedValueOnce({
                    rows: [{
                        id: 10,
                        user_id: 1,
                        status_id: 204,
                        oculto: false
                    }]
                })
                .mockResolvedValueOnce({ rows: [] });

            roleRepository.lerPorUser.mockResolvedValue({
                rows: [{ role: "user" }]
            });

            const req = criarReq({
                url: "/pedido/10/cancelar",
                method: "PATCH"
            });
            const res = criarRes();

            await pedidosCancelar(req, res);

            expect(res.statusCode).toBe(200);
            expect(lerResposta(res).mensagem).toBe(
                "Pedido cancelado e estoque atualizado com sucesso."
            );
            expect(lerResposta(res).produtos_devolvidos).toEqual([
                {
                    produto_id: 5,
                    quantidade_devolvida: 2,
                    estoque_atual: 12
                }
            ]);
            expect(queryMock).toHaveBeenCalledWith("COMMIT");
            expect(client.release).toHaveBeenCalled();
        });

        test("deve retornar 400 para ID inválido", async () => {
            const req = criarReq({
                url: "/pedido/abc/cancelar",
                method: "PATCH"
            });
            const res = criarRes();

            await pedidosCancelar(req, res);

            expect(res.statusCode).toBe(400);
            expect(lerResposta(res).mensagem).toBe("ID do pedido inválido.");
            expect(pool.connect).not.toHaveBeenCalled();
        });

        test("deve retornar 401 quando usuário não estiver autenticado", async () => {
            const req = criarReq({
                url: "/pedido/10/cancelar",
                method: "PATCH",
                usuarioId: null
            });
            const res = criarRes();

            await pedidosCancelar(req, res);

            expect(res.statusCode).toBe(401);
            expect(pool.connect).not.toHaveBeenCalled();
        });

        test("deve retornar 404 quando pedido não existir", async () => {
            queryMock
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] });

            const req = criarReq({
                url: "/pedido/10/cancelar",
                method: "PATCH"
            });
            const res = criarRes();

            await pedidosCancelar(req, res);

            expect(res.statusCode).toBe(404);
            expect(queryMock).toHaveBeenCalledWith("ROLLBACK");
            expect(client.release).toHaveBeenCalled();
        });

        test("deve retornar 403 para usuário sem permissão", async () => {
            queryMock
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({
                    rows: [{
                        id: 10,
                        user_id: 99,
                        status_id: 200,
                        oculto: false
                    }]
                });

            roleRepository.lerPorUser.mockResolvedValue({
                rows: [{ role: "user" }]
            });

            const req = criarReq({
                url: "/pedido/10/cancelar",
                method: "PATCH"
            });
            const res = criarRes();

            await pedidosCancelar(req, res);

            expect(res.statusCode).toBe(403);
            expect(queryMock).toHaveBeenCalledWith("ROLLBACK");
            expect(client.release).toHaveBeenCalled();
        });

        test("deve retornar 409 quando pedido não estiver pendente", async () => {
            queryMock
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({
                    rows: [{
                        id: 10,
                        user_id: 1,
                        status_id: 204,
                        oculto: false
                    }]
                });

            roleRepository.lerPorUser.mockResolvedValue({
                rows: [{ role: "user" }]
            });

            const req = criarReq({
                url: "/pedido/10/cancelar",
                method: "PATCH"
            });
            const res = criarRes();

            await pedidosCancelar(req, res);

            expect(res.statusCode).toBe(409);
            expect(queryMock).toHaveBeenCalledWith("ROLLBACK");
        });

        test("deve retornar 409 quando pedido não possuir produtos", async () => {
            queryMock
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({
                    rows: [{
                        id: 10,
                        user_id: 1,
                        status_id: 200,
                        oculto: false
                    }]
                })
                .mockResolvedValueOnce({ rows: [] });

            roleRepository.lerPorUser.mockResolvedValue({
                rows: [{ role: "user" }]
            });

            const req = criarReq({
                url: "/pedido/10/cancelar",
                method: "PATCH"
            });
            const res = criarRes();

            await pedidosCancelar(req, res);

            expect(res.statusCode).toBe(409);
            expect(queryMock).toHaveBeenCalledWith("ROLLBACK");
        });

        test("deve retornar 500 e desfazer transação se o banco falhar", async () => {
            queryMock
                .mockResolvedValueOnce({ rows: [] })
                .mockRejectedValueOnce(new Error("Falha no banco"))
                .mockResolvedValueOnce({ rows: [] });

            const req = criarReq({
                url: "/pedido/10/cancelar",
                method: "PATCH"
            });
            const res = criarRes();

            await pedidosCancelar(req, res);

            expect(res.statusCode).toBe(500);
            expect(queryMock).toHaveBeenCalledWith("ROLLBACK");
            expect(client.release).toHaveBeenCalled();
        });
    });
});
