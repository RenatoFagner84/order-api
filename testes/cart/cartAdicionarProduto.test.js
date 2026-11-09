
jest.mock("../../src/repositories/cartRepository", () => ({
    consultar: jest.fn(),
    consultarItem: jest.fn(),
    verificarEstoque: jest.fn(),
    adicionarProduto: jest.fn()
}));

const cartRepository = require("../../src/repositories/cartRepository");
const cartAdicionarProduto = require("../../src/controllers/cart/cartAdicionarProduto");

const criarRequisicao = (opcoes = {}) => {
    const usuario = Object.prototype.hasOwnProperty.call(opcoes, "usuario")
        ? opcoes.usuario
        : { id: 1 };

    const params = Object.prototype.hasOwnProperty.call(opcoes, "params")
        ? opcoes.params
        : { id: "10" };

    const body = Object.prototype.hasOwnProperty.call(opcoes, "body")
        ? opcoes.body
        : { produto_id: 5, quantidade: 2 };

    const dados = Buffer.from(
        typeof body === "string" ? body : JSON.stringify(body)
    );

    return {
        usuario,
        params,
        async *[Symbol.asyncIterator]() {
            if (opcoes.corpoVazio) return;
            yield dados;
        }
    };
};

const criarResposta = () => ({
    status: null,
    body: "",
    writableEnded: false,
    writeHead(status) {
        this.status = status;
    },
    end(body = "") {
        this.body = body;
        this.writableEnded = true;
    }
});

const configurarRepositorio = () => {
    cartRepository.consultar.mockResolvedValue({
        rows: [{ id: 10, user_id: 1, oculto: false, status: "aberto" }]
    });

    cartRepository.consultarItem.mockResolvedValue({ rows: [] });
    cartRepository.verificarEstoque.mockResolvedValue({ rows: [{ id: 5 }] });
    cartRepository.adicionarProduto.mockResolvedValue({
        rows: [{ carrinho_id: 10, produto_id: 5, quantidade: 2 }]
    });
};

describe("cartAdicionarProduto", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        configurarRepositorio();
    });

    test("deve adicionar um produto ao carrinho e retornar 201", async () => {
        const req = criarRequisicao();
        const res = criarResposta();

        await cartAdicionarProduto(req, res);

        expect(res.status).toBe(201);
        expect(JSON.parse(res.body)).toEqual({
            carrinho_id: 10,
            produto_id: 5,
            quantidade: 2
        });
        expect(cartRepository.adicionarProduto).toHaveBeenCalledWith(10, 5, 2);
    });

    test("deve retornar 401 quando o usuário não estiver autenticado", async () => {
        const req = criarRequisicao({ usuario: undefined });
        const res = criarResposta();

        await cartAdicionarProduto(req, res);

        expect(res.status).toBe(401);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Usuário não autenticado."
        });
        expect(cartRepository.consultar).not.toHaveBeenCalled();
    });

    test.each([
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

        await cartAdicionarProduto(req, res);

        expect(res.status).toBe(401);
    });

    test.each([
        undefined,
        null,
        {},
        { id: undefined },
        { id: null },
        { id: "" },
        { id: "abc" },
        { id: "0" },
        { id: "-1" },
        { id: "1.5" },
        { id: String(Number.MAX_SAFE_INTEGER + 1) }
    ])("deve retornar 400 para ID de carrinho inválido: %j", async (params) => {
        const req = criarRequisicao({ params });
        const res = criarResposta();

        await cartAdicionarProduto(req, res);

        expect(res.status).toBe(400);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "ID do carrinho inválido."
        });
    });

    test("deve retornar 400 quando o JSON for inválido", async () => {
        const req = criarRequisicao({ body: "{invalido" });
        const res = criarResposta();

        await cartAdicionarProduto(req, res);

        expect(res.status).toBe(400);
    });

    test.each([null, [], "texto", 123, true])(
        "deve retornar 400 quando o corpo não for um objeto: %j",
        async (body) => {
            const req = criarRequisicao({ body });
            const res = criarResposta();

            await cartAdicionarProduto(req, res);

            expect(res.status).toBe(400);
        }
    );

    test.each([
        { quantidade: 2 },
        { produto_id: 0, quantidade: 2 },
        { produto_id: -1, quantidade: 2 },
        { produto_id: 1.5, quantidade: 2 },
        { produto_id: "abc", quantidade: 2 },
        { produto_id: 5 },
        { produto_id: 5, quantidade: 0 },
        { produto_id: 5, quantidade: -1 },
        { produto_id: 5, quantidade: 1.5 },
        { produto_id: 5, quantidade: "abc" },
        { produto_id: Number.MAX_SAFE_INTEGER + 1, quantidade: 2 },
        { produto_id: 5, quantidade: Number.MAX_SAFE_INTEGER + 1 }
    ])("deve retornar 400 para dados inválidos: %j", async (body) => {
        const req = criarRequisicao({ body });
        const res = criarResposta();

        await cartAdicionarProduto(req, res);

        expect(res.status).toBe(400);
    });

    test("deve retornar 400 quando o corpo estiver vazio", async () => {
        const req = criarRequisicao({ corpoVazio: true });
        const res = criarResposta();

        await cartAdicionarProduto(req, res);

        expect(res.status).toBe(400);
    });

    test("deve retornar 413 quando o corpo exceder 1 MB", async () => {
        const req = {
            usuario: { id: 1 },
            params: { id: "10" },
            async *[Symbol.asyncIterator]() {
                yield Buffer.alloc(1024 * 1024 + 1, 97);
            }
        };
        const res = criarResposta();

        await cartAdicionarProduto(req, res);

        expect(res.status).toBe(413);
    });

    test("deve retornar 404 quando o carrinho não existir", async () => {
        cartRepository.consultar.mockResolvedValue({ rows: [] });

        const req = criarRequisicao();
        const res = criarResposta();

        await cartAdicionarProduto(req, res);

        expect(res.status).toBe(404);
    });

    test("deve retornar 403 quando o carrinho pertencer a outro usuário", async () => {
        cartRepository.consultar.mockResolvedValue({
            rows: [{ id: 10, user_id: 2, oculto: false, status: "aberto" }]
        });

        const req = criarRequisicao();
        const res = criarResposta();

        await cartAdicionarProduto(req, res);

        expect(res.status).toBe(403);
    });

    test.each([
        { id: 10, user_id: 1, oculto: true, status: "aberto" },
        { id: 10, user_id: 1, oculto: false, status: "fechado" },
        { id: 10, user_id: 1, oculto: false, status: "finalizado" }
    ])("deve retornar 409 quando o carrinho não estiver disponível: %j", async (carrinho) => {
        cartRepository.consultar.mockResolvedValue({ rows: [carrinho] });

        const req = criarRequisicao();
        const res = criarResposta();

        await cartAdicionarProduto(req, res);

        expect(res.status).toBe(409);
    });

    test("deve somar a quantidade já existente antes de verificar o estoque", async () => {
        cartRepository.consultarItem.mockResolvedValue({
            rows: [{ quantidade: 3 }]
        });

        const req = criarRequisicao();
        const res = criarResposta();

        await cartAdicionarProduto(req, res);

        expect(cartRepository.verificarEstoque).toHaveBeenCalledWith(5, 5);
        expect(res.status).toBe(201);
    });

    test("deve retornar 409 quando o estoque for insuficiente", async () => {
        cartRepository.verificarEstoque.mockResolvedValue({ rows: [] });

        const req = criarRequisicao();
        const res = criarResposta();

        await cartAdicionarProduto(req, res);

        expect(res.status).toBe(409);
        expect(cartRepository.adicionarProduto).not.toHaveBeenCalled();
    });

    test("deve retornar 500 quando o repositório lançar um erro", async () => {
        const erroOriginal = console.error;
        console.error = jest.fn();
        cartRepository.consultar.mockRejectedValue(new Error("Falha no banco"));

        try {
            const req = criarRequisicao();
            const res = criarResposta();

            await cartAdicionarProduto(req, res);

            expect(res.status).toBe(500);
            expect(JSON.parse(res.body)).toEqual({
                mensagem: "Erro interno ao adicionar produto ao carrinho."
            });
        } finally {
            console.error = erroOriginal;
        }
    });

    test("não deve enviar outra resposta se a resposta já tiver terminado", async () => {
        const req = criarRequisicao();
        const res = criarResposta();
        res.writableEnded = true;

        await cartAdicionarProduto(req, res);

        expect(res.status).toBeNull();
        expect(res.body).toBe("");
    });
});
