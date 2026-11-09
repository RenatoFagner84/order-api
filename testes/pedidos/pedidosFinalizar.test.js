jest.mock("../../src/db.js", () => ({
    connect: jest.fn()
}));

const pool = require("../../src/db.js");
const pedidosFinalizar = require("../../src/controllers/pedidos/pedidosFinalizar.js");

const criarResposta = () => {
    const res = {
        statusCode: null,
        headers: null,
        body: null,
        writableEnded: false,
        headersSent: false,
        writeHead: jest.fn((status, headers) => {
            res.statusCode = status;
            res.headers = headers;
            res.headersSent = true;
        }),
        end: jest.fn((dados) => {
            res.body = dados ? JSON.parse(dados) : null;
            res.writableEnded = true;
        })
    };

    return res;
};

const criarRequisicao = (url = "/carrinho/1", usuarioId = 10) => ({
    url,
    usuario: { id: usuarioId }
});

const criarClient = (consultas = []) => {
    const client = {
        query: jest.fn(),
        release: jest.fn()
    };

    for (const item of consultas) {
        client.query.mockResolvedValueOnce(item);
    }

    return client;
};

const resultado = (rows = []) => ({ rows });

describe("pedidosFinalizar", () => {
    let client;
    let req;
    let res;
    let erroSpy;

    beforeEach(() => {
        jest.clearAllMocks();

        req = criarRequisicao();
        res = criarResposta();

        client = criarClient();
        pool.connect.mockResolvedValue(client);

        erroSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        erroSpy.mockRestore();
    });

    test("deve finalizar o carrinho, criar o pedido e atualizar o estoque", async () => {
        client = criarClient([
            resultado(),
            resultado([
                {
                    id: 1,
                    user_id: 10,
                    status_id: 200,
                    oculto: false
                }
            ]),
            resultado([
                {
                    produto_id: 5,
                    quantidade: 2,
                    nome: "Teclado",
                    valor: "50.00",
                    quantidade_estoque: 10
                }
            ]),
            resultado([
                {
                    id: 100,
                    user_id: 10,
                    data_pedido: "2025-01-01",
                    status_id: 200,
                    oculto: false
                }
            ]),
            resultado([
                {
                    id: 200,
                    pedido_id: 100,
                    produto_id: 5,
                    quantidade: 2,
                    valor_unitario: 50
                }
            ]),
            resultado([
                {
                    id: 5,
                    nome: "Teclado",
                    quantidade: 8
                }
            ]),
            resultado()
        ]);

        pool.connect.mockResolvedValue(client);

        await pedidosFinalizar(req, res);

        expect(res.statusCode).toBe(201);
        expect(res.body).toEqual({
            mensagem: "Pedido finalizado com sucesso.",
            pedido: {
                id: 100,
                user_id: 10,
                data_pedido: "2025-01-01",
                status_id: 200,
                oculto: false,
                produtos: [
                    {
                        id: 200,
                        pedido_id: 100,
                        produto_id: 5,
                        quantidade: 2,
                        valor_unitario: 50,
                        nome: "Teclado",
                        estoque_atual: 8
                    }
                ]
            }
        });

        expect(client.query).toHaveBeenNthCalledWith(1, "BEGIN");
        expect(client.query).toHaveBeenCalledWith("COMMIT");
        expect(client.query).toHaveBeenCalledWith(
            expect.stringContaining("UPDATE carrinho"),
            [1]
        );
        expect(client.release).toHaveBeenCalledTimes(1);
    });

    test.each([
        ["/carrinho/abc", "ID do carrinho inválido."],
        ["/carrinho/0", "ID do carrinho inválido."],
        ["/carrinho/-1", "ID do carrinho inválido."],
        ["/carrinho/1.5", "ID do carrinho inválido."],
        ["/carrinho/9007199254740992", "ID do carrinho inválido."]
    ])("deve rejeitar a URL %s", async (url, mensagem) => {
        req = criarRequisicao(url);

        await pedidosFinalizar(req, res);

        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual({ mensagem });
        expect(pool.connect).not.toHaveBeenCalled();
    });

    test("deve rejeitar usuário não autenticado", async () => {
        req = { url: "/carrinho/1" };

        await pedidosFinalizar(req, res);

        expect(res.statusCode).toBe(401);
        expect(res.body).toEqual({
            mensagem: "Usuário não autenticado."
        });
        expect(pool.connect).not.toHaveBeenCalled();
    });

    test.each([0, -1, 1.5, "abc", Number.MAX_SAFE_INTEGER + 1])(
        "deve rejeitar ID de usuário inválido: %s",
        async (usuarioId) => {
            req = criarRequisicao("/carrinho/1", usuarioId);

            await pedidosFinalizar(req, res);

            expect(res.statusCode).toBe(401);
            expect(res.body).toEqual({
                mensagem: "Usuário não autenticado."
            });
            expect(pool.connect).not.toHaveBeenCalled();
        }
    );

    test("deve retornar 404 quando o carrinho não existir", async () => {
        client = criarClient([
            resultado(),
            resultado([])
        ]);
        pool.connect.mockResolvedValue(client);

        await pedidosFinalizar(req, res);

        expect(res.statusCode).toBe(404);
        expect(res.body).toEqual({
            mensagem: "Carrinho não encontrado."
        });
        expect(client.query).toHaveBeenCalledWith("ROLLBACK");
        expect(client.release).toHaveBeenCalledTimes(1);
    });

    test("deve retornar 403 quando o carrinho pertencer a outro usuário", async () => {
        client = criarClient([
            resultado(),
            resultado([
                {
                    id: 1,
                    user_id: 20,
                    status_id: 200,
                    oculto: false
                }
            ])
        ]);
        pool.connect.mockResolvedValue(client);

        await pedidosFinalizar(req, res);

        expect(res.statusCode).toBe(403);
        expect(res.body).toEqual({
            mensagem: "Você não tem permissão para finalizar este carrinho."
        });
        expect(client.query).toHaveBeenCalledWith("ROLLBACK");
        expect(client.release).toHaveBeenCalledTimes(1);
    });

    test("deve retornar 409 quando o carrinho estiver oculto", async () => {
        client = criarClient([
            resultado(),
            resultado([
                {
                    id: 1,
                    user_id: 10,
                    status_id: 200,
                    oculto: true
                }
            ])
        ]);
        pool.connect.mockResolvedValue(client);

        await pedidosFinalizar(req, res);

        expect(res.statusCode).toBe(409);
        expect(res.body).toEqual({
            mensagem: "Este carrinho não está disponível."
        });
        expect(client.query).toHaveBeenCalledWith("ROLLBACK");
    });

    test("deve retornar 409 quando o carrinho já estiver finalizado", async () => {
        client = criarClient([
            resultado(),
            resultado([
                {
                    id: 1,
                    user_id: 10,
                    status_id: 401,
                    oculto: false
                }
            ])
        ]);
        pool.connect.mockResolvedValue(client);

        await pedidosFinalizar(req, res);

        expect(res.statusCode).toBe(409);
        expect(res.body).toEqual({
            mensagem: "Este carrinho já foi finalizado."
        });
        expect(client.query).toHaveBeenCalledWith("ROLLBACK");
    });

    test("deve retornar 400 quando o carrinho estiver vazio", async () => {
        client = criarClient([
            resultado(),
            resultado([
                {
                    id: 1,
                    user_id: 10,
                    status_id: 200,
                    oculto: false
                }
            ]),
            resultado([])
        ]);
        pool.connect.mockResolvedValue(client);

        await pedidosFinalizar(req, res);

        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual({
            mensagem: "Não é possível finalizar um carrinho vazio."
        });
        expect(client.query).toHaveBeenCalledWith("ROLLBACK");
    });

    test("deve rejeitar produto com estoque insuficiente", async () => {
        client = criarClient([
            resultado(),
            resultado([
                {
                    id: 1,
                    user_id: 10,
                    status_id: 200,
                    oculto: false
                }
            ]),
            resultado([
                {
                    produto_id: 5,
                    quantidade: 8,
                    nome: "Teclado",
                    valor: "50.00",
                    quantidade_estoque: 3
                }
            ])
        ]);
        pool.connect.mockResolvedValue(client);

        await pedidosFinalizar(req, res);

        expect(res.statusCode).toBe(409);
        expect(res.body).toEqual({
            mensagem: "Estoque insuficiente ou quantidade inválida.",
            produtos: [
                {
                    produto_id: 5,
                    nome: "Teclado",
                    quantidade_solicitada: 8,
                    quantidade_estoque: 3
                }
            ]
        });
        expect(client.query).toHaveBeenCalledWith("ROLLBACK");
    });

    test("deve rejeitar quantidade inválida no produto", async () => {
        client = criarClient([
            resultado(),
            resultado([
                {
                    id: 1,
                    user_id: 10,
                    status_id: 200,
                    oculto: false
                }
            ]),
            resultado([
                {
                    produto_id: 5,
                    quantidade: 0,
                    nome: "Teclado",
                    valor: "50.00",
                    quantidade_estoque: 10
                }
            ])
        ]);
        pool.connect.mockResolvedValue(client);

        await pedidosFinalizar(req, res);

        expect(res.statusCode).toBe(409);
        expect(res.body).toEqual({
            mensagem: "Estoque insuficiente ou quantidade inválida.",
            produtos: [
                {
                    produto_id: 5,
                    nome: "Teclado",
                    quantidade_solicitada: 0,
                    quantidade_estoque: 10
                }
            ]
        });
        expect(client.query).toHaveBeenCalledWith("ROLLBACK");
    });

    test("deve retornar 500 quando ocorrer erro ao conectar ao banco", async () => {
        pool.connect.mockRejectedValue(new Error("Erro de conexão"));

        await pedidosFinalizar(req, res);

        expect(res.statusCode).toBe(500);
        expect(res.body).toEqual({
            mensagem: "Erro interno ao finalizar o pedido."
        });
    });

    test("deve desfazer a transação quando ocorrer erro durante a consulta", async () => {
        client.query
            .mockResolvedValueOnce(resultado())
            .mockRejectedValueOnce(new Error("Erro na consulta"));

        pool.connect.mockResolvedValue(client);

        await pedidosFinalizar(req, res);

        expect(res.statusCode).toBe(500);
        expect(res.body).toEqual({
            mensagem: "Erro interno ao finalizar o pedido."
        });
        expect(client.query).toHaveBeenCalledWith("ROLLBACK");
        expect(client.release).toHaveBeenCalledTimes(1);
    });

    test("deve retornar 500 e desfazer a transação se não conseguir atualizar o estoque", async () => {
        client = criarClient([
            resultado(),
            resultado([
                {
                    id: 1,
                    user_id: 10,
                    status_id: 200,
                    oculto: false
                }
            ]),
            resultado([
                {
                    produto_id: 5,
                    quantidade: 2,
                    nome: "Teclado",
                    valor: "50.00",
                    quantidade_estoque: 10
                }
            ]),
            resultado([
                {
                    id: 100,
                    user_id: 10,
                    data_pedido: "2025-01-01",
                    status_id: 200,
                    oculto: false
                }
            ]),
            resultado([
                {
                    id: 200,
                    pedido_id: 100,
                    produto_id: 5,
                    quantidade: 2,
                    valor_unitario: 50
                }
            ]),
            resultado([])
        ]);
        pool.connect.mockResolvedValue(client);

        await pedidosFinalizar(req, res);

        expect(res.statusCode).toBe(500);
        expect(res.body).toEqual({
            mensagem: "Erro interno ao finalizar o pedido."
        });
        expect(client.query).toHaveBeenCalledWith("ROLLBACK");
        expect(client.release).toHaveBeenCalledTimes(1);
    });

    test("não deve escrever a resposta novamente se ela já tiver sido enviada", async () => {
        res.writableEnded = true;

        await pedidosFinalizar(
            criarRequisicao("/carrinho/invalido", 10),
            res
        );

        expect(res.writeHead).not.toHaveBeenCalled();
        expect(res.end).not.toHaveBeenCalled();
        expect(pool.connect).not.toHaveBeenCalled();
    });
});
