const { Readable } = require("stream");

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

const mensagemEsperada =
    "Se o e-mail estiver cadastrado, você receberá um código de recuperação.";

describe("usersRecuperarSenha", () => {

    beforeEach(() => {
        jest.clearAllMocks();

        bcrypt.hash.mockResolvedValue("pin_hash_teste");
        randomInt.mockReturnValue(123456);

        userRepository.buscarUsuarioParaRecuperacao.mockResolvedValue({
            rowCount: 1,
            rows: [{
                id: 1,
                nome: "Usuário Teste",
                email: "teste@email.com"
            }]
        });

        userRepository.invalidarRecuperacoesAnteriores.mockResolvedValue({
            rowCount: 1
        });

        userRepository.criarRecuperacaoSenha.mockResolvedValue({
            rowCount: 1
        });

        enviarEmailRecuperacaoSenha.mockResolvedValue(true);
    });

    test("deve retornar 400 quando o e-mail não for informado", async () => {
        const req = criarRequisicao({});
        const res = criarResposta();

        await usersRecuperarSenha(req, res);

        expect(res.writeHead).toHaveBeenCalledWith(400, expect.any(Object));

        expect(JSON.parse(res.end.mock.calls[0][0])).toEqual({
            mensagem: "Informe um endereço de e-mail válido."
        });

        expect(userRepository.buscarUsuarioParaRecuperacao).not.toHaveBeenCalled();
    });

    test("deve retornar 400 quando o e-mail for inválido", async () => {
        const req = criarRequisicao({
            email: "email-invalido"
        });

        const res = criarResposta();

        await usersRecuperarSenha(req, res);

        expect(res.writeHead).toHaveBeenCalledWith(400, expect.any(Object));

        expect(JSON.parse(res.end.mock.calls[0][0])).toEqual({
            mensagem: "Informe um endereço de e-mail válido."
        });

        expect(userRepository.buscarUsuarioParaRecuperacao).not.toHaveBeenCalled();
    });

    test("deve retornar 200 quando o usuário não estiver cadastrado", async () => {
        userRepository.buscarUsuarioParaRecuperacao.mockResolvedValue({
            rowCount: 0,
            rows: []
        });

        const req = criarRequisicao({
            email: "desconhecido@email.com"
        });

        const res = criarResposta();

        await usersRecuperarSenha(req, res);

        expect(res.writeHead).toHaveBeenCalledWith(200, expect.any(Object));

        expect(JSON.parse(res.end.mock.calls[0][0])).toEqual({
            mensagem: mensagemEsperada
        });

        expect(bcrypt.hash).not.toHaveBeenCalled();
        expect(enviarEmailRecuperacaoSenha).not.toHaveBeenCalled();
    });

    test("deve gerar PIN, salvar recuperação e enviar e-mail com sucesso", async () => {
        const req = criarRequisicao({
            email: "  TESTE@EMAIL.COM  "
        });

        const res = criarResposta();

        await usersRecuperarSenha(req, res);

        expect(userRepository.buscarUsuarioParaRecuperacao)
            .toHaveBeenCalledWith("teste@email.com");

        expect(randomInt).toHaveBeenCalledWith(100000, 1000000);

        expect(bcrypt.hash).toHaveBeenCalledWith("123456", 10);

        expect(userRepository.invalidarRecuperacoesAnteriores)
            .toHaveBeenCalledWith(1);

        expect(userRepository.criarRecuperacaoSenha)
            .toHaveBeenCalledWith(
                1,
                "pin_hash_teste",
                expect.any(Date)
            );

        expect(enviarEmailRecuperacaoSenha).toHaveBeenCalledWith({
            nome: "Usuário Teste",
            email: "teste@email.com",
            pin: "123456"
        });

        expect(res.writeHead).toHaveBeenCalledWith(200, expect.any(Object));

        expect(JSON.parse(res.end.mock.calls[0][0])).toEqual({
            mensagem: mensagemEsperada
        });
    });

    test("deve retornar 500 quando ocorrer erro ao consultar o usuário", async () => {
        userRepository.buscarUsuarioParaRecuperacao.mockRejectedValue(
            new Error("Erro no banco de dados")
        );

        const consoleSpy = jest
            .spyOn(console, "error")
            .mockImplementation(() => {});

        try {
            const req = criarRequisicao({
                email: "teste@email.com"
            });

            const res = criarResposta();

            await usersRecuperarSenha(req, res);

            expect(res.writeHead).toHaveBeenCalledWith(500, expect.any(Object));

            expect(JSON.parse(res.end.mock.calls[0][0])).toEqual({
                mensagem: "Não foi possível solicitar a recuperação de senha."
            });
        } finally {
            consoleSpy.mockRestore();
        }
    });

    test("deve retornar 500 quando ocorrer erro no envio do e-mail", async () => {
        enviarEmailRecuperacaoSenha.mockRejectedValue(
            new Error("Falha no envio do e-mail")
        );

        const consoleSpy = jest
            .spyOn(console, "error")
            .mockImplementation(() => {});

        try {
            const req = criarRequisicao({
                email: "teste@email.com"
            });

            const res = criarResposta();

            await usersRecuperarSenha(req, res);

            expect(res.writeHead).toHaveBeenCalledWith(500, expect.any(Object));

            expect(JSON.parse(res.end.mock.calls[0][0])).toEqual({
                mensagem: "Não foi possível solicitar a recuperação de senha."
            });
        } finally {
            consoleSpy.mockRestore();
        }
    });
});
