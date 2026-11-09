
jest.mock("../../src/repositories/produtoRepository", () => ({
    lerTudo: jest.fn()
}));

const produtosRepository = require("../../src/repositories/produtoRepository");
const produtosLer = require("../../src/controllers/produtos/produtosLer");

const criarReq = (url = "/api/produtos") => ({
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

describe("produtosLer", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        produtosRepository.lerTudo.mockResolvedValue({
            rows: [
                {
                    id: 1,
                    nome: "Teclado",
                    quantidade: 10,
                    valor: 99.90
                },
                {
                    id: 2,
                    nome: "Mouse",
                    quantidade: 20,
                    valor: 49.90
                }
            ]
        });
    });

    it("deve retornar 200 e a lista de produtos", async () => {
        const req = criarReq();
        const res = criarRes();

        await produtosLer(req, res);

        expect(res.status).toBe(200);
        expect(res.headers).toEqual({
            "Content-Type": "application/json; charset=utf-8"
        });
        expect(JSON.parse(res.body)).toEqual([
            {
                id: 1,
                nome: "Teclado",
                quantidade: 10,
                valor: 99.90
            },
            {
                id: 2,
                nome: "Mouse",
                quantidade: 20,
                valor: 49.90
            }
        ]);
        expect(produtosRepository.lerTudo).toHaveBeenCalledTimes(1);
    });

    it("deve retornar 200 com uma lista vazia quando não houver produtos", async () => {
        produtosRepository.lerTudo.mockResolvedValue({
            rows: []
        });

        const req = criarReq();
        const res = criarRes();

        await produtosLer(req, res);

        expect(res.status).toBe(200);
        expect(JSON.parse(res.body)).toEqual([]);
    });

    it("deve retornar 500 quando o repositório lançar um erro", async () => {
        const erro = new Error("Erro no banco de dados");
        const consoleSpy = jest
            .spyOn(console, "error")
            .mockImplementation(() => {});

        produtosRepository.lerTudo.mockRejectedValue(erro);

        const req = criarReq();
        const res = criarRes();

        await produtosLer(req, res);

        expect(res.status).toBe(500);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Erro interno ao listar produtos."
        });
        expect(consoleSpy).toHaveBeenCalledWith(
            "[ERRO AO LISTAR PRODUTOS]",
            erro
        );

        consoleSpy.mockRestore();
    });

    it("não deve enviar outra resposta se os headers já tiverem sido enviados", async () => {
        const req = criarReq();
        const res = criarRes();

        res.headersSent = true;

        await produtosLer(req, res);

        expect(res.status).toBeNull();
        expect(res.body).toBeNull();
    });

    it("não deve enviar outra resposta se a resposta já tiver terminado", async () => {
        const req = criarReq();
        const res = criarRes();

        res.writableEnded = true;

        await produtosLer(req, res);

        expect(res.status).toBeNull();
        expect(res.body).toBeNull();
    });
});
