# Contribution Guidelines for MAS ERP Document Module

These instructions apply to the entire repository.

## General Principles
- Keep all documentation bilingual (English + Arabic) whenever you edit or add descriptive text.
- Preserve the separation of concerns between `docfront.cshtml` (UI) and `docapi.cshtml` (file/data services). Any new server-side logic should live in `docapi.cshtml` or a dedicated backend component, not inside the UI page.
- Favor declarative Razor markup and small helper functions over large inline scripts to maintain readability.

## DOCX & XLSX Handling
- Use the Open XML SDK (`DocumentFormat.OpenXml.*`) for low-level manipulation; if you introduce a new library (e.g., EPPlus, ClosedXML), document the reasoning in the README and keep the dependency list updated.
- When parsing documents, capture both structure and formatting metadata so the front-end can reproduce the original layout faithfully.
- Validate every filesystem path against `HttpRuntime.AppDomainAppPath` and reject inputs containing `..` or absolute-drive prefixes.
- Before persisting modifications to files, implement backup/versioning to prevent data loss.

## Front-end Localization
- Any new UI strings must be added to both Arabic and English dictionaries inside `docfront.cshtml` with matching keys.
- When adding scripts or styles, prefer scoped sections and avoid inline `<style>` blocks unless absolutely necessary.

## Documentation Expectations
- Update `README.md` whenever workflow, dependencies, or architectural assumptions change.
- Describe new features with step-by-step usage notes so future developers understand how the front-end and API interact.

