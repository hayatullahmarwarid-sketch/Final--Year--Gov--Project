---
name: Upload form English fields removed
description: English title/content/category fields removed from decree upload and edit forms
---

## Rule
- `UploadDecreeFormModal`: no `titleEn`, `contentEn`, `newCatEn` state. The Pashto name is required for new categories. `titleEn: ''` is sent to the backend (backend field is optional).
- `EditDecreeModal`: `titleEn` state kept (loaded from existing decree, not shown in UI) so existing English titles are preserved on save. English content field hidden.

**Why:** Teacher requested removal of English input fields. Backend still accepts `titleEn` as optional, so no API changes were needed.

**How to apply:** Any new decree-related form should only collect Pashto (`ps`) and Dari (`fa`) content. `titleSummary = psT || faT` (Pashto-first). Category slug is generated via `slugifyCategoryName(pashtoName)` which falls back to a timestamp slug for non-ASCII.
