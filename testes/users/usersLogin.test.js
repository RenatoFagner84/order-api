const { Readable } = require("stream");

jest.mock("../../src/repositories/userRepository", () => ({
    buscarPorEmailParaLogin: jest.fn()
}));

jest.mock("../../src/repositories/roleRepository", () => ({
    lerPorUser: jest.fn()
}));

jest.mock("bcryptjs", () => ({
    compare: jest.fn()
}));

jest.mock("jsonwebtoken", () => ({
    sign: jest.fn()
}));

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const userRepository = require("../../src/repositories/userRepository");
const roleRepository = require("../../src/repositories/roleRepository");
const usersLogin = require("../../src/controllers/users/usersLogin");

describe("usersLogin", () => {
    let req;
    let res;
    let statusCode;
    let resposta;
    let segredoOriginal;

    const usuarioValido = {
        id: 10,
        nome: "João Silva",
        email: "joao@email.com",
        senha_hash: "hash_da_senha",
        ativo: true
    };

    const criarRequisicao = (body) => {
        const conteudo = typeof body === "string"
            ? body
            : JSON.stringify(body);

        const requisicao = Readable.from([conteudo]);

        requisicao.url = "/users/login";

        return requisicao;
    };

    const executar = async (body) => {
        req = criarRequisicao(body);

        res = {
            writableEnded: false,
            headersSent: false,

            writeHead: jest.fn((status) => {
                statusCode = status;
            }),

            end: jest.fn((conteudo) => {
                resposta = conteudo;
                res.writableEnded = true;
            })
        };

        await usersLogin(req, res);

        return {
            status: statusCode,
            dados: resposta ? JSON.parse(resposta) : undefined
        };
    };

    const prepararLoginValido = () => {
        userRepository.buscarPorEmailParaLogin.mockResolvedValue({
            rows: [usuarioValido]
        });

        bcrypt.compare.mockResolvedValue(true);

        roleRepository.lerPorUser.mockResolvedValue({
            rows: [
                { id: 1 },
                { id: 2 }
            ]
        });

        jwt.sign.mockReturnValue("token_de_teste");
    };

    beforeEach(() => {
        jest.clearAllMocks();

        statusCode = null;
        resposta = "";

        segredoOriginal = process.env.JWT_SECRET;
        process.env.JWT_SECRET = "segredo_de_teste";

        jest.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        if (segredoOriginal === undefined) {
            delete process.env.JWT_SECRET;
        } else {
            process.env.JWT_SECRET = segredoOriginal;
        }

        jest.restoreAllMocks();
    });

    test("deve realizar login com sucesso", async () => {
        prepararLoginValido();

        const resultado = await executar({
            email: "joao@email.com",
            senha: "123456"
        });

        expect(resultado.status).toBe(200);

        expect(resultado.dados).toEqual({
            mensagem: "Login realizado com sucesso.",
            token: "token_de_teste",
            usuario: {
                nome: "João Silva",
                email: "joao@email.com"
            },
            roles: [
                { id: 1 },
                { id: 2 }
            ]
        });

        expect(userRepository.buscarPorEmailParaLogin)
            .toHaveBeenCalledWith("joao@email.com");

        expect(bcrypt.compare).toHaveBeenCalledWith(
            "123456",
            "hash_da_senha"
        );

        expect(roleRepository.lerPorUser).toHaveBeenCalledWith(10);

        expect(jwt.sign).toHaveBeenCalledWith(
            { sub: "10" },
            "segredo_de_teste",
            { expiresIn: "2h" }
        );

        expect(req.usuario).toEqual({ id: 10 });
        expect(req.logMensagem).toBe("Login realizado com sucesso.");
    });

    test("deve remover espaços extras do e-mail", async () => {
        prepararLoginValido();

        const resultado = await executar({
            email: "  joao@email.com  ",
            senha: "123456"
        });

        expect(resultado.status).toBe(200);

        expect(userRepository.buscarPorEmailParaLogin)
            .toHaveBeenCalledWith("joao@email.com");
    });

    test("deve retornar 400 quando o JSON for inválido", async () => {
        const resultado = await executar("{json inválido");

        expect(resultado.status).toBe(400);

        expect(resultado.dados.mensagem).toBe(
            "Corpo da requisição JSON inválido."
        );

        expect(userRepository.buscarPorEmailParaLogin)
            .not.toHaveBeenCalled();
    });

    test.each([
        ["e-mail ausente", { senha: "123456" }],
        ["senha ausente", { email: "joao@email.com" }],
        ["e-mail vazio", { email: " ", senha: "123456" }],
        ["senha vazia", { email: "joao@email.com", senha: "" }],
        ["e-mail não textual", { email: 123, senha: "123456" }],
        ["senha não textual", { email: "joao@email.com", senha: 123 }]
    ])("deve retornar 400 quando houver %s", async (_caso, body) => {
        const resultado = await executar(body);

        expect(resultado.status).toBe(400);

        expect(resultado.dados.mensagem).toBe(
            "Informe e-mail e senha."
        );

        expect(userRepository.buscarPorEmailParaLogin)
            .not.toHaveBeenCalled();
    });

    test.each([
        ["null", "null"],
        ["array", "[]"],
        ["texto", '"texto"']
    ])("deve retornar 400 quando o corpo JSON for %s", async (_caso, body) => {
        const resultado = await executar(body);

        expect(resultado.status).toBe(400);

        expect(resultado.dados.mensagem).toBe(
            "O corpo da requisição deve ser um objeto JSON."
        );
    });

    test("deve retornar 401 quando o usuário não existir", async () => {
        userRepository.buscarPorEmailParaLogin.mockResolvedValue({
            rows: []
        });

        const resultado = await executar({
            email: "inexistente@email.com",
            senha: "123456"
        });

        expect(resultado.status).toBe(401);

        expect(resultado.dados.mensagem).toBe(
            "E-mail ou senha inválidos."
        );

        expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    test("deve retornar 401 quando o repositório não retornar resultado", async () => {
        userRepository.buscarPorEmailParaLogin.mockResolvedValue(null);

        const resultado = await executar({
            email: "joao@email.com",
            senha: "123456"
        });

        expect(resultado.status).toBe(401);
    });

    test("deve retornar 401 quando o usuário estiver inativo", async () => {
        userRepository.buscarPorEmailParaLogin.mockResolvedValue({
            rows: [{ ...usuarioValido, ativo: false }]
        });

        const resultado = await executar({
            email: "joao@email.com",
            senha: "123456"
        });

        expect(resultado.status).toBe(401);
        expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    test("deve retornar 401 quando o usuário não possuir hash de senha", async () => {
        userRepository.buscarPorEmailParaLogin.mockResolvedValue({
            rows: [{ ...usuarioValido, senha_hash: null }]
        });

        const resultado = await executar({
            email: "joao@email.com",
            senha: "123456"
        });

        expect(resultado.status).toBe(401);
        expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    test("deve retornar 401 quando a senha estiver incorreta", async () => {
        userRepository.buscarPorEmailParaLogin.mockResolvedValue({
            rows: [usuarioValido]
        });

        bcrypt.compare.mockResolvedValue(false);

        const resultado = await executar({
            email: "joao@email.com",
            senha: "senha_errada"
        });

        expect(resultado.status).toBe(401);

        expect(resultado.dados.mensagem).toBe(
            "E-mail ou senha inválidos."
        );

        expect(roleRepository.lerPorUser).not.toHaveBeenCalled();
        expect(jwt.sign).not.toHaveBeenCalled();
    });

    test("deve retornar 500 quando JWT_SECRET não estiver definido", async () => {
        prepararLoginValido();
        delete process.env.JWT_SECRET;

        const resultado = await executar({
            email: "joao@email.com",
            senha: "123456"
        });

        expect(resultado.status).toBe(500);

        expect(resultado.dados.mensagem).toBe(
            "Erro interno ao realizar login."
        );

        expect(jwt.sign).not.toHaveBeenCalled();
        expect(console.error).toHaveBeenCalled();
    });

    test("deve retornar 500 quando a consulta ao usuário falhar", async () => {
        userRepository.buscarPorEmailParaLogin.mockRejectedValue(
            new Error("Erro no banco")
        );

        const resultado = await executar({
            email: "joao@email.com",
            senha: "123456"
        });

        expect(resultado.status).toBe(500);

        expect(resultado.dados.mensagem).toBe(
            "Erro interno ao realizar login."
        );

        expect(console.error).toHaveBeenCalled();
    });

    test("deve retornar 500 quando a consulta de roles falhar", async () => {
        userRepository.buscarPorEmailParaLogin.mockResolvedValue({
            rows: [usuarioValido]
        });

        bcrypt.compare.mockResolvedValue(true);

        roleRepository.lerPorUser.mockRejectedValue(
            new Error("Erro ao consultar roles")
        );

        const resultado = await executar({
            email: "joao@email.com",
            senha: "123456"
        });

        expect(resultado.status).toBe(500);

        expect(resultado.dados.mensagem).toBe(
            "Erro interno ao realizar login."
        );
    });

    test("deve retornar 500 quando a comparação de senha falhar", async () => {
        userRepository.buscarPorEmailParaLogin.mockResolvedValue({
            rows: [usuarioValido]
        });

        bcrypt.compare.mockRejectedValue(
            new Error("Erro ao comparar senha")
        );

        const resultado = await executar({
            email: "joao@email.com",
            senha: "123456"
        });

        expect(resultado.status).toBe(500);
    });

    test("deve retornar 500 quando a geração do token falhar", async () => {
        prepararLoginValido();

        jwt.sign.mockImplementation(() => {
            throw new Error("Erro ao gerar token");
        });

        const resultado = await executar({
            email: "joao@email.com",
            senha: "123456"
        });

        expect(resultado.status).toBe(500);
    });

    test("não deve responder novamente se os headers já foram enviados", async () => {
        prepararLoginValido();

        req = criarRequisicao({
            email: "joao@email.com",
            senha: "123456"
        });

        res = {
            writableEnded: false,
            headersSent: true,
            writeHead: jest.fn(),
            end: jest.fn()
        };

        await usersLogin(req, res);

        expect(res.writeHead).not.toHaveBeenCalled();
        expect(res.end).not.toHaveBeenCalled();
    });
});
