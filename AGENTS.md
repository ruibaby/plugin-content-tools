# Repository Guidelines

## Project Structure & Module Organization

This repository implements Halo’s Content Tools plugin (`content-tools`), providing content conversion, import/export, cloning, and copying. The Gradle project name remains `plugin-content-tools`.

- `src/main/java/cc/ryanc/contenttools/`: Java plugin entry point.
- `src/main/resources/`: plugin metadata (`plugin.yaml`) and icon.
- `ui/src/index.ts`: console routes and extension points.
- `ui/src/views/`, `components/`: import screens and reusable UI components.
- `ui/src/class/`, `utils/`: content operations, converters, and helpers.
- `images/`: README screenshots. `.github/workflows/`: CI and release workflows.

## Build, Test, and Development Commands

Use Java 21, Node.js 24 (matching CI), and pnpm 10.33.0 (pinned in `ui/package.json`). Run these commands from the repository root:

- `pnpm --dir ui install --frozen-lockfile`: install UI dependencies.
- `./gradlew build`: build the UI and plugin JAR and run configured checks; JARs appear in `build/libs/`.
- `./gradlew test`: run Java tests through JUnit Platform.
- `pnpm --dir ui dev`: rebuild UI assets on changes; this is a watch build, not a standalone console server.
- `pnpm --dir ui type-check`: check Vue and TypeScript types.
- `pnpm --dir ui lint`: run ESLint with automatic fixes.
- `pnpm --dir ui prettier`: format UI sources and organize imports.

Install the built JAR into a local Halo instance (2.26.0 or newer) for integration verification.

## Coding Style & Naming Conventions

Follow `.editorconfig`: UTF-8, LF, four-space Java indentation, and two-space frontend indentation. UI Prettier uses single quotes, semicolons, and a 100-character line width. Use TypeScript with Vue Composition API and `<script setup>`. Name Vue components in PascalCase and follow existing camelCase utility filenames. Keep changes focused on the requested behavior.

## Testing Guidelines

Java testing dependencies include Spring Boot Test and JUnit Platform; place new tests under `src/test/java`, using `*Test` names. No test sources or coverage threshold currently exist. The UI `test:unit` script only prints a placeholder message. Run type checking and manually verify affected import, export, conversion, or cloning flows, including content and image preservation.

## Commit & Pull Request Guidelines

Recent commits use concise imperative English subjects, such as `Add article import feature to tools menu`; Conventional Commit prefixes are not required. PRs should explain the behavior change, link relevant issues, record validation and limitations, and include screenshots for visible UI changes.

## Generated Files

Do not hand-edit lockfiles, generated API clients/docs, or build outputs. Regenerate them with the appropriate tools only when required by the change.
