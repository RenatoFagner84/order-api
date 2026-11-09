const enderecoRepository = require("../../src/repositories/enderecoRepository");
const enderecoAtualizar = require("../../src/controllers/enderecos/enderecoAtualizar");

jest.mock("../../src/repositories/enderecoRepository");

describe("enderecoAtualizar", () => {
    let req;
    let res;
    let consoleErrorOriginal;

    const criarResposta = () => {
        const resposta = {
            statusCode: null,
            headers: {},
            body: null,
            writableEnded: false,
            headersSent: false,

            writeHead: jest.fn(function (status, headers) {
                this.statusCode = status;
                this.headers = headers;
                this.headersSent = true;
                return this;
            }),

            end: jest.fn(function (dados) {
                this.body = dados;
                this.writableEnded = true;
                return this;
            })
        };

        return resposta;
    };

    const criarRequisicao = (id = 1, corpo = {}) => {
        const conteudo = JSON.stringify(corpo);

        return {
            params: { id },

            async *[Symbol.asyncIterator]() {
                yield Buffer.from(conteudo);
            }
        };
    };

    const criarErroNaLeitura = () => ({
        params: { id: 1 },

        async *[Symbol.asyncIterator]() {
            throw new Error("Erro na leitura da requisição");
        }
    });

    const endereco = {
        id: 1,
        cep: "57000000",
        logradouro: "Rua das Flores",
        numero: "123",
        complemento: "Apartamento 2",
        bairro: "Centro",
        cidade: "Maceió",
        estado: "AL"
    };

    const dadosAtualizacao = {
        cep: "57000000",
        logradouro: "Rua das Flores",
        numero: "123",
        complemento: "Apartamento 2",
        bairro: "Centro",
        cidade: "Maceió",
        estado: "AL"
    };

    beforeAll(() => {
        consoleErrorOriginal = console.error;
        console.error = jest.fn();
    });

    afterAll(() => {
        console.error = consoleErrorOriginal;
    });

    beforeEach(() => {
        jest.clearAllMocks();

        req = criarRequisicao(1, dadosAtualizacao);
        res = criarResposta();

        enderecoRepository.ler.mockResolvedValue({
            rows: [endereco]
        });

        enderecoRepository.atualizar.mockResolvedValue({
            rows: [endereco]
        });
    });

    test("deve atualizar o endereço com sucesso", async () => {
        await enderecoAtualizar(req, res);

        expect(enderecoRepository.ler).toHaveBeenCalledWith(1);

        expect(enderecoRepository.atualizar).toHaveBeenCalledWith(
            1,
            dadosAtualizacao.cep,
            dadosAtualizacao.logradouro,
            dadosAtualizacao.numero,
            dadosAtualizacao.complemento,
            dadosAtualizacao.bairro,
            dadosAtualizacao.cidade,
            dadosAtualizacao.estado
        );

        expect(res.statusCode).toBe(200);
        expect(JSON.parse(res.body)).toEqual(endereco);
    });

    test("deve rejeitar ID inválido", async () => {
        req = criarRequisicao("abc", dadosAtualizacao);

        await enderecoAtualizar(req, res);

        expect(res.statusCode).toBe(400);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "ID do endereço inválido."
        });
        expect(enderecoRepository.ler).not.toHaveBeenCalled();
        expect(enderecoRepository.atualizar).not.toHaveBeenCalled();
    });

    test("deve rejeitar ID igual a zero", async () => {
        req = criarRequisicao(0, dadosAtualizacao);

        await enderecoAtualizar(req, res);

        expect(res.statusCode).toBe(400);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "ID do endereço inválido."
        });
        expect(enderecoRepository.ler).not.toHaveBeenCalled();
    });

    test("deve rejeitar ID negativo", async () => {
        req = criarRequisicao(-1, dadosAtualizacao);

        await enderecoAtualizar(req, res);

        expect(res.statusCode).toBe(400);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "ID do endereço inválido."
        });
        expect(enderecoRepository.ler).not.toHaveBeenCalled();
    });

    test("deve rejeitar ID decimal", async () => {
        req = criarRequisicao(1.5, dadosAtualizacao);

        await enderecoAtualizar(req, res);

        expect(res.statusCode).toBe(400);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "ID do endereço inválido."
        });
        expect(enderecoRepository.ler).not.toHaveBeenCalled();
    });

    test("deve rejeitar ID ausente", async () => {
        req = {
            params: {},
            async *[Symbol.asyncIterator]() {
                yield Buffer.from(JSON.stringify(dadosAtualizacao));
            }
        };

        await enderecoAtualizar(req, res);

        expect(res.statusCode).toBe(400);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "ID do endereço inválido."
        });
        expect(enderecoRepository.ler).not.toHaveBeenCalled();
    });

    test("deve retornar 404 quando o endereço não existir", async () => {
        enderecoRepository.ler.mockResolvedValue({
            rows: []
        });

        await enderecoAtualizar(req, res);

        expect(res.statusCode).toBe(404);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Endereço não encontrado"
        });
        expect(enderecoRepository.atualizar).not.toHaveBeenCalled();
    });

    test("deve rejeitar JSON inválido", async () => {
        req = {
            params: { id: 1 },

            async *[Symbol.asyncIterator]() {
                yield Buffer.from("{json-invalido");
            }
        };

        await enderecoAtualizar(req, res);

        expect(res.statusCode).toBe(400);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Corpo da requisição JSON inválido."
        });
        expect(enderecoRepository.ler).not.toHaveBeenCalled();
        expect(enderecoRepository.atualizar).not.toHaveBeenCalled();
    });

    test("deve rejeitar corpo JSON igual a null", async () => {
        req = criarRequisicao(1, null);

        await enderecoAtualizar(req, res);

        expect(res.statusCode).toBe(400);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "O corpo da requisição deve ser um objeto JSON."
        });
        expect(enderecoRepository.ler).not.toHaveBeenCalled();
    });

    test("deve rejeitar corpo JSON em formato de array", async () => {
        req = criarRequisicao(1, [dadosAtualizacao]);

        await enderecoAtualizar(req, res);

        expect(res.statusCode).toBe(400);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "O corpo da requisição deve ser um objeto JSON."
        });
        expect(enderecoRepository.ler).not.toHaveBeenCalled();
    });

    test("deve rejeitar corpo JSON contendo uma string", async () => {
        req = criarRequisicao(1, "texto");

        await enderecoAtualizar(req, res);

        expect(res.statusCode).toBe(400);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "O corpo da requisição deve ser um objeto JSON."
        });
        expect(enderecoRepository.ler).not.toHaveBeenCalled();
    });

    test("deve rejeitar corpo da requisição maior que 1 MB", async () => {
        req = {
            params: { id: 1 },

            async *[Symbol.asyncIterator]() {
                yield Buffer.alloc(1024 * 1024 + 1, 97);
            }
        };

        await enderecoAtualizar(req, res);

        expect(res.statusCode).toBe(413);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Corpo da requisição muito grande."
        });
        expect(enderecoRepository.ler).not.toHaveBeenCalled();
        expect(enderecoRepository.atualizar).not.toHaveBeenCalled();
    });

    test("deve retornar erro 400 quando ocorrer falha ao receber a requisição", async () => {
        req = criarErroNaLeitura();

        await enderecoAtualizar(req, res);

        expect(res.statusCode).toBe(400);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Erro ao receber os dados da requisição."
        });
        expect(enderecoRepository.ler).not.toHaveBeenCalled();
        expect(enderecoRepository.atualizar).not.toHaveBeenCalled();
        expect(console.error).toHaveBeenCalled();
    });

    test("deve retornar erro 500 quando a consulta do endereço falhar", async () => {
        enderecoRepository.ler.mockRejectedValue(
            new Error("Erro ao consultar endereço")
        );

        await enderecoAtualizar(req, res);

        expect(res.statusCode).toBe(500);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Erro interno ao atualizar o endereço."
        });
        expect(enderecoRepository.atualizar).not.toHaveBeenCalled();
        expect(console.error).toHaveBeenCalled();
    });

    test("deve retornar erro 500 quando a atualização falhar", async () => {
        enderecoRepository.atualizar.mockRejectedValue(
            new Error("Erro ao atualizar endereço")
        );

        await enderecoAtualizar(req, res);

        expect(res.statusCode).toBe(500);
        expect(JSON.parse(res.body)).toEqual({
            mensagem: "Erro interno ao atualizar o endereço."
        });
        expect(console.error).toHaveBeenCalled();
    });

    test("deve respeitar os campos enviados na requisição", async () => {
        const novosDados = {
            cep: "57010000",
            logradouro: "Avenida Brasil",
            numero: "456",
            complemento: "Casa",
            bairro: "Pajuçara",
            cidade: "Maceió",
            estado: "AL"
        };

        req = criarRequisicao(5, novosDados);

        enderecoRepository.ler.mockResolvedValue({
            rows: [{ id: 5 }]
        });

        enderecoRepository.atualizar.mockResolvedValue({
            rows: [{
                id: 5,
                ...novosDados
            }]
        });

        await enderecoAtualizar(req, res);

        expect(enderecoRepository.atualizar).toHaveBeenCalledWith(
            5,
            "57010000",
            "Avenida Brasil",
            "456",
            "Casa",
            "Pajuçara",
            "Maceió",
            "AL"
        );

        expect(res.statusCode).toBe(200);
        expect(JSON.parse(res.body)).toEqual({
            id: 5,
            ...novosDados
        });
    });

    test("não deve enviar uma segunda resposta quando ela já foi encerrada", async () => {
        res.writableEnded = true;

        await enderecoAtualizar(req, res);

        expect(res.writeHead).not.toHaveBeenCalled();
        expect(res.end).not.toHaveBeenCalled();
    });

    test("deve liberar a resposta sem escrever quando os cabeçalhos já foram enviados", async () => {
        res.headersSent = true;

        await enderecoAtualizar(req, res);

        expect(res.writeHead).not.toHaveBeenCalled();
        expect(res.end).not.toHaveBeenCalled();
    });
});
