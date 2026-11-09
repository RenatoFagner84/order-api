const EventEmitter = require("events");
const caixaAtualizar = require("../../src/controllers/caixa/caixaAtualizar");
const caixaRepository = require("../../src/repositories/caixaRepository");

jest.mock("../../src/repositories/caixaRepository");

function criarRequisicao(caminho = "/caixa/atualizar/10") {
  const req = new EventEmitter();
  req.url = caminho;
  req.method = "PUT";
  req.destroy = jest.fn();
  return req;
}

function criarResposta() {
  const res = {
    statusCode: null,
    headers: {},
    body: null,
    writableEnded: false,
    writeHead: jest.fn(function (statusCode, headers = {}) {
      this.statusCode = statusCode;
      this.headers = headers;
    }),
    end: jest.fn(function (body = "") {
      this.body = body ? JSON.parse(body) : null;
      this.writableEnded = true;
    })
  };

  return res;
}

function executar(conteudo, caminho = "/caixa/atualizar/10") {
  const req = criarRequisicao(caminho);
  const res = criarResposta();
  caixaAtualizar(req, res, caminho);
 
  req.emit("data", Buffer.from(conteudo));
  req.emit("end");

  return { req, res };
}

describe("caixaAtualizar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("deve atualizar uma movimentação com sucesso", async () => {
    const movimentacao = { id: 10, descricao: "Venda" };

    caixaRepository.ler.mockResolvedValue({ rows: [{ id: 10 }] });
    caixaRepository.atualizar.mockResolvedValue({ rows: [movimentacao] });

    const { res } = executar(JSON.stringify({
      user_id: 1,
      pedido_id: 2,
      tipo_movimentacao_id: 3,
      subtotal: 100,
      desconto: 0,
      frete: 0,
      acrescimo: 0,
      total: 100,
      forma_pagamento_id: 1,
      pagamento_status_id: 1,
      descricao: "Venda"
    }));

    await new Promise(setImmediate);

    expect(caixaRepository.ler).toHaveBeenCalledWith(10);
    expect(caixaRepository.atualizar).toHaveBeenCalledWith(
      10, 1, 2, 3, 100, 0, 0, 0, 100, 1, 1, "Venda"
    );
    console.log(res.statusCode);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(movimentacao);
  });

  test.each([
    "/caixa/atualizar/abc",
    "/caixa/atualizar/0",
    "/caixa/atualizar/-1",
    "/caixa/atualizar/1.5"
  ])("deve rejeitar ID inválido: %s", async (caminho) => {
    const { res } = executar("{}", caminho);

    await new Promise(setImmediate);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      mensagem: "ID da movimentação inválido."
    });
    expect(caixaRepository.ler).not.toHaveBeenCalled();
  });

  test("deve rejeitar JSON inválido", async () => {
    const { res } = executar("{");

    await new Promise(setImmediate);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ mensagem: "JSON inválido." });
  });

  test.each(["null", "[]", '"texto"', "123"])(
    "deve rejeitar dados que não sejam um objeto: %s",
    async (conteudo) => {
      const { res } = executar(conteudo);

      await new Promise(setImmediate);

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({
        mensagem: "Os dados enviados são inválidos."
      });
    }
  );

  test("deve retornar 404 quando a movimentação não existir", async () => {
    caixaRepository.ler.mockResolvedValue({ rows: [] });

    const { res } = executar("{}");

    await new Promise(setImmediate);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      mensagem: "Movimentação do caixa não encontrada."
    });
    expect(caixaRepository.atualizar).not.toHaveBeenCalled();
  });

  test("deve retornar 404 quando a atualização não encontrar a movimentação", async () => {
    caixaRepository.ler.mockResolvedValue({ rows: [{ id: 10 }] });
    caixaRepository.atualizar.mockResolvedValue({ rows: [] });

    const { res } = executar("{}");

    await new Promise(setImmediate);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      mensagem: "Movimentação do caixa não encontrada."
    });
  });

  test("deve retornar 500 quando o repositório lançar erro", async () => {
    caixaRepository.ler.mockRejectedValue(new Error("Erro no banco"));

    const { res } = executar("{}");

    await new Promise(setImmediate);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      mensagem: "Erro interno ao atualizar a movimentação do caixa."
    });
  });

  test("deve rejeitar corpo muito grande", async () => {
    const req = criarRequisicao();
    const res = criarResposta();

    caixaAtualizar(req, res, req.url);
    req.emit("data", Buffer.alloc(1_000_001, "a"));

    await new Promise(setImmediate);

    expect(res.statusCode).toBe(413);
    expect(res.body).toEqual({
      mensagem: "Corpo da requisição muito grande."
    });
    expect(req.destroy).toHaveBeenCalled();
  });

  test("deve responder erro quando a requisição emitir erro", async () => {
    const req = criarRequisicao();
    const res = criarResposta();

    caixaAtualizar(req, res, req.url);
    req.emit("error", new Error("Erro de conexão"));

    await new Promise(setImmediate);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      mensagem: "Erro ao receber os dados da requisição."
    });
  });
});