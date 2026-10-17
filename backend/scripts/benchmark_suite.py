"""Script de Benchmark Suite y Comparación Cross-Branch para endpoints de la API.

Evalúa latencias, percentiles y tamaño de payload de endpoints pre y post-optimización.
Permite ejecutar pruebas de carga concurrentes tanto en modo in-process ASGI (sin requerir
puerto ni servidor de red activo) como vía HTTP, exportando métricas estructuradas en JSON
y generando reportes comparativos tabulares y en Markdown.

Uso:
    # 1. Modo post-optimización (por defecto):
    py backend/scripts/benchmark_suite.py --in-process --mode post -n 30 -c 5

    # 2. Modo pre-optimización:
    py backend/scripts/benchmark_suite.py --in-process --mode pre -n 30 -c 5

    # 3. Solo inspección rápida (1 request por endpoint):
    py backend/scripts/benchmark_suite.py --in-process --mode post --inspect-only

    # 4. Comparación de resultados guardados:
    py backend/scripts/benchmark_suite.py --mode compare
"""

import argparse
import asyncio
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import statistics
import sys
import time
from typing import List, Optional, Tuple, Union

import httpx

# Asegurar importación de app si se ejecuta desde la raíz o backend/
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Asegurar codificación utf-8 en terminales Windows
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# Ubicar raíz del repositorio para persistencia entre ramas
REPO_ROOT = Path(__file__).resolve().parent.parent.parent


# ============================================================================
# 1. ESTRUCTURAS DE DATOS (DATACLASSES)
# ============================================================================

@dataclass
class EndpointSpec:
    """Especificación semántica de un endpoint a evaluar."""
    id: str
    name: str
    category: str
    path: str
    description: Optional[str] = None


@dataclass
class BenchmarkResult:
    """Resultado de la ejecución de pruebas sobre un endpoint."""
    id: str
    name: str
    category: str
    path: str
    total_requests: int
    success_requests: int
    payload_kb: float
    avg_ms: float
    p50_ms: float
    p95_ms: float
    min_ms: float
    max_ms: float
    rps: float = 0.0
    error_msg: Optional[str] = None


@dataclass
class ComparisonRow:
    """Fila consolidada de comparación entre dos ejecuciones (pre vs post)."""
    id: str
    name: str
    category: str
    pre_path: str
    post_path: str
    pre_avg_ms: float
    post_avg_ms: float
    diff_avg_ms: float
    pct_avg_change: float
    speedup: float
    pre_p95_ms: float
    post_p95_ms: float
    pre_payload_kb: float
    post_payload_kb: float
    diff_payload_kb: float
    pct_payload_change: float
    status: str


# ============================================================================
# 2. DEFINICIÓN DE SUITES (PRE vs POST)
# ============================================================================

SUITE_PRE: List[EndpointSpec] = [
    EndpointSpec(
        id="kpi_categories",
        name="Categorías (KPIs)",
        category="Categorías",
        path="/categories/analytics",
    ),
    EndpointSpec(
        id="kpi_suppliers",
        name="Proveedores (KPIs)",
        category="Proveedores",
        path="/suppliers/analytics",
    ),
    EndpointSpec(
        id="report_sales",
        name="Reporte Ventas",
        category="Ventas",
        path="/sales/summary?rango=semanal",
    ),
    EndpointSpec(
        id="report_categories",
        name="Reporte Categorías",
        category="Categorías",
        path="/categories/analytics",
    ),
    EndpointSpec(
        id="report_products",
        name="Reporte Productos",
        category="Reportes",
        path="/reports/products-matrix?limit=200",
    ),
    EndpointSpec(
        id="report_payments",
        name="Reporte Métodos de Pago",
        category="Reportes",
        path="/reports/payment-methods",
    ),
    EndpointSpec(
        id="sales_history",
        name="Historial de Ventas (Página 1, size 20)",
        category="Ventas",
        path="/sales?page=1&page_size=20",
    ),
    EndpointSpec(
        id="catalog_products",
        name="Productos (Página 1, size 20)",
        category="Inventario",
        path="/products?page=1&page_size=20",
    ),
    EndpointSpec(
        id="invoices_history",
        name="Facturas (Página 1, size 20)",
        category="Facturas",
        path="/invoices?page=1&page_size=20",
    ),
    EndpointSpec(
        id="dashboard_stats",
        name="Dashboard (Métricas Globales)",
        category="Dashboard",
        path="/dashboard/stats",
    ),
    EndpointSpec(
        id="invoices_stats",
        name="Facturas (Estadísticas)",
        category="Facturas",
        path="/invoices/stats",
    ),
    EndpointSpec(
        id="invoices_pending",
        name="Facturas (Pendientes Summary)",
        category="Facturas",
        path="/invoices/pending-summary",
    ),
    EndpointSpec(
        id="invoices_upcoming",
        name="Facturas (Próximas a Vencer)",
        category="Facturas",
        path="/invoices?sort_by=fecha_limite_pago&estado_pago=PENDIENTE&page_size=5&page=1",
    ),
    EndpointSpec(
        id="invoices_top_suppliers",
        name="Facturas (Top Proveedores)",
        category="Facturas",
        path="/invoices/top-suppliers",
    ),
    EndpointSpec(
        id="retornable_comparison",
        name="Retornables (Comparación)",
        category="Retornables",
        path="/retornable/comparacion",
    ),
    EndpointSpec(
        id="rate_latest",
        name="Tasas de Cambio (Última Tasa)",
        category="Configuración",
        path="/exchange-rates/latest",
    ),
    EndpointSpec(
        id="combos_list",
        name="Combos (Listado)",
        category="Inventario",
        path="/combos",
    ),
    EndpointSpec(
        id="payment_methods",
        name="Métodos de Pago (Listado)",
        category="Configuración",
        path="/payment-methods",
    ),
    EndpointSpec(
        id="users_list",
        name="Usuarios (Listado)",
        category="Configuración",
        path="/users",
    ),
    EndpointSpec(
        id="price_rules",
        name="Reglas de Precio Divisas",
        category="Configuración",
        path="/price-rules",
    ),
]

SUITE_POST: List[EndpointSpec] = [
    EndpointSpec(
        id="kpi_categories",
        name="Categorías (Resumen KPIs)",
        category="Categorías",
        path="/categories/summary",
    ),
    EndpointSpec(
        id="kpi_suppliers",
        name="Proveedores (Resumen KPIs)",
        category="Proveedores",
        path="/suppliers/summary",
    ),
    EndpointSpec(
        id="report_sales",
        name="Reporte Ventas",
        category="Ventas",
        path="/sales/summary?rango=diario",
    ),
    EndpointSpec(
        id="report_categories",
        name="Reporte Categorías",
        category="Categorías",
        path="/reports/categories",
    ),
    EndpointSpec(
        id="report_products",
        name="Reporte Productos",
        category="Reportes",
        path="/reports/products-matrix?limit=200",
    ),
    EndpointSpec(
        id="report_payments",
        name="Reporte Métodos de Pago",
        category="Reportes",
        path="/reports/payment-methods",
    ),
    EndpointSpec(
        id="sales_history",
        name="Historial de Ventas (Página 1, size 20 con sumatorias agregadas)",
        category="Ventas",
        path="/sales?page=1&page_size=20",
    ),
    EndpointSpec(
        id="catalog_products",
        name="Productos (Página 1, size 20)",
        category="Inventario",
        path="/products?page=1&page_size=20",
    ),
    EndpointSpec(
        id="invoices_history",
        name="Facturas (Página 1, size 20)",
        category="Facturas",
        path="/invoices?page=1&page_size=20",
    ),
    EndpointSpec(
        id="dashboard_stats",
        name="Dashboard (Métricas Globales)",
        category="Dashboard",
        path="/dashboard/stats",
    ),
    EndpointSpec(
        id="invoices_stats",
        name="Facturas (Estadísticas)",
        category="Facturas",
        path="/invoices/stats",
    ),
    EndpointSpec(
        id="invoices_pending",
        name="Facturas (Pendientes Summary)",
        category="Facturas",
        path="/invoices/pending-summary",
    ),
    EndpointSpec(
        id="invoices_upcoming",
        name="Facturas (Próximas a Vencer)",
        category="Facturas",
        path="/invoices?sort_by=fecha_limite_pago&estado_pago=PENDIENTE&page_size=5&page=1",
    ),
    EndpointSpec(
        id="invoices_top_suppliers",
        name="Facturas (Top Proveedores)",
        category="Facturas",
        path="/invoices/top-suppliers",
    ),
    EndpointSpec(
        id="retornable_comparison",
        name="Retornables (Comparación)",
        category="Retornables",
        path="/retornable/comparacion",
    ),
    EndpointSpec(
        id="rate_latest",
        name="Tasas de Cambio (Última Tasa)",
        category="Configuración",
        path="/exchange-rates/latest",
    ),
    EndpointSpec(
        id="combos_list",
        name="Combos (Listado)",
        category="Inventario",
        path="/combos",
    ),
    EndpointSpec(
        id="payment_methods",
        name="Métodos de Pago (Listado)",
        category="Configuración",
        path="/payment-methods",
    ),
    EndpointSpec(
        id="users_list",
        name="Usuarios (Listado)",
        category="Configuración",
        path="/users",
    ),
    EndpointSpec(
        id="price_rules",
        name="Reglas de Precio Divisas",
        category="Configuración",
        path="/price-rules",
    ),
]


# ============================================================================
# 3. LÓGICA DE COMPARACIÓN Y SERIALIZACIÓN
# ============================================================================

def compute_comparison_row(pre: BenchmarkResult, post: BenchmarkResult) -> ComparisonRow:
    """Calcula las diferencias porcentuales, aceleración y clasificación de estado."""
    diff_avg_ms = round(post.avg_ms - pre.avg_ms, 2)
    pct_avg_change = round(((post.avg_ms - pre.avg_ms) / pre.avg_ms) * 100, 1) if pre.avg_ms > 0 else 0.0
    speedup = round(pre.avg_ms / post.avg_ms, 2) if post.avg_ms > 0 else 1.0
    diff_payload_kb = round(post.payload_kb - pre.payload_kb, 2)
    pct_payload_change = round(((post.payload_kb - pre.payload_kb) / pre.payload_kb) * 100, 1) if pre.payload_kb > 0 else 0.0

    if pct_avg_change <= -20.0:
        status = "MEJORA SIGNIFICATIVA"
    elif pct_avg_change <= -5.0:
        status = "MEJORA"
    elif pct_avg_change <= 5.0:
        status = "NEUTRO"
    else:
        status = "REGRESIÓN"

    return ComparisonRow(
        id=post.id,
        name=post.name,
        category=post.category,
        pre_path=pre.path,
        post_path=post.path,
        pre_avg_ms=pre.avg_ms,
        post_avg_ms=post.avg_ms,
        diff_avg_ms=diff_avg_ms,
        pct_avg_change=pct_avg_change,
        speedup=speedup,
        pre_p95_ms=pre.p95_ms,
        post_p95_ms=post.p95_ms,
        pre_payload_kb=pre.payload_kb,
        post_payload_kb=post.payload_kb,
        diff_payload_kb=diff_payload_kb,
        pct_payload_change=pct_payload_change,
        status=status,
    )


def serialize_benchmark_data(
    filepath: str,
    mode: str,
    branch: str,
    results: List[BenchmarkResult],
    metadata_extra: Optional[dict] = None,
) -> None:
    """Serializa los resultados de benchmark y metadatos a formato JSON."""
    out_path = Path(filepath)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    requests_count = results[0].total_requests if results else 0
    avg_latency = round(statistics.mean([r.avg_ms for r in results]), 2) if results else 0.0

    metadata = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "mode": mode,
        "branch": branch,
        "requests": requests_count,
        "total_endpoints": len(results),
        "avg_latency_overall": avg_latency,
    }
    if metadata_extra:
        metadata.update(metadata_extra)

    payload = {
        "metadata": metadata,
        "results": [asdict(r) for r in results],
    }

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)


def deserialize_benchmark_data(filepath: str) -> Tuple[dict, List[BenchmarkResult]]:
    """Carga los resultados y metadatos desde un archivo JSON previo."""
    in_path = Path(filepath)
    if not in_path.exists():
        raise FileNotFoundError(f"Archivo de benchmark no encontrado: {filepath}")

    with open(in_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    metadata = data.get("metadata", {})
    raw_results = data.get("results", [])
    results = [BenchmarkResult(**r) for r in raw_results]
    return metadata, results


def generate_markdown_report(
    rows: List[ComparisonRow],
    pre_branch: str = "master",
    post_branch: str = "style-changes",
) -> str:
    """Genera un reporte completo en Markdown con resumen ejecutivo y tabla comparativa."""
    lines = []
    lines.append("# Reporte Comparativo de Rendimiento")
    lines.append("")
    lines.append(f"**Comparación de ramas:** `{pre_branch}` (Base) vs `{post_branch}` (Optimizado)")
    lines.append(f"**Fecha:** {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")
    lines.append(f"**Total endpoints evaluados:** {len(rows)}")
    lines.append("")

    if rows:
        pre_avg_overall = statistics.mean([r.pre_avg_ms for r in rows])
        post_avg_overall = statistics.mean([r.post_avg_ms for r in rows])
        diff_avg_overall = post_avg_overall - pre_avg_overall
        pct_change_overall = ((post_avg_overall - pre_avg_overall) / pre_avg_overall * 100) if pre_avg_overall > 0 else 0.0
        speedup_overall = (pre_avg_overall / post_avg_overall) if post_avg_overall > 0 else 1.0

        pre_payload_total = sum(r.pre_payload_kb for r in rows)
        post_payload_total = sum(r.post_payload_kb for r in rows)
        diff_payload_total = post_payload_total - pre_payload_total
        pct_payload_overall = ((post_payload_total - pre_payload_total) / pre_payload_total * 100) if pre_payload_total > 0 else 0.0

        mejoras_sig = sum(1 for r in rows if r.status == "MEJORA SIGNIFICATIVA")
        mejoras = sum(1 for r in rows if r.status == "MEJORA")
        neutros = sum(1 for r in rows if r.status == "NEUTRO")
        regresiones = sum(1 for r in rows if r.status == "REGRESIÓN")

        lines.append("## Resumen Ejecutivo de Métricas Globales")
        lines.append("")
        lines.append(
            f"- **Latencia Promedio Global:** {pre_avg_overall:.2f} ms (`{pre_branch}`) ➔ "
            f"**{post_avg_overall:.2f} ms** (`{post_branch}`) | **Δ {pct_change_overall:+.1f}%** ({speedup_overall:.2f}x speedup)"
        )
        lines.append(
            f"- **Transferencia de Datos Total:** {pre_payload_total:.2f} KB ➔ "
            f"**{post_payload_total:.2f} KB** | **Δ {pct_payload_overall:+.1f}%** ({diff_payload_total:+.2f} KB)"
        )
        lines.append(
            f"- **Distribución de Estado:** {mejoras_sig} Mejoras Significativas (≤-20%), "
            f"{mejoras} Mejoras (-20% a -5%), {neutros} Neutros (±5%), {regresiones} Regresiones (>+5%)"
        )
        lines.append("")

        sorted_by_speedup = sorted(rows, key=lambda r: r.speedup, reverse=True)
        top_speedups = [r for r in sorted_by_speedup if r.speedup > 1.0][:5]
        if top_speedups:
            lines.append("### Mayores Aceleraciones Obtenidas")
            for r in top_speedups:
                lines.append(
                    f"- **{r.name}** (`{r.id}`): **{r.speedup:.1f}x más rápido** "
                    f"({r.pre_avg_ms:.1f} ms ➔ {r.post_avg_ms:.1f} ms | Δ {r.pct_avg_change:+.1f}%)"
                )
            lines.append("")

    lines.append("## Detalle Completo por Endpoint")
    lines.append("")
    lines.append("| Módulo | Endpoint | Path Pre | Path Post | Lat Pre (ms) | Lat Post (ms) | Δ Lat (%) | Speedup | Payload Pre (KB) | Payload Post (KB) | Δ Payload (%) | Estado |")
    lines.append("|---|---|---|---|---|---|---|---|---|---|---|---|")

    for r in rows:
        lines.append(
            f"| {r.category} | {r.name} | `{r.pre_path}` | `{r.post_path}` | "
            f"{r.pre_avg_ms:.1f} | {r.post_avg_ms:.1f} | {r.pct_avg_change:+.1f}% | {r.speedup:.1f}x | "
            f"{r.pre_payload_kb:.2f} | {r.post_payload_kb:.2f} | {r.pct_payload_change:+.1f}% | {r.status} |"
        )
    lines.append("")

    return "\n".join(lines)


# ============================================================================
# 4. RUNNER DE BENCHMARK & AUTENTICACIÓN
# ============================================================================

def get_current_git_branch() -> str:
    """Detecta el nombre de la rama git actual si está disponible."""
    try:
        import subprocess
        res = subprocess.run(["git", "branch", "--show-current"], capture_output=True, text=True, check=True)
        branch = res.stdout.strip()
        if branch:
            return branch
    except Exception:
        pass
    return "unknown"


def resolve_repo_path(path_str: str) -> Path:
    """Resuelve rutas relativas contra la raíz del repositorio."""
    p = Path(path_str)
    if not p.is_absolute():
        return (REPO_ROOT / p).resolve()
    return p


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
        from app.models.role import Role
        from app.models.user import User
        from app.services.auth_service import create_access_token
        from sqlalchemy import select

        with SessionLocal() as db:
            # Priorizar usuario con rol ADMINISTRADOR
            stmt_admin = select(User).join(User.role).where(User.is_active.is_(True), Role.nombre == "ADMINISTRADOR")
            user = db.execute(stmt_admin).scalars().first()
            if not user:
                # Fallback a cualquier usuario activo
                user = db.execute(select(User).where(User.is_active.is_(True))).scalars().first()
            if not user:
                print("[!] No se encontró ningún usuario activo en la base de datos.")
                return False
            token = create_access_token({"sub": str(user.id)})
            client.cookies.set("access_token", token)
            role_desc = user.role.nombre if user.role else "N/A"
            print(f"[+] Sesión ASGI directa iniciada como '{user.username}' (Rol: {role_desc}).")
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
    endpoint_info: Union[EndpointSpec, dict],
    requests: int,
    concurrency: int,
    inspect_only: bool = False,
) -> BenchmarkResult:
    """Ejecuta la prueba para un endpoint individual."""
    if isinstance(endpoint_info, EndpointSpec):
        ep_id = endpoint_info.id
        name = endpoint_info.name
        category = endpoint_info.category
        path = endpoint_info.path
    else:
        ep_id = endpoint_info.get("id", endpoint_info.get("name", "ep"))
        name = endpoint_info.get("name", "")
        category = endpoint_info.get("category", "General")
        path = endpoint_info.get("path", "")

    target_url = f"{path_prefix}{path}"
    print(f" -> Probando: {name:<36} ({path})...", end="", flush=True)

    start_bench = time.perf_counter()

    # 1. Petición inicial para verificar estado y tamaño de payload
    start_init = time.perf_counter()
    try:
        resp = await client.get(target_url)
        init_elapsed = (time.perf_counter() - start_init) * 1000
    except Exception as e:
        print(f" [FALLÓ: {e}]")
        return BenchmarkResult(
            id=ep_id,
            name=name,
            category=category,
            path=path,
            total_requests=requests,
            success_requests=0,
            payload_kb=0.0,
            avg_ms=0.0,
            p50_ms=0.0,
            p95_ms=0.0,
            min_ms=0.0,
            max_ms=0.0,
            rps=0.0,
            error_msg=str(e),
        )

    if resp.status_code != 200:
        print(f" [ERROR {resp.status_code}]")
        return BenchmarkResult(
            id=ep_id,
            name=name,
            category=category,
            path=path,
            total_requests=requests,
            success_requests=0,
            payload_kb=round(len(resp.content) / 1024, 2),
            avg_ms=round(init_elapsed, 2),
            p50_ms=round(init_elapsed, 2),
            p95_ms=round(init_elapsed, 2),
            min_ms=round(init_elapsed, 2),
            max_ms=round(init_elapsed, 2),
            rps=0.0,
            error_msg=f"HTTP {resp.status_code}",
        )

    payload_kb = len(resp.content) / 1024

    if inspect_only or requests <= 1:
        print(f" [OK | {payload_kb:.2f} KB | {init_elapsed:.1f} ms]")
        rps_val = round(1000.0 / init_elapsed, 1) if init_elapsed > 0 else 0.0
        return BenchmarkResult(
            id=ep_id,
            name=name,
            category=category,
            path=path,
            total_requests=1,
            success_requests=1,
            payload_kb=round(payload_kb, 2),
            avg_ms=round(init_elapsed, 2),
            p50_ms=round(init_elapsed, 2),
            p95_ms=round(init_elapsed, 2),
            min_ms=round(init_elapsed, 2),
            max_ms=round(init_elapsed, 2),
            rps=rps_val,
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

    total_bench_duration = time.perf_counter() - start_bench
    success_count = len(latencies)

    if not latencies:
        print(" [FALLARON TODAS]")
        return BenchmarkResult(
            id=ep_id,
            name=name,
            category=category,
            path=path,
            total_requests=requests,
            success_requests=0,
            payload_kb=round(payload_kb, 2),
            avg_ms=0.0,
            p50_ms=0.0,
            p95_ms=0.0,
            min_ms=0.0,
            max_ms=0.0,
            rps=0.0,
            error_msg="Sin respuestas exitosas",
        )

    latencies.sort()
    avg_ms = statistics.mean(latencies)
    p50_ms = statistics.median(latencies)
    p95_idx = int(len(latencies) * 0.95)
    p95_ms = latencies[min(p95_idx, len(latencies) - 1)]
    min_ms = latencies[0]
    max_ms = latencies[-1]
    rps = round(success_count / total_bench_duration, 1) if total_bench_duration > 0 else 0.0

    print(f" [OK | {success_count}/{requests} | p50: {p50_ms:.1f}ms | p95: {p95_ms:.1f}ms | {payload_kb:.2f} KB | {rps} rps]")

    return BenchmarkResult(
        id=ep_id,
        name=name,
        category=category,
        path=path,
        total_requests=requests,
        success_requests=success_count,
        payload_kb=round(payload_kb, 2),
        avg_ms=round(avg_ms, 2),
        p50_ms=round(p50_ms, 2),
        p95_ms=round(p95_ms, 2),
        min_ms=round(min_ms, 2),
        max_ms=round(max_ms, 2),
        rps=rps,
        error_msg=errors[0] if errors else None,
    )


# ============================================================================
# 5. RENDERIZADORES DE TABLAS EN TERMINAL
# ============================================================================

def print_summary_table(results: List[BenchmarkResult]):
    """Imprime una tabla formateada y visual con los resultados de la corrida actual."""
    print("\n" + "=" * 126)
    print(" REPORTE CONSOLIDADO DE RENDIMIENTO Y LATENCIAS DE ENDPOINTS")
    print("=" * 126)

    header = (
        f"{'Endpoint / Módulo':<38} | "
        f"{'Éxito':<7} | "
        f"{'Payload':<9} | "
        f"{'Promedio':<9} | "
        f"{'p50':<8} | "
        f"{'p95':<8} | "
        f"{'Min/Max':<14} | "
        f"{'RPS':<6} | "
        f"{'Estado':<6}"
    )
    print(header)
    print("-" * 126)

    for r in results:
        success_str = f"{r.success_requests}/{r.total_requests}"
        payload_str = f"{r.payload_kb:.2f} KB"
        avg_str = f"{r.avg_ms:.1f} ms"
        p50_str = f"{r.p50_ms:.1f} ms"
        p95_str = f"{r.p95_ms:.1f} ms"
        min_max_str = f"{r.min_ms:.1f} / {r.max_ms:.1f}"
        rps_str = f"{r.rps:.1f}"
        status_str = "OK" if r.success_requests == r.total_requests and not r.error_msg else "ERROR"

        display_name = r.name if len(r.name) <= 38 else r.name[:35] + "..."
        line = (
            f"{display_name:<38} | "
            f"{success_str:<7} | "
            f"{payload_str:<9} | "
            f"{avg_str:<9} | "
            f"{p50_str:<8} | "
            f"{p95_str:<8} | "
            f"{min_max_str:<14} | "
            f"{rps_str:<6} | "
            f"{status_str:<6}"
        )
        print(line)

    print("=" * 126)


def print_comparison_terminal_table(rows: List[ComparisonRow], pre_branch: str, post_branch: str):
    """Imprime una tabla comparativa side-by-side en la consola de comandos."""
    print("\n" + "=" * 136)
    print(f" TABLA COMPARATIVA DE RENDIMIENTO: '{pre_branch.upper()}' (BASE) vs '{post_branch.upper()}' (OPTIMIZADO)")
    print("=" * 136)

    header = (
        f"{'Módulo / Endpoint':<36} | "
        f"{'Pre Lat (avg/p95)':<18} | "
        f"{'Post Lat (avg/p95)':<18} | "
        f"{'Dif Lat (%)':<10} | "
        f"{'Speedup':<8} | "
        f"{'Pre KB':<8} | "
        f"{'Post KB':<8} | "
        f"{'Dif KB (%)':<10} | "
        f"{'Estado':<12}"
    )
    print(header)
    print("-" * 136)

    for r in rows:
        disp_name = r.name if len(r.name) <= 36 else r.name[:33] + "..."
        pre_lat = f"{r.pre_avg_ms:.1f} / {r.pre_p95_ms:.1f}"
        post_lat = f"{r.post_avg_ms:.1f} / {r.post_p95_ms:.1f}"
        d_lat = f"{r.pct_avg_change:+.1f}%"
        speedup_str = f"{r.speedup:.1f}x"
        pre_kb = f"{r.pre_payload_kb:.2f}"
        post_kb = f"{r.post_payload_kb:.2f}"
        d_kb = f"{r.pct_payload_change:+.1f}%"
        status_tag = r.status

        line = (
            f"{disp_name:<36} | "
            f"{pre_lat:<18} | "
            f"{post_lat:<18} | "
            f"{d_lat:<10} | "
            f"{speedup_str:<8} | "
            f"{pre_kb:<8} | "
            f"{post_kb:<8} | "
            f"{d_kb:<10} | "
            f"{status_tag:<12}"
        )
        print(line)

    print("=" * 136)


# ============================================================================
# 6. ENTRADA PRINCIPAL Y CONTROLADOR CLI
# ============================================================================

def parse_arguments():
    default_pre_file = str(REPO_ROOT / "benchmark_results" / "benchmark_pre.json")
    default_post_file = str(REPO_ROOT / "benchmark_results" / "benchmark_post.json")
    default_md_file = str(REPO_ROOT / "benchmark_results" / "comparison_report.md")

    parser = argparse.ArgumentParser(
        description="Suite de benchmark y motor comparativo de rendimiento API cross-branch.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        "--mode",
        choices=["pre", "post", "compare"],
        default="post",
        help="Modo de ejecución: 'pre' (suite pre-optimización), 'post' (suite optimizada), o 'compare' (comparar archivos)",
    )
    parser.add_argument(
        "--compare",
        action="store_true",
        help="Acceso directo a modo comparación (equivalente a --mode compare)",
    )
    parser.add_argument(
        "--in-process",
        action="store_true",
        help="Ejecutar directamente contra ASGI/FastAPI sin requerir puerto HTTP de red activo",
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
        help="URL base de la API FastAPI para pruebas HTTP",
    )
    parser.add_argument(
        "-o", "--output",
        default=None,
        help="Ruta personalizada para guardar el archivo JSON de salida",
    )
    parser.add_argument(
        "--pre-file",
        default=default_pre_file,
        help="Ruta del archivo JSON de benchmark pre-optimización",
    )
    parser.add_argument(
        "--post-file",
        default=default_post_file,
        help="Ruta del archivo JSON de benchmark post-optimización",
    )
    parser.add_argument(
        "--md-file",
        default=default_md_file,
        help="Ruta donde guardar el reporte comparativo en Markdown",
    )
    parser.add_argument(
        "--inspect-only",
        action="store_true",
        help="Ejecutar solo 1 petición por endpoint para validar respuestas y latencia base sin carga concurrente",
    )
    parser.add_argument(
        "--branch",
        default=None,
        help="Nombre de la rama para metadatos (si no se especifica se detecta por git)",
    )
    parser.add_argument(
        "-u", "--username",
        default=None,
        help="Nombre de usuario para iniciar sesión en modo HTTP",
    )
    parser.add_argument(
        "-p", "--password",
        default=None,
        help="Contraseña para iniciar sesión en modo HTTP",
    )
    parser.add_argument(
        "--no-login",
        action="store_true",
        help="Omitir autenticación en modo HTTP",
    )
    parser.add_argument(
        "-t", "--timeout",
        type=float,
        default=30.0,
        help="Timeout en segundos para cada petición",
    )
    return parser.parse_args()


async def run_benchmark_suite(args, suite: List[EndpointSpec], mode_name: str, output_file: str):
    """Ejecuta una suite de benchmark y guarda el archivo JSON correspondiente."""
    detected_branch = get_current_git_branch()
    branch = args.branch or (detected_branch if detected_branch != "unknown" else ("master" if mode_name == "pre" else "style-changes"))

    print("=" * 80)
    print(" SUITE DE BENCHMARK DE ENDPOINTS - YANESU SHISUTEMU")
    print("=" * 80)
    print(f"Modo         : {mode_name.upper()} ({len(suite)} endpoints)")
    print(f"Rama Git     : {branch}")
    print(f"Transporte   : {'In-Process ASGI (Directo)' if args.in_process else f'HTTP ({args.base_url})'}")
    print(f"Peticiones   : {args.requests if not args.inspect_only else 1} por endpoint")
    print(f"Concurrencia : {args.concurrency if not args.inspect_only else 1}")
    print(f"Tipo prueba  : {'Solo Inspección (1 req)' if args.inspect_only else 'Carga Concurrente'}")
    print(f"Destino JSON : {output_file}")
    print("-" * 80)

    if args.in_process:
        from app.main import app
        transport = httpx.ASGITransport(app=app)
        client = httpx.AsyncClient(transport=transport, base_url="http://testserver/api", timeout=args.timeout)
        path_prefix = ""
        if not setup_in_process_auth(client):
            print("[!] Abortando ejecución por falta de autenticación in-process.")
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
        # Warmup inicial
        try:
            await client.get(f"{path_prefix}/dashboard/stats")
        except Exception:
            pass

        print("\n[*] Ejecutando suite de endpoints...\n")
        results: List[BenchmarkResult] = []
        for ep in suite:
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

        serialize_benchmark_data(
            filepath=output_file,
            mode=mode_name,
            branch=branch,
            results=results,
            metadata_extra={
                "requests": 1 if args.inspect_only else args.requests,
                "concurrency": 1 if args.inspect_only else args.concurrency,
            },
        )
        print(f"\n[+] Resultados serializados exitosamente en: {output_file}")


def run_comparison(args):
    """Carga los resultados pre y post, computa comparaciones y genera reportes."""
    pre_path = resolve_repo_path(args.pre_file)
    post_path = resolve_repo_path(args.post_file)
    md_path = resolve_repo_path(args.md_file)

    print("=" * 80)
    print(" MOTOR DE COMPARACIÓN DE RENDIMIENTO CROSS-BRANCH")
    print("=" * 80)
    print(f"Archivo Pre  : {pre_path}")
    print(f"Archivo Post : {post_path}")
    print(f"Reporte MD   : {md_path}")
    print("-" * 80)

    try:
        pre_meta, pre_results = deserialize_benchmark_data(str(pre_path))
        post_meta, post_results = deserialize_benchmark_data(str(post_path))
    except FileNotFoundError as e:
        print(f"[!] Error al cargar datos para comparación: {e}")
        print("[*] Asegúrate de ejecutar primero la suite con '--mode pre' y luego con '--mode post'.")
        return

    pre_branch = pre_meta.get("branch", "master")
    post_branch = post_meta.get("branch", "style-changes")

    pre_map = {r.id: r for r in pre_results}
    post_map = {r.id: r for r in post_results}

    common_rows: List[ComparisonRow] = []
    for post_res in post_results:
        if post_res.id in pre_map:
            row = compute_comparison_row(pre_map[post_res.id], post_res)
            common_rows.append(row)

    if not common_rows:
        print("[!] No se encontraron endpoints con IDs coincidentes para comparar.")
        return

    print(f"[*] Se emparejaron {len(common_rows)} endpoints exitosamente.")
    print_comparison_terminal_table(common_rows, pre_branch, post_branch)

    # Generar y guardar reporte Markdown
    md_report = generate_markdown_report(common_rows, pre_branch=pre_branch, post_branch=post_branch)
    md_path.parent.mkdir(parents=True, exist_ok=True)
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(md_report)

    print(f"[+] Reporte comparativo Markdown guardado en: {md_path}")


async def async_main():
    args = parse_arguments()
    if args.compare:
        args.mode = "compare"

    if args.mode == "compare":
        run_comparison(args)
    elif args.mode == "pre":
        target_out = str(resolve_repo_path(args.output or args.pre_file))
        await run_benchmark_suite(args, SUITE_PRE, "pre", target_out)
    else:  # post
        target_out = str(resolve_repo_path(args.output or args.post_file))
        await run_benchmark_suite(args, SUITE_POST, "post", target_out)


def main():
    asyncio.run(async_main())


if __name__ == "__main__":
    main()
