#!/usr/bin/env python3
"""Validate pnpm production and full audit reports against short-lived exceptions."""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any, Iterable

HIGH_SEVERITIES = {"high", "critical"}
ALLOWED_SCOPES = {"production", "development", "all"}
REQUIRED_FIELDS = {
    "package",
    "advisory",
    "severity",
    "scope",
    "reason",
    "expires_on",
}
SEVERITY_RANK = {"low": 1, "moderate": 2, "high": 3, "critical": 4}
ADVISORY_ID_PATTERN = re.compile(
    r"\b(GHSA-[0-9A-Za-z-]+|CVE-\d{4}-\d+)\b", re.IGNORECASE
)


@dataclass(frozen=True)
class AuditIssue:
    package: str
    advisory: str
    severity: str
    title: str

    @property
    def key(self) -> tuple[str, str]:
        return normalize_package(self.package), normalize_advisory(self.advisory)


@dataclass(frozen=True)
class AuditException:
    package: str
    advisory: str
    severity: str
    scope: str
    reason: str
    expires_on: date

    @property
    def key(self) -> tuple[str, str]:
        return normalize_package(self.package), normalize_advisory(self.advisory)


def split_kv(line: str) -> tuple[str, str]:
    if ":" not in line:
        raise ValueError(f"Expected 'key: value', got: {line}")
    key, value = line.split(":", 1)
    value = value.strip()
    if (value.startswith('"') and value.endswith('"')) or (
        value.startswith("'") and value.endswith("'")
    ):
        value = value[1:-1]
    return key.strip(), value


def parse_exception_document(path: Path) -> tuple[int, list[dict[str, str]]]:
    """Parse the deliberately small YAML schema without adding a CI dependency."""
    version: int | None = None
    exceptions: list[dict[str, str]] = []
    current: dict[str, str] | None = None
    in_exceptions = False

    with path.open("r", encoding="utf-8-sig") as handle:
        for line_number, raw in enumerate(handle, start=1):
            line = raw.strip()
            if not line or line.startswith("#"):
                continue
            try:
                if line.startswith("version:"):
                    _, raw_version = split_kv(line)
                    version = int(raw_version)
                    continue
                if line.startswith("exceptions:"):
                    _, value = split_kv(line)
                    if value not in {"", "[]"}:
                        raise ValueError("exceptions must be a YAML list or []")
                    in_exceptions = True
                    continue
                if not in_exceptions:
                    raise ValueError("entries must be under exceptions:")
                if line.startswith("- "):
                    if current is not None:
                        exceptions.append(current)
                    current = {}
                    remainder = line[2:].strip()
                    if remainder:
                        key, value = split_kv(remainder)
                        current[key] = value
                    continue
                if current is None:
                    raise ValueError("exception field found before a list item")
                key, value = split_kv(line)
                current[key] = value
            except (TypeError, ValueError) as exc:
                raise ValueError(f"{path}:{line_number}: {exc}") from exc

    if current is not None:
        exceptions.append(current)
    if version is None:
        raise ValueError(f"{path}: missing version")
    return version, exceptions


def normalize_severity(value: Any) -> str:
    return str(value or "").strip().lower()


def normalize_package(value: Any) -> str:
    return str(value or "").strip().lower()


def normalize_advisory(value: Any) -> str:
    normalized = str(value or "").strip()
    match = ADVISORY_ID_PATTERN.search(normalized)
    if match:
        return match.group(1).lower()
    return normalized.lower()


def parse_date(value: Any) -> date | None:
    try:
        return date.fromisoformat(str(value))
    except (TypeError, ValueError):
        return None


def pick_advisory_id(advisory: dict[str, Any]) -> str:
    cves = advisory.get("cves") or []
    return str(
        advisory.get("github_advisory_id")
        or advisory.get("url")
        or (cves[0] if cves else "")
        or advisory.get("id")
        or advisory.get("source")
        or ""
    )


def iter_report_issues(data: dict[str, Any]) -> Iterable[AuditIssue]:
    advisories = data.get("advisories")
    if isinstance(advisories, dict) and advisories:
        for advisory in advisories.values():
            if not isinstance(advisory, dict):
                continue
            yield AuditIssue(
                package=str(advisory.get("module_name") or advisory.get("name") or ""),
                advisory=pick_advisory_id(advisory),
                severity=normalize_severity(advisory.get("severity")),
                title=str(
                    advisory.get("title")
                    or advisory.get("overview")
                    or advisory.get("url")
                    or ""
                ),
            )
        return

    vulnerabilities = data.get("vulnerabilities")
    if not isinstance(vulnerabilities, dict):
        return
    for package, vulnerability in vulnerabilities.items():
        if not isinstance(vulnerability, dict):
            continue
        via = vulnerability.get("via") or []
        if not isinstance(via, list):
            via = [via]
        for advisory in via:
            if not isinstance(advisory, dict):
                continue
            yield AuditIssue(
                package=str(advisory.get("name") or package),
                advisory=pick_advisory_id(advisory),
                severity=normalize_severity(
                    advisory.get("severity") or vulnerability.get("severity")
                ),
                title=str(
                    advisory.get("title")
                    or advisory.get("url")
                    or advisory.get("source")
                    or ""
                ),
            )


def load_audit_report(path: Path, label: str) -> dict[tuple[str, str], AuditIssue]:
    try:
        with path.open("r", encoding="utf-8-sig") as handle:
            data = json.load(handle)
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise ValueError(f"Unable to read {label} audit report {path}: {exc}") from exc

    if not isinstance(data, dict):
        raise ValueError(f"{label} audit report must contain a JSON object")
    if data.get("error"):
        error = data["error"]
        if isinstance(error, dict):
            error = error.get("message") or error.get("code") or json.dumps(error)
        raise ValueError(f"{label} audit command failed: {error}")

    issues: dict[tuple[str, str], AuditIssue] = {}
    for issue in iter_report_issues(data):
        if issue.severity not in HIGH_SEVERITIES:
            continue
        if not normalize_package(issue.package):
            raise ValueError(f"{label} audit contains an issue without a package name")
        if not normalize_advisory(issue.advisory):
            raise ValueError(
                f"{label} audit contains a {issue.severity} issue without an advisory ID: "
                f"{issue.package}"
            )
        existing = issues.get(issue.key)
        if existing is None or SEVERITY_RANK[issue.severity] > SEVERITY_RANK[existing.severity]:
            issues[issue.key] = issue

    vulnerability_counts = ((data.get("metadata") or {}).get("vulnerabilities") or {})
    reported_high = int(vulnerability_counts.get("high") or 0)
    reported_critical = int(vulnerability_counts.get("critical") or 0)
    if reported_high + reported_critical > 0 and not issues:
        raise ValueError(
            f"{label} audit reports {reported_high} high and {reported_critical} critical "
            "vulnerabilities but exposes no advisory IDs"
        )
    return issues


def load_exceptions(path: Path) -> list[AuditException]:
    version, raw_exceptions = parse_exception_document(path)
    if version != 1:
        raise ValueError(f"Unsupported audit exception schema version: {version}")

    parsed: list[AuditException] = []
    seen: set[tuple[str, str]] = set()
    errors: list[str] = []
    for index, raw in enumerate(raw_exceptions, start=1):
        missing = sorted(field for field in REQUIRED_FIELDS if not raw.get(field))
        if missing:
            errors.append(f"Exception #{index} is missing required fields: {', '.join(missing)}")
            continue

        severity = normalize_severity(raw["severity"])
        scope = str(raw["scope"]).strip().lower()
        expires_on = parse_date(raw["expires_on"])
        item = AuditException(
            package=str(raw["package"]).strip(),
            advisory=str(raw["advisory"]).strip(),
            severity=severity,
            scope=scope,
            reason=str(raw["reason"]).strip(),
            expires_on=expires_on or date.min,
        )
        if severity not in HIGH_SEVERITIES:
            errors.append(
                f"Exception #{index} has invalid severity {raw['severity']!r}; "
                "only high or critical can be excepted"
            )
        if scope not in ALLOWED_SCOPES:
            errors.append(
                f"Exception #{index} has invalid scope {raw['scope']!r}; expected "
                "production, development, or all"
            )
        if expires_on is None:
            errors.append(
                f"Exception #{index} has invalid expires_on date {raw['expires_on']!r}; "
                "expected YYYY-MM-DD"
            )
        if not normalize_package(item.package) or not normalize_advisory(item.advisory):
            errors.append(f"Exception #{index} has an empty package or advisory")
        if item.key in seen:
            errors.append(
                f"Duplicate exception for {item.package} advisory {item.advisory}"
            )
        seen.add(item.key)
        parsed.append(item)

    if errors:
        raise ValueError("\n".join(errors))
    return parsed


def exception_applies(exception_scope: str, issue_scope: str) -> bool:
    return exception_scope == "all" or exception_scope == issue_scope


def format_issue(issue: AuditIssue, scope: str) -> str:
    title = f": {issue.title}" if issue.title else ""
    return (
        f"- {issue.package} ({issue.severity}, {scope}) "
        f"[{issue.advisory}]{title}"
    )


def validate(
    production: dict[tuple[str, str], AuditIssue],
    full: dict[tuple[str, str], AuditIssue],
    exceptions: list[AuditException],
) -> list[str]:
    errors: list[str] = []
    missing_from_full = sorted(set(production) - set(full))
    if missing_from_full:
        errors.append("Full audit report is missing issues present in the production report:")
        for key in missing_from_full:
            errors.append(format_issue(production[key], "production"))

    scoped_issues: dict[tuple[str, str], tuple[AuditIssue, str]] = {}
    for key, issue in full.items():
        scoped_issues[key] = (issue, "production" if key in production else "development")
    for key, issue in production.items():
        scoped_issues.setdefault(key, (issue, "production"))

    exception_index = {exception.key: exception for exception in exceptions}
    used_exceptions: set[tuple[str, str]] = set()
    today = date.today()

    for key in sorted(scoped_issues):
        issue, scope = scoped_issues[key]
        exception = exception_index.get(key)
        if exception is None:
            errors.append(format_issue(issue, scope))
            continue
        used_exceptions.add(key)
        if exception.severity != issue.severity:
            errors.append(
                f"Exception severity mismatch for {issue.package} [{issue.advisory}]: "
                f"audit={issue.severity}, exception={exception.severity}"
            )
        if not exception_applies(exception.scope, scope):
            errors.append(
                f"Exception scope mismatch for {issue.package} [{issue.advisory}]: "
                f"issue={scope}, exception={exception.scope}"
            )
        if exception.expires_on < today:
            errors.append(
                f"Exception expired for {issue.package} [{issue.advisory}] on "
                f"{exception.expires_on.isoformat()}"
            )

    unused = sorted(set(exception_index) - used_exceptions)
    for key in unused:
        exception = exception_index[key]
        errors.append(
            f"Unused audit exception must be removed: {exception.package} "
            f"[{exception.advisory}]"
        )
    return errors


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--production-audit", required=True, type=Path)
    parser.add_argument("--full-audit", required=True, type=Path)
    parser.add_argument("--exceptions", required=True, type=Path)
    args = parser.parse_args()

    try:
        production = load_audit_report(args.production_audit, "production")
        full = load_audit_report(args.full_audit, "full dependency")
        exceptions = load_exceptions(args.exceptions)
    except ValueError as exc:
        sys.stderr.write(f"{exc}\n")
        return 1

    errors = validate(production, full, exceptions)
    if errors:
        sys.stderr.write("Unapproved high/critical pnpm audit findings:\n")
        sys.stderr.write("\n".join(errors) + "\n")
        return 1

    development_count = len(set(full) - set(production))
    print(
        "pnpm audit gate passed: "
        f"{len(production)} production and {development_count} development-only "
        f"high/critical advisories; {len(exceptions)} approved exceptions."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
