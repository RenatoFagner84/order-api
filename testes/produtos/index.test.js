jest.mock("../../src/controllers/produtos/produtosLer", () => jest.fn());
jest.mock("../../src/controllers/produtos/produtosLerId", () => jest.fn());
jest.mock("../../src/controllers/produtos/produtosBuscar", () => jest.fn());
jest.mock("../../src/controllers/produtos/produtosInserir", () => jest.fn());
jest.mock("../../src/controllers/produtos/produtosAtualizar", () => jest.fn());
jest.mock("../../src/controllers/produtos/produtosDeletar", () => jest.fn());

const produtosLer = require("../../src/controllers/produtos/produtosLer");
const produtosLerId = require("../../src/controllers/produtos/produtosLerId");
const produtosBuscar = require("../../src/controllers/produtos/produtosBuscar");
const produtosInserir = require("../../src/controllers/produtos/produtosInserir");
const produtosAtualizar = require("../../src/controllers/produtos/produtosAtualizar");
const produtosDeletar = require("../../src/controllers/produtos/produtosDeletar");

const produtosControllers = require("../../src/controllers/produtos");

describe("Controllers de produtos", () => {
    test("deve exportar todos os controllers esperados", () => {
        expect(produtosControllers).toEqual({
            produtosLer,
            produtosLerId,
            produtosBuscar,
            produtosInserir,
            produtosAtualizar,
            produtosDeletar
        });
    });

    test.each([
        ["produtosLer", produtosLer],
        ["produtosLerId", produtosLerId],
        ["produtosBuscar", produtosBuscar],
        ["produtosInserir", produtosInserir],
        ["produtosAtualizar", produtosAtualizar],
        ["produtosDeletar", produtosDeletar]
    ])(
        "deve exportar %s como uma função",
        (nome, controller) => {
            expect(produtosControllers[nome]).toBe(controller);
            expect(typeof produtosControllers[nome]).toBe("function");
        }
    );

    test("não deve exportar propriedades adicionais", () => {
        expect(Object.keys(produtosControllers)).toEqual([
            "produtosLer",
            "produtosLerId",
            "produtosBuscar",
            "produtosInserir",
            "produtosAtualizar",
            "produtosDeletar"
        ]);
    });
});