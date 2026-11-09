const EventEmitter = require("events");

jest.mock("../../src/repositories/caixaRepository");

const caixaListarPorUser = require("../../src/controllers/caixa/caixaListarPorUser");
const caixaRepository = require("../../src/repositories/caixaRepository");

describe("caixaListarPorUser", () => {
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

        await caixaListarPorUser(req, res);

        return { req, res };
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("deve listar as movimentações de um usuário com sucesso", async () => {
        const movimentacoes = [
            {
                id: 1,
                user_id: 5,
                total: 150
            },
            {
                id: 2,
                user_id: 5,
                total: 200
            }
        ];

        caixaRepository.listarPorUser.mockResolvedValue({
            rows: movimentacoes
        });

        const { res } = await executar("/caixa/listarPorUser/5");

        expect(res.statusCode).toBe(200);
        expect(res.headers["Content-Type"]).toBe(
            "application/json; charset=utf-8"
        );
        expect(res.body).toEqual(movimentacoes);

        expect(caixaRepository.listarPorUser).toHaveBeenCalledTimes(1);
        expect(caixaRepository.listarPorUser).toHaveBeenCalledWith(5);
    });

    test("deve retornar uma lista vazia quando o usuário não possui movimentações", async () => {
        caixaRepository.listarPorUser.mockResolvedValue({
            rows: []
        });

        const { res } = await executar("/caixa/listarPorUser/5");

        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual([]);

        expect(caixaRepository.listarPorUser).toHaveBeenCalledWith(5);
    });

    test.each([
        "/caixa/listarPorUser/abc",
        "/caixa/listarPorUser/0",
        "/caixa/listarPorUser/-1",
        "/caixa/listarPorUser/1.5",
        "/caixa/listarPorUser/",
        "/caixa/listarPorUser/9007199254740992"
    ])("deve rejeitar ID de usuário inválido: %s", async (url) => {
        const { res } = await executar(url);

        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual({
            mensagem: "ID do usuário inválido."
        });

        expect(caixaRepository.listarPorUser).not.toHaveBeenCalled();
    });

    test("deve retornar erro 500 quando o repositório falhar", async () => {
        const erro = new Error("Erro no banco de dados");

        caixaRepository.listarPorUser.mockRejectedValue(erro);

        const consoleSpy = jest
            .spyOn(console, "error")
            .mockImplementation(() => {});

        try {
            const { res } = await executar("/caixa/listarPorUser/5");

            expect(res.statusCode).toBe(500);
            expect(res.body).toEqual({
                mensagem: "Erro interno ao listar as movimentações do usuário."
            });

            expect(caixaRepository.listarPorUser).toHaveBeenCalledWith(5);
            expect(consoleSpy).toHaveBeenCalled();
        } finally {
            consoleSpy.mockRestore();
        }
    });
});