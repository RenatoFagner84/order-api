
jest.mock("../../src/repositories/cartRepository", () => ({
    consultarItens: jest.fn()
}));

const cartRepository = require("../../src/repositories/cartRepository");
const cartConsultarItens = require("../../src/controllers/cart/consultarItens");

const criarRequisicao = (url = "/cart/10/itens") => ({
    url
});

const criarResposta = (opcoes = {}) => {
    const res = {
        status: null,
        headers: null,
        body: "",
        writableEnded: opcoes.writableEnded ?? false,
        headersSent: opcoes.headersSent ?? false,
        writeHead: jest.fn((status, headers) => {
            res.status = status;
            res.headers = headers;
            res.headersSent = true;
        }),
        end: jest.fn((body = "") => {
            res.body = body;
            res.writableEnded = true;
        })
    };

    return res;
};

describe("cartConsultarItens", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        cartRepository.consultarItens.mockResolvedValue({
            rows: [
                {
                    id: 1,
                    carrinho_id: 10,
                    produto_id: 20,
                    quantidade: 2
                },
                {
                    id: 2,
                    carrinho_id: 10,
                    produto_id: 30,
                    quantidade: 1
                }
            ]
        });

        jest.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("deve consultar os itens do carrinho e retornar 200", async () => {
        const req = criarRequisicao("/cart/10/itens");
        const res = criarResposta();

        await cartConsultarItens(req, res);

        expect(res.status).toBe(200);
        expect(res.headers).toEqual({
            "Content-Type": "application/json; charset=utf-8"
        });
        expect(JSON.parse(res.body)).toEqual([
            {
                id: 1,
                carrinho_id: 10,
                produto_id: 20,
                quantidade: 2
            },
            {
                id: 2,
                carrinho_id: 10,
                produto_id: 30,
                quantidade: 1
            }
        ]);
        expect(cartRepository.consultarItens).toHaveBeenCalledWith(10);
        expect(cartRepository.consultarItens).toHaveBeenCalledTimes(1);
    });

    it("deve retornar uma lista vazia quando o carrinho não tiver itens", async () => {
        cartRepository.consultarItens.mockResolvedValue({
            rows: []
        });

        const req = criarRequisicao("/cart/10/itens");
        const res = criarResposta();

        await cartConsultarItens(req, res);

        expect(res.status).toBe(200);
        expect(JSON.parse(res.body)).toEqual([]);
        expect(cartRepository.consultarItens).toHaveBeenCalledWith(10);
    });

    it.each([
        "/cart/0/itens",
        "/cart/-1/itens",
        "/cart/abc/itens",
        "/cart/1.5/itens",
        "/cart/1e2/itens",
        "/cart/9007199254740992/itens",
        "/cart//itens",
        "/cart/%20/itens",
        "/cart/10abc/itens"
    ])("deve retornar 400 para URL com ID inválido: %s", async (url) => {
        const req = criarRequisicao(url);
        const res = criarResposta();

        await cartConsultarItens(req, res);

        expect(res.status).toBe(400);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "ID do carrinho inválido."
        });
        expect(cartRepository.consultarItens).not.toHaveBeenCalled();
    });

    it("deve aceitar um ID válido com vários dígitos", async () => {
        const req = criarRequisicao("/cart/123/itens");
        const res = criarResposta();

        await cartConsultarItens(req, res);

        expect(res.status).toBe(200);
        expect(cartRepository.consultarItens).toHaveBeenCalledWith(123);
    });

    it("deve retornar 500 quando o repositório lançar um erro", async () => {
        const erro = new Error("Erro no banco");

        cartRepository.consultarItens.mockRejectedValue(erro);

        const req = criarRequisicao("/cart/10/itens");
        const res = criarResposta();

        await cartConsultarItens(req, res);

        expect(res.status).toBe(500);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Erro interno ao consultar os itens do carrinho."
        });
        expect(console.error).toHaveBeenCalledWith(
            "[ERRO AO CONSULTAR ITENS DO CARRINHO]",
            erro
        );
    });

    it("não deve enviar outra resposta quando writableEnded for true", async () => {
        const req = criarRequisicao("/cart/10/itens");
        const res = criarResposta({
            writableEnded: true
        });

        await cartConsultarItens(req, res);

        expect(res.writeHead).not.toHaveBeenCalled();
        expect(res.end).not.toHaveBeenCalled();
        expect(cartRepository.consultarItens).toHaveBeenCalledWith(10);
    });

    it("não deve enviar outra resposta quando headersSent for true", async () => {
        const req = criarRequisicao("/cart/10/itens");
        const res = criarResposta({
            headersSent: true
        });

        await cartConsultarItens(req, res);

        expect(res.writeHead).not.toHaveBeenCalled();
        expect(res.end).not.toHaveBeenCalled();
        expect(cartRepository.consultarItens).toHaveBeenCalledWith(10);
    });

    it("não deve enviar resposta de erro quando os cabeçalhos já tiverem sido enviados", async () => {
        cartRepository.consultarItens.mockRejectedValue(
            new Error("Erro no banco")
        );

        const req = criarRequisicao("/cart/10/itens");
        const res = criarResposta({
            headersSent: true
        });

        await cartConsultarItens(req, res);

        expect(res.writeHead).not.toHaveBeenCalled();
        expect(res.end).not.toHaveBeenCalled();
        expect(console.error).toHaveBeenCalled();
    });
});
