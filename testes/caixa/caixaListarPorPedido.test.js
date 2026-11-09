const EventEmitter = require("events");

jest.mock("../../src/repositories/caixaRepository");

const caixaListarPorPedido = require("../../src/controllers/caixa/caixaListarPorPedido");
const caixaRepository = require("../../src/repositories/caixaRepository");

describe("caixaListarPorPedido", () => {
    let req;
    let res;

    const executar = async (url) => {
        req = new EventEmitter();
        req.url = url;

        res = {
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
        };

        await caixaListarPorPedido(req, res);

        return { req, res };
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("deve listar as movimentações de um pedido com sucesso", async () => {
        const movimentacoes = [
            {
                id: 1,
                pedido_id: 10,
                total: 150
            },
            {
                id: 2,
                pedido_id: 10,
                total: 200
            }
        ];

        caixaRepository.listarPorPedido.mockResolvedValue({
            rows: movimentacoes
        });

        const { res } = await executar("/caixa/listarPorPedido/10");

        expect(res.statusCode).toBe(200);
        expect(res.headers["Content-Type"]).toBe(
            "application/json; charset=utf-8"
        );
        expect(res.body).toEqual(movimentacoes);

        expect(caixaRepository.listarPorPedido).toHaveBeenCalledTimes(1);
        expect(caixaRepository.listarPorPedido).toHaveBeenCalledWith(10);
    });

    test("deve retornar uma lista vazia quando o pedido não possui movimentações", async () => {
        caixaRepository.listarPorPedido.mockResolvedValue({
            rows: []
        });

        const { res } = await executar("/caixa/listarPorPedido/10");

        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual([]);

        expect(caixaRepository.listarPorPedido).toHaveBeenCalledWith(10);
    });

    test.each([
        "/caixa/listarPorPedido/abc",
        "/caixa/listarPorPedido/0",
        "/caixa/listarPorPedido/-1",
        "/caixa/listarPorPedido/1.5",
        "/caixa/listarPorPedido/",
        "/caixa/listarPorPedido/9007199254740992"
    ])("deve rejeitar ID de pedido inválido: %s", async (url) => {
        const { res } = await executar(url);

        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual({
            mensagem: "ID do pedido inválido."
        });

        expect(caixaRepository.listarPorPedido).not.toHaveBeenCalled();
    });

    test("deve retornar erro 500 quando o repositório falhar", async () => {
        const erro = new Error("Erro no banco de dados");

        caixaRepository.listarPorPedido.mockRejectedValue(erro);

        const consoleSpy = jest
            .spyOn(console, "error")
            .mockImplementation(() => {});

        try {
            const { res } = await executar("/caixa/listarPorPedido/10");

            expect(res.statusCode).toBe(500);
            expect(res.body).toEqual({
                mensagem: "Erro interno ao listar as movimentações do pedido."
            });

            expect(caixaRepository.listarPorPedido).toHaveBeenCalledWith(10);
            expect(consoleSpy).toHaveBeenCalled();
        } finally {
            consoleSpy.mockRestore();
        }
    });
});