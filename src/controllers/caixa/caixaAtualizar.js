const caixaRepository = require("../../repositories/caixaRepository");

const caixaAtualizar = async (req, res) => {
  const id = req.url.split("/")[3];

  let body = "";

  req.on("data", (chunk) => {
    body += chunk.toString();
  });

  req.on("end", async () => {
    const dados = JSON.parse(body);

    const {
      user_id,
      pedido_id,
      tipo_movimentacao_id,
      subtotal,
      desconto,
      frete,
      acrescimo,
      total,
      forma_pagamento_id,
      pagamento_status_id,
      descricao
    } = dados;

    const caixaExiste = await caixaRepository.ler(id);

    if (caixaExiste.rows.length === 0) {
      res.writeHead(404, {
        "Content-Type": "application/json"
      });

      res.end(JSON.stringify({
        mensagem: "Movimentação do caixa não encontrada"
      }));

      return;
    }

    const resultado = await caixaRepository.atualizar(
      id,
      user_id,
      pedido_id,
      tipo_movimentacao_id,
      subtotal,
      desconto,
      frete,
      acrescimo,
      total,
      forma_pagamento_id,
      pagamento_status_id,
      descricao
    );

    res.writeHead(200, {
      "Content-Type": "application/json"
    });

    res.end(JSON.stringify(resultado.rows[0]));
  });
};

module.exports = caixaAtualizar;