jest.mock("../../src/repositories/produtosPedidoRepository", () => ({
    lerTudo: jest.fn()
}));

const produtosPedidoRepository = require("../../src/repositories/produtosPedidoRepository");
const produtosPedidoLer = require("../../src/controllers/produtosPedidos/produtosPedidoLer");

const criarRequisicao = () => ({});

const criarResposta = (opcoes = {}) => ({
    status: null,
    headers: null,
    body: null,
    writableEnded: opcoes.writableEnded ?? false,
    headersSent: opcoes.headersSent ?? false,

    writeHead(status, headers) {
        this.status = status;
        this.headers = headers;
        this.headersSent = true;
    },

    end(body) {
        this.body = body;
        this.writableEnded = true;
    }
});

describe("produtosPedidoLer", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test("deve listar todos os produtos dos pedidos e retornar 200", async () => {
        const produtos = [
            {
                pedido_id: 1,
                produto_id: 10,
                quantidade: 2,
                valor_unitario: 15.5
            },
            {
                pedido_id: 2,
                produto_id: 20,
                quantidade: 1,
                valor_unitario: 30
            }
        ];

        produtosPedidoRepository.lerTudo.mockResolvedValue({
            rows: produtos
        });

        const req = criarRequisicao();
        const res = criarResposta();

        await produtosPedidoLer(req, res);

        expect(produtosPedidoRepository.lerTudo).toHaveBeenCalledTimes(1);
        expect(res.status).toBe(200);
        expect(res.headers).toEqual({
            "Content-Type": "application/json; charset=utf-8"
        });
        expect(JSON.parse(res.body)).toEqual(produtos);
        expect(res.writableEnded).toBe(true);
    });

    test("deve retornar uma lista vazia quando não houver produtos", async () => {
        produtosPedidoRepository.lerTudo.mockResolvedValue({
            rows: []
        });

        const req = criarRequisicao();
        const res = criarResposta();

        await produtosPedidoLer(req, res);

        expect(res.status).toBe(200);
        expect(JSON.parse(res.body)).toEqual([]);
    });

    test("deve retornar 500 quando o repositório lançar um erro", async () => {
        produtosPedidoRepository.lerTudo.mockRejectedValue(
            new Error("Erro no banco de dados")
        );

        const req = criarRequisicao();
        const res = criarResposta();

        await produtosPedidoLer(req, res);

        expect(produtosPedidoRepository.lerTudo).toHaveBeenCalledTimes(1);
        expect(res.status).toBe(500);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Erro interno ao listar produtos do pedido."
        });
        expect(console.error).toHaveBeenCalledWith(
            "[ERRO AO LISTAR PRODUTOS DO PEDIDO]",
            expect.any(Error)
        );
        expect(res.writableEnded).toBe(true);
    });

    test("não deve enviar resposta se ela já tiver sido encerrada", async () => {
        produtosPedidoRepository.lerTudo.mockResolvedValue({
            rows: []
        });

        const req = criarRequisicao();
        const res = criarResposta({ writableEnded: true });

        await produtosPedidoLer(req, res);

        expect(res.status).toBeNull();
        expect(res.body).toBeNull();
    });

    test("não deve enviar resposta se os cabeçalhos já tiverem sido enviados", async () => {
        produtosPedidoRepository.lerTudo.mockResolvedValue({
            rows: []
        });

        const req = criarRequisicao();
        const res = criarResposta({ headersSent: true });

        await produtosPedidoLer(req, res);

        expect(res.status).toBeNull();
        expect(res.body).toBeNull();
    });
});