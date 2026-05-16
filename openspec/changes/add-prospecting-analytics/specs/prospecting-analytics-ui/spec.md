## ADDED Requirements

### Requirement: Dashboard displays summary cards

The AnalyticsDashboard component SHALL display three summary cards showing today, this week, and all-time send statistics.

#### Scenario: Data exists for all periods

- **WHEN** the dashboard loads and analytics data is available
- **THEN** three cards SHALL be displayed: "Hoje" (today's sent/failed), "Semana" (7-day sent/failed), "Total" (all-time sent/failed), each with a success percentage

#### Scenario: No data exists

- **WHEN** the dashboard loads and no send records exist
- **THEN** all three cards SHALL show zero counts

### Requirement: Dashboard displays hourly breakdown

The AnalyticsDashboard component SHALL display a chart of sends per hour for the current day.

#### Scenario: Current day has send activity

- **WHEN** the dashboard loads and there are sends today
- **THEN** a horizontal bar chart SHALL show sends per hour, with hour labels on the left and bar width proportional to send count

#### Scenario: Current day has no send activity

- **WHEN** the dashboard loads and today has no sends
- **THEN** the hourly chart SHALL display a message indicating no activity today

### Requirement: Dashboard lists recent campaigns

The AnalyticsDashboard component SHALL display a list of the most recent campaigns with summary information.

#### Scenario: Recent campaigns exist

- **WHEN** the dashboard loads and there are past campaigns
- **THEN** the last 10 campaigns SHALL be displayed, each showing: start time, total sends, success count, failure count, profile used, and humanization profile

#### Scenario: Expand campaign details

- **WHEN** the user clicks on a campaign in the list
- **THEN** the campaign SHALL expand to show the list of individual sends within that campaign (target, status, timestamp)

#### Scenario: No campaigns exist

- **WHEN** the dashboard loads and no campaigns exist
- **THEN** a message SHALL indicate that no campaigns have been run yet

### Requirement: Dashboard auto-refreshes

The AnalyticsDashboard component SHALL poll for updated analytics data while a campaign is active.

#### Scenario: Campaign is sending

- **WHEN** an active campaign is sending messages
- **THEN** the dashboard SHALL refresh analytics data every 5 seconds

#### Scenario: No active campaign

- **WHEN** no campaign is active
- **THEN** the dashboard SHALL refresh analytics data once on mount and not poll

### Requirement: Clear history button with confirmation

The AnalyticsDashboard component SHALL provide a button to clear all send history, with a confirmation step.

#### Scenario: User clears history

- **WHEN** the user clicks "Limpar histórico" and confirms the action
- **THEN** all send records SHALL be deleted and the dashboard SHALL reset to show zero counts

#### Scenario: User cancels clear

- **WHEN** the user clicks "Limpar histórico" but cancels the confirmation
- **THEN** no records SHALL be deleted

### Requirement: Dashboard integrates into popup navigation

The AnalyticsDashboard SHALL be accessible from the main popup page via a navigation element.

#### Scenario: User navigates to analytics

- **WHEN** the user clicks the "Histórico" navigation item in the popup
- **THEN** the AnalyticsDashboard component SHALL be rendered as the active view
