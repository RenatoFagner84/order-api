
jest.mock("../../src/repositories/cartRepository", () => ({
    consultar: jest.fn(),
    consultarItens: jest.fn()
}));

const cartRepository = require("../../src/repositories/cartRepository");
const cartConsultar = require("../../src/controllers/cart/cartConsultar");

const criarRequisicao = (opcoes = {}) => ({
    params: Object.prototype.hasOwnProperty.call(opcoes, "params")
        ? opcoes.params
        : { id: "10" },
    usuario: Object.prototype.hasOwnProperty.call(opcoes, "usuario")
        ? opcoes.usuario
        : { id: 1 }
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

describe("cartConsultar", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        cartRepository.consultar.mockResolvedValue({
            rows: [
                {
                    id: 10,
                    user_id: 1,
                    status: "aberto",
                    oculto: false
                }
            ]
        });

        cartRepository.consultarItens.mockResolvedValue({
            rows: [
                {
                    produto_id: 5,
                    quantidade: 2
                }
            ]
        });

        jest.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("deve consultar o carrinho e retornar 200", async () => {
        const req = criarRequisicao();
        const res = criarResposta();

        await cartConsultar(req, res);

        expect(res.status).toBe(200);
        expect(res.headers).toEqual({
            "Content-Type": "application/json; charset=utf-8"
        });
        expect(JSON.parse(res.body)).toEqual({
            id: 10,
            user_id: 1,
            status: "aberto",
            oculto: false,
            itens: [
                {
                    produto_id: 5,
                    quantidade: 2
                }
            ]
        });
        expect(cartRepository.consultar).toHaveBeenCalledWith(10);
        expect(cartRepository.consultarItens).toHaveBeenCalledWith(10);
    });

    it.each([
        undefined,
        null,
        "",
        "abc",
        "0",
        "-1",
        "1.5",
        String(Number.MAX_SAFE_INTEGER + 1)
    ])("deve retornar 400 para ID inválido: %s", async (id) => {
        const req = criarRequisicao({
            params: { id }
        });
        const res = criarResposta();

        await cartConsultar(req, res);

        expect(res.status).toBe(400);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "ID do carrinho inválido."
        });
        expect(cartRepository.consultar).not.toHaveBeenCalled();
    });

    it.each([
        undefined,
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
        const req = criarRequisicao({ usuario });
        const res = criarResposta();

        await cartConsultar(req, res);

        expect(res.status).toBe(401);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Usuário não autenticado."
        });
        expect(cartRepository.consultar).not.toHaveBeenCalled();
    });

    it("deve retornar 404 quando o carrinho não existir", async () => {
        cartRepository.consultar.mockResolvedValue({
            rows: []
        });

        const req = criarRequisicao();
        const res = criarResposta();

        await cartConsultar(req, res);

        expect(res.status).toBe(404);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Carrinho não encontrado."
        });
        expect(cartRepository.consultarItens).not.toHaveBeenCalled();
    });

    it("deve retornar 403 quando o carrinho pertencer a outro usuário", async () => {
        cartRepository.consultar.mockResolvedValue({
            rows: [
                {
                    id: 10,
                    user_id: 2,
                    status: "aberto",
                    oculto: false
                }
            ]
        });

        const req = criarRequisicao();
        const res = criarResposta();

        await cartConsultar(req, res);

        expect(res.status).toBe(403);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Você não tem permissão para consultar este carrinho."
        });
        expect(cartRepository.consultarItens).not.toHaveBeenCalled();
    });

    it("deve retornar um carrinho com uma lista vazia de itens", async () => {
        cartRepository.consultarItens.mockResolvedValue({
            rows: []
        });

        const req = criarRequisicao();
        const res = criarResposta();

        await cartConsultar(req, res);

        expect(res.status).toBe(200);
        expect(JSON.parse(res.body)).toEqual({
            id: 10,
            user_id: 1,
            status: "aberto",
            oculto: false,
            itens: []
        });
    });

    it("deve retornar 500 quando consultar o carrinho lançar um erro", async () => {
        cartRepository.consultar.mockRejectedValue(
            new Error("Erro no banco")
        );

        const req = criarRequisicao();
        const res = criarResposta();

        await cartConsultar(req, res);

        expect(res.status).toBe(500);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Erro interno ao consultar o carrinho."
        });
        expect(cartRepository.consultarItens).not.toHaveBeenCalled();
    });

    it("deve retornar 500 quando consultar os itens lançar um erro", async () => {
        cartRepository.consultarItens.mockRejectedValue(
            new Error("Erro no banco")
        );

        const req = criarRequisicao();
        const res = criarResposta();

        await cartConsultar(req, res);

        expect(res.status).toBe(500);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Erro interno ao consultar o carrinho."
        });
    });

    it("não deve enviar outra resposta se a resposta já tiver terminado", async () => {
        const req = criarRequisicao();
        const res = criarResposta({
            writableEnded: true
        });

        await cartConsultar(req, res);

        expect(res.writeHead).not.toHaveBeenCalled();
        expect(res.end).not.toHaveBeenCalled();
    });
});

