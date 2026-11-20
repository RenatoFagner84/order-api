
jest.mock("bcryptjs", () => ({
    hash: jest.fn()
}));

jest.mock("jsonwebtoken", () => ({
    verify: jest.fn()
}));

jest.mock("../../src/repositories/userRepository", () => ({
    redefinirSenhaComToken: jest.fn()
}));

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const userRepository = require("../../src/repositories/userRepository");

const usersRedefinirSenha = require(
    "../../src/controllers/users/usersRedefinirSenha"
);

describe("usersRedefinirSenha", () => {
    let req;
    let res;
    let statusCode;
    let resposta;
    let jwtSecretOriginal;

    const mensagemSucesso =
        "Senha redefinida com sucesso. Você já pode fazer login.";

    const mensagemFalha =
        "Não foi possível concluir a redefinição. Solicite um novo código e tente novamente.";

    const tokenValido = {
        purpose: "password_reset",
        sub: "1",
        resetId: 10
    };

    const criarResposta = () => {
        const respostaMock = {};

        respostaMock.status = jest.fn((status) => {
            statusCode = status;
            return respostaMock;
        });

        respostaMock.json = jest.fn((dados) => {
            resposta = dados;
            return respostaMock;
        });

        return respostaMock;
    };

    const executar = async (body) => {
        req = {
            body
        };

        res = criarResposta();

        statusCode = null;
        resposta = undefined;

        await usersRedefinirSenha(req, res);

        return {
            status: statusCode,
            dados: resposta
        };
    };

    beforeEach(() => {
        jest.clearAllMocks();

        jwtSecretOriginal = process.env.JWT_SECRET;
        process.env.JWT_SECRET = "segredo_teste";

        bcrypt.hash.mockResolvedValue("senha_hash_teste");

        jwt.verify.mockReturnValue(tokenValido);

        userRepository.redefinirSenhaComToken.mockResolvedValue({
            sucesso: true
        });

        jest.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        if (jwtSecretOriginal === undefined) {
            delete process.env.JWT_SECRET;
        } else {
            process.env.JWT_SECRET = jwtSecretOriginal;
        }

        jest.restoreAllMocks();
    });

    test("deve retornar 400 quando o corpo da requisição estiver ausente", async () => {
        const resultado = await executar(undefined);

        expect(resultado.status).toBe(400);

        expect(resultado.dados).toEqual({
            mensagem: "Informe o token e a nova senha."
        });

        expect(jwt.verify).not.toHaveBeenCalled();
        expect(bcrypt.hash).not.toHaveBeenCalled();
        expect(userRepository.redefinirSenhaComToken).not.toHaveBeenCalled();
    });

    test("deve retornar 400 quando o corpo não for um objeto", async () => {
        const casos = [
            null,
            "texto",
            123,
            [],
            true
        ];

        for (const body of casos) {
            const resultado = await executar(body);

            expect(resultado.status).toBe(400);

            expect(resultado.dados).toEqual({
                mensagem: "Informe o token e a nova senha."
            });
        }

        expect(jwt.verify).not.toHaveBeenCalled();
    });

    test.each([
        ["token ausente", { senha: "novaSenha123" }],
        ["senha ausente", { token: "token_teste" }],
        ["token vazio", { token: "", senha: "novaSenha123" }],
        ["senha vazia", { token: "token_teste", senha: "" }],
        ["token numérico", { token: 123, senha: "novaSenha123" }],
        ["senha numérica", { token: "token_teste", senha: 123 }],
        ["token nulo", { token: null, senha: "novaSenha123" }],
        ["senha nula", { token: "token_teste", senha: null }]
    ])(
        "deve retornar 400 quando houver %s",
        async (_caso, body) => {
            const resultado = await executar(body);

            expect(resultado.status).toBe(400);

            expect(resultado.dados).toEqual({
                mensagem: "Informe o token e a nova senha."
            });

            expect(jwt.verify).not.toHaveBeenCalled();
            expect(bcrypt.hash).not.toHaveBeenCalled();
        }
    );

    test("deve retornar 400 quando a senha tiver menos de 8 caracteres", async () => {
        const resultado = await executar({
            token: "token_teste",
            senha: "1234567"
        });

        expect(resultado.status).toBe(400);

        expect(resultado.dados).toEqual({
            mensagem: "A senha deve ter pelo menos 8 caracteres."
        });

        expect(jwt.verify).not.toHaveBeenCalled();
        expect(bcrypt.hash).not.toHaveBeenCalled();
    });

    test("deve aceitar senha com exatamente 8 caracteres", async () => {
        const resultado = await executar({
            token: "token_teste",
            senha: "12345678"
        });

        expect(resultado.status).toBe(200);

        expect(bcrypt.hash).toHaveBeenCalledWith(
            "12345678",
            10
        );
    });

    test("deve retornar 500 quando JWT_SECRET não estiver configurado", async () => {
        delete process.env.JWT_SECRET;

        const resultado = await executar({
            token: "token_teste",
            senha: "novaSenha123"
        });

        expect(resultado.status).toBe(500);

        expect(resultado.dados).toEqual({
            mensagem: "Não foi possível redefinir a senha. Tente novamente mais tarde."
        });

        expect(jwt.verify).not.toHaveBeenCalled();

        expect(bcrypt.hash).not.toHaveBeenCalled();

        expect(console.error).toHaveBeenCalledWith(
            "[ERRO AO REDEFINIR SENHA]",
            expect.objectContaining({
                message: "JWT_SECRET não configurado."
            })
        );
    });

    test("deve retornar 400 quando o token for inválido ou expirado", async () => {
        jwt.verify.mockImplementation(() => {
            throw new Error("Token inválido");
        });

        const resultado = await executar({
            token: "token_invalido",
            senha: "novaSenha123"
        });

        expect(resultado.status).toBe(400);

        expect(resultado.dados).toEqual({
            mensagem: mensagemFalha
        });

        expect(userRepository.redefinirSenhaComToken).not.toHaveBeenCalled();

        expect(bcrypt.hash).not.toHaveBeenCalled();
    });

    test("deve retornar 400 quando o token não for de recuperação de senha", async () => {
        jwt.verify.mockReturnValue({
            purpose: "login",
            sub: "1",
            resetId: 10
        });

        const resultado = await executar({
            token: "token_teste",
            senha: "novaSenha123"
        });

        expect(resultado.status).toBe(400);

        expect(resultado.dados).toEqual({
            mensagem: mensagemFalha
        });

        expect(userRepository.redefinirSenhaComToken).not.toHaveBeenCalled();
    });

    test.each([
        [
            "sub ausente",
            {
                purpose: "password_reset",
                resetId: 10
            }
        ],
        [
            "resetId ausente",
            {
                purpose: "password_reset",
                sub: "1"
            }
        ],
        [
            "resetId não inteiro",
            {
                purpose: "password_reset",
                sub: "1",
                resetId: "10"
            }
        ],
        [
            "resetId decimal",
            {
                purpose: "password_reset",
                sub: "1",
                resetId: 10.5
            }
        ],
        [
            "sub igual a zero",
            {
                purpose: "password_reset",
                sub: "0",
                resetId: 10
            }
        ],
        [
            "sub negativo",
            {
                purpose: "password_reset",
                sub: "-1",
                resetId: 10
            }
        ],
        [
            "sub não numérico",
            {
                purpose: "password_reset",
                sub: "abc",
                resetId: 10
            }
        ],
        [
            "sub fora do limite seguro",
            {
                purpose: "password_reset",
                sub: "9007199254740992",
                resetId: 10
            }
        ]
    ])(
        "deve retornar 400 quando o payload apresentar %s",
        async (_caso, payload) => {
            jwt.verify.mockReturnValue(payload);

            const resultado = await executar({
                token: "token_teste",
                senha: "novaSenha123"
            });

            expect(resultado.status).toBe(400);

            expect(resultado.dados).toEqual({
                mensagem: mensagemFalha
            });

            expect(userRepository.redefinirSenhaComToken)
                .not.toHaveBeenCalled();

            expect(bcrypt.hash).not.toHaveBeenCalled();
        }
    );

    test("deve retornar 400 quando a recuperação não puder ser concluída", async () => {
        userRepository.redefinirSenhaComToken.mockResolvedValue({
            sucesso: false,
            motivo: "expirado"
        });

        const resultado = await executar({
            token: "token_teste",
            senha: "novaSenha123"
        });

        expect(resultado.status).toBe(400);

        expect(resultado.dados).toEqual({
            mensagem: mensagemFalha
        });

        expect(userRepository.redefinirSenhaComToken)
            .toHaveBeenCalledWith(
                1,
                10,
                "senha_hash_teste"
            );
    });

    test.each([
        ["token inexistente", { sucesso: false, motivo: "invalido" }],
        ["token utilizado", { sucesso: false, motivo: "utilizado" }],
        ["token expirado", { sucesso: false, motivo: "expirado" }],
        ["usuário inativo", { sucesso: false, motivo: "usuario" }]
    ])(
        "deve apresentar mensagem genérica para %s",
        async (_caso, retorno) => {
            userRepository.redefinirSenhaComToken.mockResolvedValue(retorno);

            const resultado = await executar({
                token: "token_teste",
                senha: "novaSenha123"
            });

            expect(resultado.status).toBe(400);

            expect(resultado.dados).toEqual({
                mensagem: mensagemFalha
            });
        }
    );

    test("deve redefinir a senha com sucesso", async () => {
        const resultado = await executar({
            token: "token_teste",
            senha: "novaSenha123"
        });

        expect(resultado.status).toBe(200);

        expect(resultado.dados).toEqual({
            mensagem: mensagemSucesso
        });

        expect(jwt.verify).toHaveBeenCalledWith(
            "token_teste",
            "segredo_teste"
        );

        expect(bcrypt.hash).toHaveBeenCalledWith(
            "novaSenha123",
            10
        );

        expect(userRepository.redefinirSenhaComToken)
            .toHaveBeenCalledWith(
                1,
                10,
                "senha_hash_teste"
            );
    });

    test("deve retornar 500 quando ocorrer erro ao gerar o hash da senha", async () => {
        const erro = new Error("Erro ao gerar hash");

        bcrypt.hash.mockRejectedValue(erro);

        const resultado = await executar({
            token: "token_teste",
            senha: "novaSenha123"
        });

        expect(resultado.status).toBe(500);

        expect(resultado.dados).toEqual({
            mensagem: "Não foi possível redefinir a senha. Tente novamente mais tarde."
        });

        expect(userRepository.redefinirSenhaComToken)
            .not.toHaveBeenCalled();

        expect(console.error).toHaveBeenCalledWith(
            "[ERRO AO REDEFINIR SENHA]",
            erro
        );
    });

    test("deve retornar 500 quando ocorrer erro no repository", async () => {
        const erro = new Error("Erro no banco de dados");

        userRepository.redefinirSenhaComToken.mockRejectedValue(erro);

        const resultado = await executar({
            token: "token_teste",
            senha: "novaSenha123"
        });

        expect(resultado.status).toBe(500);

        expect(resultado.dados).toEqual({
            mensagem: "Não foi possível redefinir a senha. Tente novamente mais tarde."
        });

        expect(console.error).toHaveBeenCalledWith(
            "[ERRO AO REDEFINIR SENHA]",
            erro
        );
    });
});
