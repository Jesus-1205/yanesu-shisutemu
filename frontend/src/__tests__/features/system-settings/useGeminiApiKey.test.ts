import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { api } from "@/services/api";
import { useGeminiApiKey } from "@/features/system-settings/hooks/useGeminiApiKey";

const mockToast = vi.fn();
vi.mock("@/ui-components/Toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/services/api", () => ({
  api: {
    getApiKeyStatus: vi.fn(),
    saveApiKey: vi.fn(),
    deleteApiKey: vi.fn(),
    testGeminiConnection: vi.fn(),
  },
}));

const mockApi = vi.mocked(api);

describe("useGeminiApiKey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("carga el estado inicial de la API key", async () => {
    mockApi.getApiKeyStatus.mockResolvedValueOnce({
      configured: true,
      clave: "GEMINI_API_KEY",
      descripcion: "Google Gemini",
    });

    const { result } = renderHook(() => useGeminiApiKey());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.configured).toBe(true);
    expect(mockApi.getApiKeyStatus).toHaveBeenCalledWith("GEMINI_API_KEY");
  });

  it("maneja fallo al obtener estado guardando el error y mostrando toast", async () => {
    mockApi.getApiKeyStatus.mockRejectedValueOnce(new Error("Error de conexión"));

    const { result } = renderHook(() => useGeminiApiKey());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.configured).toBe(false);
    expect(result.current.error).toBe("Error de conexión");
    expect(mockToast).toHaveBeenCalledWith("Error de conexión", "error");
  });

  it("guarda la API key exitosamente", async () => {
    mockApi.getApiKeyStatus.mockResolvedValueOnce({
      configured: false,
      clave: "GEMINI_API_KEY",
      descripcion: null,
    });
    mockApi.saveApiKey.mockResolvedValueOnce({ message: "Guardado" });

    const { result } = renderHook(() => useGeminiApiKey());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setGeminiKey("AIzaSy12345");
      result.current.setShowKey(true);
    });

    await act(async () => {
      await result.current.handleSave();
    });

    expect(mockApi.saveApiKey).toHaveBeenCalledWith({
      clave: "GEMINI_API_KEY",
      valor: "AIzaSy12345",
      descripcion: "API Key de Google Gemini para análisis de facturas",
    });
    expect(mockToast).toHaveBeenCalledWith("API key guardada correctamente", "success");
    expect(result.current.configured).toBe(true);
    expect(result.current.geminiKey).toBe("");
    expect(result.current.showKey).toBe(false);
  });

  it("no intenta guardar si la API key está vacía", async () => {
    mockApi.getApiKeyStatus.mockResolvedValueOnce({
      configured: false,
      clave: "GEMINI_API_KEY",
      descripcion: null,
    });

    const { result } = renderHook(() => useGeminiApiKey());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setGeminiKey("   ");
    });

    await act(async () => {
      await result.current.handleSave();
    });

    expect(mockApi.saveApiKey).not.toHaveBeenCalled();
  });

  it("maneja error al guardar la API key", async () => {
    mockApi.getApiKeyStatus.mockResolvedValueOnce({
      configured: false,
      clave: "GEMINI_API_KEY",
      descripcion: null,
    });
    mockApi.saveApiKey.mockRejectedValueOnce(new Error("Permiso denegado"));

    const { result } = renderHook(() => useGeminiApiKey());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setGeminiKey("AIzaSy12345");
    });

    await act(async () => {
      await result.current.handleSave();
    });

    expect(mockToast).toHaveBeenCalledWith("Permiso denegado", "error");
    expect(result.current.saving).toBe(false);
  });

  it("elimina la API key correctamente", async () => {
    mockApi.getApiKeyStatus.mockResolvedValueOnce({
      configured: true,
      clave: "GEMINI_API_KEY",
      descripcion: "Google Gemini",
    });
    mockApi.deleteApiKey.mockResolvedValueOnce({ message: "Eliminada" });

    const { result } = renderHook(() => useGeminiApiKey());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.handleDelete();
    });

    expect(mockApi.deleteApiKey).toHaveBeenCalledWith("GEMINI_API_KEY");
    expect(mockToast).toHaveBeenCalledWith("API key eliminada", "success");
    expect(result.current.configured).toBe(false);
    expect(result.current.testResult).toBeNull();
  });

  it("maneja error al eliminar la API key", async () => {
    mockApi.getApiKeyStatus.mockResolvedValueOnce({
      configured: true,
      clave: "GEMINI_API_KEY",
      descripcion: "Google Gemini",
    });
    mockApi.deleteApiKey.mockRejectedValueOnce(new Error("Fallo al eliminar"));

    const { result } = renderHook(() => useGeminiApiKey());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.handleDelete();
    });

    expect(mockToast).toHaveBeenCalledWith("Fallo al eliminar", "error");
  });

  it("prueba la conexión con Gemini con éxito", async () => {
    mockApi.getApiKeyStatus.mockResolvedValueOnce({
      configured: false,
      clave: "GEMINI_API_KEY",
      descripcion: null,
    });
    mockApi.testGeminiConnection.mockResolvedValueOnce({
      success: true,
      message: "Modelos disponibles: gemini-1.5-flash",
      models: ["gemini-1.5-flash"],
    });

    const { result } = renderHook(() => useGeminiApiKey());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setGeminiKey("AIzaSyValidKey");
    });

    await act(async () => {
      await result.current.handleTest();
    });

    expect(mockApi.testGeminiConnection).toHaveBeenCalledWith({
      clave: "GEMINI_API_KEY",
      valor: "AIzaSyValidKey",
    });
    expect(mockToast).toHaveBeenCalledWith("Conexión exitosa con Gemini", "success");
    expect(result.current.testResult).toEqual({
      success: true,
      message: "Modelos disponibles: gemini-1.5-flash",
      models: ["gemini-1.5-flash"],
    });
  });

  it("muestra error si se intenta probar sin clave", async () => {
    mockApi.getApiKeyStatus.mockResolvedValueOnce({
      configured: false,
      clave: "GEMINI_API_KEY",
      descripcion: null,
    });

    const { result } = renderHook(() => useGeminiApiKey());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.handleTest();
    });

    expect(mockToast).toHaveBeenCalledWith("Ingresa una API key para probar", "error");
    expect(mockApi.testGeminiConnection).not.toHaveBeenCalled();
  });

  it("maneja resultado fallido al probar la conexión", async () => {
    mockApi.getApiKeyStatus.mockResolvedValueOnce({
      configured: false,
      clave: "GEMINI_API_KEY",
      descripcion: null,
    });
    mockApi.testGeminiConnection.mockResolvedValueOnce({
      success: false,
      message: "API key inválida",
      models: null,
    });

    const { result } = renderHook(() => useGeminiApiKey());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setGeminiKey("AIzaSyInvalidKey");
    });

    await act(async () => {
      await result.current.handleTest();
    });

    expect(mockToast).toHaveBeenCalledWith("API key inválida", "error");
    expect(result.current.testResult?.success).toBe(false);
  });
});
