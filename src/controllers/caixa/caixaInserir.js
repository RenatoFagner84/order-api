const caixaRepository = require("../../repositories/caixaRepository");

const caixaInserir = async (req, res) => {
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

    const resultado = await caixaRepository.inserir(
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

    res.writeHead(201, {
      "Content-Type": "application/json"
    });

    res.end(JSON.stringify(resultado.rows[0]));
  });
};

module.exports = caixaInserir;