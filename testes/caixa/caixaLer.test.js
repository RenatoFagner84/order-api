const caixaRepository = require("../../src/repositories/caixaRepository");

jest.mock("../../src/repositories/caixaRepository");

const caixaLer = require("../../src/controllers/caixa/caixaLer");

function criarRequisicao(caminho = "/caixa/ler/10") {
    return {
        url: caminho,
        method: "GET"
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

describe("caixaLer", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test("deve consultar uma movimentação com sucesso", async () => {
        const movimentacao = {
            id: 10,
            descricao: "Venda",
            total: 100
        };

        caixaRepository.ler.mockResolvedValue({
            rows: [movimentacao]
        });

        const req = criarRequisicao("/caixa/ler/10");
        const res = criarResposta();

        await caixaLer(req, res);

        expect(caixaRepository.ler).toHaveBeenCalledWith(10);
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual(movimentacao);
        expect(res.headers["Content-Type"]).toBe(
            "application/json; charset=utf-8"
        );
    });

    test.each([
        "/caixa/ler/abc",
        "/caixa/ler/0",
        "/caixa/ler/-1",
        "/caixa/ler/1.5",
        "/caixa/ler/",
        "/caixa/ler/9007199254740992"
    ])("deve rejeitar ID inválido: %s", async (caminho) => {
        const req = criarRequisicao(caminho);
        const res = criarResposta();

        await caixaLer(req, res);

        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual({
            mensagem: "ID da movimentação inválido."
        });

        expect(caixaRepository.ler).not.toHaveBeenCalled();
    });

    test("deve retornar 404 quando a movimentação não existir", async () => {
        caixaRepository.ler.mockResolvedValue({
            rows: []
        });

        const req = criarRequisicao("/caixa/ler/10");
        const res = criarResposta();

        await caixaLer(req, res);

        expect(caixaRepository.ler).toHaveBeenCalledWith(10);
        expect(res.statusCode).toBe(404);
        expect(res.body).toEqual({
            mensagem: "Movimentação do caixa não encontrada."
        });
    });

    test("deve retornar 404 quando rows não existir", async () => {
        caixaRepository.ler.mockResolvedValue({});

        const req = criarRequisicao("/caixa/ler/10");
        const res = criarResposta();

        await caixaLer(req, res);

        expect(res.statusCode).toBe(404);
        expect(res.body).toEqual({
            mensagem: "Movimentação do caixa não encontrada."
        });
    });

    test("deve retornar 500 quando o repositório lançar erro", async () => {
        caixaRepository.ler.mockRejectedValue(
            new Error("Erro no banco")
        );

        const req = criarRequisicao("/caixa/ler/10");
        const res = criarResposta();

        await caixaLer(req, res);

        expect(caixaRepository.ler).toHaveBeenCalledWith(10);
        expect(res.statusCode).toBe(500);
        expect(res.body).toEqual({
            mensagem: "Erro interno ao consultar a movimentação do caixa."
        });

        expect(console.error).toHaveBeenCalled();
    });
});
