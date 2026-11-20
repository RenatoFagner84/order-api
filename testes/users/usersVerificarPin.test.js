
jest.mock("bcryptjs", () => ({
    hash: jest.fn().mockResolvedValue("hash-ficticio"),
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

const criarRequisicao = (body) => ({ body });

const criarResposta = () => {
    const res = {};

    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);

    return res;
};

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
            rowCount: 1
        });
    });

    afterAll(() => {
        if (jwtSecretOriginal === undefined) {
            delete process.env.JWT_SECRET;
        } else {
            process.env.JWT_SECRET = jwtSecretOriginal;
        }
    });

    const executar = async (body) => {
        const req = criarRequisicao(body);
        const res = criarResposta();

        await usersVerificarPin(req, res);

        return {
            status: res.status.mock.calls[0]?.[0],
            body: res.json.mock.calls[0]?.[0],
            res
        };
    };

    test("deve retornar 400 quando o corpo estiver ausente", async () => {
        const resultado = await executar(undefined);

        expect(resultado.status).toBe(400);
        expect(resultado.body.mensagem).toBe(
            "Informe o e-mail e o código de recuperação."
        );
        expect(userRepository.buscarRecuperacaoAtiva).not.toHaveBeenCalled();
    });

    test("deve retornar 400 quando o e-mail estiver ausente", async () => {
        const resultado = await executar({ pin: "123456" });

        expect(resultado.status).toBe(400);
        expect(resultado.body.mensagem).toBe(
            "Informe o e-mail e o código de recuperação."
        );
    });

    test("deve retornar 400 quando o PIN estiver ausente", async () => {
        const resultado = await executar({ email: "teste@email.com" });

        expect(resultado.status).toBe(400);
        expect(resultado.body.mensagem).toBe(
            "Informe o e-mail e o código de recuperação."
        );
    });

    test("deve retornar 400 quando o e-mail não for uma string", async () => {
        const resultado = await executar({
            email: 123,
            pin: "123456"
        });

        expect(resultado.status).toBe(400);
        expect(userRepository.buscarRecuperacaoAtiva).not.toHaveBeenCalled();
    });

    test("deve retornar 400 quando o e-mail for inválido", async () => {
        const resultado = await executar({
            email: "email_invalido",
            pin: "123456"
        });

        expect(resultado.status).toBe(400);
        expect(resultado.body.mensagem).toBe(
            "Não foi possível validar o código. Confira os dados ou solicite um novo código."
        );
        expect(userRepository.buscarRecuperacaoAtiva).not.toHaveBeenCalled();
    });

    test("deve retornar 400 quando o PIN não tiver seis números", async () => {
        const resultado = await executar({
            email: "teste@email.com",
            pin: "12345"
        });

        expect(resultado.status).toBe(400);
        expect(userRepository.buscarRecuperacaoAtiva).not.toHaveBeenCalled();
    });

    test("deve retornar 400 quando o PIN tiver letras", async () => {
        const resultado = await executar({
            email: "teste@email.com",
            pin: "12ab56"
        });

        expect(resultado.status).toBe(400);
    });

    test("deve normalizar o e-mail antes de consultar a recuperação", async () => {
        userRepository.buscarRecuperacaoAtiva.mockResolvedValue({
            rowCount: 0,
            rows: []
        });

        await executar({
            email: "  TESTE@EMAIL.COM  ",
            pin: "123456"
        });

        expect(userRepository.buscarRecuperacaoAtiva).toHaveBeenCalledWith(
            "teste@email.com"
        );
    });

    test("deve retornar 400 quando não existir recuperação ativa", async () => {
        userRepository.buscarRecuperacaoAtiva.mockResolvedValue({
            rowCount: 0,
            rows: []
        });

        const resultado = await executar({
            email: "teste@email.com",
            pin: "123456"
        });

        expect(resultado.status).toBe(400);
        expect(resultado.body.mensagem).toBe(
            "Não foi possível validar o código. Confira os dados ou solicite um novo código."
        );
        expect(bcrypt.compare).toHaveBeenCalledWith(
            "123456",
            "hash-ficticio"
        );
    });

    test("deve invalidar a recuperação quando atingir cinco tentativas", async () => {
        userRepository.buscarRecuperacaoAtiva.mockResolvedValue({
            rowCount: 1,
            rows: [criarRecuperacao({ tentativas: 5 })]
        });

        const resultado = await executar({
            email: "teste@email.com",
            pin: "123456"
        });

        expect(resultado.status).toBe(400);
        expect(userRepository.invalidarRecuperacao).toHaveBeenCalledWith(10);
        expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    test("deve invalidar a recuperação quando estiver expirada", async () => {
        userRepository.buscarRecuperacaoAtiva.mockResolvedValue({
            rowCount: 1,
            rows: [
                criarRecuperacao({
                    expires_at: new Date(Date.now() - 1000)
                })
            ]
        });

        const resultado = await executar({
            email: "teste@email.com",
            pin: "123456"
        });

        expect(resultado.status).toBe(400);
        expect(userRepository.invalidarRecuperacao).toHaveBeenCalledWith(10);
        expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    test("deve registrar tentativa quando o PIN estiver incorreto", async () => {
        bcrypt.compare.mockResolvedValue(false);

        const resultado = await executar({
            email: "teste@email.com",
            pin: "123456"
        });

        expect(resultado.status).toBe(400);
        expect(bcrypt.compare).toHaveBeenCalledWith(
            "123456",
            "pin_hash_teste"
        );
        expect(
            userRepository.registrarTentativaRecuperacao
        ).toHaveBeenCalledWith(10);
        expect(jwt.sign).not.toHaveBeenCalled();
    });

    test("deve retornar 500 quando JWT_SECRET não estiver configurado", async () => {
        delete process.env.JWT_SECRET;

        const erroOriginal = console.error;
        console.error = jest.fn();

        try {
            const resultado = await executar({
                email: "teste@email.com",
                pin: "123456"
            });

            expect(resultado.status).toBe(500);
            expect(resultado.body.mensagem).toBe(
                "Não foi possível validar o código. Tente novamente mais tarde."
            );
        } finally {
            console.error = erroOriginal;
        }
    });

    test("deve retornar token quando o PIN estiver correto", async () => {
        const resultado = await executar({
            email: "teste@email.com",
            pin: "123456"
        });

        expect(resultado.status).toBe(200);
        expect(resultado.body).toEqual({
            mensagem: "Código verificado com sucesso.",
            token: "token_jwt_teste"
        });

        expect(jwt.sign).toHaveBeenCalledWith(
            {
                sub: "1",
                resetId: 10,
                purpose: "password_reset"
            },
            "segredo_teste",
            { expiresIn: "10m" }
        );

        expect(
            userRepository.registrarTentativaRecuperacao
        ).not.toHaveBeenCalled();
    });

    test("deve retornar 500 quando a consulta ao repositório falhar", async () => {
        userRepository.buscarRecuperacaoAtiva.mockRejectedValue(
            new Error("Erro no banco")
        );

        const erroOriginal = console.error;
        console.error = jest.fn();

        try {
            const resultado = await executar({
                email: "teste@email.com",
                pin: "123456"
            });

            expect(resultado.status).toBe(500);
            expect(resultado.body.mensagem).toBe(
                "Não foi possível validar o código. Tente novamente mais tarde."
            );
        } finally {
            console.error = erroOriginal;
        }
    });

    test("deve retornar 500 quando a comparação do PIN falhar", async () => {
        bcrypt.compare.mockRejectedValue(new Error("Erro no bcrypt"));

        const erroOriginal = console.error;
        console.error = jest.fn();

        try {
            const resultado = await executar({
                email: "teste@email.com",
                pin: "123456"
            });

            expect(resultado.status).toBe(500);
        } finally {
            console.error = erroOriginal;
        }
    });

    test("deve retornar 500 quando a geração do token falhar", async () => {
        jwt.sign.mockImplementation(() => {
            throw new Error("Erro ao gerar token");
        });

        const erroOriginal = console.error;
        console.error = jest.fn();

        try {
            const resultado = await executar({
                email: "teste@email.com",
                pin: "123456"
            });

            expect(resultado.status).toBe(500);
        } finally {
            console.error = erroOriginal;
        }
    });
});
