const { Readable } = require("stream");

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

const criarRequisicao = (dados) => {
    return Readable.from([
        typeof dados === "string"
            ? dados
            : JSON.stringify(dados)
    ]);
};

const criarResposta = () => ({
    writeHead: jest.fn(),
    end: jest.fn()
});

const mensagemSucesso =
    "Senha redefinida com sucesso. Você já pode fazer login.";

const tokenValido = {
    purpose: "password_reset",
    sub: "1",
    resetId: 10
};

describe("usersRedefinirSenha", () => {

    const jwtSecretOriginal = process.env.JWT_SECRET;

    beforeEach(() => {
        jest.clearAllMocks();

        process.env.JWT_SECRET = "segredo_teste";

        bcrypt.hash.mockResolvedValue("senha_hash_teste");

        jwt.verify.mockReturnValue(tokenValido);

        userRepository.redefinirSenhaComToken.mockResolvedValue({
            sucesso: true
        });
    });

    afterAll(() => {
        if (jwtSecretOriginal === undefined) {
            delete process.env.JWT_SECRET;
        } else {
            process.env.JWT_SECRET = jwtSecretOriginal;
        }
    });

    test("deve retornar 400 quando token ou senha não forem informados", async () => {
        const req = criarRequisicao({
            token: "",
            senha: ""
        });

        const res = criarResposta();

        await usersRedefinirSenha(req, res);

        expect(res.writeHead).toHaveBeenCalledWith(400, expect.any(Object));

        expect(JSON.parse(res.end.mock.calls[0][0])).toEqual({
            mensagem: "Informe o token e a nova senha."
        });

        expect(jwt.verify).not.toHaveBeenCalled();
        expect(userRepository.redefinirSenhaComToken).not.toHaveBeenCalled();
    });

    test("deve retornar 400 quando o JSON for inválido", async () => {
        const req = criarRequisicao("{json-invalido");

        const res = criarResposta();

        await usersRedefinirSenha(req, res);

        expect(res.writeHead).toHaveBeenCalledWith(400, expect.any(Object));

        expect(JSON.parse(res.end.mock.calls[0][0])).toEqual({
            mensagem: "Informe o token e a nova senha."
        });
    });

    test("deve retornar 400 quando a senha tiver menos de 8 caracteres", async () => {
        const req = criarRequisicao({
            token: "token_teste",
            senha: "1234567"
        });

        const res = criarResposta();

        await usersRedefinirSenha(req, res);

        expect(res.writeHead).toHaveBeenCalledWith(400, expect.any(Object));

        expect(JSON.parse(res.end.mock.calls[0][0])).toEqual({
            mensagem: "A senha deve ter pelo menos 8 caracteres."
        });

        expect(jwt.verify).not.toHaveBeenCalled();
    });

    test("deve retornar 500 quando JWT_SECRET não estiver configurado", async () => {
        delete process.env.JWT_SECRET;

        const consoleSpy = jest
            .spyOn(console, "error")
            .mockImplementation(() => {});

        try {
            const req = criarRequisicao({
                token: "token_teste",
                senha: "senha123456"
            });

            const res = criarResposta();

            await usersRedefinirSenha(req, res);

            expect(res.writeHead).toHaveBeenCalledWith(500, expect.any(Object));

            expect(JSON.parse(res.end.mock.calls[0][0])).toEqual({
                mensagem: "Não foi possível redefinir a senha."
            });

            expect(jwt.verify).not.toHaveBeenCalled();
        } finally {
            consoleSpy.mockRestore();
            process.env.JWT_SECRET = "segredo_teste";
        }
    });

    test("deve retornar 401 quando o token for inválido ou expirado", async () => {
        jwt.verify.mockImplementation(() => {
            throw new Error("Token inválido");
        });

        const req = criarRequisicao({
            token: "token_invalido",
            senha: "senha123456"
        });

        const res = criarResposta();

        await usersRedefinirSenha(req, res);

        expect(res.writeHead).toHaveBeenCalledWith(401, expect.any(Object));

        expect(JSON.parse(res.end.mock.calls[0][0])).toEqual({
            mensagem: "Token inválido ou expirado. Solicite uma nova recuperação."
        });

        expect(userRepository.redefinirSenhaComToken).not.toHaveBeenCalled();
    });

    test("deve retornar 401 quando o token não for de recuperação de senha", async () => {
        jwt.verify.mockReturnValue({
            purpose: "login",
            sub: "1",
            resetId: 10
        });

        const req = criarRequisicao({
            token: "token_teste",
            senha: "senha123456"
        });

        const res = criarResposta();

        await usersRedefinirSenha(req, res);

        expect(res.writeHead).toHaveBeenCalledWith(401, expect.any(Object));

        expect(JSON.parse(res.end.mock.calls[0][0])).toEqual({
            mensagem: "Token de recuperação inválido."
        });

        expect(userRepository.redefinirSenhaComToken).not.toHaveBeenCalled();
    });

    test("deve retornar 401 quando os dados do token forem inválidos", async () => {
        jwt.verify.mockReturnValue({
            purpose: "password_reset",
            sub: "0",
            resetId: 10
        });

        const req = criarRequisicao({
            token: "token_teste",
            senha: "senha123456"
        });

        const res = criarResposta();

        await usersRedefinirSenha(req, res);

        expect(res.writeHead).toHaveBeenCalledWith(401, expect.any(Object));

        expect(JSON.parse(res.end.mock.calls[0][0])).toEqual({
            mensagem: "Token de recuperação inválido."
        });

        expect(userRepository.redefinirSenhaComToken).not.toHaveBeenCalled();
    });

    test("deve retornar 400 quando a recuperação não puder ser concluída", async () => {
        const motivos = [
            {
                motivo: "invalido",
                mensagem: "Solicitação de recuperação não encontrada."
            },
            {
                motivo: "utilizado",
                mensagem: "Este código de recuperação já foi utilizado."
            },
            {
                motivo: "expirado",
                mensagem: "O prazo de recuperação expirou. Solicite um novo código."
            },
            {
                motivo: "usuario",
                mensagem: "Usuário não encontrado ou desativado."
            }
        ];

        for (const item of motivos) {
            userRepository.redefinirSenhaComToken.mockResolvedValueOnce({
                sucesso: false,
                motivo: item.motivo
            });

            const req = criarRequisicao({
                token: "token_teste",
                senha: "senha123456"
            });

            const res = criarResposta();

            await usersRedefinirSenha(req, res);

            expect(res.writeHead).toHaveBeenCalledWith(
                400,
                expect.any(Object)
            );

            expect(JSON.parse(res.end.mock.calls[0][0])).toEqual({
                mensagem: item.mensagem
            });
        }
    });

    test("deve redefinir a senha com sucesso", async () => {
        const req = criarRequisicao({
            token: "token_teste",
            senha: "novaSenha123"
        });

        const res = criarResposta();

        await usersRedefinirSenha(req, res);

        expect(jwt.verify).toHaveBeenCalledWith(
            "token_teste",
            "segredo_teste"
        );

        expect(bcrypt.hash).toHaveBeenCalledWith(
            "novaSenha123",
            10
        );

        expect(userRepository.redefinirSenhaComToken).toHaveBeenCalledWith(
            1,
            10,
            "senha_hash_teste"
        );

        expect(res.writeHead).toHaveBeenCalledWith(200, expect.any(Object));

        expect(JSON.parse(res.end.mock.calls[0][0])).toEqual({
            mensagem: mensagemSucesso
        });
    });

    test("deve retornar 500 quando ocorrer erro no repository", async () => {
        userRepository.redefinirSenhaComToken.mockRejectedValue(
            new Error("Erro no banco de dados")
        );

        const consoleSpy = jest
            .spyOn(console, "error")
            .mockImplementation(() => {});

        try {
            const req = criarRequisicao({
                token: "token_teste",
                senha: "novaSenha123"
            });

            const res = criarResposta();

            await usersRedefinirSenha(req, res);

            expect(res.writeHead).toHaveBeenCalledWith(500, expect.any(Object));

            expect(JSON.parse(res.end.mock.calls[0][0])).toEqual({
                mensagem: "Não foi possível redefinir a senha."
            });
        } finally {
            consoleSpy.mockRestore();
        }
    });

});
