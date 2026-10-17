# Benchmark Suite Cross-Branch Comparison Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform `backend/scripts/benchmark_suite.py` into a dual-mode benchmarking and cross-branch comparison suite that evaluates API endpoints pre- and post-optimization, exports structured JSON metrics to `benchmark_results/`, and generates side-by-side terminal & Markdown comparison reports with latency and payload delta metrics.

**Architecture:** A unified CLI tool supporting `--mode pre`, `--mode post`, and `--mode compare`. The runner executes asynchronous load tests against SQLite using either in-process ASGI (fast, no external server needed) or HTTP. Results are serialized per semantic endpoint ID into JSON files, and a comparison engine computes latency deltas, speedup factors, and payload changes to render formatted console tables and Markdown reports.

**Tech Stack:** Python 3.12, httpx (ASGITransport & AsyncClient), asyncio, statistics, argparse, json, pathlib, pytest.

**Spec:** In-chat approved bounded design (Emparejados + Comunes).

## Global Constraints
- Python 3.12+ compatibility, no external dependencies beyond existing `requirements.txt` (`httpx` is already installed).
- Strict separation between pre-optimization suite (`master`) and post-optimization suite (`style-changes`).
- Storage output must default to `benchmark_results/` in the workspace root so results persist across branch checkouts.
- Zero commits unless explicitly authorized by the user (respecting `AGENTS.md` and user instructions).

---

### Task 1: Unit Tests for Benchmark Suite Logic (Comparison, Metrics, Serialization)

**Files:**
- Create: `backend/tests/test_benchmark_suite.py`

**Interfaces:**
- Consumes: `benchmark_suite.py` helper functions: `compute_comparison_row`, `serialize_benchmark_data`, `deserialize_benchmark_data`, `generate_markdown_report`.
- Produces: Test verification suite ensuring calculation correctness and serialization integrity before modifying the main script.

- [ ] **Step 1: Write the failing unit tests in `backend/tests/test_benchmark_suite.py`**

```python
"""Tests unitarios para la lógica del benchmark suite y motor de comparación."""

import json
from scripts.benchmark_suite import (
    BenchmarkResult,
    ComparisonRow,
    compute_comparison_row,
    generate_markdown_report,
    serialize_benchmark_data,
    deserialize_benchmark_data,
)


def test_compute_comparison_metrics_improvement():
    pre = BenchmarkResult(
        id="kpi_categories",
        name="Categorías (KPIs)",
        category="Categorías",
        path="/categories/analytics",
        total_requests=30,
        success_requests=30,
        payload_kb=15.0,
        avg_ms=100.0,
        p50_ms=95.0,
        p95_ms=120.0,
        min_ms=80.0,
        max_ms=130.0,
        rps=10.0,
    )
    post = BenchmarkResult(
        id="kpi_categories",
        name="Categorías (KPIs)",
        category="Categorías",
        path="/categories/summary",
        total_requests=30,
        success_requests=30,
        payload_kb=1.5,
        avg_ms=25.0,
        p50_ms=22.0,
        p95_ms=30.0,
        min_ms=18.0,
        max_ms=35.0,
        rps=40.0,
    )

    row = compute_comparison_row(pre, post)

    assert row.id == "kpi_categories"
    assert row.diff_avg_ms == -75.0
    assert row.pct_avg_change == -75.0
    assert row.speedup == 4.0
    assert row.diff_payload_kb == -13.5
    assert row.pct_payload_change == -90.0
    assert "MEJORA" in row.status


def test_compute_comparison_metrics_regression():
    pre = BenchmarkResult(
        id="test_ep",
        name="Test Endpoint",
        category="Test",
        path="/test",
        total_requests=10,
        success_requests=10,
        payload_kb=2.0,
        avg_ms=20.0,
        p50_ms=20.0,
        p95_ms=25.0,
        min_ms=15.0,
        max_ms=30.0,
        rps=50.0,
    )
    post = BenchmarkResult(
        id="test_ep",
        name="Test Endpoint",
        category="Test",
        path="/test",
        total_requests=10,
        success_requests=10,
        payload_kb=2.0,
        avg_ms=35.0,
        p50_ms=35.0,
        p95_ms=40.0,
        min_ms=25.0,
        max_ms=45.0,
        rps=28.0,
    )

    row = compute_comparison_row(pre, post)
    assert row.diff_avg_ms == 15.0
    assert row.pct_avg_change == 75.0
    assert row.speedup < 1.0
    assert row.status == "REGRESIÓN"


def test_json_serialization_roundtrip(tmp_path):
    results = [
        BenchmarkResult(
            id="ep1",
            name="Endpoint 1",
            category="Cat 1",
            path="/ep1",
            total_requests=10,
            success_requests=10,
            payload_kb=5.25,
            avg_ms=42.1,
            p50_ms=40.0,
            p95_ms=50.0,
            min_ms=35.0,
            max_ms=55.0,
            rps=23.7,
        )
    ]
    file_path = tmp_path / "test_benchmark.json"
    serialize_benchmark_data(str(file_path), mode="pre", branch="master", results=results)

    loaded_metadata, loaded_results = deserialize_benchmark_data(str(file_path))
    assert loaded_metadata["mode"] == "pre"
    assert loaded_metadata["branch"] == "master"
    assert len(loaded_results) == 1
    assert loaded_results[0].id == "ep1"
    assert loaded_results[0].avg_ms == 42.1


def test_generate_markdown_report():
    row = ComparisonRow(
        id="kpi_categories",
        name="Categorías (KPIs)",
        category="Categorías",
        pre_path="/categories/analytics",
        post_path="/categories/summary",
        pre_avg_ms=100.0,
        post_avg_ms=25.0,
        diff_avg_ms=-75.0,
        pct_avg_change=-75.0,
        speedup=4.0,
        pre_p95_ms=120.0,
        post_p95_ms=30.0,
        pre_payload_kb=15.0,
        post_payload_kb=1.5,
        diff_payload_kb=-13.5,
        pct_payload_change=-90.0,
        status="MEJORA SIGNIFICATIVA",
    )

    md = generate_markdown_report([row], pre_branch="master", post_branch="style-changes")
    assert "# Reporte Comparativo de Rendimiento" in md
    assert "Categorías (KPIs)" in md
    assert "4.0x" in md
    assert "-75.0%" in md
```

- [ ] **Step 2: Run test to verify it fails initially**

Run: `pytest backend/tests/test_benchmark_suite.py -v`
Expected: FAIL with `ImportError` or `AttributeError` because the new functions are not yet implemented in `backend/scripts/benchmark_suite.py`.

---

### Task 2: Define Data Structures & Pre/Post Endpoint Suites

**Files:**
- Modify: `backend/scripts/benchmark_suite.py`

**Interfaces:**
- Produces:
  - `EndpointSpec` dataclass: `(id, name, path, category, description)`
  - `BenchmarkResult` dataclass: `(id, name, category, path, total_requests, success_requests, payload_kb, avg_ms, p50_ms, p95_ms, min_ms, max_ms, rps, error_msg)`
  - `ComparisonRow` dataclass: all comparison fields
  - `SUITE_PRE`: list of `EndpointSpec` for `master`
  - `SUITE_POST`: list of `EndpointSpec` for `style-changes`

- [ ] **Step 1: Implement Dataclasses and Suite Definitions in `backend/scripts/benchmark_suite.py`**

Define:
1. `SUITE_PRE`:
   - Categorías KPIs: `id="kpi_categories"`, path=`"/categories/analytics"`
   - Proveedores KPIs: `id="kpi_suppliers"`, path=`"/suppliers/analytics"`
   - Reportes Ventas: `id="report_sales"`, path=`"/sales/summary?rango=semanal"`
   - Reportes Categorías: `id="report_categories"`, path=`"/categories/analytics"`
   - Reportes Productos: `id="report_products"`, path=`"/reports/products-matrix?limit=200"`
   - Reportes Pagos: `id="report_payments"`, path=`"/reports/payment-methods"`
   - Historial Ventas: `id="sales_history"`, path=`"/sales?page=1&page_size=20"`
   - Catálogo Productos: `id="catalog_products"`, path=`"/products?page=1&page_size=20"`
   - Facturas Lista: `id="invoices_history"`, path=`"/invoices?page=1&page_size=20"`
   - Dashboard Stats: `id="dashboard_stats"`, path=`"/dashboard/stats"`
   - Facturas Stats: `id="invoices_stats"`, path=`"/invoices/stats"`
   - Facturas Pendientes: `id="invoices_pending"`, path=`"/invoices/pending-summary"`
   - Facturas Próximas: `id="invoices_upcoming"`, path=`"/invoices?sort_by=fecha_limite_pago&estado_pago=PENDIENTE&page_size=5&page=1"`
   - Top Proveedores: `id="invoices_top_suppliers"`, path=`"/invoices/top-suppliers"`
   - Retornables Comparación: `id="retornable_comparison"`, path=`"/retornable/comparacion"`
   - Tasa Última: `id="rate_latest"`, path=`"/exchange-rates/latest"`
   - Combos Lista: `id="combos_list"`, path=`"/combos"`
   - Métodos Pago: `id="payment_methods"`, path=`"/payment-methods"`
   - Usuarios Lista: `id="users_list"`, path=`"/users"`
   - Reglas Precios: `id="price_rules"`, path=`"/price-rules"`

2. `SUITE_POST`:
   - Categorías KPIs: `id="kpi_categories"`, path=`"/categories/summary"`
   - Proveedores KPIs: `id="kpi_suppliers"`, path=`"/suppliers/summary"`
   - Reportes Ventas: `id="report_sales"`, path=`"/sales/summary?rango=diario"`
   - Reportes Categorías: `id="report_categories"`, path=`"/reports/categories"`
   - Reportes Productos: `id="report_products"`, path=`"/reports/products-matrix?limit=200"`
   - Reportes Pagos: `id="report_payments"`, path=`"/reports/payment-methods"`
   - Historial Ventas (con sumatorias SQL): `id="sales_history"`, path=`"/sales?page=1&page_size=20"`
   - Catálogo Productos: `id="catalog_products"`, path=`"/products?page=1&page_size=20"`
   - Facturas Lista: `id="invoices_history"`, path=`"/invoices?page=1&page_size=20"`
   - Dashboard Stats: `id="dashboard_stats"`, path=`"/dashboard/stats"`
   - Facturas Stats: `id="invoices_stats"`, path=`"/invoices/stats"`
   - Facturas Pendientes: `id="invoices_pending"`, path=`"/invoices/pending-summary"`
   - Facturas Próximas: `id="invoices_upcoming"`, path=`"/invoices?sort_by=fecha_limite_pago&estado_pago=PENDIENTE&page_size=5&page=1"`
   - Top Proveedores: `id="invoices_top_suppliers"`, path=`"/invoices/top-suppliers"`
   - Retornables Comparación: `id="retornable_comparison"`, path=`"/retornable/comparacion"`
   - Tasa Última: `id="rate_latest"`, path=`"/exchange-rates/latest"`
   - Combos Lista: `id="combos_list"`, path=`"/combos"`
   - Métodos Pago: `id="payment_methods"`, path=`"/payment-methods"`
   - Usuarios Lista: `id="users_list"`, path=`"/users"`
   - Reglas Precios: `id="price_rules"`, path=`"/price-rules"`

---

### Task 3: Implement Serialization & Comparison Math Engine

**Files:**
- Modify: `backend/scripts/benchmark_suite.py`

**Interfaces:**
- Produces:
  - `compute_comparison_row(pre: BenchmarkResult, post: BenchmarkResult) -> ComparisonRow`
  - `serialize_benchmark_data(filepath: str, mode: str, branch: str, results: List[BenchmarkResult]) -> None`
  - `deserialize_benchmark_data(filepath: str) -> Tuple[dict, List[BenchmarkResult]]`
  - `generate_markdown_report(rows: List[ComparisonRow], pre_branch: str, post_branch: str) -> str`

- [ ] **Step 1: Implement the math and serialization functions**

Implement calculations:
- `diff_avg_ms = round(post.avg_ms - pre.avg_ms, 2)`
- `pct_avg_change = round(((post.avg_ms - pre.avg_ms) / pre.avg_ms) * 100, 1)` if `pre.avg_ms > 0` else 0.0
- `speedup = round(pre.avg_ms / post.avg_ms, 2)` if `post.avg_ms > 0` else 1.0
- `diff_payload_kb = round(post.payload_kb - pre.payload_kb, 2)`
- `pct_payload_change = round(((post.payload_kb - pre.payload_kb) / pre.payload_kb) * 100, 1)` if `pre.payload_kb > 0` else 0.0
- Status tags:
  - If `pct_avg_change <= -20.0`: `"MEJORA SIGNIFICATIVA"`
  - If `-20.0 < pct_avg_change <= -5.0`: `"MEJORA"`
  - If `-5.0 < pct_avg_change <= 5.0`: `"NEUTRO"`
  - If `pct_avg_change > 5.0`: `"REGRESIÓN"`

- [ ] **Step 2: Run pytest to verify unit tests pass**

Run: `pytest backend/tests/test_benchmark_suite.py -v`
Expected: ALL PASS.

---

### Task 4: Complete Benchmark Runner & CLI Integration

**Files:**
- Modify: `backend/scripts/benchmark_suite.py`

**Interfaces:**
- CLI Flags:
  - `--mode {pre,post,compare}` (default: `post`)
  - `--in-process` (direct ASGI execution against SQLite)
  - `-n / --requests` (default: 30)
  - `-c / --concurrency` (default: 5)
  - `-b / --base-url` (default: `http://127.0.0.1:8000/api`)
  - `-o / --output` (custom output file path)
  - `--pre-file` (default: `benchmark_results/benchmark_pre.json`)
  - `--post-file` (default: `benchmark_results/benchmark_post.json`)
  - `--md-file` (default: `benchmark_results/comparison_report.md`)
  - `--inspect-only` (1 single request for verification)

- [ ] **Step 1: Implement CLI parser and execution workflow**

1. In `--mode pre`:
   - Detects or uses `SUITE_PRE`.
   - Runs benchmarks against in-process ASGI app or HTTP.
   - Prints individual summary table.
   - Saves to `benchmark_results/benchmark_pre.json`.
2. In `--mode post`:
   - Detects or uses `SUITE_POST`.
   - Runs benchmarks against in-process ASGI app or HTTP.
   - Prints individual summary table.
   - Saves to `benchmark_results/benchmark_post.json`.
3. In `--mode compare`:
   - Loads `benchmark_results/benchmark_pre.json` and `benchmark_results/benchmark_post.json`.
   - Computes comparison rows for all matching IDs.
   - Prints a formatted comparison table in terminal:
     - Columns: `Módulo / Endpoint`, `Pre Lat (p50/avg)`, `Post Lat (p50/avg)`, `Δ Latencia (%)`, `Speedup`, `Pre KB`, `Post KB`, `Δ KB (%)`, `Estado`.
   - Generates and writes `benchmark_results/comparison_report.md`.

- [ ] **Step 2: Dry-run test with `--inspect-only` in in-process mode**

Run: `python backend/scripts/benchmark_suite.py --in-process --mode post --inspect-only`
Expected: Executes 1 request per endpoint in `SUITE_POST`, verifies all endpoints return 200 OK, prints summary table, and writes `benchmark_results/benchmark_post.json`.

---

### Task 5: End-to-End Verification Across Branches

- [ ] **Step 1: Test `style-changes` benchmark execution**
Run: `python backend/scripts/benchmark_suite.py --in-process --mode post -n 10 -c 2`
Expected: Generates `benchmark_results/benchmark_post.json` with 10 requests per endpoint.

- [ ] **Step 2: Test comparison mode with mock or pre data**
Run: `python backend/scripts/benchmark_suite.py --compare`
Expected: Validates report generation and terminal rendering.

- [ ] **Step 3: Run entire backend test suite to ensure zero regressions**
Run: `pytest backend/tests/ -v`
Expected: All existing backend tests pass.

---

### Task 6: Document Branch-Switching Workflow

Provide clear instructions for the user:
1. On `style-changes`, run:
   `python backend/scripts/benchmark_suite.py --in-process --mode post -n 30 -c 5`
2. Switch to `master`:
   ```bash
   git checkout master
   git checkout style-changes -- backend/scripts/benchmark_suite.py
   python backend/scripts/benchmark_suite.py --in-process --mode pre -n 30 -c 5
   ```
3. Switch back to `style-changes`:
   ```bash
   git checkout style-changes
   python backend/scripts/benchmark_suite.py --compare
   ```
4. Check generated report in `benchmark_results/comparison_report.md`.
