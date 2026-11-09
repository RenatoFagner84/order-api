
jest.mock("../../src/repositories/produtoRepository", () => ({
    ler: jest.fn()
}));

const produtoRepository = require("../../src/repositories/produtoRepository");
const produtosLerId = require("../../src/controllers/produtos/produtosLerId");

const criarReq = (url) => ({
    url
});

const criarRes = () => ({
    status: null,
    headers: null,
    body: null,
    headersSent: false,
    writableEnded: false,

    writeHead(status, headers) {
        this.status = status;
        this.headers = headers;
        this.headersSent = true;
    },

    end(body) {
        this.body = body;
        this.writableEnded = true;
    }
});

describe("produtosLerId", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        produtoRepository.ler.mockResolvedValue({
            rows: [
                {
                    id: 1,
                    nome: "Teclado",
                    quantidade: 10,
                    valor: 99.90
                }
            ]
        });
    });

    it("deve retornar 200 e o produto encontrado", async () => {
        const req = criarReq("/api/produtos/1");
        const res = criarRes();

        await produtosLerId(req, res);

        expect(res.status).toBe(200);
        expect(res.headers).toEqual({
            "Content-Type": "application/json; charset=utf-8"
        });
        expect(JSON.parse(res.body)).toEqual({
            id: 1,
            nome: "Teclado",
            quantidade: 10,
            valor: 99.90
        });
        expect(produtoRepository.ler).toHaveBeenCalledWith("1");
    });

    it("deve retornar 400 quando o ID não for informado", async () => {
        const req = criarReq("/api/produtos");
        const res = criarRes();

        await produtosLerId(req, res);

        expect(res.status).toBe(400);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Informe um ID de produto válido."
        });
        expect(produtoRepository.ler).not.toHaveBeenCalled();
    });

    it("deve retornar 400 quando o ID estiver vazio", async () => {
        const req = criarReq("/api/produtos/");
        const res = criarRes();

        await produtosLerId(req, res);

        expect(res.status).toBe(400);
        expect(produtoRepository.ler).not.toHaveBeenCalled();
    });

    it("deve retornar 400 quando o ID não for numérico", async () => {
        const req = criarReq("/api/produtos/abc");
        const res = criarRes();

        await produtosLerId(req, res);

        expect(res.status).toBe(400);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Informe um ID de produto válido."
        });
        expect(produtoRepository.ler).not.toHaveBeenCalled();
    });

    it("deve retornar 400 quando o ID for negativo", async () => {
        const req = criarReq("/api/produtos/-1");
        const res = criarRes();

        await produtosLerId(req, res);

        expect(res.status).toBe(400);
        expect(produtoRepository.ler).not.toHaveBeenCalled();
    });

    it("deve retornar 400 quando o ID for decimal", async () => {
        const req = criarReq("/api/produtos/1.5");
        const res = criarRes();

        await produtosLerId(req, res);

        expect(res.status).toBe(400);
        expect(produtoRepository.ler).not.toHaveBeenCalled();
    });

    it("deve retornar 404 quando o produto não for encontrado", async () => {
        produtoRepository.ler.mockResolvedValue({
            rows: []
        });

        const req = criarReq("/api/produtos/99");
        const res = criarRes();

        await produtosLerId(req, res);

        expect(res.status).toBe(404);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Produto não encontrado"
        });
        expect(produtoRepository.ler).toHaveBeenCalledWith("99");
    });

    it("deve retornar 500 quando o repositório lançar um erro", async () => {
        const erro = new Error("Erro no banco de dados");
        const consoleSpy = jest
            .spyOn(console, "error")
            .mockImplementation(() => {});

        produtoRepository.ler.mockRejectedValue(erro);

        const req = criarReq("/api/produtos/1");
        const res = criarRes();

        await produtosLerId(req, res);

        expect(res.status).toBe(500);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Erro interno ao buscar produto."
        });
        expect(consoleSpy).toHaveBeenCalledWith(
            "[ERRO AO BUSCAR PRODUTO]",
            erro
        );

        consoleSpy.mockRestore();
    });

    it("não deve enviar outra resposta se os headers já tiverem sido enviados", async () => {
        const req = criarReq("/api/produtos/1");
        const res = criarRes();

        res.headersSent = true;

        await produtosLerId(req, res);

        expect(res.status).toBeNull();
        expect(res.body).toBeNull();
    });

    it("não deve enviar outra resposta se a resposta já tiver terminado", async () => {
        const req = criarReq("/api/produtos/1");
        const res = criarRes();

        res.writableEnded = true;

        await produtosLerId(req, res);

        expect(res.status).toBeNull();
        expect(res.body).toBeNull();
    });
});
