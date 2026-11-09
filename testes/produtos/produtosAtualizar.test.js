
jest.mock("../../src/repositories/produtoRepository", () => ({
    ler: jest.fn(),
    atualizar: jest.fn()
}));

const produtoRepository = require("../../src/repositories/produtoRepository");
const produtosAtualizar = require("../../src/controllers/produtos/produtosAtualizar");

describe("produtosAtualizar", () => {
    let res;
    let consoleErrorSpy;

    const criarResponse = () => ({
        statusCode: null,
        headers: {},
        body: null,
        writableEnded: false,
        headersSent: false,

        writeHead(status, headers) {
            this.statusCode = status;
            this.headers = headers;
            this.headersSent = true;
        },

        end(dados) {
            this.body = dados ? JSON.parse(dados) : null;
            this.writableEnded = true;
        }
    });

    const criarRequest = (url, body, erro = null) => ({
        url,

        async *[Symbol.asyncIterator]() {
            if (erro) {
                throw erro;
            }

            if (body !== undefined) {
                yield Buffer.isBuffer(body) ? body : Buffer.from(body);
            }
        }
    });

    const executar = async ({
        url = "/api/produtos/10",
        body = {
            nome: "Produto atualizado",
            quantidade: 20,
            valor: 35.5
        },
        erroNaRequisicao = null
    } = {}) => {
        const corpo = typeof body === "string" || Buffer.isBuffer(body)
            ? body
            : JSON.stringify(body);

        const req = criarRequest(url, corpo, erroNaRequisicao);
        res = criarResponse();

        await produtosAtualizar(req, res);

        return { req, res };
    };

    beforeEach(() => {
        jest.clearAllMocks();

        consoleErrorSpy = jest
            .spyOn(console, "error")
            .mockImplementation(() => {});

        produtoRepository.ler.mockResolvedValue({
            rows: [{
                id: 10,
                nome: "Produto original",
                quantidade: 5,
                valor: 20
            }]
        });

        produtoRepository.atualizar.mockResolvedValue({
            rows: [{
                id: 10,
                nome: "Produto atualizado",
                quantidade: 20,
                valor: 35.5
            }]
        });
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    test("deve atualizar o produto com sucesso", async () => {
        const { res } = await executar();

        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({
            id: 10,
            nome: "Produto atualizado",
            quantidade: 20,
            valor: 35.5
        });

        expect(res.headers["Content-Type"]).toBe(
            "application/json; charset=utf-8"
        );

        expect(produtoRepository.ler).toHaveBeenCalledWith("10");
        expect(produtoRepository.atualizar).toHaveBeenCalledWith(
            "10",
            "Produto atualizado",
            20,
            35.5
        );
    });

    test("deve remover espaços extras do nome antes de atualizar", async () => {
        await executar({
            body: {
                nome: "  Produto atualizado  ",
                quantidade: 10,
                valor: 15
            }
        });

        expect(produtoRepository.atualizar).toHaveBeenCalledWith(
            "10",
            "Produto atualizado",
            10,
            15
        );
    });

    test.each([
        ["ID ausente", "/api/produtos"],
        ["ID vazio", "/api/produtos/"],
        ["ID com letras", "/api/produtos/abc"],
        ["ID negativo", "/api/produtos/-1"],
        ["ID decimal", "/api/produtos/1.5"],
        ["ID com espaços", "/api/produtos/%2010%20"]
    ])("deve retornar 400 quando houver %s", async (_descricao, url) => {
        const { res } = await executar({ url });

        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual({
            mensagem: "Informe um ID de produto válido."
        });

        expect(produtoRepository.ler).not.toHaveBeenCalled();
        expect(produtoRepository.atualizar).not.toHaveBeenCalled();
    });

    test("deve retornar 400 quando o JSON for inválido", async () => {
        const { res } = await executar({
            body: '{"nome":'
        });

        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual({
            mensagem: "Corpo da requisição JSON inválido."
        });

        expect(produtoRepository.ler).not.toHaveBeenCalled();
    });

    test.each([
        ["null", "null"],
        ["array", "[]"],
        ["string", '"texto"'],
        ["número", "123"],
        ["booleano", "true"]
    ])("deve retornar 400 quando o corpo JSON for %s", async (_descricao, body) => {
        const { res } = await executar({ body });

        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual({
            mensagem: "O corpo da requisição deve ser um objeto JSON."
        });

        expect(produtoRepository.ler).not.toHaveBeenCalled();
    });

    test.each([
        ["nome ausente", { quantidade: 10, valor: 20 }],
        ["nome vazio", { nome: "", quantidade: 10, valor: 20 }],
        ["nome com espaços", { nome: "   ", quantidade: 10, valor: 20 }],
        ["nome não textual", { nome: 123, quantidade: 10, valor: 20 }],
        ["quantidade ausente", { nome: "Produto", valor: 20 }],
        ["quantidade nula", { nome: "Produto", quantidade: null, valor: 20 }],
        ["quantidade negativa", { nome: "Produto", quantidade: -1, valor: 20 }],
        ["quantidade inválida", { nome: "Produto", quantidade: "abc", valor: 20 }],
        ["valor ausente", { nome: "Produto", quantidade: 10 }],
        ["valor nulo", { nome: "Produto", quantidade: 10, valor: null }],
        ["valor negativo", { nome: "Produto", quantidade: 10, valor: -1 }],
        ["valor inválido", { nome: "Produto", quantidade: 10, valor: "abc" }]
    ])("deve retornar 400 quando houver %s", async (_descricao, body) => {
        const { res } = await executar({ body });

        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual({
            mensagem: "Informe nome, quantidade e valor válidos."
        });

        expect(produtoRepository.ler).not.toHaveBeenCalled();
        expect(produtoRepository.atualizar).not.toHaveBeenCalled();
    });

    test("deve aceitar quantidade e valor iguais a zero", async () => {
        const { res } = await executar({
            body: {
                nome: "Produto gratuito",
                quantidade: 0,
                valor: 0
            }
        });

        expect(res.statusCode).toBe(200);
        expect(produtoRepository.atualizar).toHaveBeenCalledWith(
            "10",
            "Produto gratuito",
            0,
            0
        );
    });

    test("deve converter quantidade e valor numéricos em strings para números", async () => {
        const { res } = await executar({
            body: {
                nome: "Produto",
                quantidade: "15",
                valor: "29.90"
            }
        });

        expect(res.statusCode).toBe(200);
        expect(produtoRepository.atualizar).toHaveBeenCalledWith(
            "10",
            "Produto",
            15,
            29.9
        );
    });

    test("deve retornar 404 quando o produto não existir", async () => {
        produtoRepository.ler.mockResolvedValue({ rows: [] });

        const { res } = await executar();

        expect(res.statusCode).toBe(404);
        expect(res.body).toEqual({
            mensagem: "Produto não encontrado"
        });

        expect(produtoRepository.atualizar).not.toHaveBeenCalled();
    });

    test("deve retornar 404 quando a atualização não encontrar o produto", async () => {
        produtoRepository.atualizar.mockResolvedValue({ rows: [] });

        const { res } = await executar();

        expect(res.statusCode).toBe(404);
        expect(res.body).toEqual({
            mensagem: "Produto não encontrado"
        });
    });

    test("deve retornar 500 quando ocorrer erro ao consultar o produto", async () => {
        produtoRepository.ler.mockRejectedValue(
            new Error("Erro simulado ao consultar produto")
        );

        const { res } = await executar();

        expect(res.statusCode).toBe(500);
        expect(res.body).toEqual({
            mensagem: "Erro interno ao atualizar produto."
        });

        expect(produtoRepository.atualizar).not.toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            "[ERRO AO ATUALIZAR PRODUTO]",
            expect.any(Error)
        );
    });

    test("deve retornar 500 quando ocorrer erro ao atualizar o produto", async () => {
        produtoRepository.atualizar.mockRejectedValue(
            new Error("Erro simulado ao atualizar produto")
        );

        const { res } = await executar();

        expect(res.statusCode).toBe(500);
        expect(res.body).toEqual({
            mensagem: "Erro interno ao atualizar produto."
        });

        expect(consoleErrorSpy).toHaveBeenCalledWith(
            "[ERRO AO ATUALIZAR PRODUTO]",
            expect.any(Error)
        );
    });

    test("deve retornar 400 quando ocorrer erro ao receber os dados", async () => {
        const { res } = await executar({
            erroNaRequisicao: new Error("Erro simulado na requisição")
        });

        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual({
            mensagem: "Erro ao receber os dados da requisição."
        });

        expect(produtoRepository.ler).not.toHaveBeenCalled();
        expect(produtoRepository.atualizar).not.toHaveBeenCalled();

        expect(consoleErrorSpy).toHaveBeenCalledWith(
            "[ERRO AO RECEBER ATUALIZAÇÃO DE PRODUTO]",
            expect.any(Error)
        );
    });

    test("deve retornar 413 quando o corpo exceder 1 MB", async () => {
        const corpoGrande = "a".repeat(1024 * 1024 + 1);

        const { res } = await executar({
            body: corpoGrande
        });

        expect(res.statusCode).toBe(413);
        expect(res.body).toEqual({
            mensagem: "Corpo da requisição muito grande."
        });

        expect(produtoRepository.ler).not.toHaveBeenCalled();
        expect(produtoRepository.atualizar).not.toHaveBeenCalled();
    });

    test("não deve responder novamente se os cabeçalhos já tiverem sido enviados", async () => {
        res = criarResponse();
        res.headersSent = true;

        const req = criarRequest(
            "/api/produtos/10",
            JSON.stringify({
                nome: "Produto atualizado",
                quantidade: 20,
                valor: 35.5
            })
        );

        await produtosAtualizar(req, res);

        expect(res.statusCode).toBeNull();
        expect(res.writableEnded).toBe(false);
    });

    test("não deve responder novamente se a resposta já estiver encerrada", async () => {
        res = criarResponse();
        res.writableEnded = true;

        const req = criarRequest(
            "/api/produtos/10",
            JSON.stringify({
                nome: "Produto atualizado",
                quantidade: 20,
                valor: 35.5
            })
        );

        await produtosAtualizar(req, res);

        expect(res.statusCode).toBeNull();
        expect(res.writableEnded).toBe(true);
    });
});
