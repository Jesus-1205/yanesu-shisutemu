"""Script de Benchmark y Verificación de Carga de Endpoints de la API.

Permite medir tiempos de respuesta, latencias p50/p95, concurrencia y tamaño de payload
para cualquier endpoint del sistema de inventario.

Uso:
    py scripts/benchmark_api.py -u jb1602 -p tu_clave -e /sales?page=1&page_size=20 -n 1000 -c 50
    py scripts/benchmark_api.py -u jb1602 -p tu_clave -e /invoices?page=1&page_size=20
    py scripts/benchmark_api.py -u jb1602 -p tu_clave -e /products?page=1&page_size=20 --inspect-only
"""

import argparse
import asyncio
import os
import statistics
import sys
import time
import httpx


async def authenticate(client: httpx.AsyncClient, login_url: str, username: str, password: str) -> bool:
    """Inicia sesión y almacena la cookie httpOnly access_token en la sesión del cliente."""
    payload = {"username": username, "password": password}
    try:
        resp = await client.post(login_url, json=payload)
        if resp.status_code == 200:
            print(f"[+] Autenticación exitosa como '{username}'.")
            return True
        else:
            print(f"[!] Error de autenticación ({resp.status_code}): {resp.text}")
            return False
    except Exception as e:
        print(f"[!] No se pudo conectar al servidor en {login_url}: {e}")
        return False


async def test_single_inspection(client: httpx.AsyncClient, target_url: str):
    """Realiza una petición de inspección para mostrar métricas del payload recibido."""
    print(f"\n[*] Inspeccionando respuesta de: {target_url}")
    try:
        resp = await client.get(target_url)
    except Exception as e:
        print(f"[!] Error al realizar la petición de inspección: {e}")
        return

    if resp.status_code != 200:
        print(f"[!] Error {resp.status_code}: {resp.text}")
        return

    data = resp.json()
    payload_size_kb = len(resp.content) / 1024

    total_records = None
    items = []
    if isinstance(data, dict):
        total_records = data.get("total")
        items = data.get("items", [])
    elif isinstance(data, list):
        total_records = len(data)
        items = data

    print(f"[+] Código 200 OK | Tamaño recibido: {payload_size_kb:.2f} KB | Total registros en DB: {total_records}")

    if items and isinstance(items, list) and len(items) > 0 and isinstance(items[0], dict):
        primero = items[0]
        print("\n--- Estructura del primer registro recibido ---")
        for k, v in list(primero.items())[:15]:
            print(f"  - {k}: {v}")
        if len(primero) > 15:
            print(f"  ... ({len(primero) - 15} campos adicionales)")


async def worker(
    semaphore: asyncio.Semaphore,
    client: httpx.AsyncClient,
    target_url: str,
    latencies: list,
    payload_sizes: list,
):
    """Worker asíncrono para ejecutar una petición dentro del pool concurrente."""
    async with semaphore:
        start_time = time.perf_counter()
        try:
            resp = await client.get(target_url)
            elapsed_ms = (time.perf_counter() - start_time) * 1000

            if resp.status_code == 200:
                latencies.append(elapsed_ms)
                payload_sizes.append(len(resp.content))
            else:
                print(f"[!] Error en petición: {resp.status_code}")
        except Exception as e:
            print(f"[!] Falló request ({type(e).__name__}): {e}")


async def run_benchmark(
    client: httpx.AsyncClient,
    target_url: str,
    total_requests: int,
    concurrency: int,
):
    """Ejecuta el benchmark de carga concurrente."""
    print(f"\n[*] Iniciando benchmark: {total_requests} peticiones (Concurrencia: {concurrency})...")
    semaphore = asyncio.Semaphore(concurrency)
    latencies = []
    payload_sizes = []

    tasks = [
        worker(semaphore, client, target_url, latencies, payload_sizes)
        for _ in range(total_requests)
    ]
    await asyncio.gather(*tasks)

    if latencies:
        latencies.sort()
        p50 = statistics.median(latencies)
        p95_idx = int(len(latencies) * 0.95)
        p95 = latencies[min(p95_idx, len(latencies) - 1)]
        avg_kb = (payload_sizes[0] / 1024) if payload_sizes else 0

        print("\n" + "=" * 45)
        print(" RESULTADOS DEL BENCHMARK")
        print("=" * 45)
        print(f"Peticiones exitosas : {len(latencies)}/{total_requests}")
        print(f"Tamaño de payload   : {avg_kb:.2f} KB por request")
        print(f"Latencia Promedio   : {statistics.mean(latencies):.2f} ms")
        print(f"Latencia p50 (med)  : {p50:.2f} ms")
        print(f"Latencia p95        : {p95:.2f} ms")
        print("=" * 45)


async def async_main(args):
    base_url = args.base_url.rstrip("/")
    login_url = f"{base_url}/auth/login"

    # Construir target_url si se pasa una ruta relativa
    endpoint = args.endpoint
    if endpoint.startswith("http://") or endpoint.startswith("https://"):
        target_url = endpoint
    else:
        if not endpoint.startswith("/"):
            endpoint = "/" + endpoint
        target_url = f"{base_url}{endpoint}"

    limits = httpx.Limits(max_connections=args.concurrency, max_keepalive_connections=args.concurrency)
    async with httpx.AsyncClient(limits=limits, timeout=args.timeout) as client:
        print("=" * 55)
        print(" BENCHMARK Y PROFILER DE ENDPOINTS - YANESU SHISUTEMU")
        print("=" * 55)

        if not args.no_login:
            username = args.username or os.getenv("API_BENCHMARK_USER", "admin")
            password = args.password or os.getenv("API_BENCHMARK_PASS", "admin")
            if not await authenticate(client, login_url, username, password):
                print("[!] Abortando prueba por fallo de autenticación.")
                return

        # 1. Inspección
        await test_single_inspection(client, target_url)

        # 2. Benchmark de concurrencia
        if not args.inspect_only:
            await run_benchmark(client, target_url, args.requests, args.concurrency)


def parse_arguments():
    parser = argparse.ArgumentParser(
        description="Herramienta CLI para medir latencia, carga concurrente y tamaño de payload de endpoints de la API.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        "-e", "--endpoint",
        default="/sales?page=1&page_size=20",
        help="Ruta relativa o URL completa del endpoint a probar (ej. /sales, /invoices, /products)",
    )
    parser.add_argument(
        "-n", "--requests",
        type=int,
        default=50,
        help="Cantidad total de peticiones a ejecutar en el benchmark",
    )
    parser.add_argument(
        "-c", "--concurrency",
        type=int,
        default=10,
        help="Número de peticiones concurrentes simultáneas",
    )
    parser.add_argument(
        "-b", "--base-url",
        default="http://127.0.0.1:8000/api",
        help="URL base de la API FastAPI",
    )
    parser.add_argument(
        "-u", "--username",
        default=None,
        help="Nombre de usuario para iniciar sesión (o variable API_BENCHMARK_USER)",
    )
    parser.add_argument(
        "-p", "--password",
        default=None,
        help="Contraseña para iniciar sesión (o variable API_BENCHMARK_PASS)",
    )
    parser.add_argument(
        "--no-login",
        action="store_true",
        help="Omitir autenticación (para endpoints públicos)",
    )
    parser.add_argument(
        "-t", "--timeout",
        type=float,
        default=30.0,
        help="Timeout en segundos para cada petición",
    )
    parser.add_argument(
        "--inspect-only",
        action="store_true",
        help="Solo inspeccionar un registro y el tamaño de payload, sin lanzar el benchmark de carga",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_arguments()
    asyncio.run(async_main(args))
