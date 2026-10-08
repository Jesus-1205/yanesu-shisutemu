"""Script de Benchmark Suite para evaluar todos los endpoints principales de la API.

Ejecuta pruebas de carga y medición de latencias para la lista completa de endpoints
críticos y genera una tabla comparativa consolidada al finalizar.

Soporta:
1. Modo In-Process ASGI (ultra-rápido, sin dependencias de red, usa la BD local directamente)
2. Modo Live HTTP (hacia http://127.0.0.1:8000/api o servidor remoto)

Uso:
    py scripts/benchmark_suite.py --in-process
    py scripts/benchmark_suite.py --in-process -n 50 -c 10
    py scripts/benchmark_suite.py -u tu_usuario -p tu_clave
    py scripts/benchmark_suite.py --inspect-only
"""

import argparse
import asyncio
import os
import statistics
import sys
import time
from dataclasses import dataclass
from typing import List, Optional
import httpx

# Asegurar importación de app si se ejecuta desde la raíz o backend/
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))


# Lista completa de endpoints clave organizados por módulo
DEFAULT_ENDPOINTS = [
    # 1. Micro KPIs y Resúmenes Rápidos
    {"name": "Categorías (Resumen KPIs)", "path": "/categories/summary"},
    {"name": "Proveedores (Resumen KPIs)", "path": "/suppliers/summary"},
    {"name": "Ventas (Resumen KPIs)", "path": "/sales/summary"},
    {"name": "Facturas (Pendientes Summary)", "path": "/invoices/pending-summary"},
    {"name": "Dashboard (Métricas Globales)", "path": "/dashboard/stats"},
    {"name": "Retornables (Resumen)", "path": "/retornable/resumen"},
    
    # 2. Catálogos y Paginaciones Principales
    {"name": "Productos (Página 1, size 50)", "path": "/products?page=1&page_size=50"},
    {"name": "Ventas (Página 1, size 50)", "path": "/sales?page=1&page_size=50"},
    {"name": "Facturas (Página 1, size 50)", "path": "/invoices?page=1&page_size=50"},
    {"name": "Combos (Página 1, size 20)", "path": "/combos?page=1&page_size=20"},
    {"name": "Categorías (Página 1, size 20)", "path": "/categories?page=1&page_size=20"},
    {"name": "Proveedores (Página 1, size 20)", "path": "/suppliers?page=1&page_size=20"},
    {"name": "Retornables (Reportes paginados)", "path": "/retornable/reportes?page=1&page_size=20"},
    {"name": "Retornables (Histórico movs)", "path": "/retornable/historico?page=1&page_size=20"},
    {"name": "Métodos de Pago (Listado)", "path": "/payment-methods"},
    {"name": "Usuarios (Listado)", "path": "/users"},
    {"name": "Roles (Listado)", "path": "/roles"},
    
    # 3. Analítica, Métricas y Reportes
    {"name": "Categorías (Analítica completa)", "path": "/categories/analytics"},
    {"name": "Proveedores (Analítica completa)", "path": "/suppliers/analytics"},
    {"name": "Facturas (Estadísticas)", "path": "/invoices/stats"},
    {"name": "Facturas (Top Proveedores)", "path": "/invoices/top-suppliers"},
    {"name": "Productos (Top Vendidos)", "path": "/products/top-selling"},
    {"name": "Productos (Baja Rotación)", "path": "/products/low-rotation"},
    {"name": "Productos (Top Margen)", "path": "/products/top-margin"},
    {"name": "Productos (Menor Margen)", "path": "/products/lowest-margin"},
    {"name": "Ventas (Top Week)", "path": "/sales/top-week"},
    {"name": "Reportes (Matriz de Productos)", "path": "/reports/products-matrix"},
    {"name": "Reportes (Métodos de Pago)", "path": "/reports/payment-methods"},
    {"name": "Tasas de Cambio (Última Tasa)", "path": "/exchange-rates/latest"},
    {"name": "Tasas de Cambio (Historial)", "path": "/exchange-rates/history"},
]


@dataclass
class BenchmarkResult:
    name: str
    path: str
    total_requests: int
    success_requests: int
    payload_kb: float
    avg_ms: float
    p50_ms: float
    p95_ms: float
    min_ms: float
    max_ms: float
    error_msg: Optional[str] = None


async def authenticate_http(client: httpx.AsyncClient, login_url: str, username: str, password: str) -> bool:
    """Inicia sesión vía HTTP y almacena la cookie httpOnly access_token."""
    payload = {"username": username, "password": password}
    try:
        resp = await client.post(login_url, json=payload)
        if resp.status_code == 200:
            print(f"[+] Autenticación HTTP exitosa como '{username}'.")
            return True
        else:
            print(f"[!] Error de autenticación ({resp.status_code}): {resp.text}")
            return False
    except Exception as e:
        print(f"[!] No se pudo conectar al servidor en {login_url}: {e}")
        return False


def setup_in_process_auth(client: httpx.AsyncClient) -> bool:
    """Genera token JWT directamente para el usuario administrador local."""
    try:
        from app.core.database import SessionLocal
        from app.models.user import User
        from app.services.auth_service import create_access_token
        from sqlalchemy import select

        with SessionLocal() as db:
            user = db.execute(select(User).where(User.is_active.is_(True))).scalars().first()
            if not user:
                print("[!] No se encontró ningún usuario activo en la base de datos.")
                return False
            token = create_access_token({"sub": str(user.id)})
            client.cookies.set("access_token", token)
            print(f"[+] Sesión ASGI directa iniciada como '{user.username}' (Rol: {user.role.nombre if user.role else 'N/A'}).")
            return True
    except Exception as e:
        print(f"[!] Error al generar token in-process: {e}")
        return False


async def worker(
    semaphore: asyncio.Semaphore,
    client: httpx.AsyncClient,
    target_url: str,
    latencies: list,
    payload_sizes: list,
    errors: list,
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
                errors.append(f"HTTP {resp.status_code}")
        except Exception as e:
            errors.append(type(e).__name__)


async def benchmark_single_endpoint(
    client: httpx.AsyncClient,
    path_prefix: str,
    endpoint_info: dict,
    requests: int,
    concurrency: int,
    inspect_only: bool = False,
) -> BenchmarkResult:
    """Ejecuta la prueba para un endpoint individual."""
    name = endpoint_info["name"]
    path = endpoint_info["path"]
    target_url = f"{path_prefix}{path}"
    
    print(f" -> Probando: {name:<35} ({path})...", end="", flush=True)

    # 1. Petición inicial para verificar estado y tamaño de payload
    start_init = time.perf_counter()
    try:
        resp = await client.get(target_url)
        init_elapsed = (time.perf_counter() - start_init) * 1000
    except Exception as e:
        print(f" [FALLÓ: {e}]")
        return BenchmarkResult(
            name=name,
            path=path,
            total_requests=requests,
            success_requests=0,
            payload_kb=0,
            avg_ms=0,
            p50_ms=0,
            p95_ms=0,
            min_ms=0,
            max_ms=0,
            error_msg=str(e),
        )

    if resp.status_code != 200:
        print(f" [ERROR {resp.status_code}]")
        return BenchmarkResult(
            name=name,
            path=path,
            total_requests=requests,
            success_requests=0,
            payload_kb=len(resp.content) / 1024,
            avg_ms=init_elapsed,
            p50_ms=init_elapsed,
            p95_ms=init_elapsed,
            min_ms=init_elapsed,
            max_ms=init_elapsed,
            error_msg=f"HTTP {resp.status_code}",
        )

    payload_kb = len(resp.content) / 1024

    if inspect_only or requests <= 1:
        print(f" [OK | {payload_kb:.2f} KB | {init_elapsed:.1f} ms]")
        return BenchmarkResult(
            name=name,
            path=path,
            total_requests=1,
            success_requests=1,
            payload_kb=payload_kb,
            avg_ms=init_elapsed,
            p50_ms=init_elapsed,
            p95_ms=init_elapsed,
            min_ms=init_elapsed,
            max_ms=init_elapsed,
        )

    # 2. Benchmark de carga concurrente
    semaphore = asyncio.Semaphore(concurrency)
    latencies = [init_elapsed]
    payload_sizes = [len(resp.content)]
    errors = []

    tasks = [
        worker(semaphore, client, target_url, latencies, payload_sizes, errors)
        for _ in range(requests - 1)
    ]
    await asyncio.gather(*tasks)

    success_count = len(latencies)
    if not latencies:
        print(" [FALLARON TODAS]")
        return BenchmarkResult(
            name=name,
            path=path,
            total_requests=requests,
            success_requests=0,
            payload_kb=payload_kb,
            avg_ms=0,
            p50_ms=0,
            p95_ms=0,
            min_ms=0,
            max_ms=0,
            error_msg="Sin respuestas exitosas",
        )

    latencies.sort()
    avg_ms = statistics.mean(latencies)
    p50_ms = statistics.median(latencies)
    p95_idx = int(len(latencies) * 0.95)
    p95_ms = latencies[min(p95_idx, len(latencies) - 1)]
    min_ms = latencies[0]
    max_ms = latencies[-1]

    print(f" [OK | {success_count}/{requests} | p50: {p50_ms:.1f}ms | p95: {p95_ms:.1f}ms | {payload_kb:.2f} KB]")

    return BenchmarkResult(
        name=name,
        path=path,
        total_requests=requests,
        success_requests=success_count,
        payload_kb=payload_kb,
        avg_ms=avg_ms,
        p50_ms=p50_ms,
        p95_ms=p95_ms,
        min_ms=min_ms,
        max_ms=max_ms,
        error_msg=errors[0] if errors else None,
    )


def print_summary_table(results: List[BenchmarkResult]):
    """Imprime una tabla formateada y visual con los resultados consolidados."""
    print("\n" + "=" * 118)
    print(" REPORTE CONSOLIDADO DE RENDIMIENTO Y LATENCIAS DE ENDPOINTS")
    print("=" * 118)
    
    header = f"{'Endpoint / Módulo':<38} | {'Éxito':<7} | {'Payload':<9} | {'Promedio':<9} | {'p50':<8} | {'p95':<8} | {'Min/Max':<14} | {'Estado':<6}"
    print(header)
    print("-" * 118)

    for r in results:
        success_str = f"{r.success_requests}/{r.total_requests}"
        payload_str = f"{r.payload_kb:.2f} KB"
        avg_str = f"{r.avg_ms:.1f} ms"
        p50_str = f"{r.p50_ms:.1f} ms"
        p95_str = f"{r.p95_ms:.1f} ms"
        min_max_str = f"{r.min_ms:.1f} / {r.max_ms:.1f}"
        status_str = "OK" if r.success_requests == r.total_requests and not r.error_msg else "WARN/ERR"
        
        display_name = r.name if len(r.name) <= 38 else r.name[:35] + "..."
        line = f"{display_name:<38} | {success_str:<7} | {payload_str:<9} | {avg_str:<9} | {p50_str:<8} | {p95_str:<8} | {min_max_str:<14} | {status_str:<6}"
        print(line)

    print("=" * 118)


async def async_main(args):
    use_in_process = args.in_process

    print("=" * 80)
    print(" SUITE DE BENCHMARK DE ENDPOINTS - YANESU SHISUTEMU")
    print("=" * 80)
    print(f"Modo        : {'In-Process ASGI (Directo)' if use_in_process else f'HTTP ({args.base_url})'}")
    print(f"Peticiones  : {args.requests} por endpoint")
    print(f"Concurrencia: {args.concurrency}")
    print(f"Tipo        : {'Solo Inspección (1 req)' if args.inspect_only else 'Carga Concurrente'}")
    print("-" * 80)

    if use_in_process:
        from app.main import app
        transport = httpx.ASGITransport(app=app)
        client = httpx.AsyncClient(transport=transport, base_url="http://testserver/api", timeout=args.timeout)
        path_prefix = ""
        if not setup_in_process_auth(client):
            print("[!] Abortando prueba in-process.")
            return
    else:
        base_url = args.base_url.rstrip("/")
        login_url = f"{base_url}/auth/login"
        path_prefix = base_url
        limits = httpx.Limits(max_connections=args.concurrency, max_keepalive_connections=args.concurrency)
        client = httpx.AsyncClient(limits=limits, timeout=args.timeout)
        
        if not args.no_login:
            username = args.username or os.getenv("API_BENCHMARK_USER", "admin")
            password = args.password or os.getenv("API_BENCHMARK_PASS", "admin")
            if not await authenticate_http(client, login_url, username, password):
                print("[*] Intentando modo in-process alternativo...")
                await client.aclose()
                from app.main import app
                transport = httpx.ASGITransport(app=app)
                client = httpx.AsyncClient(transport=transport, base_url="http://testserver/api", timeout=args.timeout)
                path_prefix = ""
                if not setup_in_process_auth(client):
                    return

    async with client:
        # Pre-calentamiento (warmup) del pool y SQLite
        try:
            await client.get(f"{path_prefix}/health")
        except Exception:
            pass

        print("\n[*] Ejecutando suite de endpoints...\n")
        results = []
        for ep in DEFAULT_ENDPOINTS:
            res = await benchmark_single_endpoint(
                client=client,
                path_prefix=path_prefix,
                endpoint_info=ep,
                requests=args.requests,
                concurrency=args.concurrency,
                inspect_only=args.inspect_only,
            )
            results.append(res)

        print_summary_table(results)


def parse_arguments():
    parser = argparse.ArgumentParser(
        description="Herramienta CLI para benchmark y reporte consolidado de los endpoints principales de la API.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        "--in-process",
        action="store_true",
        help="Ejecutar directamente contra la app FastAPI/ASGI sin requerir puerto HTTP de red activo",
    )
    parser.add_argument(
        "-n", "--requests",
        type=int,
        default=30,
        help="Cantidad de peticiones por endpoint",
    )
    parser.add_argument(
        "-c", "--concurrency",
        type=int,
        default=5,
        help="Concurrencia simultánea para cada endpoint",
    )
    parser.add_argument(
        "-b", "--base-url",
        default="http://127.0.0.1:8000/api",
        help="URL base de la API FastAPI",
    )
    parser.add_argument(
        "-u", "--username",
        default=None,
        help="Nombre de usuario para iniciar sesión",
    )
    parser.add_argument(
        "-p", "--password",
        default=None,
        help="Contraseña para iniciar sesión",
    )
    parser.add_argument(
        "--no-login",
        action="store_true",
        help="Omitir autenticación",
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
        help="Solo inspeccionar una petición por endpoint para medir tamaño y latencia base sin carga concurrente",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_arguments()
    asyncio.run(async_main(args))
