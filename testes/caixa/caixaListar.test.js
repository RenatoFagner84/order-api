const caixaRepository = require("../../src/repositories/caixaRepository");

jest.mock("../../src/repositories/caixaRepository");

const caixaListar = require("../../src/controllers/caixa/caixaListar");

function criarRequisicao() {
    return {
        method: "GET",
        url: "/caixa/listar"
    };
}

function criarResposta() {
    return {
        statusCode: null,
        headers: {},
        body: null,
        writableEnded: false,
        headersSent: false,

        writeHead: jest.fn(function (statusCode, headers = {}) {
            this.statusCode = statusCode;
            this.headers = headers;
            this.headersSent = true;
        }),

        end: jest.fn(function (body = "") {
            this.body = body ? JSON.parse(body) : null;
            this.writableEnded = true;
        })
    };
}

describe("caixaListar", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test("deve listar as movimentações com sucesso", async () => {
        const movimentacoes = [
            {
                id: 1,
                descricao: "Venda",
                total: 100
            },
            {
                id: 2,
                descricao: "Compra",
                total: 50
            }
        ];

        caixaRepository.listar.mockResolvedValue({
            rows: movimentacoes
        });

        const req = criarRequisicao();
        const res = criarResposta();

        await caixaListar(req, res);

        expect(caixaRepository.listar).toHaveBeenCalledTimes(1);
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual(movimentacoes);
        expect(res.headers["Content-Type"]).toBe(
            "application/json; charset=utf-8"
        );
    });

    test("deve retornar uma lista vazia quando não houver movimentações", async () => {
        caixaRepository.listar.mockResolvedValue({
            rows: []
        });

        const req = criarRequisicao();
        const res = criarResposta();

        await caixaListar(req, res);

        expect(caixaRepository.listar).toHaveBeenCalledTimes(1);
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual([]);
    });

    test("deve retornar 500 quando o repositório lançar um erro", async () => {
        caixaRepository.listar.mockRejectedValue(
            new Error("Erro no banco de dados")
        );

        const req = criarRequisicao();
        const res = criarResposta();

        await caixaListar(req, res);

        expect(caixaRepository.listar).toHaveBeenCalledTimes(1);
        expect(res.statusCode).toBe(500);
        expect(res.body).toEqual({
            mensagem: "Erro interno ao listar as movimentações do caixa."
        });

        expect(console.error).toHaveBeenCalledWith(
            "[ERRO AO LISTAR MOVIMENTAÇÕES DO CAIXA]",
            expect.any(Error)
        );
    });
});
