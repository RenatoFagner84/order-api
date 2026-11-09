
jest.mock("../../src/repositories/produtoRepository", () => ({
    buscarPorNome: jest.fn()
}));

const produtoRepository = require("../../src/repositories/produtoRepository");
const produtosBuscar = require("../../src/controllers/produtos/produtosBuscar");

const criarReq = (url) => ({
    url
});

const criarRes = () => ({
    status: null,
    headers: null,
    body: null,
    headersSent: false,
    writableEnded: false,

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

describe("produtosBuscar", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        produtoRepository.buscarPorNome.mockResolvedValue({
            rows: [
                {
                    id: 1,
                    nome: "Teclado",
                    quantidade: 10,
                    valor: 99.90
                }
            ]
        });
    });

    it("deve retornar 200 e os produtos encontrados", async () => {
        const req = criarReq("/api/produtos/buscar?nome=Teclado");
        const res = criarRes();

        await produtosBuscar(req, res);

        expect(res.status).toBe(200);
        expect(JSON.parse(res.body)).toEqual([
            {
                id: 1,
                nome: "Teclado",
                quantidade: 10,
                valor: 99.90
            }
        ]);
        expect(produtoRepository.buscarPorNome).toHaveBeenCalledWith("Teclado");
    });

    it("deve remover espaços extras do nome", async () => {
        const req = criarReq("/api/produtos/buscar?nome=%20Teclado%20");
        const res = criarRes();

        await produtosBuscar(req, res);

        expect(res.status).toBe(200);
        expect(produtoRepository.buscarPorNome).toHaveBeenCalledWith("Teclado");
    });

    it("deve retornar 400 quando o nome não for informado", async () => {
        const req = criarReq("/api/produtos/buscar");
        const res = criarRes();

        await produtosBuscar(req, res);

        expect(res.status).toBe(400);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Informe o nome do produto"
        });
        expect(produtoRepository.buscarPorNome).not.toHaveBeenCalled();
    });

    it("deve retornar 400 quando o nome estiver vazio", async () => {
        const req = criarReq("/api/produtos/buscar?nome=");
        const res = criarRes();

        await produtosBuscar(req, res);

        expect(res.status).toBe(400);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Informe o nome do produto"
        });
        expect(produtoRepository.buscarPorNome).not.toHaveBeenCalled();
    });

    it("deve retornar 400 quando o nome contiver apenas espaços", async () => {
        const req = criarReq("/api/produtos/buscar?nome=%20%20%20");
        const res = criarRes();

        await produtosBuscar(req, res);

        expect(res.status).toBe(400);
        expect(produtoRepository.buscarPorNome).not.toHaveBeenCalled();
    });

    it("deve retornar 404 quando nenhum produto for encontrado", async () => {
        produtoRepository.buscarPorNome.mockResolvedValue({
            rows: []
        });

        const req = criarReq("/api/produtos/buscar?nome=Inexistente");
        const res = criarRes();

        await produtosBuscar(req, res);

        expect(res.status).toBe(404);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Produto não encontrado"
        });
    });

    it("deve retornar 500 quando o repositório retornar null", async () => {
        produtoRepository.buscarPorNome.mockResolvedValue(null);

        const req = criarReq("/api/produtos/buscar?nome=Teclado");
        const res = criarRes();

        await produtosBuscar(req, res);

        expect(res.status).toBe(500);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Erro interno ao buscar produtos."
        });
    });

    it("deve retornar 500 quando rows não for um array", async () => {
        produtoRepository.buscarPorNome.mockResolvedValue({
            rows: null
        });

        const req = criarReq("/api/produtos/buscar?nome=Teclado");
        const res = criarRes();

        await produtosBuscar(req, res);

        expect(res.status).toBe(500);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Erro interno ao buscar produtos."
        });
    });

    it("deve retornar 500 quando o repositório lançar um erro", async () => {
        const erro = new Error("Erro no banco de dados");
        const consoleSpy = jest
            .spyOn(console, "error")
            .mockImplementation(() => {});

        produtoRepository.buscarPorNome.mockRejectedValue(erro);

        const req = criarReq("/api/produtos/buscar?nome=Teclado");
        const res = criarRes();

        await produtosBuscar(req, res);

        expect(res.status).toBe(500);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Erro interno ao buscar produtos."
        });
        expect(consoleSpy).toHaveBeenCalledWith(
            "[ERRO AO BUSCAR PRODUTOS]",
            erro
        );

        consoleSpy.mockRestore();
    });

    it("não deve enviar outra resposta se os headers já tiverem sido enviados", async () => {
        const req = criarReq("/api/produtos/buscar?nome=Teclado");
        const res = criarRes();

        res.headersSent = true;

        await produtosBuscar(req, res);

        expect(res.status).toBeNull();
        expect(res.body).toBeNull();
    });

    it("não deve enviar outra resposta se a resposta já tiver terminado", async () => {
        const req = criarReq("/api/produtos/buscar?nome=Teclado");
        const res = criarRes();

        res.writableEnded = true;

        await produtosBuscar(req, res);

        expect(res.status).toBeNull();
        expect(res.body).toBeNull();
    });
});
