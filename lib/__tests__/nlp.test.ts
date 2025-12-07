import { parseExpense } from "../nlp";
import { completeChat } from "../ai";
import { addExpense } from "../../pages/api/expense";
import { getDefintions } from "../../pages/api/definitions";
import getDb from "../kysely";

// Mock dependencies
jest.mock("../ai");
jest.mock("../../pages/api/expense");
jest.mock("../../pages/api/definitions");
jest.mock("../kysely");

const mockCompleteChat = completeChat as jest.MockedFunction<
  typeof completeChat
>;
const mockAddExpense = addExpense as jest.MockedFunction<typeof addExpense>;
const mockGetDefinitions = getDefintions as jest.MockedFunction<
  typeof getDefintions
>;
const mockGetDb = getDb as jest.MockedFunction<typeof getDb>;

describe("parseAndAddExpense", () => {
  const mockDefinitions = {
    categories: ["Groceries", "Dining", "Drinks", "Transport"],
    cards: ["Cash", "OCBC365", "DBS", "Card"],
    persons: ["Justin", "Alice"],
    fx: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDefinitions.mockResolvedValue(mockDefinitions);
  });

  describe("successful parsing", () => {
    it("should parse a basic expense with all fields", async () => {
      mockCompleteChat.mockResolvedValue(
        JSON.stringify({
          amount: 10.5,
          payee: "NTUC Fairprice",
          category: "Groceries",
          payment_method: "OCBC365",
          currency: "SGD",
          date: "2024-12-06",
          error: null,
        }),
      );

      mockAddExpense.mockResolvedValue({ ok: true });

      const result = await parseExpense("Spent $10.50 at NTUC with OCBC365");

      expect(result.ok).toBe(true);
      expect(result.expense).toMatchObject({
        payee: "NTUC Fairprice",
        category: "Groceries",
        amount: 10.5,
        payment_method: "OCBC365",
        currency: "SGD",
      });
      expect(mockAddExpense).toHaveBeenCalledWith(
        expect.any(String), // month
        expect.any(String), // date
        "NTUC Fairprice",
        "Groceries",
        10.5,
        "OCBC365",
        "bot",
      );
    });

    it("should use UNKNOWN for missing category", async () => {
      mockCompleteChat.mockResolvedValue(
        JSON.stringify({
          amount: 5,
          payee: "Unknown Store",
          category: "InvalidCategory",
          payment_method: "Cash",
          currency: "SGD",
          date: "2024-12-06",
          error: null,
        }),
      );

      mockAddExpense.mockResolvedValue({ ok: true });

      const result = await parseExpense("Paid $5 at Unknown Store");

      expect(result.ok).toBe(true);
      expect(result.expense?.category).toBe("UNKNOWN");
    });

    it("should use UNKNOWN for missing payment method", async () => {
      mockCompleteChat.mockResolvedValue(
        JSON.stringify({
          amount: 15,
          payee: "Starbucks",
          category: "Dining",
          payment_method: "UnknownCard",
          currency: "SGD",
          date: "2024-12-06",
          error: null,
        }),
      );

      mockAddExpense.mockResolvedValue({ ok: true });

      const result = await parseExpense("Bought coffee at Starbucks for $15");

      expect(result.ok).toBe(true);
      expect(result.expense?.payment_method).toBe("UNKNOWN");
    });

    it("should default to today's date when null", async () => {
      mockCompleteChat.mockResolvedValue(
        JSON.stringify({
          amount: 20,
          payee: "Grab",
          category: "Transport",
          payment_method: "Card",
          currency: "SGD",
          date: null,
          error: null,
        }),
      );

      mockAddExpense.mockResolvedValue({ ok: true });

      const result = await parseExpense("Took grab for $20");

      expect(result.ok).toBe(true);
      expect(result.expense?.date).toBeDefined();
      // Should be close to today
      const parsedDate = new Date(result.expense!.date);
      const today = new Date();
      expect(parsedDate.toDateString()).toBe(today.toDateString());
    });

    it("should strip markdown code blocks from AI response", async () => {
      mockCompleteChat.mockResolvedValue(
        "```json\n" +
          JSON.stringify({
            amount: 8,
            payee: "Gong Cha",
            category: "Drinks",
            payment_method: "Cash",
            currency: "SGD",
            date: "2024-12-06",
            error: null,
          }) +
          "\n```",
      );

      mockAddExpense.mockResolvedValue({ ok: true });

      const result = await parseExpense("Got bubble tea for $8");

      expect(result.ok).toBe(true);
      expect(result.expense?.payee).toBe("Gong Cha");
    });

    it("should look up user by telegram ID", async () => {
      const mockDb = {
        selectFrom: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        executeTakeFirst: jest.fn().mockResolvedValue({
          first_name: "Justin",
        }),
      };

      mockGetDb.mockReturnValue(mockDb as any);

      mockCompleteChat.mockResolvedValue(
        JSON.stringify({
          amount: 30,
          payee: "FairPrice",
          category: "Groceries",
          payment_method: "DBS",
          currency: "SGD",
          date: "2024-12-06",
          error: null,
        }),
      );

      mockAddExpense.mockResolvedValue({ ok: true });

      const result = await parseExpense("Spent $30 at FairPrice", "5000147974");

      expect(result.ok).toBe(true);
      expect(mockAddExpense).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        "FairPrice",
        "Groceries",
        30,
        "DBS",
        "Justin", // Should use actual user name
      );
    });
  });

  describe("error handling", () => {
    it("should return error when AI fails to parse", async () => {
      mockCompleteChat.mockResolvedValue(
        JSON.stringify({
          error: "Could not extract amount",
          amount: null,
          payee: null,
          category: null,
          payment_method: null,
          currency: null,
          date: null,
        }),
      );

      const result = await parseExpense("some random text");

      expect(result.ok).toBe(false);
      expect(result.error).toBe("Could not extract amount");
    });

    it("should return error when amount is missing", async () => {
      mockCompleteChat.mockResolvedValue(
        JSON.stringify({
          amount: null,
          payee: "Store",
          category: "Groceries",
          payment_method: "Cash",
          currency: "SGD",
          date: "2024-12-06",
          error: null,
        }),
      );

      const result = await parseExpense("Bought something at Store");

      expect(result.ok).toBe(false);
      expect(result.error).toContain("amount");
    });

    it("should return error when AI response is invalid JSON", async () => {
      mockCompleteChat.mockResolvedValue("This is not JSON");

      const result = await parseExpense("test");

      expect(result.ok).toBe(false);
      expect(result.error).toBe("Invalid AI response format");
    });

    it("should return error when definitions cannot be loaded", async () => {
      mockGetDefinitions.mockRejectedValue(
        new Error("Failed to load definitions"),
      );

      const result = await parseExpense("Spent $10");

      expect(result.ok).toBe(false);
      expect(result.error).toContain("Failed to load definitions");
    });

    it("should return error when addExpense fails", async () => {
      mockCompleteChat.mockResolvedValue(
        JSON.stringify({
          amount: 10,
          payee: "Store",
          category: "Groceries",
          payment_method: "Cash",
          currency: "SGD",
          date: "2024-12-06",
          error: null,
        }),
      );

      mockAddExpense.mockResolvedValue({
        ok: false,
        error: { message: "Sheet API error" },
      });

      const result = await parseExpense("Spent $10");

      expect(result.ok).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should handle exceptions gracefully", async () => {
      mockCompleteChat.mockRejectedValue(new Error("Network error"));

      const result = await parseExpense("test");

      expect(result.ok).toBe(false);
      expect(result.error).toBe("Network error");
    });
  });

  describe("caching", () => {
    it("should call getDefinitions for each request (caching happens at source level)", async () => {
      mockCompleteChat.mockResolvedValue(
        JSON.stringify({
          amount: 5,
          payee: "Store",
          category: "Groceries",
          payment_method: "Cash",
          currency: "SGD",
          date: "2024-12-06",
          error: null,
        }),
      );

      mockAddExpense.mockResolvedValue({ ok: true });

      // First call
      await parseExpense("Spent $5");
      expect(mockGetDefinitions).toHaveBeenCalledTimes(1);

      // Second call - caching is handled by the definitions API,
      // so this will still call the mock (mocks don't have caching)
      // In production, the caching at pages/api/definitions.ts will prevent repeated sheet calls
      await parseExpense("Spent $10");
      expect(mockGetDefinitions).toHaveBeenCalledTimes(2);
    });
  });
});
