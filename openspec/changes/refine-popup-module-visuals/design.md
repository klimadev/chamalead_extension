## Context

The popup currently has one visually refined module: `UpdatesTab`, which uses explicit states, action grouping, semantic cards, and responsive CSS. The other surfaces are more basic: `BulkSendForm` is a linear form with CSV, message/audio, actions, progress, and logs in one continuous stack; the WhatsApp status header uses simple rows and badges; About is a plain identity/feature list; Options/Settings is functional but visually detached from the popup.

The product context is operational: users open ChamaLead to prepare and run WhatsApp campaigns safely. The interface should feel like a compact campaign cockpit, not a generic settings form. The change should refine presentation while preserving existing behavior and avoiding new dependencies.

## Goals / Non-Goals

**Goals:**

- Make the popup feel cohesive across bulk send, status, updates, and about modules.
- Reframe bulk sending as an operational campaign flow: source, content, safety, execution, and feedback.
- Make WhatsApp readiness immediately legible before users reach the send form.
- Improve About and Options so they share the same visual language and product confidence.
- Keep the design compact enough for the existing extension popup width and usable on narrow screens.
- Prefer reusable CSS patterns and minimal component changes over introducing a new component library.

**Non-Goals:**

- Change WA-JS integration, message sending behavior, CSV parsing, audio sending, update checking, or settings persistence.
- Add a routing system, design dependency, animation dependency, or test framework.
- Redesign the extension as a full dashboard outside the popup/options surfaces.
- Implement automatic extension updating or modify permissions as part of visual refinement.

## Decisions

### Use a compact campaign cockpit structure for bulk send

The bulk send module should be organized into distinct visual regions: campaign type, contact source, content, safety context, actions, execution progress, and logs. These can remain in one component initially, but the markup should make each region visually scannable.

Rationale: users need confidence before sending messages at scale. Grouping by campaign readiness makes the existing fields easier to reason about without changing the send workflow.

Alternative considered: keep a plain form and only polish individual controls. This is lower effort but does not address the current lack of hierarchy.

### Treat WhatsApp status as an operational readiness panel

The header should summarize whether the extension is ready to send, authenticated, or blocked. The current individual badges can evolve into a compact status card with a primary readiness label and supporting indicators.

Rationale: readiness is the gate for the main action. It deserves stronger hierarchy than a basic definition list.

Alternative considered: show status only inside the bulk send tab. That would hide a global prerequisite and make other tabs less informative.

### Keep one visual system shared by popup and options

Options should use the same card, section, label, control, and state language as the popup. Any reusable styling should live in `global.css` or existing UI components rather than inline styles when practical.

Rationale: the extension has two UI surfaces, but users should perceive one product. Existing `Card` and `Button` components can be improved or supplemented without introducing heavy abstraction.

Alternative considered: refine only the popup. This leaves settings feeling like a separate prototype.

### Use domain-motivated visual cues, not generic dashboard chrome

The visual language should lean into ChamaLead's domain: WhatsApp readiness, campaign rhythm, contact validation, safety, and execution logs. Green/teal should signal live readiness and successful progress; amber should signal attention; red should remain reserved for failures.

Rationale: domain cues make the UI feel specific to WhatsApp campaign operation. Generic SaaS card grids would be less memorable and less helpful.

Alternative considered: use a neutral enterprise dashboard style. It is safe but would not create the stronger product identity requested.

### Preserve compactness and accessibility

The popup remains around the existing width. Layout changes should support stacking on narrow widths, clear focus states, semantic status/alert regions, readable text sizes, and usable controls.

Rationale: browser extension popups are constrained and transient. Refinement must improve scanning speed, not increase cognitive load.

Alternative considered: add richer multi-column layouts. This risks overflow and poorer usability inside the popup.

## Risks / Trade-offs

- Visual richness increases CSS size and selector complexity -> Keep naming scoped by module/pattern and consolidate repeated primitives.
- Reorganizing `BulkSendForm` markup could accidentally alter behavior -> Preserve existing handlers/state and validate with lint/build after implementation.
- More status language could become misleading if it implies automatic safety guarantees -> Use copy that describes current behavior, such as humanized interval and readiness, without overpromising deliverability.
- Inline styles in existing UI components may limit consistency -> Update carefully only when needed and avoid broad rewrites unrelated to the visual change.
- Popup vertical height may grow -> Prefer dense but legible sections, collapsible/log-limited regions, and responsive stacking.

## Migration Plan

1. Introduce shared visual patterns and tokens/classes in `global.css` without removing existing update styles prematurely.
2. Refine the WhatsApp readiness/header area and verify blocked/ready states remain accurate.
3. Reorganize `BulkSendForm` presentation while preserving state, handlers, CSV parsing, audio handling, and send actions.
4. Refresh About and Options/Settings with the same visual language.
5. Align or deduplicate overlapping update styles only if safe and clearly beneficial.
6. Increment version, update changelog if user-visible notes are maintained, then run lint and build.

Rollback is straightforward because no data model or integration migration is expected: revert the UI/CSS changes and keep the existing behavior unchanged.

## Open Questions

- Should logs remain visible by default, or become visually secondary/collapsible after the first successful send?
- Should the About tab explicitly link users toward the Updates tab, or remain informational only?
- Should Options become a richer settings dashboard now, or only receive visual alignment until more settings exist?
