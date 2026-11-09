jest.mock("../../src/db", () => ({
    query: jest.fn()
}));

const pool = require("../../src/db");
const cartRepository = require("../../src/repositories/cartRepository");

describe("cartRepository.criar", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("cria e consulta o carrinho em uma chamada ao banco", async () => {
        const resultado = {
            rows: [{
                id: 1,
                user_id: 10,
                status_id: 2,
                status: "aberto",
                valor_total: "0"
            }]
        };
        pool.query.mockResolvedValue(resultado);

        await expect(cartRepository.criar(10)).resolves.toBe(resultado);

        expect(pool.query).toHaveBeenCalledTimes(1);
        expect(pool.query).toHaveBeenCalledWith(
            expect.stringContaining("WHERE LOWER(nome) = LOWER($2)"),
            [10, "aberto"]
        );
        expect(pool.query.mock.calls[0][0]).toContain("INSERT INTO carrinho");
        expect(pool.query.mock.calls[0][0]).toContain("RETURNING id");
    });

    test("lança erro quando o status aberto não existe", async () => {
        pool.query.mockResolvedValue({ rows: [] });

        await expect(cartRepository.criar(10)).rejects.toThrow(
            "Não foi possível criar o carrinho. Verifique se o status 'aberto' existe na tabela status."
        );

        expect(pool.query).toHaveBeenCalledTimes(1);
    });
});
