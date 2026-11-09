
const { Readable } = require("stream");

jest.mock("../../src/repositories/pedidosRepository", () => ({
    consultar: jest.fn(),
    atualizar: jest.fn(),
    atualizarProduto: jest.fn()
}));

jest.mock("../../src/repositories/roleRepository", () => ({
    lerPorUser: jest.fn()
}));

jest.mock("../../src/repositories/statusRepository", () => ({
    consultarStatus: jest.fn()
}));

const pedidosRepository = require("../../src/repositories/pedidosRepository");
const roleRepository = require("../../src/repositories/roleRepository");
const statusRepository = require("../../src/repositories/statusRepository");
const pedidosAtualizar = require("../../src/controllers/pedidos/pedidosAtualizar");

const criarReq = ({
    url = "/pedido/10",
    method = "PUT",
    usuarioId = 1,
    body = {}
} = {}) => {
    const req = Readable.from([
        typeof body === "string" ? body : JSON.stringify(body)
    ]);

    req.url = url;
    req.method = method;
    req.usuario = usuarioId === null ? undefined : { id: usuarioId };

    return req;
};

const criarRes = () => {
    const res = {
        writableEnded: false,
        headersSent: false,
        statusCode: null,
        body: null,
        writeHead: jest.fn((status, headers) => {
            res.statusCode = status;
            res.headersSent = true;
            res.headers = headers;
        }),
        end: jest.fn((body) => {
            res.body = body;
            res.writableEnded = true;
        })
    };

    return res;
};

const lerResposta = (res) => JSON.parse(res.body);

describe("pedidosAtualizar", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("atualização de produto do pedido", () => {
        const bodyProduto = {
            quantidade: 3,
            valor_unitario: 12.5
        };

        const pedidoPendente = {
            id: 10,
            user_id: 1,
            status_id: 200,
            oculto: false
        };

        test("deve atualizar um produto do pedido com sucesso", async () => {
            pedidosRepository.consultar.mockResolvedValue({
                rows: [pedidoPendente]
            });

            pedidosRepository.atualizarProduto.mockResolvedValue({
                rows: [{
                    pedido_id: 10,
                    produto_id: 5,
                    quantidade: 3,
                    valor_unitario: 12.5
                }]
            });

            const req = criarReq({
                url: "/pedido/10/produtos/5",
                body: bodyProduto
            });
            const res = criarRes();

            await pedidosAtualizar(req, res);

            expect(res.statusCode).toBe(200);
            expect(lerResposta(res)).toEqual({
                pedido_id: 10,
                produto_id: 5,
                quantidade: 3,
                valor_unitario: 12.5
            });

            expect(pedidosRepository.atualizarProduto).toHaveBeenCalledWith(
                10,
                5,
                3,
                12.5
            );
        });

        test("deve retornar 401 se o usuário não estiver autenticado", async () => {
            const req = criarReq({
                url: "/pedido/10/produtos/5",
                usuarioId: null,
                body: bodyProduto
            });
            const res = criarRes();

            await pedidosAtualizar(req, res);

            expect(res.statusCode).toBe(401);
            expect(lerResposta(res).mensagem).toBe(
                "Usuário não autenticado."
            );
            expect(pedidosRepository.consultar).not.toHaveBeenCalled();
        });

        test("deve retornar 400 para quantidade inválida", async () => {
            const req = criarReq({
                url: "/pedido/10/produtos/5",
                body: {
                    quantidade: 0,
                    valor_unitario: 12.5
                }
            });
            const res = criarRes();

            await pedidosAtualizar(req, res);

            expect(res.statusCode).toBe(400);
            expect(lerResposta(res).mensagem).toBe(
                "Informe quantidade e valor unitário válidos."
            );
            expect(pedidosRepository.consultar).not.toHaveBeenCalled();
        });

        test("deve retornar 400 para valor unitário negativo", async () => {
            const req = criarReq({
                url: "/pedido/10/produtos/5",
                body: {
                    quantidade: 2,
                    valor_unitario: -1
                }
            });
            const res = criarRes();

            await pedidosAtualizar(req, res);

            expect(res.statusCode).toBe(400);
            expect(pedidosRepository.consultar).not.toHaveBeenCalled();
        });

        test("deve retornar 404 se o pedido não existir", async () => {
            pedidosRepository.consultar.mockResolvedValue({
                rows: []
            });

            const req = criarReq({
                url: "/pedido/10/produtos/5",
                body: bodyProduto
            });
            const res = criarRes();

            await pedidosAtualizar(req, res);

            expect(res.statusCode).toBe(404);
            expect(lerResposta(res).mensagem).toBe(
                "Pedido não encontrado."
            );
            expect(pedidosRepository.atualizarProduto).not.toHaveBeenCalled();
        });

        test("deve negar alteração de pedido alheio para usuário comum", async () => {
            pedidosRepository.consultar.mockResolvedValue({
                rows: [{
                    ...pedidoPendente,
                    user_id: 99
                }]
            });

            roleRepository.lerPorUser.mockResolvedValue({
                rows: [{ role: "user" }]
            });

            const req = criarReq({
                url: "/pedido/10/produtos/5",
                usuarioId: 1,
                body: bodyProduto
            });
            const res = criarRes();

            await pedidosAtualizar(req, res);

            expect(res.statusCode).toBe(403);
            expect(lerResposta(res).mensagem).toBe(
                "Você não tem permissão para alterar este pedido."
            );
            expect(pedidosRepository.atualizarProduto).not.toHaveBeenCalled();
        });

        test("deve permitir que admin altere produto de pedido alheio", async () => {
            pedidosRepository.consultar.mockResolvedValue({
                rows: [{
                    ...pedidoPendente,
                    user_id: 99
                }]
            });

            roleRepository.lerPorUser.mockResolvedValue({
                rows: [{ role: " ADMIN " }]
            });

            pedidosRepository.atualizarProduto.mockResolvedValue({
                rows: [{
                    pedido_id: 10,
                    produto_id: 5,
                    quantidade: 3,
                    valor_unitario: 12.5
                }]
            });

            const req = criarReq({
                url: "/pedido/10/produtos/5",
                usuarioId: 1,
                body: bodyProduto
            });
            const res = criarRes();

            await pedidosAtualizar(req, res);

            expect(res.statusCode).toBe(200);
            expect(pedidosRepository.atualizarProduto).toHaveBeenCalled();
        });

        test("deve retornar 409 se o pedido não estiver pendente", async () => {
            pedidosRepository.consultar.mockResolvedValue({
                rows: [{
                    ...pedidoPendente,
                    status_id: 204
                }]
            });

            const req = criarReq({
                url: "/pedido/10/produtos/5",
                body: bodyProduto
            });
            const res = criarRes();

            await pedidosAtualizar(req, res);

            expect(res.statusCode).toBe(409);
            expect(lerResposta(res).mensagem).toBe(
                "Não é possível alterar os produtos deste pedido."
            );
            expect(pedidosRepository.atualizarProduto).not.toHaveBeenCalled();
        });

        test("deve retornar 404 se o produto não pertencer ao pedido", async () => {
            pedidosRepository.consultar.mockResolvedValue({
                rows: [pedidoPendente]
            });

            pedidosRepository.atualizarProduto.mockResolvedValue({
                rows: []
            });

            const req = criarReq({
                url: "/pedido/10/produtos/5",
                body: bodyProduto
            });
            const res = criarRes();

            await pedidosAtualizar(req, res);

            expect(res.statusCode).toBe(404);
            expect(lerResposta(res).mensagem).toBe(
                "Produto não encontrado neste pedido."
            );
        });

        test("deve retornar 400 para JSON inválido", async () => {
            const req = criarReq({
                url: "/pedido/10/produtos/5",
                body: "{"
            });
            const res = criarRes();

            await pedidosAtualizar(req, res);

            expect(res.statusCode).toBe(400);
            expect(lerResposta(res).mensagem).toBe("JSON inválido.");
        });

        test("deve retornar 500 se o repository falhar", async () => {
            pedidosRepository.consultar.mockRejectedValue(
                new Error("Falha no banco")
            );

            const req = criarReq({
                url: "/pedido/10/produtos/5",
                body: bodyProduto
            });
            const res = criarRes();

            await pedidosAtualizar(req, res);

            expect(res.statusCode).toBe(500);
            expect(lerResposta(res).mensagem).toBe(
                "Erro interno ao atualizar o produto do pedido."
            );
        });
    });

    describe("atualização do status do pedido", () => {
        const pedido = {
            id: 10,
            user_id: 1,
            status_id: 200,
            oculto: false
        };

        test("deve atualizar o status com sucesso para admin", async () => {
            pedidosRepository.consultar.mockResolvedValue({
                rows: [pedido]
            });

            roleRepository.lerPorUser.mockResolvedValue({
                rows: [{ role: "admin" }]
            });

            statusRepository.consultarStatus.mockResolvedValue({
                rows: [{ id: 201, nome: "Em processamento" }]
            });

            pedidosRepository.atualizar.mockResolvedValue({
                rows: [{
                    ...pedido,
                    status_id: 201
                }]
            });

            const req = criarReq({
                url: "/pedido/10",
                body: { status_id: 201 }
            });
            const res = criarRes();

            await pedidosAtualizar(req, res);

            expect(res.statusCode).toBe(200);
            expect(lerResposta(res)).toEqual({
                mensagem: "Pedido atualizado com sucesso.",
                pedido: {
                    ...pedido,
                    status_id: 201
                }
            });

            expect(pedidosRepository.atualizar).toHaveBeenCalledWith(10, 201);
        });

        test("deve retornar 400 para status_id inválido", async () => {
            const req = criarReq({
                url: "/pedido/10",
                body: { status_id: 0 }
            });
            const res = criarRes();

            await pedidosAtualizar(req, res);

            expect(res.statusCode).toBe(400);
            expect(lerResposta(res).mensagem).toBe(
                "Informe um status_id válido."
            );
            expect(pedidosRepository.consultar).not.toHaveBeenCalled();
        });

        test("deve retornar 403 se usuário comum tentar alterar o status", async () => {
            pedidosRepository.consultar.mockResolvedValue({
                rows: [pedido]
            });

            roleRepository.lerPorUser.mockResolvedValue({
                rows: [{ role: "user" }]
            });

            const req = criarReq({
                url: "/pedido/10",
                body: { status_id: 201 }
            });
            const res = criarRes();

            await pedidosAtualizar(req, res);

            expect(res.statusCode).toBe(403);
            expect(lerResposta(res).mensagem).toBe(
                "Somente admin ou manager pode alterar o status de pedidos."
            );
            expect(statusRepository.consultarStatus).not.toHaveBeenCalled();
        });

        test("deve retornar 400 se o status não existir", async () => {
            pedidosRepository.consultar.mockResolvedValue({
                rows: [pedido]
            });

            roleRepository.lerPorUser.mockResolvedValue({
                rows: [{ role: "manager" }]
            });

            statusRepository.consultarStatus.mockResolvedValue({
                rows: []
            });

            const req = criarReq({
                url: "/pedido/10",
                body: { status_id: 999 }
            });
            const res = criarRes();

            await pedidosAtualizar(req, res);

            expect(res.statusCode).toBe(400);
            expect(lerResposta(res).mensagem).toBe(
                "O status informado não existe."
            );
            expect(pedidosRepository.atualizar).not.toHaveBeenCalled();
        });

        test("deve retornar 404 se o pedido não existir", async () => {
            pedidosRepository.consultar.mockResolvedValue({
                rows: []
            });

            const req = criarReq({
                url: "/pedido/10",
                body: { status_id: 201 }
            });
            const res = criarRes();

            await pedidosAtualizar(req, res);

            expect(res.statusCode).toBe(404);
            expect(lerResposta(res).mensagem).toBe(
                "Pedido não encontrado."
            );
        });

        test("deve retornar 409 se o pedido estiver oculto", async () => {
            pedidosRepository.consultar.mockResolvedValue({
                rows: [{
                    ...pedido,
                    oculto: true
                }]
            });

            roleRepository.lerPorUser.mockResolvedValue({
                rows: [{ role: "admin" }]
            });

            statusRepository.consultarStatus.mockResolvedValue({
                rows: [{ id: 201 }]
            });

            const req = criarReq({
                url: "/pedido/10",
                body: { status_id: 201 }
            });
            const res = criarRes();

            await pedidosAtualizar(req, res);

            expect(res.statusCode).toBe(409);
            expect(lerResposta(res).mensagem).toBe(
                "Não é possível alterar um pedido oculto."
            );
            expect(pedidosRepository.atualizar).not.toHaveBeenCalled();
        });

        test("deve retornar 409 se o repository não atualizar o pedido", async () => {
            pedidosRepository.consultar.mockResolvedValue({
                rows: [pedido]
            });

            roleRepository.lerPorUser.mockResolvedValue({
                rows: [{ role: "manager" }]
            });

            statusRepository.consultarStatus.mockResolvedValue({
                rows: [{ id: 201 }]
            });

            pedidosRepository.atualizar.mockResolvedValue({
                rows: []
            });

            const req = criarReq({
                url: "/pedido/10",
                body: { status_id: 201 }
            });
            const res = criarRes();

            await pedidosAtualizar(req, res);

            expect(res.statusCode).toBe(409);
            expect(lerResposta(res).mensagem).toBe(
                "O pedido não foi atualizado. Verifique seu status atual."
            );
        });
    });
});

