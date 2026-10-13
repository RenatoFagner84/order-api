const cartCriar = require("./cartCriar");
const cartConsultar = require("./cartConsultar");
const cartListarTodos = require("./cartListarTodos");
const cartAdicionarProduto = require("./cartAdicionarProduto");
const cartRemoverProduto = require("./cartRemoverProduto");
const cartAtualizarQuantidade = require("./cartAtualizarQuantidade");

module.exports = {
    cartCriar,
    cartConsultar,
    cartListarTodos,
    cartAdicionarProduto,
    cartRemoverProduto,
    cartAtualizarQuantidade
};