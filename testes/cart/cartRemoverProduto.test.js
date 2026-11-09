
jest.mock("../../src/repositories/cartRepository", () => ({
    consultar: jest.fn(),
    removerProduto: jest.fn()
}));

const cartRepository = require("../../src/repositories/cartRepository");
const cartRemoverProduto = require("../../src/controllers/cart/cartRemoverProduto");

const criarRequisicao = (opcoes = {}) => ({
    usuario: Object.prototype.hasOwnProperty.call(opcoes, "usuario")
        ? opcoes.usuario
        : { id: 1 },
    params: Object.prototype.hasOwnProperty.call(opcoes, "params")
        ? opcoes.params
        : { id: "10", produtoId: "20" }
});

const criarResposta = (opcoes = {}) => {
    const res = {
        status: null,
        headers: null,
        body: "",
        writableEnded: opcoes.writableEnded ?? false,
        writeHead: jest.fn((status, headers) => {
            res.status = status;
            res.headers = headers;
        }),
        end: jest.fn((body = "") => {
            res.body = body;
            res.writableEnded = true;
        })
    };

    return res;
};

describe("cartRemoverProduto", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        cartRepository.consultar.mockResolvedValue({
            rows: [
                {
                    id: 10,
                    user_id: 1,
                    status: "aberto",
                    oculto: false
                }
            ]
        });

        cartRepository.removerProduto.mockResolvedValue({
            rows: [{ id: 20 }]
        });

        jest.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("deve remover o produto do carrinho e retornar 200", async () => {
        const req = criarRequisicao();
        const res = criarResposta();

        await cartRemoverProduto(req, res);

        expect(res.status).toBe(200);
        expect(res.headers).toEqual({
            "Content-Type": "application/json; charset=utf-8"
        });
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Produto removido do carrinho com sucesso."
        });
        expect(cartRepository.consultar).toHaveBeenCalledWith(10);
        expect(cartRepository.removerProduto).toHaveBeenCalledWith(10, 20);
    });

    it("deve retornar 401 quando o usuário não estiver autenticado", async () => {
        const req = criarRequisicao({ usuario: undefined });
        const res = criarResposta();

        await cartRemoverProduto(req, res);

        expect(res.status).toBe(401);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Usuário não autenticado."
        });
        expect(cartRepository.consultar).not.toHaveBeenCalled();
        expect(cartRepository.removerProduto).not.toHaveBeenCalled();
    });

    it.each([
        null,
        {},
        { id: undefined },
        { id: null },
        { id: "" },
        { id: "abc" },
        { id: 0 },
        { id: -1 },
        { id: 1.5 },
        { id: Number.MAX_SAFE_INTEGER + 1 }
    ])("deve retornar 401 para usuário inválido: %j", async (usuario) => {
        const req = criarRequisicao({ usuario });
        const res = criarResposta();

        await cartRemoverProduto(req, res);

        expect(res.status).toBe(401);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Usuário não autenticado."
        });
        expect(cartRepository.consultar).not.toHaveBeenCalled();
    });

    it("deve aceitar o ID do usuário como string numérica", async () => {
        const req = criarRequisicao({
            usuario: { id: "5" }
        });
        const res = criarResposta();

        cartRepository.consultar.mockResolvedValue({
            rows: [
                {
                    id: 10,
                    user_id: 5,
                    status: "aberto",
                    oculto: false
                }
            ]
        });

        await cartRemoverProduto(req, res);

        expect(res.status).toBe(200);
        expect(cartRepository.removerProduto).toHaveBeenCalledWith(10, 20);
    });

    it.each([
        { id: "abc", produtoId: "20" },
        { id: "0", produtoId: "20" },
        { id: "-1", produtoId: "20" },
        { id: "1.5", produtoId: "20" },
        { id: "10", produtoId: "abc" },
        { id: "10", produtoId: "0" },
        { id: "10", produtoId: "-1" },
        { id: "10", produtoId: "2.5" },
        {},
        { id: "10" },
        { produtoId: "20" },
        null,
        undefined
    ])("deve retornar 400 para IDs inválidos: %j", async (params) => {
        const req = criarRequisicao({ params });
        const res = criarResposta();

        await cartRemoverProduto(req, res);

        expect(res.status).toBe(400);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "ID do carrinho ou do produto inválido."
        });
        expect(cartRepository.consultar).not.toHaveBeenCalled();
        expect(cartRepository.removerProduto).not.toHaveBeenCalled();
    });

    it("deve retornar 404 quando o carrinho não existir", async () => {
        cartRepository.consultar.mockResolvedValue({ rows: [] });

        const req = criarRequisicao();
        const res = criarResposta();

        await cartRemoverProduto(req, res);

        expect(res.status).toBe(404);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Carrinho não encontrado."
        });
        expect(cartRepository.removerProduto).not.toHaveBeenCalled();
    });

    it("deve retornar 403 quando o carrinho pertencer a outro usuário", async () => {
        cartRepository.consultar.mockResolvedValue({
            rows: [
                {
                    id: 10,
                    user_id: 2,
                    status: "aberto",
                    oculto: false
                }
            ]
        });

        const req = criarRequisicao();
        const res = criarResposta();

        await cartRemoverProduto(req, res);

        expect(res.status).toBe(403);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Você não tem permissão para alterar este carrinho."
        });
        expect(cartRepository.removerProduto).not.toHaveBeenCalled();
    });

    it("deve retornar 409 quando o carrinho estiver oculto", async () => {
        cartRepository.consultar.mockResolvedValue({
            rows: [
                {
                    id: 10,
                    user_id: 1,
                    status: "aberto",
                    oculto: true
                }
            ]
        });

        const req = criarRequisicao();
        const res = criarResposta();

        await cartRemoverProduto(req, res);

        expect(res.status).toBe(409);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Este carrinho não está disponível para alterações."
        });
        expect(cartRepository.removerProduto).not.toHaveBeenCalled();
    });

    it.each([
        "finalizado",
        "cancelado",
        "fechado",
        "",
        null,
        undefined
    ])("deve retornar 409 quando o status for %j", async (status) => {
        cartRepository.consultar.mockResolvedValue({
            rows: [
                {
                    id: 10,
                    user_id: 1,
                    status,
                    oculto: false
                }
            ]
        });

        const req = criarRequisicao();
        const res = criarResposta();

        await cartRemoverProduto(req, res);

        expect(res.status).toBe(409);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Este carrinho não está disponível para alterações."
        });
        expect(cartRepository.removerProduto).not.toHaveBeenCalled();
    });

    it("deve aceitar o status aberto independentemente de maiúsculas", async () => {
        cartRepository.consultar.mockResolvedValue({
            rows: [
                {
                    id: 10,
                    user_id: 1,
                    status: "ABERTO",
                    oculto: false
                }
            ]
        });

        const req = criarRequisicao();
        const res = criarResposta();

        await cartRemoverProduto(req, res);

        expect(res.status).toBe(200);
        expect(cartRepository.removerProduto).toHaveBeenCalledWith(10, 20);
    });

    it("deve retornar 404 quando o produto não estiver no carrinho", async () => {
        cartRepository.removerProduto.mockResolvedValue({ rows: [] });

        const req = criarRequisicao();
        const res = criarResposta();

        await cartRemoverProduto(req, res);

        expect(res.status).toBe(404);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Produto do carrinho não encontrado."
        });
    });

    it("deve retornar 404 quando o resultado da remoção não tiver rows", async () => {
        cartRepository.removerProduto.mockResolvedValue({});

        const req = criarRequisicao();
        const res = criarResposta();

        await cartRemoverProduto(req, res);

        expect(res.status).toBe(404);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Produto do carrinho não encontrado."
        });
    });

    it("deve retornar 500 quando a consulta do carrinho falhar", async () => {
        cartRepository.consultar.mockRejectedValue(new Error("Erro no banco"));

        const req = criarRequisicao();
        const res = criarResposta();

        await cartRemoverProduto(req, res);

        expect(res.status).toBe(500);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Erro interno ao remover produto do carrinho."
        });
        expect(console.error).toHaveBeenCalledWith(
            "[ERRO AO REMOVER PRODUTO DO CARRINHO]",
            expect.any(Error)
        );
    });

    it("deve retornar 500 quando a remoção do produto falhar", async () => {
        cartRepository.removerProduto.mockRejectedValue(
            new Error("Erro no banco")
        );

        const req = criarRequisicao();
        const res = criarResposta();

        await cartRemoverProduto(req, res);

        expect(res.status).toBe(500);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Erro interno ao remover produto do carrinho."
        });
        expect(console.error).toHaveBeenCalledWith(
            "[ERRO AO REMOVER PRODUTO DO CARRINHO]",
            expect.any(Error)
        );
    });

    it("não deve enviar outra resposta quando ela já tiver terminado", async () => {
        cartRepository.consultar.mockRejectedValue(new Error("Erro no banco"));

        const req = criarRequisicao();
        const res = criarResposta({ writableEnded: true });

        await cartRemoverProduto(req, res);

        expect(res.writeHead).not.toHaveBeenCalled();
        expect(res.end).not.toHaveBeenCalled();
    });
});
