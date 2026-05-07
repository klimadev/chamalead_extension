## ADDED Requirements

### Requirement: Active site context resolution
The extension SHALL resolve the active browser tab into a site context before presenting site-specific popup features.

#### Scenario: WhatsApp Web tab is active
- **WHEN** the active tab URL matches WhatsApp Web
- **THEN** the resolved site context identifies WhatsApp as a supported site

#### Scenario: Unsupported tab is active
- **WHEN** the active tab URL does not match any supported site definition
- **THEN** the resolved site context identifies the tab as unsupported

#### Scenario: Active tab URL is unavailable
- **WHEN** the active tab has no readable URL
- **THEN** the resolved site context identifies the tab as unsupported or unavailable without enabling site-specific features

### Requirement: Site-specific feature availability
The extension SHALL show site-specific popup features only when those features are compatible with the resolved site context.

#### Scenario: WhatsApp is supported
- **WHEN** the resolved site context is WhatsApp
- **THEN** the popup makes the existing WhatsApp bulk-send feature available

#### Scenario: Site is unsupported
- **WHEN** the resolved site context is unsupported
- **THEN** the popup does not show WhatsApp-specific operational features

### Requirement: Global popup features remain available
The extension SHALL keep global popup features independent from the active site's support status.

#### Scenario: Unsupported site with global features
- **WHEN** the active site is unsupported
- **THEN** the popup still provides access to global extension information such as updates and about content

### Requirement: Unsupported-site feedback
The extension SHALL present a clear unsupported-site state when the active tab is not a supported site.

#### Scenario: User opens popup on an unsupported site
- **WHEN** the user opens the popup on a site that is not supported
- **THEN** the popup explains that the current site has no available ChamaLead features

### Requirement: WhatsApp integration scope preservation
The extension SHALL preserve the existing WhatsApp runtime integration scope while introducing site-aware popup behavior.

#### Scenario: Existing WhatsApp behavior
- **WHEN** the user opens WhatsApp Web and the session is ready
- **THEN** the existing WhatsApp status and bulk-send behavior remain available through the WhatsApp site context

#### Scenario: Non-WhatsApp page
- **WHEN** the user opens a non-WhatsApp page
- **THEN** the extension does not require WhatsApp WA-JS behavior to be available for that page
