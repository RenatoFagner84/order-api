const EventEmitter = require("events");
const caixaInserir = require("../../src/controllers/caixa/caixaInserir");
const caixaRepository = require("../../src/repositories/caixaRepository");

jest.mock("../../src/repositories/caixaRepository");

function criarRequisicao() {
    const req = new EventEmitter();
    req.destroy = jest.fn();
    return req;
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

function executar(conteudo) {
    const req = criarRequisicao();
    const res = criarResposta();

    caixaInserir(req, res);

    req.emit("data", Buffer.from(conteudo));
    req.emit("end");

    return { req, res };
}

describe("caixaInserir", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test("deve inserir uma movimentação com sucesso", async () => {
        const movimentacao = {
            id: 10,
            descricao: "Venda"
        };

        caixaRepository.inserir.mockResolvedValue({
            rows: [movimentacao]
        });

        const { res } = executar(JSON.stringify({
            user_id: 1,
            pedido_id: 2,
            tipo_movimentacao_id: 3,
            subtotal: 100,
            desconto: 0,
            frete: 0,
            acrescimo: 0,
            total: 100,
            forma_pagamento_id: 1,
            pagamento_status_id: 1,
            descricao: "Venda"
        }));

        await new Promise(setImmediate);

        expect(caixaRepository.inserir).toHaveBeenCalledWith(
            1,
            2,
            3,
            100,
            0,
            0,
            0,
            100,
            1,
            1,
            "Venda"
        );

        expect(res.statusCode).toBe(201);
        expect(res.body).toEqual(movimentacao);
    });

    test("deve rejeitar JSON inválido", async () => {
        const { res } = executar("{");

        await new Promise(setImmediate);

        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual({
            mensagem: "JSON inválido."
        });

        expect(caixaRepository.inserir).not.toHaveBeenCalled();
    });

    test.each(["null", "[]", '"texto"', "123"])(
        "deve rejeitar dados que não sejam um objeto: %s",
        async (conteudo) => {
            const { res } = executar(conteudo);

            await new Promise(setImmediate);

            expect(res.statusCode).toBe(400);
            expect(res.body).toEqual({
                mensagem: "Os dados enviados são inválidos."
            });

            expect(caixaRepository.inserir).not.toHaveBeenCalled();
        }
    );

    test.each([undefined, null, ""])(
        "deve rejeitar tipo de movimentação inválido: %s",
        async (tipo) => {
            const dados = {
                user_id: 1,
                tipo_movimentacao_id: tipo
            };

            const { res } = executar(JSON.stringify(dados));

            await new Promise(setImmediate);

            expect(res.statusCode).toBe(400);
            expect(res.body).toEqual({
                mensagem: "O tipo de movimentação é obrigatório."
            });

            expect(caixaRepository.inserir).not.toHaveBeenCalled();
        }
    );

   test.each([
    { subtotal: -1 },
    { desconto: -5 },
    { frete: -10 },
    { acrescimo: -2 },
    { total: -100 },
    { subtotal: "100" },
    { desconto: "0" }
])("deve rejeitar valores financeiros inválidos: %o", async (valores) => {
    const dados = {
        tipo_movimentacao_id: 1,
        subtotal: 100,
        desconto: 0,
        frete: 0,
        acrescimo: 0,
        total: 100,
        ...valores
    };

    const { res } = executar(JSON.stringify(dados));

    await new Promise(setImmediate);

    expect(res.statusCode).toBe(400);

    expect(res.body).toEqual({
        mensagem: "Os valores financeiros devem ser números válidos e não negativos."
    });

    expect(caixaRepository.inserir).not.toHaveBeenCalled();
});

    test("deve retornar 500 quando o repositório não inserir nenhuma linha", async () => {
        caixaRepository.inserir.mockResolvedValue({
            rows: []
        });

        const { res } = executar(JSON.stringify({
            tipo_movimentacao_id: 1
        }));

        await new Promise(setImmediate);

        expect(res.statusCode).toBe(500);
        expect(res.body).toEqual({
            mensagem: "Não foi possível registrar a movimentação do caixa."
        });
    });

    test("deve retornar 500 quando o repositório lançar erro", async () => {
        caixaRepository.inserir.mockRejectedValue(
            new Error("Erro no banco")
        );

        const { res } = executar(JSON.stringify({
            tipo_movimentacao_id: 1
        }));

        await new Promise(setImmediate);

        expect(res.statusCode).toBe(500);
        expect(res.body).toEqual({
            mensagem: "Erro interno ao registrar a movimentação do caixa."
        });

        expect(console.error).toHaveBeenCalled();
    });

    test("deve rejeitar corpo muito grande", async () => {
        const req = criarRequisicao();
        const res = criarResposta();

        caixaInserir(req, res);

        req.emit("data", Buffer.alloc(1_000_001, "a"));

        await new Promise(setImmediate);

        expect(res.statusCode).toBe(413);
        expect(res.body).toEqual({
            mensagem: "Corpo da requisição muito grande."
        });

        expect(req.destroy).toHaveBeenCalled();
        expect(caixaRepository.inserir).not.toHaveBeenCalled();
    });

    test("deve responder erro quando a requisição emitir erro", async () => {
        const req = criarRequisicao();
        const res = criarResposta();

        caixaInserir(req, res);

        req.emit("error", new Error("Erro de conexão"));

        await new Promise(setImmediate);

        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual({
            mensagem: "Erro ao receber os dados da requisição."
        });

        expect(console.error).toHaveBeenCalled();
    });
});
