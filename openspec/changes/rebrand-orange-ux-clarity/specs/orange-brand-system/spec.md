## ADDED Requirements

### Requirement: Orange color tokens replace teal across all UI
The extension SHALL use orange (#f97316) as the primary brand color, replacing all teal (#0f766e) hardcodes and references. CSS variables SHALL be the single source of truth for all brand colors.

#### Scenario: User opens any popup tab
- **WHEN** the user opens the popup in any context (WhatsApp, Instagram, other)
- **THEN** primary actions (buttons, links, focus rings) render in orange (#f97316), accent backgrounds render in orange-50 (#fff7ed), and accent borders render in orange-200 (#fed7aa)

#### Scenario: User hovers over a primary button
- **WHEN** the user hovers over a `.button` or `.button--soft` element
- **THEN** the hover state uses orange-600 (#ea580c) for solid buttons and a slightly stronger orange tint for soft buttons

#### Scenario: Progress bar is visible
- **WHEN** a campaign is in progress
- **THEN** the progress bar renders an orange gradient (#f97316 → #fb923c) instead of the previous teal-to-green gradient

#### Scenario: Logo or brand accent is displayed
- **WHEN** the About tab or any brand identity element renders
- **THEN** the logo background and any brand decorative gradients use orange (#f97316 → #fb923c)

### Requirement: Status colors remain semantically distinct from brand
The extension SHALL preserve the existing semantic color system for operational states: green for success, amber for warning, red for danger, neutral gray for inactive. These SHALL NOT be replaced by orange.

#### Scenario: WhatsApp is ready and authenticated
- **WHEN** WPP reports ready + authenticated
- **THEN** status chips use the existing green success colors (--success-bg, --success-fg)

#### Scenario: Campaign has failures
- **WHEN** a campaign has failed messages
- **THEN** error indicators use the existing red danger colors (--danger-bg, --danger-fg)

#### Scenario: User sees a warning state
- **WHEN** a non-critical attention state is displayed
- **THEN** warning indicators use the existing amber colors (--warning-bg, --warning-fg), distinct from brand orange

### Requirement: Orange brand colors render correctly on all UI surfaces
All components SHALL use CSS variables for brand colors. Hardcoded teal values (#0f766e, #ccfbf1, #f0fdfa, #99f6e4) SHALL be replaced with appropriate orange token references.

#### Scenario: Any component renders that previously used teal
- **WHEN** buttons (.button--soft), links (.instagram-profile-link), badges (.instagram-profile-badge--accent, .contact-tag), focus rings (.field-input:focus), and update buttons (.update-btn.download) render
- **THEN** each element uses the corresponding orange CSS variable instead of hardcoded teal

#### Scenario: New CSS variables are added to :root
- **WHEN** the stylesheet loads
- **THEN** :root defines --primary, --primary-hover, --primary-soft, --primary-border, --primary-gradient, and --progress-gradient with orange values
