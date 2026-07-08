# Build instructions

Read the **@project_structure.md** for project where to put files; also update **@project_structure.md** every sunday or if it pass sunday update it! also update it date.

when build feaature read the **@features.md**

when build ui element think like a pro **interaction-animation-requirements.md.**

# Here are extra rules:

Always add jsdocs after you done developing make it easy to understand for other developers.

This app is bilingual: **English (`en`)** and **Myanmar/Burmese (`my`)**. Whenever you develop UI that shows user-facing text, you MUST add it in both languages — never hardcode a raw string in JSX. Add every new string to **both** the `en` and `my` dictionaries in `src/constants/i18n.ts` (the `my` value type forces parity — a missing Burmese key is a compile error), then render it through `t("key")` from `@/hooks/useTranslation`. Use `t("key", { name })` for `{name}` placeholders. Language names in pickers stay in their own native script (not translated). Technical/domain identifiers (node-type names, code) may stay English.

If the developed feature code has related connection to other folders or files please update them too.

Please do note that make sure the organization Id is not expose to the user or app or in network tab.
