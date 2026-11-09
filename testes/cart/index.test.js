
jest.mock("../../src/controllers/cart/cartCriar", () => jest.fn());
jest.mock("../../src/controllers/cart/cartConsultar", () => jest.fn());
jest.mock("../../src/controllers/cart/cartListarTodos", () => jest.fn());
jest.mock("../../src/controllers/cart/cartAdicionarProduto", () => jest.fn());
jest.mock("../../src/controllers/cart/cartRemoverProduto", () => jest.fn());
jest.mock("../../src/controllers/cart/cartAtualizarQuantidade", () => jest.fn());
jest.mock("../../src/controllers/cart/consultarItens", () => jest.fn());

const cartCriar = require("../../src/controllers/cart/cartCriar");
const cartConsultar = require("../../src/controllers/cart/cartConsultar");
const cartListarTodos = require("../../src/controllers/cart/cartListarTodos");
const cartAdicionarProduto = require("../../src/controllers/cart/cartAdicionarProduto");
const cartRemoverProduto = require("../../src/controllers/cart/cartRemoverProduto");
const cartAtualizarQuantidade = require("../../src/controllers/cart/cartAtualizarQuantidade");
const cartConsultarItens = require("../../src/controllers/cart/consultarItens");

const cartControllers = require("../../src/controllers/cart");

describe("cartControllers", () => {
    it("deve exportar todos os controladores do carrinho", () => {
        expect(cartControllers).toEqual({
            cartCriar,
            cartConsultar,
            cartListarTodos,
            cartAdicionarProduto,
            cartRemoverProduto,
            cartAtualizarQuantidade,
            cartConsultarItens
        });
    });

    it("deve exportar exatamente sete controladores", () => {
        expect(Object.keys(cartControllers)).toHaveLength(7);
    });

    it.each([
        "cartCriar",
        "cartConsultar",
        "cartListarTodos",
        "cartAdicionarProduto",
        "cartRemoverProduto",
        "cartAtualizarQuantidade",
        "cartConsultarItens"
    ])("deve exportar %s como função", (nome) => {
        expect(typeof cartControllers[nome]).toBe("function");
    });
});
