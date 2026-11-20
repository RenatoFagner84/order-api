
jest.mock("../../src/db", () => ({
    query: jest.fn()
}));

const pool = require("../../src/db");
const cartRepository = require("../../src/repositories/cartRepository");

describe("cartRepository.criar", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("cria o carrinho e consulta os dados em duas chamadas ao banco", async () => {
        const resultado = {
            rows: [{
                id: 1,
                user_id: 10,
                status_id: 2,
                status: "aberto",
                valor_total: "0"
            }]
        };

        pool.query
            .mockResolvedValueOnce({
                rows: [{ id: 1 }]
            })
            .mockResolvedValueOnce(resultado);

        await expect(cartRepository.criar(10)).resolves.toBe(resultado);

        expect(pool.query).toHaveBeenCalledTimes(2);

        // Primeira chamada: criação do carrinho.
        const primeiraConsulta = pool.query.mock.calls[0];

        expect(primeiraConsulta[0]).toContain("INSERT INTO carrinho");
        expect(primeiraConsulta[0]).toContain("RETURNING id");
        expect(primeiraConsulta[0]).toContain(
            "WHERE LOWER(nome) = 'aberto'"
        );
        expect(primeiraConsulta[1]).toEqual([10]);

        // Segunda chamada: consulta dos dados do carrinho criado.
        const segundaConsulta = pool.query.mock.calls[1];

        expect(segundaConsulta[0]).toContain("FROM carrinho c");
        expect(segundaConsulta[0]).toContain("WHERE c.id = $1");
        expect(segundaConsulta[1]).toEqual([1]);
    });

    test("lança erro quando o status aberto não existe", async () => {
        pool.query.mockResolvedValueOnce({
            rows: []
        });

        await expect(cartRepository.criar(10)).rejects.toThrow(
            "Não foi possível criar o carrinho. Verifique se o status 'aberto' existe na tabela status."
        );

        // A consulta de criação falha, portanto não ocorre a segunda consulta.
        expect(pool.query).toHaveBeenCalledTimes(1);
    });
});
