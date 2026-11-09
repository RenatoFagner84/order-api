const pedidosRepository = require("../../src/repositories/pedidosRepository");
const roleRepository = require("../../src/repositories/roleRepository");
const pedidosHistoricoStatus = require("../../src/controllers/pedidos/pedidosHistoricoStatus");

jest.mock("../../src/repositories/pedidosRepository");
jest.mock("../../src/repositories/roleRepository");

describe("pedidosHistoricoStatus", () => {
    let req;
    let res;

    const pedido = {
        id: 10,
        user_id: 5,
        oculto: false,
        status_id: 200
    };

    const historico = [
        {
            id: 1,
            pedido_id: 10,
            status_id: 200,
            data_alteracao: "2026-01-01T10:00:00.000Z"
        },
        {
            id: 2,
            pedido_id: 10,
            status_id: 300,
            data_alteracao: "2026-01-02T10:00:00.000Z"
        }
    ];

    const criarResponse = () => ({
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
    });

    const executar = async ({
        url = "/pedidos/10",
        usuarioId = 5,
        usuarioAusente = false
    } = {}) => {
        req = {
            url,
            usuario: usuarioAusente ? undefined : { id: usuarioId }
        };

        res = criarResponse();

        await pedidosHistoricoStatus(req, res);

        return { req, res };
    };

    beforeEach(() => {
        jest.clearAllMocks();

        pedidosRepository.consultar.mockResolvedValue({
            rows: [{ ...pedido }]
        });

        pedidosRepository.lerHistoricoStatus.mockResolvedValue({
            rows: historico
        });

        roleRepository.lerPorUser.mockResolvedValue({
            rows: []
        });
    });

    test("deve consultar o histórico do pedido com sucesso", async () => {
        const { res } = await executar();

        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual(historico);
        expect(res.headers["Content-Type"]).toBe(
            "application/json; charset=utf-8"
        );

        expect(pedidosRepository.consultar).toHaveBeenCalledWith(10);
        expect(pedidosRepository.lerHistoricoStatus).toHaveBeenCalledWith(10);
        expect(roleRepository.lerPorUser).not.toHaveBeenCalled();
    });

    test.each([
        ["abc"],
        ["0"],
        ["-1"],
        ["1.5"],
        ["9007199254740992"],
        [""]
    ])(
        "deve retornar 400 quando o ID do pedido for inválido: %s",
        async (id) => {
            const { res } = await executar({
                url: `/pedidos/${id}`
            });

            expect(res.statusCode).toBe(400);
            expect(res.body).toEqual({
                mensagem: "ID do pedido inválido."
            });

            expect(pedidosRepository.consultar).not.toHaveBeenCalled();
            expect(pedidosRepository.lerHistoricoStatus).not.toHaveBeenCalled();
        }
    );

    test("deve retornar 401 quando o usuário não estiver autenticado", async () => {
        const { res } = await executar({
            usuarioAusente: true
        });

        expect(res.statusCode).toBe(401);
        expect(res.body).toEqual({
            mensagem: "Usuário não autenticado."
        });

        expect(pedidosRepository.consultar).not.toHaveBeenCalled();
    });

    test.each([
        0,
        -1,
        1.5,
        "abc",
        Number.MAX_SAFE_INTEGER + 1
    ])(
        "deve retornar 401 quando o ID do usuário for inválido: %s",
        async (usuarioId) => {
            const { res } = await executar({ usuarioId });

            expect(res.statusCode).toBe(401);
            expect(res.body).toEqual({
                mensagem: "Usuário não autenticado."
            });

            expect(pedidosRepository.consultar).not.toHaveBeenCalled();
        }
    );

    test("deve retornar 404 quando o pedido não existir", async () => {
        pedidosRepository.consultar.mockResolvedValue({
            rows: []
        });

        const { res } = await executar();

        expect(res.statusCode).toBe(404);
        expect(res.body).toEqual({
            mensagem: "Pedido não encontrado."
        });

        expect(pedidosRepository.lerHistoricoStatus).not.toHaveBeenCalled();
    });

    test("deve retornar 404 quando o pedido estiver oculto", async () => {
        pedidosRepository.consultar.mockResolvedValue({
            rows: [{
                ...pedido,
                oculto: true
            }]
        });

        const { res } = await executar();

        expect(res.statusCode).toBe(404);
        expect(res.body).toEqual({
            mensagem: "Pedido não encontrado."
        });

        expect(pedidosRepository.lerHistoricoStatus).not.toHaveBeenCalled();
    });

    test("deve permitir que o próprio dono consulte o histórico", async () => {
        const { res } = await executar({
            usuarioId: 5
        });

        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual(historico);
        expect(roleRepository.lerPorUser).not.toHaveBeenCalled();
        expect(pedidosRepository.lerHistoricoStatus).toHaveBeenCalledWith(10);
    });

    test("deve retornar 403 quando outro usuário não tiver permissão", async () => {
        roleRepository.lerPorUser.mockResolvedValue({
            rows: [{ role: "user" }]
        });

        const { res } = await executar({
            usuarioId: 99
        });

        expect(res.statusCode).toBe(403);
        expect(res.body).toEqual({
            mensagem: "Você não tem permissão para consultar o histórico deste pedido."
        });

        expect(roleRepository.lerPorUser).toHaveBeenCalledWith(99);
        expect(pedidosRepository.lerHistoricoStatus).not.toHaveBeenCalled();
    });

    test.each([
        ["admin"],
        ["manager"],
        ["sac"],
        ["ADMIN"],
        [" Manager "],
        [" SAC "]
    ])(
        "deve permitir a consulta para o papel autorizado: %s",
        async (role) => {
            roleRepository.lerPorUser.mockResolvedValue({
                rows: [{ role }]
            });

            const { res } = await executar({
                usuarioId: 99
            });

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual(historico);
            expect(roleRepository.lerPorUser).toHaveBeenCalledWith(99);
            expect(pedidosRepository.lerHistoricoStatus).toHaveBeenCalledWith(10);
        }
    );

    test("deve retornar 403 quando o usuário não tiver papéis", async () => {
        roleRepository.lerPorUser.mockResolvedValue({
            rows: []
        });

        const { res } = await executar({
            usuarioId: 99
        });

        expect(res.statusCode).toBe(403);
        expect(res.body).toEqual({
            mensagem: "Você não tem permissão para consultar o histórico deste pedido."
        });
    });

    test("deve retornar 403 quando a resposta de papéis não contiver uma lista", async () => {
        roleRepository.lerPorUser.mockResolvedValue({
            rows: null
        });

        const { res } = await executar({
            usuarioId: 99
        });

        expect(res.statusCode).toBe(403);
        expect(res.body).toEqual({
            mensagem: "Você não tem permissão para consultar o histórico deste pedido."
        });
    });

    test("deve retornar 500 quando ocorrer erro ao consultar o pedido", async () => {
        const erroOriginal = console.error;
        console.error = jest.fn();

        try {
            pedidosRepository.consultar.mockRejectedValue(
                new Error("Erro simulado ao consultar pedido")
            );

            const { res } = await executar();

            expect(res.statusCode).toBe(500);
            expect(res.body).toEqual({
                mensagem: "Erro interno ao consultar o histórico do pedido."
            });

            expect(pedidosRepository.lerHistoricoStatus).not.toHaveBeenCalled();
        } finally {
            console.error = erroOriginal;
        }
    });

    test("deve retornar 500 quando ocorrer erro ao consultar os papéis", async () => {
        const erroOriginal = console.error;
        console.error = jest.fn();

        try {
            roleRepository.lerPorUser.mockRejectedValue(
                new Error("Erro simulado ao consultar papéis")
            );

            const { res } = await executar({
                usuarioId: 99
            });

            expect(res.statusCode).toBe(500);
            expect(res.body).toEqual({
                mensagem: "Erro interno ao consultar o histórico do pedido."
            });

            expect(pedidosRepository.lerHistoricoStatus).not.toHaveBeenCalled();
        } finally {
            console.error = erroOriginal;
        }
    });

    test("deve retornar 500 quando ocorrer erro ao consultar o histórico", async () => {
        const erroOriginal = console.error;
        console.error = jest.fn();

        try {
            pedidosRepository.lerHistoricoStatus.mockRejectedValue(
                new Error("Erro simulado ao consultar histórico")
            );

            const { res } = await executar();

            expect(res.statusCode).toBe(500);
            expect(res.body).toEqual({
                mensagem: "Erro interno ao consultar o histórico do pedido."
            });
        } finally {
            console.error = erroOriginal;
        }
    });

    test("não deve responder novamente se os cabeçalhos já tiverem sido enviados", async () => {
        res = criarResponse();
        res.headersSent = true;

        pedidosRepository.consultar.mockResolvedValue({
            rows: [{ ...pedido }]
        });

        req = {
            url: "/pedidos/10",
            usuario: { id: 5 }
        };

        await pedidosHistoricoStatus(req, res);

        expect(res.statusCode).toBeNull();
        expect(res.writableEnded).toBe(false);
    });

    test("não deve responder novamente se a resposta já tiver sido encerrada", async () => {
        res = criarResponse();
        res.writableEnded = true;

        pedidosRepository.consultar.mockResolvedValue({
            rows: [{ ...pedido }]
        });

        req = {
            url: "/pedidos/10",
            usuario: { id: 5 }
        };

        await pedidosHistoricoStatus(req, res);

        expect(res.statusCode).toBeNull();
        expect(res.writableEnded).toBe(true);
    });
});