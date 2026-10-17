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
