import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useInvoiceImage } from "@/features/invoices/hooks/useInvoiceImage";
import { api } from "@/services/api";

vi.mock("@/services/api", () => ({
  api: {
    getInvoiceImageUrl: vi.fn((id: number) => `http://localhost/api/invoices/${id}/image`),
    downloadInvoiceImage: vi.fn(),
  },
}));

describe("useInvoiceImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the correct image URL and default state", () => {
    const { result } = renderHook(() => useInvoiceImage(42));

    expect(result.current.imageUrl).toBe("http://localhost/api/invoices/42/image");
    expect(result.current.downloading).toBe(false);
  });

  it("handles successful image download", async () => {
    vi.mocked(api.downloadInvoiceImage).mockResolvedValue("factura_42.png");

    const { result } = renderHook(() => useInvoiceImage(42));

    let filename: string | undefined;
    await act(async () => {
      filename = await result.current.downloadImage();
    });

    expect(api.downloadInvoiceImage).toHaveBeenCalledWith(42);
    expect(filename).toBe("factura_42.png");
    expect(result.current.downloading).toBe(false);
  });

  it("handles download failure and resets downloading state", async () => {
    vi.mocked(api.downloadInvoiceImage).mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useInvoiceImage(42));

    let caughtError: unknown = null;
    await act(async () => {
      try {
        await result.current.downloadImage();
      } catch (err) {
        caughtError = err;
      }
    });

    expect(caughtError).toBeInstanceOf(Error);
    expect((caughtError as Error).message).toBe("Network error");
    expect(result.current.downloading).toBe(false);
  });
});
