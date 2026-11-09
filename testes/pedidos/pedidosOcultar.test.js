const pedidosRepository = require("../../src/repositories/pedidosRepository");
const pedidosOcultar = require("../../src/controllers/pedidos/pedidosOcultar");

jest.mock("../../src/repositories/pedidosRepository");

describe("pedidosOcultar", () => {
    let req;
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

    const executar = async (dados, { erroNaRequisicao = false } = {}) => {
        const eventos = {};

        req = {
            on: jest.fn((evento, callback) => {
                eventos[evento] = callback;
                return req;
            })
        };

        res = criarResponse();

        pedidosOcultar(req, res);

        if (erroNaRequisicao) {
            eventos.error(new Error("Erro simulado na requisição"));
            return { req, res, eventos };
        }

        eventos.data(Buffer.from(JSON.stringify(dados)));
        await eventos.end();

        return { req, res, eventos };
    };

    beforeEach(() => {
        jest.clearAllMocks();

        consoleErrorSpy = jest
            .spyOn(console, "error")
            .mockImplementation(() => {});

        pedidosRepository.ocultar = jest.fn().mockResolvedValue({
            rows: [{ id: 10 }]
        });
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    test("deve ocultar o pedido com sucesso", async () => {
        const { res } = await executar({ id: 10 });

        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({
            mensagem: "Pedido ocultado com sucesso."
        });

        expect(pedidosRepository.ocultar).toHaveBeenCalledWith(10);
        expect(pedidosRepository.ocultar).toHaveBeenCalledTimes(1);
    });

    test("deve retornar 400 quando o JSON for inválido", async () => {
        const eventos = {};

        req = {
            on: jest.fn((evento, callback) => {
                eventos[evento] = callback;
                return req;
            })
        };

        res = criarResponse();

        pedidosOcultar(req, res);

        eventos.data(Buffer.from("{json inválido"));
        await eventos.end();

        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual({
            mensagem: "JSON inválido."
        });

        expect(pedidosRepository.ocultar).not.toHaveBeenCalled();
    });

    test.each([
        ["ID ausente", {}],
        ["ID nulo", { id: null }],
        ["ID vazio", { id: "" }],
        ["ID com letras", { id: "abc" }],
        ["ID zero", { id: 0 }],
        ["ID negativo", { id: -1 }],
        ["ID decimal", { id: 1.5 }],
        ["ID numérico excessivo", { id: "9007199254740992" }],
        ["ID com sinal positivo", { id: "+10" }],
        ["ID com espaços", { id: " 10 " }]
    ])(
        "deve retornar 400 quando o pedido tiver %s",
        async (_descricao, dados) => {
            const { res } = await executar(dados);

            expect(res.statusCode).toBe(400);
            expect(res.body).toEqual({
                mensagem: "ID do pedido inválido."
            });

            expect(pedidosRepository.ocultar).not.toHaveBeenCalled();
        }
    );

    test("deve retornar 404 quando o pedido não existir", async () => {
        pedidosRepository.ocultar.mockResolvedValue({
            rows: []
        });

        const { res } = await executar({ id: 10 });

        expect(res.statusCode).toBe(404);
        expect(res.body).toEqual({
            mensagem: "Pedido não encontrado."
        });

        expect(pedidosRepository.ocultar).toHaveBeenCalledWith(10);
    });

    test("deve retornar 404 quando o repositório não retornar rows", async () => {
        pedidosRepository.ocultar.mockResolvedValue({});

        const { res } = await executar({ id: 10 });

        expect(res.statusCode).toBe(404);
        expect(res.body).toEqual({
            mensagem: "Pedido não encontrado."
        });
    });

    test("deve retornar 501 quando a operação de ocultar não estiver implementada", async () => {
        pedidosRepository.ocultar = undefined;

        const { res } = await executar({ id: 10 });

        expect(res.statusCode).toBe(501);
        expect(res.body).toEqual({
            mensagem: "A operação de ocultar pedidos não está implementada."
        });
    });

    test("deve retornar 500 quando o repositório lançar um erro", async () => {
        pedidosRepository.ocultar.mockRejectedValue(
            new Error("Erro simulado no banco")
        );

        const { res } = await executar({ id: 10 });

        expect(res.statusCode).toBe(500);
        expect(res.body).toEqual({
            mensagem: "Erro interno ao ocultar o pedido."
        });

        expect(consoleErrorSpy).toHaveBeenCalledWith(
            "[ERRO AO OCULTAR PEDIDO]",
            expect.any(Error)
        );
    });

    test("deve retornar 400 quando ocorrer erro ao receber os dados", async () => {
        const { res } = await executar(
            {},
            { erroNaRequisicao: true }
        );

        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual({
            mensagem: "Erro ao receber os dados da requisição."
        });

        expect(consoleErrorSpy).toHaveBeenCalledWith(
            "[ERRO AO RECEBER DADOS DO PEDIDO]",
            expect.any(Error)
        );

        expect(pedidosRepository.ocultar).not.toHaveBeenCalled();
    });

    test("não deve responder novamente se os cabeçalhos já tiverem sido enviados", async () => {
        const eventos = {};

        req = {
            on: jest.fn((evento, callback) => {
                eventos[evento] = callback;
                return req;
            })
        };

        res = criarResponse();
        res.headersSent = true;

        pedidosOcultar(req, res);

        eventos.data(Buffer.from(JSON.stringify({ id: 10 })));
        await eventos.end();

        expect(res.statusCode).toBeNull();
        expect(res.writableEnded).toBe(false);
        expect(pedidosRepository.ocultar).toHaveBeenCalledWith(10);
    });

    test("não deve responder novamente se a resposta já estiver encerrada", async () => {
        const eventos = {};

        req = {
            on: jest.fn((evento, callback) => {
                eventos[evento] = callback;
                return req;
            })
        };

        res = criarResponse();
        res.writableEnded = true;

        pedidosOcultar(req, res);

        eventos.data(Buffer.from(JSON.stringify({ id: 10 })));
        await eventos.end();

        expect(res.statusCode).toBeNull();
        expect(res.writableEnded).toBe(true);
    });
});