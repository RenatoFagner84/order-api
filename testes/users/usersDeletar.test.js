
jest.mock("../../src/repositories/userRepository", () => ({
    ler: jest.fn(),
    deletar: jest.fn()
}));

jest.mock("../../src/repositories/roleRepository", () => ({
    lerPorUser: jest.fn(),
    verificarUltimoAdminAtivo: jest.fn()
}));

const userRepository = require("../../src/repositories/userRepository");
const roleRepository = require("../../src/repositories/roleRepository");
const usersDeletar = require("../../src/controllers/users/usersDeletar");

describe("usersDeletar", () => {
    let res;
    let consoleErrorOriginal;

    const usuarioMock = {
        id: 2,
        nome: "João Silva",
        email: "joao@email.com",
        ativo: true
    };

    const configurarUsuarioEncontrado = () => {
        userRepository.ler.mockResolvedValue({
            rows: [usuarioMock]
        });

        roleRepository.lerPorUser.mockResolvedValue({
            rows: [{ id: 3, role: "user" }]
        });

        userRepository.deletar.mockResolvedValue({
            sucesso: true,
            mensagem: "Usuário desativado com sucesso.",
            user: { id: 2, ativo: false }
        });
    };

    const executar = async (url = "/api/users/2") => {
        const partes = url.split("/");
        const id = partes.length ? partes[partes.length - 1] : undefined;

        const req = {
            params: {
                id
            }
        };

        res = {
            writableEnded: false,
            headersSent: false,
            writeHead: jest.fn(function (status, headers) {
                this.statusCode = status;
                this.headers = headers;
            }),
            end: jest.fn(function (dados) {
                this.body = dados;
                this.writableEnded = true;
            })
        };

        await usersDeletar(req, res);

        return {
            status: res.statusCode,
            body: res.body ? JSON.parse(res.body) : undefined
        };
    };

    beforeEach(() => {
        jest.clearAllMocks();

        consoleErrorOriginal = console.error;
        console.error = jest.fn();

        configurarUsuarioEncontrado();
    });

    afterEach(() => {
        console.error = consoleErrorOriginal;
    });

    describe("validação do ID", () => {
        test.each([
            ["/api/users/abc", "texto"],
            ["/api/users/0", "zero"],
            ["/api/users/-1", "número negativo"],
            ["/api/users/1.5", "número decimal"],
            ["/api/users/", "ID ausente"],
            ["/api/users/9007199254740992", "inteiro fora do limite seguro"]
        ])("deve retornar 400 para %s (%s)", async (url) => {
            const resultado = await executar(url);

            expect(resultado.status).toBe(400);
            expect(resultado.body).toEqual({
                mensagem: "ID de usuário inválido."
            });

            expect(userRepository.ler).not.toHaveBeenCalled();
            expect(userRepository.deletar).not.toHaveBeenCalled();
        });

        test("deve aceitar um ID positivo válido", async () => {
            await executar("/api/users/2");

            expect(userRepository.ler).toHaveBeenCalledWith(2);
        });
    });

    describe("usuário não encontrado", () => {
        test("deve retornar 404 quando o usuário não existir", async () => {
            userRepository.ler.mockResolvedValue({ rows: [] });

            const resultado = await executar();

            expect(resultado.status).toBe(404);
            expect(resultado.body).toEqual({
                mensagem: "Usuário não encontrado ou já desativado."
            });

            expect(roleRepository.lerPorUser).not.toHaveBeenCalled();
            expect(userRepository.deletar).not.toHaveBeenCalled();
        });
    });

    describe("proteção do último administrador", () => {
        test("deve retornar 409 ao tentar desativar o último administrador ativo", async () => {
            roleRepository.lerPorUser.mockResolvedValue({
                rows: [{ id: 1, role: "admin" }]
            });

            roleRepository.verificarUltimoAdminAtivo.mockResolvedValue({
                usuario_e_admin_ativo: true,
                total_admins_ativos: 1
            });

            const resultado = await executar();

            expect(resultado.status).toBe(409);
            expect(resultado.body).toEqual({
                mensagem:
                    "Não é possível desativar o último administrador ativo. Atribua o papel admin a outro usuário antes."
            });

            expect(
                roleRepository.verificarUltimoAdminAtivo
            ).toHaveBeenCalledWith(2, 1);

            expect(userRepository.deletar).not.toHaveBeenCalled();
        });

        test("deve permitir prosseguir quando existem outros administradores ativos", async () => {
            roleRepository.lerPorUser.mockResolvedValue({
                rows: [{ id: 1, role: "admin" }]
            });

            roleRepository.verificarUltimoAdminAtivo.mockResolvedValue({
                usuario_e_admin_ativo: true,
                total_admins_ativos: 2
            });

            const resultado = await executar();

            expect(resultado.status).toBe(200);
            expect(userRepository.deletar).toHaveBeenCalledWith(2);
        });

        test("deve ignorar diferenças entre maiúsculas e minúsculas no papel admin", async () => {
            roleRepository.lerPorUser.mockResolvedValue({
                rows: [{ id: 1, role: " ADMIN " }]
            });

            roleRepository.verificarUltimoAdminAtivo.mockResolvedValue({
                usuario_e_admin_ativo: false,
                total_admins_ativos: 2
            });

            await executar();

            expect(
                roleRepository.verificarUltimoAdminAtivo
            ).toHaveBeenCalledWith(2, 1);
        });

        test("não deve verificar administradores quando o usuário não possui esse papel", async () => {
            roleRepository.lerPorUser.mockResolvedValue({
                rows: [{ id: 3, role: "user" }]
            });

            const resultado = await executar();

            expect(resultado.status).toBe(200);

            expect(
                roleRepository.verificarUltimoAdminAtivo
            ).not.toHaveBeenCalled();
        });
    });

    describe("desativação do usuário", () => {
        test("deve retornar 200 quando o usuário for desativado com sucesso", async () => {
            const resultado = await executar();

            expect(resultado.status).toBe(200);
            expect(resultado.body).toEqual({
                mensagem: "Usuário desativado com sucesso.",
                user: { id: 2, ativo: false }
            });

            expect(userRepository.deletar).toHaveBeenCalledWith(2);
        });

        test("deve retornar 409 quando o repositório não conseguir desativar o usuário", async () => {
            userRepository.deletar.mockResolvedValue({
                sucesso: false,
                mensagem: "Não foi possível desativar o usuário."
            });

            const resultado = await executar();

            expect(resultado.status).toBe(409);
            expect(resultado.body).toEqual({
                mensagem: "Não foi possível desativar o usuário."
            });
        });

        test("deve retornar o cabeçalho JSON com UTF-8", async () => {
            await executar();

            expect(res.headers).toEqual({
                "Content-Type": "application/json; charset=utf-8"
            });
        });
    });

    describe("tratamento de erros", () => {
        test("deve retornar 500 quando a leitura do usuário falhar", async () => {
            userRepository.ler.mockRejectedValue(
                new Error("Erro no banco")
            );

            const resultado = await executar();

            expect(resultado.status).toBe(500);
            expect(resultado.body).toEqual({
                mensagem: "Erro interno ao desativar usuário."
            });

            expect(console.error).toHaveBeenCalledWith(
                "[ERRO AO DESATIVAR USUÁRIO]",
                expect.any(Error)
            );
        });

        test("deve retornar 500 quando a consulta dos papéis falhar", async () => {
            roleRepository.lerPorUser.mockRejectedValue(
                new Error("Erro ao consultar papéis")
            );

            const resultado = await executar();

            expect(resultado.status).toBe(500);
            expect(resultado.body).toEqual({
                mensagem: "Erro interno ao desativar usuário."
            });

            expect(userRepository.deletar).not.toHaveBeenCalled();
        });

        test("deve retornar 500 quando a desativação falhar", async () => {
            userRepository.deletar.mockRejectedValue(
                new Error("Erro ao desativar")
            );

            const resultado = await executar();

            expect(resultado.status).toBe(500);
            expect(resultado.body).toEqual({
                mensagem: "Erro interno ao desativar usuário."
            });
        });
    });
});
