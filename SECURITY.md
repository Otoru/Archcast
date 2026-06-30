# Security Policy

## Supported versions

Archcast is a simulation tool and runs entirely in your browser — there is no
backend, database, or network service. Security-relevant issues are therefore
limited to the project's own code running on a user's machine.

| Version | Supported |
|---------|-----------|
| `main` (latest) | ✅ |
| older releases | ❌ |

## Reporting a vulnerability

If you find a security vulnerability, **please do not open a public GitHub issue**.

Instead, report it privately by emailing **vitor.hov@gmail.com** with:

- a description of the issue and its impact,
- the steps to reproduce it (a minimal example helps), and
- any suggested fix or mitigation, if you have one.

You should receive an acknowledgement within **48 hours**. If you don't hear back
in that window, follow up on the same thread.

Please do not publicly disclose the issue until a fix is available.

## Scope

This policy covers the code in this repository. It does **not** cover:

- vulnerabilities in third-party dependencies (report those upstream),
- issues in deployed instances forked or self-hosted with custom modifications,
- purely cosmetic or "best practice" findings with no realistic attack path.

Thank you for helping keep Archcast and its users safe.