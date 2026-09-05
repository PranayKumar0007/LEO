import { HealthResponse } from "../types/backend";

export const DEFAULT_BACKEND_URL = "http://127.0.0.1:8000";

class ApiClient {
  private baseUrl: string = DEFAULT_BACKEND_URL;

  public setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/+$/, "");
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public async checkHealth(): Promise<HealthResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    try {
      const response = await fetch(`${this.baseUrl}/api/health`, {
        method: "GET",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Health check failed with status: ${response.status}`);
      }

      const data = (await response.json()) as HealthResponse;
      return data;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error(`Timeout connecting to backend at ${this.baseUrl}`);
      }
      throw new Error(
        err instanceof Error ? err.message : `Could not connect to LEO backend at ${this.baseUrl}`
      );
    }
  }
}

export const apiClient = new ApiClient();
