const pedidosConsultar = require("./pedidosConsultar");
const pedidosCancelar = require("./pedidosCancelar");
const pedidosCriar = require("./pedidosCriar");
const pedidosAtualizar = require("./pedidosAtualizar");
const pedidosOcultar = require("./pedidosOcultar");
const pedidosFinalizar = require("./pedidosFinalizar");
const pedidosHistoricoStatus = require("./pedidosHistoricoStatus");

module.exports = {
    pedidosConsultar,
    pedidosCancelar,
    pedidosCriar,
    pedidosAtualizar,
    pedidosOcultar,
    pedidosFinalizar,
    pedidosHistoricoStatus
};