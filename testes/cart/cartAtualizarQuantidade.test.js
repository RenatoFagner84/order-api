const cartRepository = require("../../src/repositories/cartRepository");
const cartAtualizarQuantidade = require("../../src/controllers/cart/cartAtualizarQuantidade");

jest.mock("../../src/repositories/cartRepository", () => ({
    consultar: jest.fn(),
    consultarItem: jest.fn(),
    verificarEstoque: jest.fn(),
    atualizarQuantidade: jest.fn()
}));

const criarRequisicao = (opcoes = {}) => {
    const usuario = Object.prototype.hasOwnProperty.call(opcoes, "usuario")
        ? opcoes.usuario
        : { id: 1 };

    const params = Object.prototype.hasOwnProperty.call(opcoes, "params")
        ? opcoes.params
        : { id: "10", produtoId: "5" };

    const body = Object.prototype.hasOwnProperty.call(opcoes, "body")
        ? opcoes.body
        : { quantidade: 3 };

    const dados = Buffer.from(
        typeof body === "string" ? body : JSON.stringify(body)
    );

    return {
        usuario,
        params,
        async *[Symbol.asyncIterator]() {
            if (opcoes.corpoVazio) {
                return;
            }

            yield dados;
        }
    };
};

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

describe("cartAtualizarQuantidade", () => {
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

        cartRepository.consultarItem.mockResolvedValue({
            rows: [{ id: 1, carrinho_id: 10, produto_id: 5, quantidade: 2 }]
        });

        cartRepository.verificarEstoque.mockResolvedValue({
            rows: [{ id: 5, estoque: 10 }]
        });

        cartRepository.atualizarQuantidade.mockResolvedValue({
            rows: [{ id: 1, carrinho_id: 10, produto_id: 5, quantidade: 3 }]
        });

        jest.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("deve atualizar a quantidade e retornar 200", async () => {
        const req = criarRequisicao();
        const res = criarResposta();

        await cartAtualizarQuantidade(req, res);

        expect(res.status).toBe(200);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Quantidade atualizada com sucesso",
            produto: {
                id: 1,
                carrinho_id: 10,
                produto_id: 5,
                quantidade: 3
            }
        });
        expect(cartRepository.consultar).toHaveBeenCalledWith(10);
        expect(cartRepository.consultarItem).toHaveBeenCalledWith(10, 5);
        expect(cartRepository.verificarEstoque).toHaveBeenCalledWith(5, 3);
        expect(cartRepository.atualizarQuantidade).toHaveBeenCalledWith(10, 5, 3);
    });

    it("deve retornar 401 quando o usuário não estiver autenticado", async () => {
        const req = criarRequisicao({ usuario: undefined });
        const res = criarResposta();

        await cartAtualizarQuantidade(req, res);

        expect(res.status).toBe(401);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Usuário não autenticado."
        });
        expect(cartRepository.consultar).not.toHaveBeenCalled();
    });

    it.each([
        undefined,
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

        await cartAtualizarQuantidade(req, res);

        expect(res.status).toBe(401);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Usuário não autenticado."
        });
        expect(cartRepository.consultar).not.toHaveBeenCalled();
    });

    it.each([
        {},
        { id: undefined, produtoId: "5" },
        { id: null, produtoId: "5" },
        { id: "", produtoId: "5" },
        { id: "abc", produtoId: "5" },
        { id: "0", produtoId: "5" },
        { id: "-1", produtoId: "5" },
        { id: "1.5", produtoId: "5" },
        { id: String(Number.MAX_SAFE_INTEGER + 1), produtoId: "5" },
        { id: "10", produtoId: undefined },
        { id: "10", produtoId: null },
        { id: "10", produtoId: "" },
        { id: "10", produtoId: "abc" },
        { id: "10", produtoId: "0" },
        { id: "10", produtoId: "-1" },
        { id: "10", produtoId: "1.5" },
        { id: "10", produtoId: String(Number.MAX_SAFE_INTEGER + 1) }
    ])("deve retornar 400 para IDs inválidos: %j", async (params) => {
        const req = criarRequisicao({ params });
        const res = criarResposta();

        await cartAtualizarQuantidade(req, res);

        expect(res.status).toBe(400);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "ID do carrinho ou do produto inválido."
        });
        expect(cartRepository.consultar).not.toHaveBeenCalled();
    });

    it("deve retornar 400 quando o JSON for inválido", async () => {
        const req = criarRequisicao({ body: "{" });
        const res = criarResposta();

        await cartAtualizarQuantidade(req, res);

        expect(res.status).toBe(400);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Corpo da requisição JSON inválido."
        });
    });

    it.each([
        null,
        [],
        "texto",
        123,
        true
    ])("deve retornar 400 quando o corpo não for um objeto: %j", async (body) => {
        const req = criarRequisicao({
            body: JSON.stringify(body)
        });
        const res = criarResposta();

        await cartAtualizarQuantidade(req, res);

        expect(res.status).toBe(400);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "O corpo da requisição deve ser um objeto JSON."
        });
        expect(cartRepository.consultar).not.toHaveBeenCalled();
    });

    it.each([
        {},
        { quantidade: undefined },
        { quantidade: null },
        { quantidade: "" },
        { quantidade: "abc" },
        { quantidade: 0 },
        { quantidade: -1 },
        { quantidade: 1.5 },
        { quantidade: Number.MAX_SAFE_INTEGER + 1 }
    ])("deve retornar 400 para quantidade inválida: %j", async (body) => {
        const req = criarRequisicao({ body });
        const res = criarResposta();

        await cartAtualizarQuantidade(req, res);

        expect(res.status).toBe(400);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Informe uma quantidade válida."
        });
        expect(cartRepository.consultar).not.toHaveBeenCalled();
    });

    it("deve retornar 400 quando o corpo estiver vazio", async () => {
        const req = criarRequisicao({ corpoVazio: true });
        const res = criarResposta();

        await cartAtualizarQuantidade(req, res);

        expect(res.status).toBe(400);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Informe uma quantidade válida."
        });
    });

    it("deve retornar 413 quando o corpo exceder 1 MB", async () => {
        const req = {
            usuario: { id: 1 },
            params: { id: "10", produtoId: "5" },
            async *[Symbol.asyncIterator]() {
                yield Buffer.alloc(1024 * 1024 + 1, "a");
            }
        };

        const res = criarResposta();

        await cartAtualizarQuantidade(req, res);

        expect(res.status).toBe(413);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Corpo da requisição muito grande."
        });
        expect(cartRepository.consultar).not.toHaveBeenCalled();
    });

    it("deve retornar 404 quando o carrinho não existir", async () => {
        cartRepository.consultar.mockResolvedValue({ rows: [] });

        const req = criarRequisicao();
        const res = criarResposta();

        await cartAtualizarQuantidade(req, res);

        expect(res.status).toBe(404);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Carrinho não encontrado."
        });
        expect(cartRepository.consultarItem).not.toHaveBeenCalled();
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

        await cartAtualizarQuantidade(req, res);

        expect(res.status).toBe(403);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Você não tem permissão para alterar este carrinho."
        });
        expect(cartRepository.consultarItem).not.toHaveBeenCalled();
    });

    it.each([
        { id: 10, user_id: 1, status: "fechado", oculto: false },
        { id: 10, user_id: 1, status: "finalizado", oculto: false },
        { id: 10, user_id: 1, status: "aberto", oculto: true }
    ])("deve retornar 409 quando o carrinho não estiver disponível: %j", async (carrinho) => {
        cartRepository.consultar.mockResolvedValue({
            rows: [carrinho]
        });

        const req = criarRequisicao();
        const res = criarResposta();

        await cartAtualizarQuantidade(req, res);

        expect(res.status).toBe(409);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Este carrinho não está disponível para alterações."
        });
        expect(cartRepository.consultarItem).not.toHaveBeenCalled();
    });

    it("deve retornar 404 quando o produto não estiver no carrinho", async () => {
        cartRepository.consultarItem.mockResolvedValue({ rows: [] });

        const req = criarRequisicao();
        const res = criarResposta();

        await cartAtualizarQuantidade(req, res);

        expect(res.status).toBe(404);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Produto não encontrado no carrinho."
        });
        expect(cartRepository.verificarEstoque).not.toHaveBeenCalled();
    });

    it("deve retornar 400 quando o estoque for insuficiente", async () => {
        cartRepository.verificarEstoque.mockResolvedValue({ rows: [] });

        const req = criarRequisicao();
        const res = criarResposta();

        await cartAtualizarQuantidade(req, res);

        expect(res.status).toBe(400);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Produto inexistente ou estoque insuficiente para a quantidade solicitada."
        });
        expect(cartRepository.atualizarQuantidade).not.toHaveBeenCalled();
    });

    it("deve retornar 404 quando a atualização não encontrar o produto", async () => {
        cartRepository.atualizarQuantidade.mockResolvedValue({ rows: [] });

        const req = criarRequisicao();
        const res = criarResposta();

        await cartAtualizarQuantidade(req, res);

        expect(res.status).toBe(404);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Produto não encontrado no carrinho."
        });
    });

    it("deve retornar 500 quando o repositório lançar um erro", async () => {
        cartRepository.consultar.mockRejectedValue(new Error("Erro no banco"));

        const req = criarRequisicao();
        const res = criarResposta();

        await cartAtualizarQuantidade(req, res);

        expect(res.status).toBe(500);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Erro interno ao atualizar a quantidade do produto."
        });
    });

    it("não deve enviar outra resposta se a resposta já tiver terminado", async () => {
        const req = criarRequisicao();
        const res = criarResposta({ writableEnded: true });

        await cartAtualizarQuantidade(req, res);

        expect(res.writeHead).not.toHaveBeenCalled();
        expect(res.end).not.toHaveBeenCalled();
    });
});