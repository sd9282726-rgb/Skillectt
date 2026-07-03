---
name: Porting Expo/RN app to React+Vite
description: Approach for converting a fully-specified Expo/React Native app into a React+Vite web artifact.
---

When the source RN app is fully specified (exact color hex values, exact data model/interfaces, exact screen list and behavior), treat the conversion as a faithful 1:1 port rather than new creative design work. It's reasonable to skip the design-subagent workflow and implement directly, since there is no ambiguity to explore — the spec already exists in the old codebase.

**Why:** The `react-vite` skill defaults to "always delegate to design subagent," but that mandate targets new/ambiguous UI work. A byte-for-byte port of already-decided colors/layout/data model is a mechanical translation task, and direct implementation preserves fidelity faster than round-tripping through a design subagent.

**How to apply:** Confirm the source app's theme tokens, data interfaces, and screen inventory are fully known before deciding to skip delegation. If any of those are open-ended (new feature, new visual direction), delegate to design as normal.

Practical porting notes:
- Client-side data (AsyncStorage in RN) maps directly to `localStorage`-backed React context on web — no backend/OpenAPI work needed unless the RN app already talked to a server.
- Clerk auth wiring (if the project uses Replit-managed Clerk) is copied verbatim from the `clerk-auth` skill's canonical `App.tsx` pattern; no changes needed to `api-server` since Express Clerk middleware is shared across artifacts.
- Old artifact.toml workflow names (e.g. ": expo") go stale after switching an artifact from `kind=mobile` to `kind=web` — the workflow gets renamed (often to ": web"); check `.replit-artifact/artifact.toml` for the current `[[services]]` name if `restart_workflow` fails with RUN_COMMAND_NOT_FOUND.
