const { Readable } = require("stream");

jest.mock("bcryptjs", () => ({
    compare: jest.fn()
}));

jest.mock("jsonwebtoken", () => ({
    sign: jest.fn()
}));

jest.mock("../../src/repositories/userRepository", () => ({
    buscarRecuperacaoAtiva: jest.fn(),
    invalidarRecuperacao: jest.fn(),
    registrarTentativaRecuperacao: jest.fn()
}));

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const userRepository = require("../../src/repositories/userRepository");

const usersVerificarPin = require(
    "../../src/controllers/users/usersVerificarPin"
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

const criarRecuperacao = (dados = {}) => ({
    id: 10,
    user_id: 1,
    pin_hash: "pin_hash_teste",
    expires_at: new Date(Date.now() + 5 * 60 * 1000),
    tentativas: 0,
    ...dados
});

describe("usersVerificarPin", () => {

    const jwtSecretOriginal = process.env.JWT_SECRET;

    beforeEach(() => {
        jest.clearAllMocks();

        process.env.JWT_SECRET = "segredo_teste";

        bcrypt.compare.mockResolvedValue(true);

        jwt.sign.mockReturnValue("token_jwt_teste");

        userRepository.buscarRecuperacaoAtiva.mockResolvedValue({
            rowCount: 1,
            rows: [criarRecuperacao()]
        });

        userRepository.invalidarRecuperacao.mockResolvedValue({
            rowCount: 1
        });

        userRepository.registrarTentativaRecuperacao.mockResolvedValue({
            rowCount: 1,
            rows: [{ tentativas: 1 }]
        });
    });

    afterAll(() => {
        if (jwtSecretOriginal === undefined) {
            delete process.env.JWT_SECRET;
        } else {
            process.env.JWT_SECRET = jwtSecretOriginal;
        }
    });

    test("deve retornar 400 quando e-mail ou PIN não forem informados", async () => {
        const req = criarRequisicao({
            email: "",
            pin: ""
        });

        const res = criarResposta();

        await usersVerificarPin(req, res);

        expect(res.writeHead).toHaveBeenCalledWith(400, expect.any(Object));

        expect(JSON.parse(res.end.mock.calls[0][0])).toEqual({
            mensagem: "Informe o e-mail e o código de recuperação."
        });

        expect(userRepository.buscarRecuperacaoAtiva).not.toHaveBeenCalled();
    });

    test("deve retornar 400 quando o JSON for inválido", async () => {
        const req = criarRequisicao("{json-invalido");

        const res = criarResposta();

        await usersVerificarPin(req, res);

        expect(res.writeHead).toHaveBeenCalledWith(400, expect.any(Object));

        expect(JSON.parse(res.end.mock.calls[0][0])).toEqual({
            mensagem: "Informe o e-mail e o código de recuperação."
        });
    });

    test("deve retornar 400 quando o e-mail for inválido", async () => {
        const req = criarRequisicao({
            email: "email_invalido",
            pin: "123456"
        });

        const res = criarResposta();

        await usersVerificarPin(req, res);

        expect(res.writeHead).toHaveBeenCalledWith(400, expect.any(Object));

        expect(JSON.parse(res.end.mock.calls[0][0])).toEqual({
            mensagem: "E-mail inválido."
        });

        expect(userRepository.buscarRecuperacaoAtiva).not.toHaveBeenCalled();
    });

    test("deve retornar 400 quando o PIN não tiver exatamente 6 números", async () => {
        const req = criarRequisicao({
            email: "teste@email.com",
            pin: "12345"
        });

        const res = criarResposta();

        await usersVerificarPin(req, res);

        expect(res.writeHead).toHaveBeenCalledWith(400, expect.any(Object));

        expect(JSON.parse(res.end.mock.calls[0][0])).toEqual({
            mensagem: "O código deve conter exatamente 6 números."
        });

        expect(userRepository.buscarRecuperacaoAtiva).not.toHaveBeenCalled();
    });

    test("deve normalizar o e-mail antes de buscar a recuperação", async () => {
        userRepository.buscarRecuperacaoAtiva.mockResolvedValue({
            rowCount: 0,
            rows: []
        });

        const req = criarRequisicao({
            email: "  TESTE@EMAIL.COM  ",
            pin: "123456"
        });

        const res = criarResposta();

        await usersVerificarPin(req, res);

        expect(userRepository.buscarRecuperacaoAtiva).toHaveBeenCalledWith(
            "teste@email.com"
        );
    });

    test("deve retornar 400 quando não existir recuperação ativa", async () => {
        userRepository.buscarRecuperacaoAtiva.mockResolvedValue({
            rowCount: 0,
            rows: []
        });

        const req = criarRequisicao({
            email: "teste@email.com",
            pin: "123456"
        });

        const res = criarResposta();

        await usersVerificarPin(req, res);

        expect(res.writeHead).toHaveBeenCalledWith(400, expect.any(Object));

        expect(JSON.parse(res.end.mock.calls[0][0])).toEqual({
            mensagem: "Código inválido ou expirado. Solicite uma nova recuperação."
        });
    });

    test("deve invalidar a recuperação quando atingir 5 tentativas", async () => {
        userRepository.buscarRecuperacaoAtiva.mockResolvedValue({
            rowCount: 1,
            rows: [criarRecuperacao({ tentativas: 5 })]
        });

        const req = criarRequisicao({
            email: "teste@email.com",
            pin: "123456"
        });

        const res = criarResposta();

        await usersVerificarPin(req, res);

        expect(userRepository.invalidarRecuperacao).toHaveBeenCalledWith(10);

        expect(res.writeHead).toHaveBeenCalledWith(400, expect.any(Object));

        expect(JSON.parse(res.end.mock.calls[0][0])).toEqual({
            mensagem: "Limite de tentativas atingido. Solicite um novo código."
        });

        expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    test("deve invalidar a recuperação quando o código estiver expirado", async () => {
        userRepository.buscarRecuperacaoAtiva.mockResolvedValue({
            rowCount: 1,
            rows: [
                criarRecuperacao({
                    expires_at: new Date(Date.now() - 1000)
                })
            ]
        });

        const req = criarRequisicao({
            email: "teste@email.com",
            pin: "123456"
        });

        const res = criarResposta();

        await usersVerificarPin(req, res);

        expect(userRepository.invalidarRecuperacao).toHaveBeenCalledWith(10);

        expect(res.writeHead).toHaveBeenCalledWith(400, expect.any(Object));

        expect(JSON.parse(res.end.mock.calls[0][0])).toEqual({
            mensagem: "Código expirado. Solicite uma nova recuperação."
        });

        expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    test("deve registrar tentativa quando o PIN estiver incorreto", async () => {
        bcrypt.compare.mockResolvedValue(false);

        userRepository.registrarTentativaRecuperacao.mockResolvedValue({
            rowCount: 1,
            rows: [{ tentativas: 1 }]
        });

        const req = criarRequisicao({
            email: "teste@email.com",
            pin: "654321"
        });

        const res = criarResposta();

        await usersVerificarPin(req, res);

        expect(bcrypt.compare).toHaveBeenCalledWith(
            "654321",
            "pin_hash_teste"
        );

        expect(userRepository.registrarTentativaRecuperacao).toHaveBeenCalledWith(10);

        expect(res.writeHead).toHaveBeenCalledWith(400, expect.any(Object));

        expect(JSON.parse(res.end.mock.calls[0][0])).toEqual({
            mensagem: "Código incorreto. Você tem 4 tentativa(s) restante(s)."
        });

        expect(jwt.sign).not.toHaveBeenCalled();
    });

    test("deve retornar erro quando atingir o limite na última tentativa", async () => {
        bcrypt.compare.mockResolvedValue(false);

        userRepository.registrarTentativaRecuperacao.mockResolvedValue({
            rowCount: 1,
            rows: [{ tentativas: 5 }]
        });

        const req = criarRequisicao({
            email: "teste@email.com",
            pin: "654321"
        });

        const res = criarResposta();

        await usersVerificarPin(req, res);

        expect(res.writeHead).toHaveBeenCalledWith(400, expect.any(Object));

        expect(JSON.parse(res.end.mock.calls[0][0])).toEqual({
            mensagem: "Limite de tentativas atingido. Solicite um novo código."
        });
    });

    test("deve retornar erro quando não conseguir registrar a tentativa", async () => {
        bcrypt.compare.mockResolvedValue(false);

        userRepository.registrarTentativaRecuperacao.mockResolvedValue({
            rowCount: 0,
            rows: []
        });

        const req = criarRequisicao({
            email: "teste@email.com",
            pin: "654321"
        });

        const res = criarResposta();

        await usersVerificarPin(req, res);

        expect(res.writeHead).toHaveBeenCalledWith(400, expect.any(Object));

        expect(JSON.parse(res.end.mock.calls[0][0])).toEqual({
            mensagem: "Limite de tentativas atingido. Solicite um novo código."
        });
    });

    test("deve retornar 500 quando JWT_SECRET não estiver configurado", async () => {
        delete process.env.JWT_SECRET;

        const consoleSpy = jest
            .spyOn(console, "error")
            .mockImplementation(() => {});

        try {
            const req = criarRequisicao({
                email: "teste@email.com",
                pin: "123456"
            });

            const res = criarResposta();

            await usersVerificarPin(req, res);

            expect(res.writeHead).toHaveBeenCalledWith(500, expect.any(Object));

            expect(JSON.parse(res.end.mock.calls[0][0])).toEqual({
                mensagem: "Não foi possível verificar o código."
            });

            expect(jwt.sign).not.toHaveBeenCalled();
        } finally {
            consoleSpy.mockRestore();
            process.env.JWT_SECRET = "segredo_teste";
        }
    });

    test("deve verificar o PIN e gerar o token JWT com sucesso", async () => {
        const req = criarRequisicao({
            email: "  TESTE@EMAIL.COM  ",
            pin: " 123456 "
        });

        const res = criarResposta();

        await usersVerificarPin(req, res);

        expect(bcrypt.compare).toHaveBeenCalledWith(
            "123456",
            "pin_hash_teste"
        );

        expect(jwt.sign).toHaveBeenCalledWith(
            {
                sub: "1",
                resetId: 10,
                purpose: "password_reset"
            },
            "segredo_teste",
            {
                expiresIn: "10m"
            }
        );

        expect(res.writeHead).toHaveBeenCalledWith(200, expect.any(Object));

        expect(JSON.parse(res.end.mock.calls[0][0])).toEqual({
            mensagem: "Código verificado com sucesso.",
            token: "token_jwt_teste"
        });
    });

    test("deve retornar 500 quando ocorrer erro no repository", async () => {
        userRepository.buscarRecuperacaoAtiva.mockRejectedValue(
            new Error("Erro no banco de dados")
        );

        const consoleSpy = jest
            .spyOn(console, "error")
            .mockImplementation(() => {});

        try {
            const req = criarRequisicao({
                email: "teste@email.com",
                pin: "123456"
            });

            const res = criarResposta();

            await usersVerificarPin(req, res);

            expect(res.writeHead).toHaveBeenCalledWith(500, expect.any(Object));

            expect(JSON.parse(res.end.mock.calls[0][0])).toEqual({
                mensagem: "Não foi possível verificar o código."
            });
        } finally {
            consoleSpy.mockRestore();
        }
    });

});
