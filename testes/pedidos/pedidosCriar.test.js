const { Readable } = require("stream");

jest.mock("../../src/repositories/pedidosRepository.js", () => ({
    criar: jest.fn()
}));

const pedidosRepository = require("../../src/repositories/pedidosRepository.js");
const pedidosCriar = require("../../src/controllers/pedidos/pedidosCriar.js");

describe("pedidosCriar", () => {
    const executar = async (body = "", usuarioId = 10) => {
        const req = Readable.from(body ? [body] : []);
        req.url = "/pedido";
        req.method = "POST";
        req.usuario = usuarioId === null ? undefined : { id: usuarioId };

        const res = {
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

        await pedidosCriar(req, res);

        return { req, res };
    };

    beforeEach(() => {
        jest.clearAllMocks();

        pedidosRepository.criar.mockResolvedValue({
            rows: [
                {
                    id: 1,
                    user_id: 10,
                    status_id: 200
                }
            ]
        });
    });

    test("deve criar um pedido com sucesso", async () => {
        const { res } = await executar();

        expect(res.statusCode).toBe(201);
        expect(res.body).toEqual({
            id: 1,
            user_id: 10,
            status_id: 200
        });
        expect(pedidosRepository.criar).toHaveBeenCalledTimes(1);
        expect(pedidosRepository.criar).toHaveBeenCalledWith(10);
    });

    test("deve aceitar um corpo JSON válido", async () => {
        const { res } = await executar(
            JSON.stringify({ produto: "Teste" })
        );

        expect(res.statusCode).toBe(201);
        expect(pedidosRepository.criar).toHaveBeenCalledWith(10);
    });

    test("deve rejeitar usuário não autenticado", async () => {
        const { res } = await executar("", null);

        expect(res.statusCode).toBe(401);
        expect(res.body).toEqual({
            mensagem: "Usuário não autenticado."
        });
        expect(pedidosRepository.criar).not.toHaveBeenCalled();
    });

    test("deve rejeitar ID de usuário igual a zero", async () => {
        const { res } = await executar("", 0);

        expect(res.statusCode).toBe(401);
        expect(res.body).toEqual({
            mensagem: "Usuário não autenticado."
        });
        expect(pedidosRepository.criar).not.toHaveBeenCalled();
    });

    test.each([
        -1,
        1.5,
        "abc",
        Number.MAX_SAFE_INTEGER + 1
    ])("deve rejeitar ID de usuário inválido: %s", async (usuarioId) => {
        const { res } = await executar("", usuarioId);

        expect(res.statusCode).toBe(401);
        expect(res.body).toEqual({
            mensagem: "Usuário autenticado inválido."
        });
        expect(pedidosRepository.criar).not.toHaveBeenCalled();
    });

    test("deve rejeitar JSON inválido", async () => {
        const { res } = await executar("{ json inválido }");

        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual({
            mensagem: "Corpo da requisição JSON inválido."
        });
        expect(pedidosRepository.criar).not.toHaveBeenCalled();
    });

    test("deve aceitar corpo vazio", async () => {
        const { res } = await executar("");

        expect(res.statusCode).toBe(201);
        expect(pedidosRepository.criar).toHaveBeenCalledWith(10);
    });

    test("deve rejeitar corpo maior que 1 MB", async () => {
        const corpoGrande = "a".repeat(1024 * 1024 + 1);
        const { res } = await executar(corpoGrande);

        expect(res.statusCode).toBe(413);
        expect(res.body).toEqual({
            mensagem: "Corpo da requisição muito grande."
        });
        expect(pedidosRepository.criar).not.toHaveBeenCalled();
    });

    test("deve retornar erro 500 quando o repositório não retornar linhas", async () => {
        pedidosRepository.criar.mockResolvedValue({
            rows: []
        });

        const { res } = await executar();

        expect(res.statusCode).toBe(500);
        expect(res.body).toEqual({
            mensagem: "Não foi possível criar o pedido."
        });
    });

    test("deve retornar erro 500 quando o repositório não retornar rows", async () => {
        pedidosRepository.criar.mockResolvedValue({});

        const { res } = await executar();

        expect(res.statusCode).toBe(500);
        expect(res.body).toEqual({
            mensagem: "Não foi possível criar o pedido."
        });
    });

    test("deve retornar erro 500 quando o repositório falhar", async () => {
        pedidosRepository.criar.mockRejectedValue(
            new Error("Erro no banco de dados")
        );

        const { res } = await executar();

        expect(res.statusCode).toBe(500);
        expect(res.body).toEqual({
            mensagem: "Erro interno ao criar o pedido."
        });
    });
});
