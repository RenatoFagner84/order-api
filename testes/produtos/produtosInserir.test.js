
jest.mock("../../src/repositories/produtoRepository", () => ({
    inserir: jest.fn(),
    inserirProduto: jest.fn()
}));

const produtoRepository = require("../../src/repositories/produtoRepository");
const produtosInserir = require("../../src/controllers/produtos/produtosInserir");

const criarReq = (dados, erro = null) => ({
    async *[Symbol.asyncIterator]() {
        if (erro) {
            throw erro;
        }

        yield dados;
    }
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

describe("produtosInserir", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        produtoRepository.inserir.mockResolvedValue({
            rows: []
        });

        produtoRepository.inserirProduto.mockResolvedValue({
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

    it("deve inserir um produto e retornar 201", async () => {
        const dados = {
            nome: "Teclado",
            quantidade: 10,
            valor: 99.90
        };

        const req = criarReq(JSON.stringify(dados));
        const res = criarRes();

        await produtosInserir(req, res);

        expect(res.status).toBe(201);
        expect(JSON.parse(res.body)).toEqual({
            id: 1,
            nome: "Teclado",
            quantidade: 10,
            valor: 99.90
        });

        expect(produtoRepository.inserir).toHaveBeenCalledWith("Teclado");
        expect(produtoRepository.inserirProduto).toHaveBeenCalledWith(
            "Teclado",
            10,
            99.90
        );
    });

    it("deve remover espaços extras do nome antes de inserir", async () => {
        const req = criarReq(JSON.stringify({
            nome: "  Teclado  ",
            quantidade: 10,
            valor: 99.90
        }));

        const res = criarRes();

        await produtosInserir(req, res);

        expect(res.status).toBe(201);
        expect(produtoRepository.inserir).toHaveBeenCalledWith("Teclado");
        expect(produtoRepository.inserirProduto).toHaveBeenCalledWith(
            "Teclado",
            10,
            99.90
        );
    });

    it("deve retornar 409 quando o produto já existir", async () => {
        produtoRepository.inserir.mockResolvedValue({
            rows: [{ id: 1, nome: "Teclado" }]
        });

        const req = criarReq(JSON.stringify({
            nome: "Teclado",
            quantidade: 10,
            valor: 99.90
        }));

        const res = criarRes();

        await produtosInserir(req, res);

        expect(res.status).toBe(409);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Produto já existe"
        });
        expect(produtoRepository.inserirProduto).not.toHaveBeenCalled();
    });

    it("deve retornar 400 quando o JSON for inválido", async () => {
        const req = criarReq("{nome: Teclado}");
        const res = criarRes();

        await produtosInserir(req, res);

        expect(res.status).toBe(400);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Corpo da requisição JSON inválido."
        });
        expect(produtoRepository.inserir).not.toHaveBeenCalled();
    });

    it.each([
        ["null", null],
        ["um array", []],
        ["uma string", "Teclado"],
        ["um número", 123],
        ["um booleano", true]
    ])("deve retornar 400 quando o corpo for %s", async (_, dados) => {
        const req = criarReq(JSON.stringify(dados));
        const res = criarRes();

        await produtosInserir(req, res);

        expect(res.status).toBe(400);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "O corpo da requisição deve ser um objeto JSON."
        });
        expect(produtoRepository.inserir).not.toHaveBeenCalled();
    });

    it.each([
        [{ quantidade: 10, valor: 99.90 }],
        [{ nome: "", quantidade: 10, valor: 99.90 }],
        [{ nome: "   ", quantidade: 10, valor: 99.90 }],
        [{ nome: 123, quantidade: 10, valor: 99.90 }],
        [{ nome: "Teclado", valor: 99.90 }],
        [{ nome: "Teclado", quantidade: null, valor: 99.90 }],
        [{ nome: "Teclado", quantidade: -1, valor: 99.90 }],
        [{ nome: "Teclado", quantidade: "abc", valor: 99.90 }],
        [{ nome: "Teclado", quantidade: 10, valor: null }],
        [{ nome: "Teclado", quantidade: 10, valor: -1 }],
        [{ nome: "Teclado", quantidade: 10, valor: "abc" }],
        [{ nome: "Teclado", quantidade: 10, valor: 99.90, extra: undefined }]
    ])("deve retornar 400 para dados inválidos: %j", async (dados) => {
        const req = criarReq(JSON.stringify(dados));
        const res = criarRes();

        await produtosInserir(req, res);

        if (dados.extra === undefined && Object.hasOwn(dados, "extra")) {
            expect(res.status).toBe(201);
            return;
        }

        expect(res.status).toBe(400);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Informe nome, quantidade e valor válidos."
        });
        expect(produtoRepository.inserir).not.toHaveBeenCalled();
        expect(produtoRepository.inserirProduto).not.toHaveBeenCalled();
    });

    it("deve aceitar quantidade e valor iguais a zero", async () => {
        const req = criarReq(JSON.stringify({
            nome: "Teclado",
            quantidade: 0,
            valor: 0
        }));

        const res = criarRes();

        await produtosInserir(req, res);

        expect(res.status).toBe(201);
        expect(produtoRepository.inserirProduto).toHaveBeenCalledWith(
            "Teclado",
            0,
            0
        );
    });

    it("deve converter quantidade e valor numéricos em strings para números", async () => {
        const req = criarReq(JSON.stringify({
            nome: "Teclado",
            quantidade: "10",
            valor: "99.90"
        }));

        const res = criarRes();

        await produtosInserir(req, res);

        expect(res.status).toBe(201);
        expect(produtoRepository.inserirProduto).toHaveBeenCalledWith(
            "Teclado",
            10,
            99.90
        );
    });

    it("deve retornar 400 quando ocorrer erro ao receber a requisição", async () => {
        const erro = new Error("Falha na leitura");
        const consoleSpy = jest
            .spyOn(console, "error")
            .mockImplementation(() => {});

        const req = criarReq("", erro);
        const res = criarRes();

        await produtosInserir(req, res);

        expect(res.status).toBe(400);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Erro ao receber os dados da requisição."
        });
        expect(produtoRepository.inserir).not.toHaveBeenCalled();

        consoleSpy.mockRestore();
    });

    it("deve retornar 413 quando o corpo exceder 1 MB", async () => {
        const req = criarReq("a".repeat(1024 * 1024 + 1));
        const res = criarRes();

        await produtosInserir(req, res);

        expect(res.status).toBe(413);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Corpo da requisição muito grande."
        });
        expect(produtoRepository.inserir).not.toHaveBeenCalled();
    });

    it("deve retornar 500 quando o repositório lançar um erro na verificação", async () => {
        const erro = new Error("Erro no banco de dados");
        const consoleSpy = jest
            .spyOn(console, "error")
            .mockImplementation(() => {});

        produtoRepository.inserir.mockRejectedValue(erro);

        const req = criarReq(JSON.stringify({
            nome: "Teclado",
            quantidade: 10,
            valor: 99.90
        }));

        const res = criarRes();

        await produtosInserir(req, res);

        expect(res.status).toBe(500);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Erro interno ao cadastrar produto."
        });

        consoleSpy.mockRestore();
    });

    it("deve retornar 500 quando ocorrer erro ao inserir o produto", async () => {
        const erro = new Error("Falha ao inserir");
        const consoleSpy = jest
            .spyOn(console, "error")
            .mockImplementation(() => {});

        produtoRepository.inserirProduto.mockRejectedValue(erro);

        const req = criarReq(JSON.stringify({
            nome: "Teclado",
            quantidade: 10,
            valor: 99.90
        }));

        const res = criarRes();

        await produtosInserir(req, res);

        expect(res.status).toBe(500);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Erro interno ao cadastrar produto."
        });

        consoleSpy.mockRestore();
    });

    it("não deve enviar outra resposta se os headers já tiverem sido enviados", async () => {
        const req = criarReq(JSON.stringify({
            nome: "Teclado",
            quantidade: 10,
            valor: 99.90
        }));

        const res = criarRes();
        res.headersSent = true;

        await produtosInserir(req, res);

        expect(res.status).toBeNull();
        expect(res.body).toBeNull();
    });

    it("não deve enviar outra resposta se a resposta já tiver terminado", async () => {
        const req = criarReq(JSON.stringify({
            nome: "Teclado",
            quantidade: 10,
            valor: 99.90
        }));

        const res = criarRes();
        res.writableEnded = true;

        await produtosInserir(req, res);

        expect(res.status).toBeNull();
        expect(res.body).toBeNull();
    });
});
