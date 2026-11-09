const EventEmitter = require("events");

jest.mock("../../src/repositories/cartRepository");

const cartRepository = require("../../src/repositories/cartRepository");
const cartCriar = require("../../src/controllers/cart/cartCriar");

const criarReq = (usuarioId, body = "") => {
    const req = new EventEmitter();

    req.usuario = usuarioId === undefined ? undefined : { id: usuarioId };

    req[Symbol.asyncIterator] = async function* () {
        if (body) {
            yield Buffer.from(body);
        }
    };

    return req;
};

const criarRes = () => {
    const res = {
        writableEnded: false,
        headersSent: false,
        statusCode: null,
        body: null,
        writeHead: jest.fn(function (status) {
            res.statusCode = status;
            res.headersSent = true;
        }),
        end: jest.fn(function (dados) {
            res.body = dados;
            res.writableEnded = true;
        })
    };

    return res;
};

describe("cartCriar", () => {
    let res;
    let consoleErrorSpy;

    beforeEach(() => {
        jest.clearAllMocks();

        res = criarRes();

        consoleErrorSpy = jest
            .spyOn(console, "error")
            .mockImplementation(() => {});
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    test("deve criar um carrinho e responder com status 201", async () => {
        const resultado = {
            rows: [{ id: 1, usuario_id: 10 }]
        };

        cartRepository.criar.mockResolvedValue(resultado);

        const req = criarReq(10);

        await cartCriar(req, res);

        expect(cartRepository.criar).toHaveBeenCalledWith(10);
        expect(res.writeHead).toHaveBeenCalledWith(201, {
            "Content-Type": "application/json; charset=utf-8"
        });
        expect(JSON.parse(res.body)).toEqual(resultado.rows[0]);
        expect(res.writableEnded).toBe(true);
    });

    test("deve responder 401 quando o usuário não estiver autenticado", async () => {
        const req = criarReq(undefined);

        await cartCriar(req, res);

        expect(res.statusCode).toBe(401);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Usuário não autenticado."
        });
        expect(cartRepository.criar).not.toHaveBeenCalled();
    });

    test.each([0, -1, 1.5, "abc", NaN, Infinity])(
        "deve responder 401 para um ID inválido: %s",
        async (usuarioId) => {
            const req = criarReq(usuarioId);

            await cartCriar(req, res);

            expect(res.statusCode).toBe(401);
            expect(JSON.parse(res.body)).toEqual({
                mensagem: "Usuário não autenticado."
            });
            expect(cartRepository.criar).not.toHaveBeenCalled();
        }
    );

    test("deve responder 400 quando o JSON for inválido", async () => {
        const req = criarReq(10, "{json inválido}");

        await cartCriar(req, res);

        expect(res.statusCode).toBe(400);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Corpo da requisição JSON inválido."
        });
        expect(cartRepository.criar).not.toHaveBeenCalled();
    });

    test("deve aceitar um corpo vazio", async () => {
        const resultado = {
            rows: [{ id: 2, usuario_id: 10 }]
        };

        cartRepository.criar.mockResolvedValue(resultado);

        const req = criarReq(10);

        await cartCriar(req, res);

        expect(cartRepository.criar).toHaveBeenCalledWith(10);
        expect(res.statusCode).toBe(201);
        expect(JSON.parse(res.body)).toEqual(resultado.rows[0]);
    });

    test("deve responder 413 quando o corpo for muito grande", async () => {
        const req = criarReq(10, "a".repeat(1024 * 1024 + 1));

        await cartCriar(req, res);

        expect(res.statusCode).toBe(413);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Corpo da requisição muito grande."
        });
        expect(cartRepository.criar).not.toHaveBeenCalled();
    });

    test("deve responder 400 quando ocorrer erro ao receber a requisição", async () => {
        const req = new EventEmitter();

        req.usuario = { id: 10 };

        req[Symbol.asyncIterator] = async function* () {
            throw new Error("Erro de leitura");
        };

        await cartCriar(req, res);

        expect(res.statusCode).toBe(400);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Erro ao receber os dados da requisição."
        });
        expect(cartRepository.criar).not.toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalled();
    });

    test("deve responder 500 quando o repository lançar um erro", async () => {
        cartRepository.criar.mockRejectedValue(
            new Error("Erro no banco de dados")
        );

        const req = criarReq(10);

        await cartCriar(req, res);

        expect(cartRepository.criar).toHaveBeenCalledWith(10);
        expect(res.statusCode).toBe(500);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Erro interno ao criar o carrinho."
        });
        expect(consoleErrorSpy).toHaveBeenCalled();
    });

    test("não deve enviar outra resposta se os headers já foram enviados", async () => {
        const req = criarReq(10);

        res.headersSent = true;

        cartRepository.criar.mockResolvedValue({
            rows: [{ id: 99 }]
        });

        await cartCriar(req, res);

        expect(res.writeHead).not.toHaveBeenCalled();
        expect(res.end).not.toHaveBeenCalled();
    });

    test("não deve enviar outra resposta se a resposta já foi encerrada", async () => {
        const req = criarReq(10);

        res.writableEnded = true;

        cartRepository.criar.mockResolvedValue({
            rows: [{ id: 99 }]
        });

        await cartCriar(req, res);

        expect(res.writeHead).not.toHaveBeenCalled();
        expect(res.end).not.toHaveBeenCalled();
    });
});
