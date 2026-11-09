const caixaDeletar = require("../../src/controllers/caixa/caixaDeletar");
const caixaRepository = require("../../src/repositories/caixaRepository");

jest.mock("../../src/repositories/caixaRepository");

function criarRequisicao(caminho = "/caixa/deletar/10") {
    return {
        url: caminho,
        method: "DELETE"
    };
}

function criarResposta() {
    return {
        statusCode: null,
        headersSent: false,
        writableEnded: false,
        body: null,
        writeHead: jest.fn(function (status, headers) {
            this.statusCode = status;
            this.headers = headers;
            this.headersSent = true;
        }),
        end: jest.fn(function (dados) {
            this.body = JSON.parse(dados);
            this.writableEnded = true;
        })
    };
}

async function executar(caminho = "/caixa/deletar/10") {
    const req = criarRequisicao(caminho);
    const res = criarResposta();

    await caixaDeletar(req, res);

    return { req, res };
}

describe("caixaDeletar", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test("deve excluir uma movimentação com sucesso", async () => {
        const movimentacao = { id: 10, descricao: "Venda" };

        caixaRepository.ler.mockResolvedValue({
            rows: [{ id: 10 }]
        });

        caixaRepository.deletar.mockResolvedValue({
            rows: [movimentacao]
        });

        const { res } = await executar();

        expect(caixaRepository.ler).toHaveBeenCalledWith(10);
        expect(caixaRepository.deletar).toHaveBeenCalledWith(10);
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({
            mensagem: "Movimentação do caixa excluída com sucesso.",
            caixa: movimentacao
        });
    });

    test.each([
        "/caixa/deletar/abc",
        "/caixa/deletar/0",
        "/caixa/deletar/-1",
        "/caixa/deletar/1.5",
        "/caixa/deletar/"
    ])("deve retornar 400 para ID inválido: %s", async (caminho) => {
        const { res } = await executar(caminho);

        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual({
            mensagem: "ID da movimentação inválido."
        });
        expect(caixaRepository.ler).not.toHaveBeenCalled();
        expect(caixaRepository.deletar).not.toHaveBeenCalled();
    });

    test("deve retornar 404 quando a movimentação não existir", async () => {
        caixaRepository.ler.mockResolvedValue({
            rows: []
        });

        const { res } = await executar();

        expect(caixaRepository.ler).toHaveBeenCalledWith(10);
        expect(caixaRepository.deletar).not.toHaveBeenCalled();
        expect(res.statusCode).toBe(404);
        expect(res.body).toEqual({
            mensagem: "Movimentação do caixa não encontrada."
        });
    });

    test("deve retornar 404 quando ler retornar rows indefinido", async () => {
        caixaRepository.ler.mockResolvedValue({});

        const { res } = await executar();

        expect(res.statusCode).toBe(404);
        expect(res.body).toEqual({
            mensagem: "Movimentação do caixa não encontrada."
        });
        expect(caixaRepository.deletar).not.toHaveBeenCalled();
    });

    test("deve retornar 404 quando a exclusão não retornar movimentação", async () => {
        caixaRepository.ler.mockResolvedValue({
            rows: [{ id: 10 }]
        });

        caixaRepository.deletar.mockResolvedValue({
            rows: []
        });

        const { res } = await executar();

        expect(caixaRepository.deletar).toHaveBeenCalledWith(10);
        expect(res.statusCode).toBe(404);
        expect(res.body).toEqual({
            mensagem: "Movimentação do caixa não encontrada."
        });
    });

    test("deve retornar 404 quando deletar retornar rows indefinido", async () => {
        caixaRepository.ler.mockResolvedValue({
            rows: [{ id: 10 }]
        });

        caixaRepository.deletar.mockResolvedValue({});

        const { res } = await executar();

        expect(res.statusCode).toBe(404);
        expect(res.body).toEqual({
            mensagem: "Movimentação do caixa não encontrada."
        });
    });

    test("deve retornar 500 quando ler lançar erro", async () => {
        caixaRepository.ler.mockRejectedValue(
            new Error("Erro ao consultar movimentação")
        );

        const { res } = await executar();

        expect(res.statusCode).toBe(500);
        expect(res.body).toEqual({
            mensagem: "Erro interno ao excluir a movimentação do caixa."
        });
        expect(caixaRepository.deletar).not.toHaveBeenCalled();
        expect(console.error).toHaveBeenCalled();
    });

    test("deve retornar 500 quando deletar lançar erro", async () => {
        caixaRepository.ler.mockResolvedValue({
            rows: [{ id: 10 }]
        });

        caixaRepository.deletar.mockRejectedValue(
            new Error("Erro ao excluir movimentação")
        );

        const { res } = await executar();

        expect(res.statusCode).toBe(500);
        expect(res.body).toEqual({
            mensagem: "Erro interno ao excluir a movimentação do caixa."
        });
        expect(console.error).toHaveBeenCalled();
    });
});