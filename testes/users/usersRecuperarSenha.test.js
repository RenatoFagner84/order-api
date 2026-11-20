
jest.mock("bcryptjs", () => ({
    hash: jest.fn()
}));

jest.mock("crypto", () => ({
    randomInt: jest.fn()
}));

jest.mock("../../src/repositories/userRepository", () => ({
    buscarUsuarioParaRecuperacao: jest.fn(),
    invalidarRecuperacoesAnteriores: jest.fn(),
    criarRecuperacaoSenha: jest.fn()
}));

jest.mock("../../src/services/emailService", () => ({
    enviarEmailRecuperacaoSenha: jest.fn()
}));

const bcrypt = require("bcryptjs");
const { randomInt } = require("crypto");

const userRepository = require("../../src/repositories/userRepository");

const {
    enviarEmailRecuperacaoSenha
} = require("../../src/services/emailService");

const usersRecuperarSenha = require(
    "../../src/controllers/users/usersRecuperarSenha"
);

describe("usersRecuperarSenha", () => {
    let req;
    let res;
    let statusCode;
    let resposta;

    const mensagemPadrao =
        "Você receberá um código de recuperação.";

    const usuarioTeste = {
        id: 1,
        nome: "Usuário Teste",
        email: "teste@email.com"
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

        await usersRecuperarSenha(req, res);

        return {
            status: statusCode,
            dados: resposta
        };
    };

    beforeEach(() => {
        jest.clearAllMocks();

        jest.spyOn(console, "log").mockImplementation(() => {});
        jest.spyOn(console, "error").mockImplementation(() => {});

        bcrypt.hash.mockResolvedValue("pin_hash_teste");

        randomInt.mockReturnValue(123456);

        userRepository.buscarUsuarioParaRecuperacao.mockResolvedValue({
            rowCount: 1,
            rows: [usuarioTeste]
        });

        userRepository.invalidarRecuperacoesAnteriores.mockResolvedValue({
            rowCount: 1
        });

        userRepository.criarRecuperacaoSenha.mockResolvedValue({
            rowCount: 1
        });

        enviarEmailRecuperacaoSenha.mockResolvedValue({
            messageId: "email-teste-123",
            accepted: ["teste@email.com"],
            rejected: [],
            response: "250 OK"
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test("deve retornar 400 quando o corpo da requisição estiver ausente", async () => {
        const resultado = await executar(undefined);

        expect(resultado.status).toBe(400);

        expect(resultado.dados).toEqual({
            mensagem: "Verique os dados e tente novamente."
        });

        expect(userRepository.buscarUsuarioParaRecuperacao)
            .not.toHaveBeenCalled();
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
                mensagem: "Verique os dados e tente novamente."
            });
        }

        expect(userRepository.buscarUsuarioParaRecuperacao)
            .not.toHaveBeenCalled();
    });

    test("deve retornar 400 quando o e-mail não for informado", async () => {
        const resultado = await executar({});

        expect(resultado.status).toBe(400);

        expect(resultado.dados).toEqual({
            mensagem: "Verique os dados e tente novamente."
        });

        expect(userRepository.buscarUsuarioParaRecuperacao)
            .not.toHaveBeenCalled();
    });

    test.each([
        ["e-mail vazio", ""],
        ["e-mail com espaços", "   "],
        ["e-mail sem arroba", "testeemail.com"],
        ["e-mail sem domínio", "teste@"],
        ["e-mail sem extensão", "teste@email"],
        ["e-mail com espaços internos", "teste @email.com"],
        ["e-mail numérico", 123],
        ["e-mail nulo", null]
    ])(
        "deve retornar 400 quando o e-mail for inválido: %s",
        async (_caso, email) => {
            const resultado = await executar({
                email
            });

            expect(resultado.status).toBe(400);

            expect(resultado.dados).toEqual({
                mensagem: "Verique os dados e tente novamente."
            });

            expect(userRepository.buscarUsuarioParaRecuperacao)
                .not.toHaveBeenCalled();
        }
    );

    test("deve retornar 200 quando o usuário não estiver cadastrado", async () => {
        userRepository.buscarUsuarioParaRecuperacao.mockResolvedValue({
            rowCount: 0,
            rows: []
        });

        const resultado = await executar({
            email: "desconhecido@email.com"
        });

        expect(resultado.status).toBe(200);

        expect(resultado.dados).toEqual({
            mensagem: mensagemPadrao
        });

        expect(bcrypt.hash).not.toHaveBeenCalled();

        expect(randomInt).not.toHaveBeenCalled();

        expect(userRepository.invalidarRecuperacoesAnteriores)
            .not.toHaveBeenCalled();

        expect(userRepository.criarRecuperacaoSenha)
            .not.toHaveBeenCalled();

        expect(enviarEmailRecuperacaoSenha)
            .not.toHaveBeenCalled();
    });

    test("deve retornar 200 quando o repositório não encontrar resultado", async () => {
        userRepository.buscarUsuarioParaRecuperacao.mockResolvedValue(null);

        const resultado = await executar({
            email: "desconhecido@email.com"
        });

        expect(resultado.status).toBe(200);

        expect(resultado.dados).toEqual({
            mensagem: mensagemPadrao
        });

        expect(bcrypt.hash).not.toHaveBeenCalled();

        expect(enviarEmailRecuperacaoSenha)
            .not.toHaveBeenCalled();
    });

    test("deve gerar PIN, salvar recuperação e enviar e-mail com sucesso", async () => {
        const resultado = await executar({
            email: "  TESTE@EMAIL.COM  "
        });

        expect(resultado.status).toBe(200);

        expect(resultado.dados).toEqual({
            mensagem: mensagemPadrao
        });

        expect(userRepository.buscarUsuarioParaRecuperacao)
            .toHaveBeenCalledWith("teste@email.com");

        expect(randomInt).toHaveBeenCalledWith(
            100000,
            1000000
        );

        expect(bcrypt.hash).toHaveBeenCalledWith(
            "123456",
            10
        );

        expect(userRepository.invalidarRecuperacoesAnteriores)
            .toHaveBeenCalledWith(1);

        expect(userRepository.criarRecuperacaoSenha)
            .toHaveBeenCalledWith(
                1,
                "pin_hash_teste",
                expect.any(Date)
            );

        const dataExpiracao =
            userRepository.criarRecuperacaoSenha.mock.calls[0][2];

        expect(dataExpiracao.getTime()).toBeGreaterThan(Date.now());

        expect(enviarEmailRecuperacaoSenha).toHaveBeenCalledWith({
            nome: "Usuário Teste",
            email: "teste@email.com",
            pin: "123456"
        });

        expect(console.log).toHaveBeenCalledWith(
            "[RECUPERAÇÃO] Resultado do envio:",
            {
                messageId: "email-teste-123",
                accepted: ["teste@email.com"],
                rejected: [],
                response: "250 OK"
            }
        );
    });

    test("deve retornar 200 mesmo quando o envio do e-mail falhar", async () => {
        const erroEmail = new Error("Falha no envio do e-mail");

        erroEmail.code = "ECONNECTION";
        erroEmail.response = "SMTP indisponível";
        erroEmail.responseCode = 500;
        erroEmail.command = "DATA";

        enviarEmailRecuperacaoSenha.mockRejectedValue(erroEmail);

        const resultado = await executar({
            email: "teste@email.com"
        });

        expect(resultado.status).toBe(200);

        expect(resultado.dados).toEqual({
            mensagem: mensagemPadrao
        });

        expect(userRepository.criarRecuperacaoSenha)
            .toHaveBeenCalled();

        expect(console.error).toHaveBeenCalledWith(
            "[FALHA NO ENVIO DO PIN]",
            {
                mensagem: erroEmail.message,
                codigo: erroEmail.code,
                resposta: erroEmail.response,
                codigoResposta: erroEmail.responseCode,
                comando: erroEmail.command
            }
        );
    });

    test("deve registrar erro quando o SMTP não aceitar o destinatário", async () => {
        enviarEmailRecuperacaoSenha.mockResolvedValue({
            messageId: "email-teste-456",
            accepted: [],
            rejected: ["teste@email.com"],
            response: "550 Recipient rejected"
        });

        const resultado = await executar({
            email: "teste@email.com"
        });

        expect(resultado.status).toBe(200);

        expect(resultado.dados).toEqual({
            mensagem: mensagemPadrao
        });

        expect(console.error).toHaveBeenCalledWith(
            "[RECUPERAÇÃO] O servidor SMTP não aceitou o destinatário."
        );
    });

    test("deve retornar 500 quando ocorrer erro ao consultar o usuário", async () => {
        const erro = new Error("Erro no banco de dados");

        userRepository.buscarUsuarioParaRecuperacao
            .mockRejectedValue(erro);

        const resultado = await executar({
            email: "teste@email.com"
        });

        expect(resultado.status).toBe(500);

        expect(resultado.dados).toEqual({
            mensagem: "Não foi possível processar a solicitação."
        });

        expect(console.error).toHaveBeenCalledWith(
            "[ERRO NA RECUPERAÇÃO DE SENHA]",
            erro
        );
    });

    test("deve retornar 500 quando ocorrer erro ao gerar o hash do PIN", async () => {
        const erro = new Error("Erro ao gerar hash");

        bcrypt.hash.mockRejectedValue(erro);

        const resultado = await executar({
            email: "teste@email.com"
        });

        expect(resultado.status).toBe(500);

        expect(resultado.dados).toEqual({
            mensagem: "Não foi possível processar a solicitação."
        });

        expect(userRepository.invalidarRecuperacoesAnteriores)
            .not.toHaveBeenCalled();

        expect(enviarEmailRecuperacaoSenha)
            .not.toHaveBeenCalled();

        expect(console.error).toHaveBeenCalledWith(
            "[ERRO NA RECUPERAÇÃO DE SENHA]",
            erro
        );
    });

    test("deve retornar 500 quando falhar ao invalidar recuperações anteriores", async () => {
        const erro = new Error("Erro ao invalidar recuperações");

        userRepository.invalidarRecuperacoesAnteriores
            .mockRejectedValue(erro);

        const resultado = await executar({
            email: "teste@email.com"
        });

        expect(resultado.status).toBe(500);

        expect(resultado.dados).toEqual({
            mensagem: "Não foi possível processar a solicitação."
        });

        expect(userRepository.criarRecuperacaoSenha)
            .not.toHaveBeenCalled();

        expect(enviarEmailRecuperacaoSenha)
            .not.toHaveBeenCalled();

        expect(console.error).toHaveBeenCalledWith(
            "[ERRO NA RECUPERAÇÃO DE SENHA]",
            erro
        );
    });

    test("deve retornar 500 quando falhar ao salvar a recuperação", async () => {
        const erro = new Error("Erro ao salvar recuperação");

        userRepository.criarRecuperacaoSenha
            .mockRejectedValue(erro);

        const resultado = await executar({
            email: "teste@email.com"
        });

        expect(resultado.status).toBe(500);

        expect(resultado.dados).toEqual({
            mensagem: "Não foi possível processar a solicitação."
        });

        expect(enviarEmailRecuperacaoSenha)
            .not.toHaveBeenCalled();

        expect(console.error).toHaveBeenCalledWith(
            "[ERRO NA RECUPERAÇÃO DE SENHA]",
            erro
        );
    });
});
