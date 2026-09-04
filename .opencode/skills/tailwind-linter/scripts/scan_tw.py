#!/usr/bin/env python3
"""
Standalone Tailwind CSS arbitrary value scanner.

Scans TSX/TS files for hardcoded Tailwind CSS arbitrary values and suggests
standard class replacements.

Usage:
    python scan_tw.py <path>                    # Scan file or directory
    python scan_tw.py <path> --fix              # Apply safe replacements
    python scan_tw.py <path> --json             # JSON output
    python scan_tw.py <path> --severity warn    # Filter by severity
"""

import argparse
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Optional


# =============================================================================
# Mapping tables: px value -> standard Tailwind class suffix
# =============================================================================

SPACING_MAP: dict[int, str] = {
    0: "0", 1: "px", 2: "0.5", 4: "1", 6: "1.5", 8: "2",
    10: "2.5", 12: "3", 14: "3.5", 16: "4", 20: "5", 24: "6",
    28: "7", 32: "8", 36: "9", 40: "10", 44: "11", 48: "12",
    52: "13", 56: "14", 60: "15", 64: "16", 68: "17", 72: "18",
    76: "19", 80: "20", 84: "21", 88: "22", 92: "23", 96: "24",
    100: "25", 104: "26", 108: "27", 112: "28", 116: "29",
    120: "30", 124: "31", 128: "32", 132: "33", 136: "34",
    140: "35", 144: "36", 148: "37", 152: "38", 156: "39",
    160: "40", 164: "41", 168: "42", 172: "43", 176: "44",
    180: "45", 184: "46", 188: "47", 192: "48", 196: "49",
    200: "50", 204: "51", 208: "52", 212: "53", 216: "54",
    220: "55", 224: "56", 228: "57", 232: "58", 236: "59",
    240: "60", 244: "61", 248: "62", 252: "63", 256: "64",
    260: "65", 264: "66", 268: "67", 272: "68", 276: "69",
    280: "70", 284: "71", 288: "72", 292: "73", 296: "74",
    300: "75", 304: "76", 308: "77", 312: "78", 316: "79",
    320: "80", 324: "81", 328: "82", 332: "83", 336: "84",
    340: "85", 344: "86", 348: "87", 352: "88", 356: "89",
    360: "90", 364: "91", 368: "92", 372: "93", 376: "94",
    380: "95", 384: "96",
}

FONT_SIZE_MAP: dict[int, str] = {
    12: "text-xs", 14: "text-sm", 16: "text-base", 18: "text-lg",
    20: "text-xl", 24: "text-2xl", 30: "text-3xl", 36: "text-4xl",
    48: "text-5xl", 60: "text-6xl", 72: "text-7xl", 96: "text-8xl",
}

BORDER_RADIUS_MAP: dict[int, str] = {
    0: "rounded-none", 2: "rounded-sm", 4: "rounded",
    6: "rounded-md", 8: "rounded-lg", 12: "rounded-xl",
    16: "rounded-2xl", 24: "rounded-3xl", 9999: "rounded-full",
}

# Known Tailwind colors (hex -> class)
TAILWIND_COLORS: dict[str, str] = {
    "#22c55e": "green-500", "#3b82f6": "blue-500",
    "#f97316": "orange-500", "#94a3b8": "slate-400",
    "#ef4444": "red-500", "#eab308": "yellow-500",
    "#8b5cf6": "violet-500", "#06b6d4": "cyan-500",
    "#10b981": "emerald-500", "#f43f5e": "rose-500",
    "#ec4899": "pink-500", "#14b8a6": "teal-500",
    "#f59e0b": "amber-500", "#6366f1": "indigo-500",
    "#84cc16": "lime-500", "#a855f7": "purple-500",
    "#0ea5e9": "sky-500", "#f3f4f6": "gray-100",
    "#e5e7eb": "gray-200", "#d1d5db": "gray-300",
    "#9ca3af": "gray-400", "#6b7280": "gray-500",
    "#4b5563": "gray-600", "#374151": "gray-700",
    "#1f2937": "gray-800", "#111827": "gray-900",
}

# Spacing prefixes (use the 4px grid scale)
SPACING_PREFIXES = frozenset({
    "p", "m", "px", "py", "pt", "pb", "pl", "pr",
    "mx", "my", "mt", "mb", "ml", "mr",
    "gap", "gap-x", "gap-y",
    "inset", "top", "right", "bottom", "left",
    "w", "h", "min-w", "min-h", "max-w", "max-h", "size",
    "scroll-m", "scroll-p", "scroll-mx", "scroll-my",
    "scroll-mt", "scroll-mb", "scroll-ml", "scroll-mr",
    "scroll-px", "scroll-py", "scroll-pt", "scroll-pb",
    "scroll-pl", "scroll-pr",
})

# Color prefixes
COLOR_PREFIXES = frozenset({
    "bg", "text", "border", "ring", "shadow", "outline",
    "accent", "fill", "stroke", "caret", "decoration",
})


@dataclass
class Finding:
    file: str
    line: int
    col: int
    original_class: str
    category: str
    suggested_class: Optional[str]
    severity: str
    fixable: bool


def parse_px_value(value: str) -> Optional[int]:
    value = value.strip()
    if value.endswith("px"):
        try:
            return int(float(value[:-2]))
        except ValueError:
            return None
    return None


def get_prefix_and_value(classname: str) -> tuple[str, str]:
    """
    Extract prefix and arbitrary value from a Tailwind class.
    Handles: p-[10px], hover:p-[10px], !text-[11px], sm:max-w-[200px], etc.
    Returns prefix WITHOUT trailing dash (e.g. "text", "max-w", "p").
    """
    c = classname
    # Strip important
    if c.startswith("!"):
        c = c[1:]
    # Strip variants (hover:, focus:, sm:, etc.)
    while ":" in c:
        c = c[c.index(":") + 1:]
    # Split at [
    bracket_idx = c.find("[")
    if bracket_idx == -1:
        return ("", "")
    prefix = c[:bracket_idx].rstrip("-")
    value = c[bracket_idx + 1:].rstrip("]")
    return (prefix, value)


# Regex: find any token that looks like a Tailwind class with arbitrary value.
# Matches: p-[10px], hover:text-[11px], !max-w-[200px], [&>svg]:w-[19px], etc.
# We look for word chars, colons (variants), hyphens, then [...]
ARBITRARY_CLASS_RE = re.compile(
    r"""
    (?:^|[\s"'`{(,])            # start: whitespace, quote, brace, comma
    (                           # --- captured class ---
    [!?]?                       # optional important
    (?:[a-z][\w-]*:)*           # optional variants: hover:, sm:, etc.
    [a-z][\w-]*                 # prefix: p, text, max-w, bg, etc.
    \[[^\]]+\]                  # arbitrary value: [...]
    )                           # --- end captured class ---
    (?=[\s"'`})\],;)]|$)        # end: whitespace, quote, brace, comma, end
    """,
    re.VERBOSE | re.IGNORECASE,
)


def classify_class(classname: str) -> tuple[str, Optional[str], bool]:
    """Classify a Tailwind class with arbitrary value. Returns (category, suggestion, fixable)."""
    prefix, value = get_prefix_and_value(classname)
    if not prefix or not value:
        return ("unknown", None, False)

    # --- Viewport units ---
    if re.search(r"\d+(?:\.\d+)?(?:vh|vw|svh|lvh|dvh|vmin|vmax)", value):
        return ("viewport", None, False)

    # --- calc/min/max expressions ---
    if re.match(r"^(calc|min|max|clamp)\(", value):
        return ("viewport", None, False)

    # --- CSS custom properties / var() ---
    if value.startswith("--") or value.startswith("var("):
        return ("selector", None, False)

    # --- Arbitrary selectors [&>...]: ---
    if classname.lstrip("!?").startswith("["):
        return ("selector", None, False)

    # --- Animations ---
    if prefix == "animate":
        return ("animation", None, False)

    # --- Font sizes (check BEFORE colors, since "text" is in COLOR_PREFIXES) ---
    if prefix == "text":
        px = parse_px_value(value)
        if px is not None:
            suggestion = FONT_SIZE_MAP.get(px)
            if suggestion:
                return ("fontsize", suggestion, True)
            return ("fontsize", None, False)
        # If not a px value, it might be a color
        hex_val = value.lower().strip()
        if hex_val.startswith("#"):
            if hex_val in TAILWIND_COLORS:
                return ("color", f"text-{TAILWIND_COLORS[hex_val]}", True)
            return ("color", None, False)
        return ("unknown", None, False)

    # --- Colors ---
    if prefix in COLOR_PREFIXES:
        hex_val = value.lower().strip()
        if hex_val.startswith("#") and hex_val in TAILWIND_COLORS:
            return ("color", f"{prefix}-{TAILWIND_COLORS[hex_val]}", True)
        elif hex_val.startswith("#"):
            return ("color", None, False)
        return ("color", None, False)

    # --- Z-index ---
    if prefix == "z":
        try:
            z_val = int(value)
            z_map = {0: "z-0", 10: "z-10", 20: "z-20", 30: "z-30", 40: "z-40", 50: "z-50"}
            if z_val in z_map:
                return ("zindex", z_map[z_val], True)
            return ("zindex", None, False)
        except ValueError:
            return ("zindex", None, False)

    # --- Border radius ---
    if prefix.startswith("rounded"):
        px = parse_px_value(value)
        if px is not None:
            suggestion = BORDER_RADIUS_MAP.get(px)
            if suggestion:
                return ("radius", suggestion, True)
            return ("radius", None, False)

    # --- Spacing / dimensions ---
    if prefix in SPACING_PREFIXES:
        px = parse_px_value(value)
        if px is not None:
            # Tailwind v4 generates classes for ANY multiple of 4px (or 1px → px)
            if px in SPACING_MAP:
                return ("spacing", f"{prefix}-{SPACING_MAP[px]}", True)
            if px % 4 == 0:
                class_num = px // 4
                return ("spacing", f"{prefix}-{class_num}", True)
            return ("spacing", None, False)
        # rem values
        if value.endswith("rem"):
            try:
                rem_val = float(value[:-3])
                px_val = int(rem_val * 16)
                if px_val in SPACING_MAP:
                    return ("spacing", f"{prefix}-{SPACING_MAP[px_val]}", True)
                if px_val % 4 == 0:
                    class_num = px_val // 4
                    return ("spacing", f"{prefix}-{class_num}", True)
            except ValueError:
                pass
            return ("spacing", None, False)

    # --- Opacity ---
    if prefix == "opacity":
        try:
            opacity_val = int(value)
            if 0 <= opacity_val <= 100 and opacity_val % 5 == 0:
                return ("opacity", f"opacity-{opacity_val}", True)
        except ValueError:
            pass
        return ("opacity", None, False)

    return ("unknown", None, False)


def find_line_number(content: str, match_start: int) -> int:
    """Get the 1-based line number for a character offset in content."""
    return content[:match_start].count("\n") + 1


def find_col_number(content: str, match_start: int) -> int:
    """Get the 1-based column number for a character offset in content."""
    last_newline = content.rfind("\n", 0, match_start)
    return match_start - last_newline


def scan_content(content: str, filepath: str) -> list[Finding]:
    """Scan file content for arbitrary Tailwind values."""
    findings = []
    seen = set()  # deduplicate by (line, class)

    for match in ARBITRARY_CLASS_RE.finditer(content):
        raw_class = match.group(1).strip()
        if not raw_class:
            continue

        line_num = find_line_number(content, match.start())
        col_num = find_col_number(content, match.start())

        dedup_key = (line_num, raw_class)
        if dedup_key in seen:
            continue
        seen.add(dedup_key)

        category, suggested, fixable = classify_class(raw_class)

        if category in ("unknown", "selector", "animation"):
            continue

        if category in ("spacing", "fontsize") and suggested:
            severity = "warn"
        elif category == "color" and suggested:
            severity = "warn"
        else:
            severity = "info"

        findings.append(Finding(
            file=filepath,
            line=line_num,
            col=col_num,
            original_class=raw_class,
            category=category,
            suggested_class=suggested,
            severity=severity,
            fixable=fixable,
        ))

    return findings


def scan_file(filepath: Path) -> list[Finding]:
    try:
        content = filepath.read_text(encoding="utf-8")
    except (UnicodeDecodeError, PermissionError) as e:
        print(f"  Warning: Could not read {filepath}: {e}", file=sys.stderr)
        return []
    return scan_content(content, str(filepath))


def scan_path(path: Path) -> list[Finding]:
    findings = []
    if path.is_file():
        findings.extend(scan_file(path))
    elif path.is_dir():
        for ext in ("*.tsx", "*.ts", "*.jsx", "*.js"):
            for filepath in path.rglob(ext):
                parts = filepath.parts
                if any(skip in parts for skip in ("node_modules", "dist", "build", ".next", ".nuxt")):
                    continue
                findings.extend(scan_file(filepath))
    else:
        print(f"Error: {path} does not exist", file=sys.stderr)
        sys.exit(1)
    return findings


def apply_fixes(findings: list[Finding]) -> int:
    fixes_by_file: dict[str, list[Finding]] = {}
    for f in findings:
        if f.fixable and f.suggested_class:
            fixes_by_file.setdefault(f.file, []).append(f)

    total_fixes = 0
    for filepath, file_findings in fixes_by_file.items():
        try:
            content = Path(filepath).read_text(encoding="utf-8")
        except (UnicodeDecodeError, PermissionError):
            continue

        file_findings.sort(key=lambda f: (-f.line, -f.col))

        for f in file_findings:
            lines = content.split("\n")
            if f.line > len(lines):
                continue
            line = lines[f.line - 1]
            if f.original_class in line:
                lines[f.line - 1] = line.replace(f.original_class, f.suggested_class, 1)
                total_fixes += 1
            content = "\n".join(lines)

        Path(filepath).write_text(content, encoding="utf-8")

    return total_fixes


CATEGORY_LABELS = {
    "spacing": "espaciado",
    "fontsize": "tipografía",
    "radius": "radio",
    "color": "color",
    "viewport": "viewport",
    "zindex": "z-index",
    "selector": "selector",
    "animation": "animación",
    "unknown": "desconocido",
}


def format_report(findings: list[Finding], severity_filter: Optional[str] = None) -> str:
    if severity_filter:
        findings = [f for f in findings if f.severity == severity_filter]

    if not findings:
        return "No arbitrary Tailwind values found."

    by_file: dict[str, list[Finding]] = {}
    for f in findings:
        by_file.setdefault(f.file, []).append(f)

    lines = []
    total = len(findings)
    fixable = sum(1 for f in findings if f.fixable)
    lines.append(f"Found {total} arbitrary Tailwind value(s) ({fixable} fixable)\n")

    for filepath, file_findings in sorted(by_file.items()):
        lines.append(f"  {filepath}")
        for f in sorted(file_findings, key=lambda x: x.line):
            cat_label = CATEGORY_LABELS.get(f.category, f.category)
            if f.suggested_class:
                lines.append(
                    f"    L{f.line:<5} {f.original_class:<35} -> {f.suggested_class:<20} [{cat_label}]"
                )
            else:
                lines.append(
                    f"    L{f.line:<5} {f.original_class:<35}   {'(mantener)':<20} [{cat_label}]"
                )
        lines.append("")

    by_category: dict[str, int] = {}
    for f in findings:
        by_category[f.category] = by_category.get(f.category, 0) + 1

    lines.append("Summary by category:")
    for cat, count in sorted(by_category.items(), key=lambda x: -x[1]):
        label = CATEGORY_LABELS.get(cat, cat)
        fixable_in_cat = sum(1 for f in findings if f.category == cat and f.fixable)
        lines.append(f"  {label:<15} {count:>3} total, {fixable_in_cat} fixable")

    return "\n".join(lines)


def format_json(findings: list[Finding], severity_filter: Optional[str] = None) -> str:
    if severity_filter:
        findings = [f for f in findings if f.severity == severity_filter]

    data = {
        "total": len(findings),
        "fixable": sum(1 for f in findings if f.fixable),
        "findings": [
            {
                "file": f.file,
                "line": f.line,
                "col": f.col,
                "original_class": f.original_class,
                "category": f.category,
                "suggested_class": f.suggested_class,
                "severity": f.severity,
                "fixable": f.fixable,
            }
            for f in findings
        ],
    }
    return json.dumps(data, indent=2, ensure_ascii=False)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Scan files for hardcoded Tailwind CSS arbitrary values",
    )
    parser.add_argument("path", help="File or directory to scan")
    parser.add_argument("--fix", action="store_true", help="Apply safe auto-fixes")
    parser.add_argument("--json", action="store_true", help="Output results as JSON")
    parser.add_argument("--severity", choices=["error", "warn", "info"], help="Filter by severity")

    args = parser.parse_args()
    target = Path(args.path).resolve()

    findings = scan_path(target)

    if args.fix:
        fixes = apply_fixes(findings)
        findings = scan_path(target)
        print(f"Applied {fixes} fix(es). Remaining issues:\n")

    if args.json:
        print(format_json(findings, args.severity))
    else:
        print(format_report(findings, args.severity))


if __name__ == "__main__":
    main()
