#!/usr/bin/env python3

import argparse
import re
import subprocess
import sys
from pathlib import Path


def run_git(*args: str) -> str:
    result = subprocess.run(
        ["git", *args],
        check=True,
        text=True,
        stdout=subprocess.PIPE,
    )
    return result.stdout.strip()


def read_opam_field(contents: str, field: str) -> str:
    pattern = rf'(?m)^\s*{re.escape(field)}\s*:\s*"([^"]+)"\s*(?:#.*)?$'
    match = re.search(pattern, contents)
    if match is None:
        raise ValueError(f'Missing or malformed `{field}: "..."` field')
    return match.group(1)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Create a package-only release archive from a Git tag."
    )
    parser.add_argument(
        "package_path",
        type=Path,
        help="Path to the package directory, e.g., interop/sepviz-iris",
    )
    args = parser.parse_args()

    repo_root = Path(run_git("rev-parse", "--show-toplevel")).resolve()
    package_path = args.package_path.resolve()
    if not package_path.is_dir():
        parser.error(f"Package directory does not exist: {package_path}")
    try:
        relative_package_path = package_path.relative_to(repo_root)
    except ValueError:
        parser.error(
            f"Package directory must be inside the Git repository: {repo_root}"
        )

    opam_files = list(package_path.glob("*.opam"))
    if not opam_files:
        parser.error(f"No .opam file found directly inside {package_path}")
    if len(opam_files) > 1:
        filenames = ", ".join(path.name for path in opam_files)
        parser.error(f"Multiple .opam files found: {filenames}")

    opam_file = opam_files[0]
    try:
        contents = opam_file.read_text(encoding="utf-8")
        package_name = read_opam_field(contents, "name")
        version = read_opam_field(contents, "version")
    except (OSError, ValueError) as error:
        parser.error(f"Cannot read {opam_file}: {error}")

    expected_opam_filename = f"{package_name}.opam"
    if opam_file.name != expected_opam_filename:
        parser.error(
            f"Package name is {package_name!r}, but the opam file is named {opam_file.name!r}"
        )

    tag = f"v{version}"
    archive_name = f"{package_name}-{version}.tar.gz"
    archive_path = Path.cwd() / archive_name
    archive_root = f"{package_name}-{version}/"

    try:
        run_git("rev-parse", "--verify", f"refs/tags/{tag}")
    except subprocess.CalledProcessError:
        parser.error(f"Git tag does not exist: {tag}")

    subprocess.run(
        [
            "git",
            "archive",
            "--format=tar.gz",
            f"--prefix={archive_root}",
            f"--output={archive_path}",
            f"{tag}:{relative_package_path.as_posix()}",
        ],
        cwd=repo_root,
        check=True,
    )

    print(f"Package: {package_name}")
    print(f"Version: {version}")
    print(f"Created: {archive_path}")


if __name__ == "__main__":
    try:
        main()
    except subprocess.CalledProcessError as error:
        print(f"Git command failed with exit code {error.returncode}", file=sys.stderr)
        sys.exit(error.returncode)
