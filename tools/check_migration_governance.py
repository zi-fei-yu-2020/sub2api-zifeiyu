#!/usr/bin/env python3
"""Enforce deterministic SQL migration naming without rewriting published history."""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

MIGRATION_PATTERN = re.compile(
    r"^(?P<prefix>[0-9]{3})(?P<suffix>[a-z]?)_"
    r"(?P<description>[a-z0-9]+(?:_[a-z0-9]+)*)\.sql$",
    re.ASCII,
)
PREFIX_PATTERN = re.compile(r"^[0-9]{3}$", re.ASCII)
BASELINE_VERSION = 1


@dataclass(frozen=True)
class MigrationName:
    filename: str
    prefix: str
    suffix: str

    @property
    def ordering_key(self) -> tuple[int, int, str, str]:
        # Unsuffixed migrations sort before historical letter-suffixed migrations.
        suffix_rank = 0 if not self.suffix else ord(self.suffix) - ord("a") + 1
        return int(self.prefix), suffix_rank, self.filename, self.filename.casefold()


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Validate SQL migration filenames and freeze known historical numeric-prefix "
            "collisions without renaming published migrations."
        )
    )
    parser.add_argument(
        "--migrations-dir",
        type=Path,
        default=Path("backend/migrations"),
        help="Directory containing SQL migrations (default: backend/migrations)",
    )
    parser.add_argument(
        "--baseline",
        type=Path,
        default=Path("backend/migrations/migration_prefix_collisions.baseline.json"),
        help="JSON baseline of accepted historical duplicate prefixes",
    )
    return parser.parse_args(argv)


def load_baseline(path: Path) -> tuple[dict[str, tuple[str, ...]], list[str]]:
    errors: list[str] = []
    try:
        raw: Any = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return {}, [f"baseline file does not exist: {path}"]
    except (OSError, json.JSONDecodeError) as exc:
        return {}, [f"cannot read baseline {path}: {exc}"]

    if not isinstance(raw, dict):
        return {}, ["baseline root must be a JSON object"]
    if raw.get("version") != BASELINE_VERSION:
        errors.append(
            f"baseline version must be {BASELINE_VERSION}, got {raw.get('version')!r}"
        )

    raw_groups = raw.get("duplicate_prefixes")
    if not isinstance(raw_groups, dict):
        errors.append("baseline duplicate_prefixes must be a JSON object")
        return {}, errors

    baseline: dict[str, tuple[str, ...]] = {}
    seen_casefolded: dict[str, str] = {}
    for prefix, raw_names in raw_groups.items():
        if not isinstance(prefix, str) or not PREFIX_PATTERN.fullmatch(prefix):
            errors.append(f"invalid baseline prefix {prefix!r}; expected exactly three digits")
            continue
        if not isinstance(raw_names, list) or len(raw_names) < 2:
            errors.append(f"baseline prefix {prefix} must contain at least two filenames")
            continue
        if any(not isinstance(name, str) for name in raw_names):
            errors.append(f"baseline prefix {prefix} contains a non-string filename")
            continue

        names = tuple(raw_names)
        if list(names) != sorted(names):
            errors.append(f"baseline prefix {prefix} filenames must be bytewise sorted")
        if len(set(names)) != len(names):
            errors.append(f"baseline prefix {prefix} contains duplicate filenames")

        for name in names:
            match = MIGRATION_PATTERN.fullmatch(name)
            if match is None:
                errors.append(f"baseline contains invalid migration filename: {name}")
                continue
            if match.group("prefix") != prefix:
                errors.append(
                    f"baseline filename {name} belongs to prefix {match.group('prefix')}, not {prefix}"
                )
            folded = name.casefold()
            previous = seen_casefolded.get(folded)
            if previous is not None and previous != name:
                errors.append(
                    f"baseline filenames collide case-insensitively: {previous} and {name}"
                )
            seen_casefolded[folded] = name

        baseline[prefix] = names

    return baseline, errors


def collect_migrations(directory: Path) -> tuple[list[MigrationName], list[str]]:
    errors: list[str] = []
    if not directory.is_dir():
        return [], [f"migrations directory does not exist: {directory}"]

    try:
        filenames = sorted(
            path.name for path in directory.iterdir() if path.is_file() and path.suffix == ".sql"
        )
    except OSError as exc:
        return [], [f"cannot read migrations directory {directory}: {exc}"]

    if not filenames:
        return [], [f"no SQL migration files found in {directory}"]

    if len(filenames) != len(set(filenames)):
        errors.append("migration filenames are not unique")

    folded_names: dict[str, str] = {}
    migrations: list[MigrationName] = []
    for filename in filenames:
        folded = filename.casefold()
        previous = folded_names.get(folded)
        if previous is not None and previous != filename:
            errors.append(
                f"migration filenames collide case-insensitively: {previous} and {filename}"
            )
        folded_names[folded] = filename

        match = MIGRATION_PATTERN.fullmatch(filename)
        if match is None:
            errors.append(
                f"invalid migration filename {filename!r}; expected "
                "NNN_description.sql or historical NNNx_description.sql using lowercase snake_case"
            )
            continue
        if match.group("prefix") == "000":
            errors.append(f"migration filename {filename!r} uses reserved prefix 000")
        migrations.append(
            MigrationName(
                filename=filename,
                prefix=match.group("prefix"),
                suffix=match.group("suffix"),
            )
        )

    return migrations, errors


def validate_governance(
    migrations: Iterable[MigrationName], baseline: dict[str, tuple[str, ...]]
) -> list[str]:
    errors: list[str] = []
    migration_list = list(migrations)

    lexical_order = [migration.filename for migration in sorted(migration_list, key=lambda item: item.filename)]
    semantic_order = [migration.filename for migration in sorted(migration_list, key=lambda item: item.ordering_key)]
    if lexical_order != semantic_order:
        errors.append(
            "migration filename ordering is not deterministic between bytewise and semantic order; "
            "keep three-digit prefixes and lowercase suffixes"
        )

    historical_filenames = {
        filename for filenames in baseline.values() for filename in filenames
    }
    for migration in migration_list:
        if migration.suffix and migration.filename not in historical_filenames:
            errors.append(
                f"letter-suffixed migration filename {migration.filename} is not a historical "
                "baseline member; new migrations must use NNN_description.sql with an unused prefix"
            )

    groups: dict[str, list[str]] = defaultdict(list)
    for migration in migration_list:
        groups[migration.prefix].append(migration.filename)
    actual_duplicates = {
        prefix: tuple(sorted(names)) for prefix, names in groups.items() if len(names) > 1
    }

    for prefix in sorted(set(actual_duplicates) | set(baseline)):
        actual = actual_duplicates.get(prefix)
        expected = baseline.get(prefix)
        if expected is None:
            errors.append(
                f"new duplicate migration prefix {prefix}: {', '.join(actual or ())}; "
                "allocate a new unused numeric prefix instead"
            )
            continue
        if actual is None:
            errors.append(
                f"historical duplicate-prefix baseline {prefix} is no longer present; "
                f"published migrations must not be renamed or deleted (expected: {', '.join(expected)})"
            )
            continue
        if actual != expected:
            added = sorted(set(actual) - set(expected))
            removed = sorted(set(expected) - set(actual))
            details: list[str] = []
            if added:
                details.append("added=" + ", ".join(added))
            if removed:
                details.append("removed=" + ", ".join(removed))
            errors.append(
                f"historical duplicate-prefix baseline {prefix} changed ({'; '.join(details)}); "
                "do not add to, rename, or delete published collision members"
            )

    return errors


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    baseline, baseline_errors = load_baseline(args.baseline)
    migrations, migration_errors = collect_migrations(args.migrations_dir)
    governance_errors = validate_governance(migrations, baseline) if migrations else []
    errors = baseline_errors + migration_errors + governance_errors

    if errors:
        print("Migration governance check failed:", file=sys.stderr)
        for error in errors:
            print(f"  - {error}", file=sys.stderr)
        return 1

    duplicate_files = sum(len(names) for names in baseline.values())
    print(
        "Migration governance check passed: "
        f"{len(migrations)} SQL files, {len(baseline)} historical duplicate-prefix groups "
        f"covering {duplicate_files} published files, no new collisions."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
