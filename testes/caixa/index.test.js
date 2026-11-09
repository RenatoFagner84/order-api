jest.mock("../../src/controllers/caixa/caixaInserir", () => jest.fn());
jest.mock("../../src/controllers/caixa/caixaLer", () => jest.fn());
jest.mock("../../src/controllers/caixa/caixaListar", () => jest.fn());
jest.mock("../../src/controllers/caixa/caixaAtualizar", () => jest.fn());
jest.mock("../../src/controllers/caixa/caixaDeletar", () => jest.fn());
jest.mock("../../src/controllers/caixa/caixaListarPorUser", () => jest.fn());
jest.mock("../../src/controllers/caixa/caixaListarPorPedido", () => jest.fn());

const caixaControllers = require("../../src/controllers/caixa");

describe("Exportações dos controllers do caixa", () => {
    test("deve exportar todos os controllers corretamente", () => {
        expect(caixaControllers).toHaveProperty("caixaInserir");
        expect(caixaControllers).toHaveProperty("caixaLer");
        expect(caixaControllers).toHaveProperty("caixaListar");
        expect(caixaControllers).toHaveProperty("caixaAtualizar");
        expect(caixaControllers).toHaveProperty("caixaDeletar");
        expect(caixaControllers).toHaveProperty("caixaListarPorUser");
        expect(caixaControllers).toHaveProperty("caixaListarPorPedido");
    });

    test("todos os controllers exportados devem ser funções", () => {
        expect(typeof caixaControllers.caixaInserir).toBe("function");
        expect(typeof caixaControllers.caixaLer).toBe("function");
        expect(typeof caixaControllers.caixaListar).toBe("function");
        expect(typeof caixaControllers.caixaAtualizar).toBe("function");
        expect(typeof caixaControllers.caixaDeletar).toBe("function");
        expect(typeof caixaControllers.caixaListarPorUser).toBe("function");
        expect(typeof caixaControllers.caixaListarPorPedido).toBe("function");
    });

    test("deve exportar exatamente os sete controllers esperados", () => {
        expect(Object.keys(caixaControllers)).toEqual([
            "caixaInserir",
            "caixaLer",
            "caixaListar",
            "caixaAtualizar",
            "caixaDeletar",
            "caixaListarPorUser",
            "caixaListarPorPedido"
        ]);
    });
});