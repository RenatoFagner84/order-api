const userRepository = require("../../src/repositories/userRepository");
const roleRepository = require("../../src/repositories/roleRepository");
const usersHistoricoStatus = require("../../src/controllers/users/usersHistoricoStatus");

jest.mock("../../src/repositories/userRepository", () => ({
    ler: jest.fn(),
    lerHistoricoStatus: jest.fn()
}));

jest.mock("../../src/repositories/roleRepository", () => ({
    lerPorUser: jest.fn()
}));

describe("usersHistoricoStatus", () => {
    let req;
    let res;

    const usuarioEncontrado = {
        rows: [{ id: 10, nome: "Maria Silva" }]
    };

    const historico = {
        rows: [
            {
                id: 1,
                user_id: 10,
                status_anterior: false,
                status_novo: true,
                alterado_por: 2
            },
            {
                id: 2,
                user_id: 10,
                status_anterior: true,
                status_novo: false,
                alterado_por: 3
            }
        ]
    };

    const definirPapeis = (papeis) => {
        roleRepository.lerPorUser.mockResolvedValue({
            rows: papeis.map((role) => ({ role }))
        });
    };

    const executar = async () => {
        await usersHistoricoStatus(req, res);
    };

    beforeEach(() => {
        jest.clearAllMocks();

        req = {
            url: "/api/users/10/historico-status",
            usuario: { id: 2 }
        };

        res = {
            writableEnded: false,
            writeHead: jest.fn(),
            end: jest.fn()
        };

        roleRepository.lerPorUser.mockResolvedValue({
            rows: [{ role: "admin" }]
        });

        userRepository.ler.mockResolvedValue(usuarioEncontrado);
        userRepository.lerHistoricoStatus.mockResolvedValue(historico);

        jest.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    const esperarResposta = (status, dados) => {
        expect(res.writeHead).toHaveBeenCalledWith(status, {
            "Content-Type": "application/json; charset=utf-8"
        });

        expect(res.end).toHaveBeenCalledWith(
            JSON.stringify(dados)
        );
    };

    describe("validação do ID", () => {
        test.each([
            ["/api/users/abc", "ID com texto"],
            ["/api/users/0", "ID igual a zero"],
            ["/api/users/-1", "ID negativo"],
            ["/api/users/1.5", "ID decimal"],
            ["/api/users/", "ID ausente"]
        ])("deve retornar 400 para %s (%s)", async (url) => {
            req.url = url;

            await executar();

            esperarResposta(400, {
                mensagem: "Informe um ID de usuário válido na rota."
            });

            expect(roleRepository.lerPorUser).not.toHaveBeenCalled();
            expect(userRepository.ler).not.toHaveBeenCalled();
        });

        test("deve aceitar um ID positivo válido", async () => {
            definirPapeis(["admin"]);

            await executar();

            expect(userRepository.ler).toHaveBeenCalledWith("10");
        });
    });

    describe("autenticação", () => {
        test("deve retornar 401 quando req.usuario não existir", async () => {
            req.usuario = undefined;

            await executar();

            esperarResposta(401, {
                mensagem: "Usuário não autenticado."
            });

            expect(roleRepository.lerPorUser).not.toHaveBeenCalled();
        });

        test("deve retornar 401 quando o ID do usuário autenticado não existir", async () => {
            req.usuario = {};

            await executar();

            esperarResposta(401, {
                mensagem: "Usuário não autenticado."
            });

            expect(roleRepository.lerPorUser).not.toHaveBeenCalled();
        });
    });

    describe("permissões de acesso", () => {
        test("deve permitir acesso ao papel admin", async () => {
            definirPapeis(["admin"]);

            await executar();

            expect(userRepository.lerHistoricoStatus).toHaveBeenCalledWith("10");
            expect(res.writeHead).toHaveBeenCalledWith(
                200,
                expect.any(Object)
            );
        });

        test("deve permitir acesso ao papel sac", async () => {
            definirPapeis(["sac"]);

            await executar();

            expect(userRepository.lerHistoricoStatus).toHaveBeenCalledWith("10");
            expect(res.writeHead).toHaveBeenCalledWith(
                200,
                expect.any(Object)
            );
        });

        test("deve ignorar maiúsculas e espaços no nome do papel", async () => {
            definirPapeis(["  SAC  "]);

            await executar();

            expect(res.writeHead).toHaveBeenCalledWith(
                200,
                expect.any(Object)
            );
        });

        test("deve permitir acesso se houver admin entre vários papéis", async () => {
            definirPapeis(["client", "admin"]);

            await executar();

            expect(res.writeHead).toHaveBeenCalledWith(
                200,
                expect.any(Object)
            );
        });

        test("deve retornar 403 para usuário sem papel autorizado", async () => {
            definirPapeis(["client"]);

            await executar();

            esperarResposta(403, {
                mensagem:
                    "Você não tem permissão para consultar o histórico de status de usuários."
            });

            expect(userRepository.ler).not.toHaveBeenCalled();
            expect(userRepository.lerHistoricoStatus).not.toHaveBeenCalled();
        });

        test("não deve consultar o histórico se não houver papéis", async () => {
            definirPapeis([]);

            await executar();

            expect(res.writeHead).toHaveBeenCalledWith(
                403,
                expect.any(Object)
            );
            expect(userRepository.lerHistoricoStatus).not.toHaveBeenCalled();
        });
    });

    describe("existência do usuário", () => {
        test("deve retornar 404 quando o usuário não existir", async () => {
            definirPapeis(["admin"]);

            userRepository.ler.mockResolvedValue({
                rows: []
            });

            await executar();

            esperarResposta(404, {
                mensagem: "Usuário não encontrado."
            });

            expect(userRepository.lerHistoricoStatus).not.toHaveBeenCalled();
        });
    });

    describe("consulta do histórico", () => {
        test("deve retornar 200 com as linhas do histórico", async () => {
            definirPapeis(["admin"]);

            await executar();

            esperarResposta(200, historico.rows);

            expect(roleRepository.lerPorUser).toHaveBeenCalledWith(2);
            expect(userRepository.ler).toHaveBeenCalledWith("10");
            expect(userRepository.lerHistoricoStatus).toHaveBeenCalledWith("10");
        });

        test("deve retornar uma lista vazia quando não houver histórico", async () => {
            definirPapeis(["sac"]);

            userRepository.lerHistoricoStatus.mockResolvedValue({
                rows: []
            });

            await executar();

            esperarResposta(200, []);
        });

        test("não deve enviar uma segunda resposta se ela já tiver terminado", async () => {
            res.writableEnded = true;

            await executar();

            expect(res.writeHead).not.toHaveBeenCalled();
            expect(res.end).not.toHaveBeenCalled();
        });
    });

    describe("tratamento de erros", () => {
        test("deve retornar 500 quando a consulta dos papéis falhar", async () => {
            roleRepository.lerPorUser.mockRejectedValue(
                new Error("Falha ao consultar papéis")
            );

            await executar();

            esperarResposta(500, {
                mensagem:
                    "Erro interno ao consultar o histórico de status do usuário."
            });
        });

        test("deve retornar 500 quando a leitura do usuário falhar", async () => {
            definirPapeis(["admin"]);

            userRepository.ler.mockRejectedValue(
                new Error("Falha ao consultar usuário")
            );

            await executar();

            esperarResposta(500, {
                mensagem:
                    "Erro interno ao consultar o histórico de status do usuário."
            });
        });

        test("deve retornar 500 quando a consulta do histórico falhar", async () => {
            definirPapeis(["admin"]);

            userRepository.lerHistoricoStatus.mockRejectedValue(
                new Error("Falha ao consultar histórico")
            );

            await executar();

            esperarResposta(500, {
                mensagem:
                    "Erro interno ao consultar o histórico de status do usuário."
            });
        });
    });
});
