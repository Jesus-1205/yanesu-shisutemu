#!/usr/bin/env python3
"""
Setup ESLint + eslint-plugin-tailwindcss for a Tailwind v4 project.

Usage:
    python setup_eslint.py <frontend_dir>

Example:
    python setup_eslint.py frontend/

This will:
  1. Install eslint, eslint-plugin-tailwindcss as devDependencies
  2. Create eslint.config.mjs with recommended rules
  3. Add a lint:tailwind script to package.json
"""

import json
import subprocess
import sys
from pathlib import Path


def find_css_entry(frontend_dir: Path) -> str:
    """Find the main Tailwind CSS entry point."""
    candidates = [
        frontend_dir / "src" / "index.css",
        frontend_dir / "src" / "styles" / "tailwind.css",
        frontend_dir / "src" / "app" / "globals.css",
        frontend_dir / "src" / "tailwind.css",
    ]
    for c in candidates:
        if c.exists():
            return str(c.relative_to(frontend_dir))
    return "src/index.css"


def create_eslint_config(frontend_dir: Path, css_path: str) -> None:
    """Create eslint.config.mjs for Tailwind CSS v4."""
    config_content = f'''import eslintPluginTailwindcss from "eslint-plugin-tailwindcss";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {{
    files: ["**/*.{tsx,ts,jsx,js}"],
    extends: [eslintPluginTailwindcss.configs["flat/recommended"]],
    settings: {{
      tailwindcss: {{
        cssConfigPath: "./{css_path}",
        attributes: ["class", "className"],
        functions: ["cn", "clsx", "classNames", "cva", "twMerge"],
      }},
    }},
    rules: {{
      "tailwindcss/no-unnecessary-arbitrary-value": "warn",
      "tailwindcss/classnames-order": "warn",
      "tailwindcss/enforces-shorthand": "warn",
      "tailwindcss/no-contradicting-classname": "error",
      "tailwindcss/no-custom-classname": "off",
    }},
  }},
]);
'''
    config_path = frontend_dir / "eslint.config.mjs"
    config_path.write_text(config_content, encoding="utf-8")
    print(f"  Created {config_path}")


def add_npm_scripts(frontend_dir: Path) -> None:
    """Add lint scripts to package.json."""
    pkg_path = frontend_dir / "package.json"
    if not pkg_path.exists():
        print("  Warning: package.json not found, skipping script addition")
        return

    pkg = json.loads(pkg_path.read_text(encoding="utf-8"))
    scripts = pkg.get("scripts", {})

    if "lint:tailwind" not in scripts:
        scripts["lint:tailwind"] = "eslint src/ --ext .tsx,.ts"
        scripts["lint:tailwind:fix"] = "eslint src/ --ext .tsx,.ts --fix"
        pkg["scripts"] = scripts
        pkg_path.write_text(json.dumps(pkg, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print("  Added lint:tailwind and lint:tailwind:fix scripts to package.json")
    else:
        print("  lint:tailwind script already exists")


def install_packages(frontend_dir: Path) -> None:
    """Install ESLint and plugin packages."""
    packages = [
        "eslint",
        "eslint-plugin-tailwindcss",
        "@eslint/js",
        "typescript-eslint",
    ]

    print(f"  Installing: {', '.join(packages)}")
    try:
        subprocess.run(
            ["npm", "install", "-D"] + packages,
            cwd=str(frontend_dir),
            check=True,
            capture_output=True,
            text=True,
        )
        print("  Packages installed successfully")
    except FileNotFoundError:
        print("  Error: npm not found. Make sure Node.js is installed.")
        sys.exit(1)
    except subprocess.CalledProcessError as e:
        print(f"  Error installing packages: {e.stderr}")
        sys.exit(1)


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python setup_eslint.py <frontend_dir>")
        print("Example: python setup_eslint.py frontend/")
        sys.exit(1)

    frontend_dir = Path(sys.argv[1]).resolve()
    if not frontend_dir.exists():
        print(f"Error: Directory {frontend_dir} does not exist")
        sys.exit(1)

    print(f"Setting up ESLint for Tailwind CSS v4 in: {frontend_dir}")

    css_path = find_css_entry(frontend_dir)
    print(f"  Found CSS entry: {css_path}")

    print("\n[1/3] Installing packages...")
    install_packages(frontend_dir)

    print("\n[2/3] Creating eslint.config.mjs...")
    create_eslint_config(frontend_dir, css_path)

    print("\n[3/3] Adding npm scripts...")
    add_npm_scripts(frontend_dir)

    print("\n--- Setup complete ---")
    print("Run the linter with:")
    print(f"  cd {frontend_dir}")
    print("  npx eslint src/ --ext .tsx,.ts")
    print("")
    print("Or use the npm script:")
    print("  npm run lint:tailwind")
    print("")
    print("To auto-fix:")
    print("  npm run lint:tailwind:fix")


if __name__ == "__main__":
    main()
