jest.mock("../../src/repositories/pedidosRepository", () => ({
    consultar: jest.fn(),
    consultarProdutos: jest.fn(),
    consultarTodosProdutos: jest.fn()
}));

jest.mock("../../src/repositories/roleRepository", () => ({
    lerPorUser: jest.fn()
}));

jest.mock("../../src/repositories/userRepository", () => ({
    ler: jest.fn()
}));

const pedidosRepository = require("../../src/repositories/pedidosRepository");
const roleRepository = require("../../src/repositories/roleRepository");
const userRepository = require("../../src/repositories/userRepository");
const pedidosConsultar = require("../../src/controllers/pedidos/pedidosConsultar");

const criarReq = (url, usuario = { id: 1 }) => ({
    url,
    usuario
});

const criarRes = () => {
    const res = {
        writableEnded: false,
        headersSent: false,
        status: null,
        headers: null,
        body: null,
        writeHead: jest.fn((status, headers) => {
            res.status = status;
            res.headers = headers;
            res.headersSent = true;
        }),
        end: jest.fn((dados) => {
            res.body = dados;
            res.writableEnded = true;
        })
    };

    return res;
};

const lerResposta = (res) => JSON.parse(res.body);

describe("pedidosConsultar", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, "error").mockImplementation(() => {});

        userRepository.ler.mockResolvedValue({
            rows: [{ id: 1 }]
        });

        roleRepository.lerPorUser.mockResolvedValue({
            rows: []
        });

        pedidosRepository.consultar.mockResolvedValue({
            rows: [{
                id: 10,
                user_id: 1,
                status: 1
            }]
        });

        pedidosRepository.consultarProdutos.mockResolvedValue({
            rows: [{
                produto_id: 5,
                quantidade: 2
            }]
        });

        pedidosRepository.consultarTodosProdutos.mockResolvedValue({
            rows: [{
                pedido_id: 10,
                produto_id: 5
            }]
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test("retornar 401 quando o usuário não estiver autenticado", async () => {
        const req = criarReq("/pedido/10", null);
        const res = criarRes();

        await pedidosConsultar(req, res);

        expect(res.status).toBe(401);
        expect(lerResposta(res)).toEqual({
            mensagem: "Usuário não autenticado."
        });
        expect(userRepository.ler).not.toHaveBeenCalled();
    });

    test("retornar 401 quando o ID do usuário for inválido", async () => {
        const req = criarReq("/pedido/10", { id: 0 });
        const res = criarRes();

        await pedidosConsultar(req, res);

        expect(res.status).toBe(401);
        expect(lerResposta(res)).toEqual({
            mensagem: "Usuário não autenticado."
        });
        expect(userRepository.ler).not.toHaveBeenCalled();
    });

    test("retornar 401 quando o usuário não existir ou estiver inativo", async () => {
        userRepository.ler.mockResolvedValue({ rows: [] });

        const req = criarReq("/pedido/10");
        const res = criarRes();

        await pedidosConsultar(req, res);

        expect(res.status).toBe(401);
        expect(lerResposta(res)).toEqual({
            mensagem: "Usuário não autenticado ou conta inativa."
        });
    });

    test("retornar 400 quando o ID do pedido for inválido", async () => {
        const req = criarReq("/pedido/abc");
        const res = criarRes();

        await pedidosConsultar(req, res);

        expect(res.status).toBe(400);
        expect(lerResposta(res)).toEqual({
            mensagem: "ID do pedido inválido."
        });
        expect(pedidosRepository.consultar).not.toHaveBeenCalled();
    });

    test("retornar 400 quando o ID do pedido for zero", async () => {
        const req = criarReq("/pedido/0");
        const res = criarRes();

        await pedidosConsultar(req, res);

        expect(res.status).toBe(400);
        expect(lerResposta(res)).toEqual({
            mensagem: "ID do pedido inválido."
        });
    });

    test("retornar 404 quando o pedido não existir", async () => {
        pedidosRepository.consultar.mockResolvedValue({ rows: [] });

        const req = criarReq("/pedido/10");
        const res = criarRes();

        await pedidosConsultar(req, res);

        expect(res.status).toBe(404);
        expect(lerResposta(res)).toEqual({
            mensagem: "Pedido não encontrado."
        });
    });

    test("consultar o próprio pedido com seus produtos", async () => {
        const req = criarReq("/pedido/10");
        const res = criarRes();

        await pedidosConsultar(req, res);

        expect(res.status).toBe(200);
        expect(lerResposta(res)).toEqual({
            id: 10,
            user_id: 1,
            status: 1,
            produtos: [{
                produto_id: 5,
                quantidade: 2
            }]
        });

        expect(pedidosRepository.consultar).toHaveBeenCalledWith(10);
        expect(pedidosRepository.consultarProdutos).toHaveBeenCalledWith(10);
        expect(roleRepository.lerPorUser).not.toHaveBeenCalled();
    });

    test("consultar somente os produtos de um pedido", async () => {
        const req = criarReq("/pedido/10/produtos");
        const res = criarRes();

        await pedidosConsultar(req, res);

        expect(res.status).toBe(200);
        expect(lerResposta(res)).toEqual([{
            produto_id: 5,
            quantidade: 2
        }]);

        expect(pedidosRepository.consultar).toHaveBeenCalledWith(10);
        expect(pedidosRepository.consultarProdutos).toHaveBeenCalledWith(10);
    });

    test("retornar 403 quando usuário comum tentar consultar pedido de outra pessoa", async () => {
        pedidosRepository.consultar.mockResolvedValue({
            rows: [{
                id: 10,
                user_id: 2,
                status: 1
            }]
        });

        roleRepository.lerPorUser.mockResolvedValue({
            rows: [{ role: "user" }]
        });

        const req = criarReq("/pedido/10");
        const res = criarRes();

        await pedidosConsultar(req, res);

        expect(res.status).toBe(403);
        expect(lerResposta(res)).toEqual({
            mensagem: "Você não tem permissão para consultar este pedido."
        });
        expect(pedidosRepository.consultarProdutos).not.toHaveBeenCalled();
    });

    test.each(["admin", "manager", "sac"])(
        "permitir que o perfil %s consulte pedido de outra pessoa",
        async (role) => {
            pedidosRepository.consultar.mockResolvedValue({
                rows: [{
                    id: 10,
                    user_id: 2,
                    status: 1
                }]
            });

            roleRepository.lerPorUser.mockResolvedValue({
                rows: [{ role }]
            });

            const req = criarReq("/pedido/10");
            const res = criarRes();

            await pedidosConsultar(req, res);

            expect(res.status).toBe(200);
            expect(pedidosRepository.consultarProdutos).toHaveBeenCalledWith(10);
        }
    );

    test("retornar 403 quando usuário comum tentar consultar todos os produtos dos pedidos", async () => {
        roleRepository.lerPorUser.mockResolvedValue({
            rows: [{ role: "user" }]
        });

        const req = criarReq("/pedido/produtos");
        const res = criarRes();

        await pedidosConsultar(req, res);

        expect(res.status).toBe(403);
        expect(lerResposta(res)).toEqual({
            mensagem: "Você não tem permissão para consultar todos os produtos dos pedidos."
        });
        expect(pedidosRepository.consultarTodosProdutos).not.toHaveBeenCalled();
    });

    test.each(["admin", "manager"])(
        "permitir que o perfil %s consulte todos os produtos dos pedidos",
        async (role) => {
            roleRepository.lerPorUser.mockResolvedValue({
                rows: [{ role }]
            });

            const req = criarReq("/pedido/produtos");
            const res = criarRes();

            await pedidosConsultar(req, res);

            expect(res.status).toBe(200);
            expect(lerResposta(res)).toEqual([{
                pedido_id: 10,
                produto_id: 5
            }]);

            expect(pedidosRepository.consultarTodosProdutos).toHaveBeenCalledTimes(1);
        }
    );

    test("aceitar perfis com espaços e letras maiúsculas", async () => {
        roleRepository.lerPorUser.mockResolvedValue({
            rows: [{ role: " ADMIN " }]
        });

        const req = criarReq("/pedido/produtos");
        const res = criarRes();

        await pedidosConsultar(req, res);

        expect(res.status).toBe(200);
        expect(pedidosRepository.consultarTodosProdutos).toHaveBeenCalledTimes(1);
    });

    test("retornar 500 quando ocorrer erro ao consultar o usuário", async () => {
        userRepository.ler.mockRejectedValue(new Error("Erro no banco"));

        const req = criarReq("/pedido/10");
        const res = criarRes();

        await pedidosConsultar(req, res);

        expect(res.status).toBe(500);
        expect(lerResposta(res)).toEqual({
            mensagem: "Erro interno ao consultar o pedido."
        });
    });

    test("retornar 500 quando ocorrer erro ao consultar o pedido", async () => {
        pedidosRepository.consultar.mockRejectedValue(new Error("Erro no banco"));

        const req = criarReq("/pedido/10");
        const res = criarRes();

        await pedidosConsultar(req, res);

        expect(res.status).toBe(500);
        expect(lerResposta(res)).toEqual({
            mensagem: "Erro interno ao consultar o pedido."
        });
    });

    test("retornar 500 quando ocorrer erro ao consultar os produtos do pedido", async () => {
        pedidosRepository.consultarProdutos.mockRejectedValue(
            new Error("Erro no banco")
        );

        const req = criarReq("/pedido/10");
        const res = criarRes();

        await pedidosConsultar(req, res);

        expect(res.status).toBe(500);
        expect(lerResposta(res)).toEqual({
            mensagem: "Erro interno ao consultar o pedido."
        });
    });

    test("retornar 500 quando ocorrer erro ao consultar todos os produtos", async () => {
        roleRepository.lerPorUser.mockResolvedValue({
            rows: [{ role: "admin" }]
        });

        pedidosRepository.consultarTodosProdutos.mockRejectedValue(
            new Error("Erro no banco")
        );

        const req = criarReq("/pedido/produtos");
        const res = criarRes();

        await pedidosConsultar(req, res);

        expect(res.status).toBe(500);
        expect(lerResposta(res)).toEqual({
            mensagem: "Erro interno ao consultar o pedido."
        });
    });
});
