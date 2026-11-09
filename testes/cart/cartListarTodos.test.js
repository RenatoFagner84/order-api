
jest.mock("../../src/repositories/cartRepository", () => ({
    listarTodos: jest.fn()
}));

const cartRepository = require("../../src/repositories/cartRepository");
const cartListarTodos = require("../../src/controllers/cart/cartListarTodos");

const criarRequisicao = (...args) => ({
    usuario: args.length > 0 ? args[0] : { id: 1 }
});

const criarResposta = (opcoes = {}) => {
    const res = {
        status: null,
        headers: null,
        body: "",
        writableEnded: opcoes.writableEnded ?? false,
        writeHead: jest.fn((status, headers) => {
            res.status = status;
            res.headers = headers;
        }),
        end: jest.fn((body = "") => {
            res.body = body;
            res.writableEnded = true;
        })
    };

    return res;
};

describe("cartListarTodos", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        cartRepository.listarTodos.mockResolvedValue({
            rows: [
                {
                    id: 10,
                    user_id: 1,
                    status: "aberto"
                },
                {
                    id: 11,
                    user_id: 1,
                    status: "finalizado"
                }
            ]
        });

        jest.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("deve listar todos os carrinhos do usuário e retornar 200", async () => {
        const req = criarRequisicao();
        const res = criarResposta();

        await cartListarTodos(req, res);

        expect(res.status).toBe(200);
        expect(res.headers).toEqual({
            "Content-Type": "application/json; charset=utf-8"
        });
        expect(JSON.parse(res.body)).toEqual([
            {
                id: 10,
                user_id: 1,
                status: "aberto"
            },
            {
                id: 11,
                user_id: 1,
                status: "finalizado"
            }
        ]);
        expect(cartRepository.listarTodos).toHaveBeenCalledWith(1);
        expect(cartRepository.listarTodos).toHaveBeenCalledTimes(1);
    });

    it("deve retornar uma lista vazia quando o usuário não tiver carrinhos", async () => {
        cartRepository.listarTodos.mockResolvedValue({
            rows: []
        });

        const req = criarRequisicao();
        const res = criarResposta();

        await cartListarTodos(req, res);

        expect(res.status).toBe(200);
        expect(JSON.parse(res.body)).toEqual([]);
        expect(cartRepository.listarTodos).toHaveBeenCalledWith(1);
    });

    it("deve retornar 401 quando o usuário não estiver autenticado", async () => {
        const req = criarRequisicao(undefined);
        const res = criarResposta();

        await cartListarTodos(req, res);

        expect(res.status).toBe(401);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Usuário não autenticado."
        });
        expect(cartRepository.listarTodos).not.toHaveBeenCalled();
    });

    it.each([
        null,
        {},
        { id: undefined },
        { id: null },
        { id: "" },
        { id: "abc" },
        { id: 0 },
        { id: -1 },
        { id: 1.5 },
        { id: Number.MAX_SAFE_INTEGER + 1 }
    ])("deve retornar 401 para usuário inválido: %j", async (usuario) => {
        const req = criarRequisicao(usuario);
        const res = criarResposta();

        await cartListarTodos(req, res);

        expect(res.status).toBe(401);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Usuário não autenticado."
        });
        expect(cartRepository.listarTodos).not.toHaveBeenCalled();
    });

    it("deve aceitar um ID de usuário numérico representado como string", async () => {
        const req = criarRequisicao({ id: "5" });
        const res = criarResposta();

        await cartListarTodos(req, res);

        expect(res.status).toBe(200);
        expect(cartRepository.listarTodos).toHaveBeenCalledWith(5);
    });

    it("deve retornar 500 quando o repositório lançar um erro", async () => {
        cartRepository.listarTodos.mockRejectedValue(
            new Error("Erro no banco")
        );

        const req = criarRequisicao();
        const res = criarResposta();

        await cartListarTodos(req, res);

        expect(res.status).toBe(500);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Erro interno ao listar carrinhos."
        });
        expect(console.error).toHaveBeenCalledWith(
            "Erro ao listar carrinhos:",
            expect.any(Error)
        );
    });

    it("não deve enviar outra resposta quando a resposta já tiver terminado", async () => {
        cartRepository.listarTodos.mockRejectedValue(
            new Error("Erro no banco")
        );

        const req = criarRequisicao();
        const res = criarResposta({
            writableEnded: true
        });

        await cartListarTodos(req, res);

        expect(res.writeHead).not.toHaveBeenCalled();
        expect(res.end).not.toHaveBeenCalled();
    });
});
