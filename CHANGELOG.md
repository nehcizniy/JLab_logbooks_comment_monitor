# Changelog

## Unreleased

- Moved DTM event status, the live DTM link, and recurring-reminder control into a dedicated DTM tab.
- Made the DTM tab available in both Simple and Advanced interface modes.
- Added New entry and Logbooks shortcuts beneath the popup's Check now and Clear alerts controls.

## 2.23.0

- Added an optional daily GitHub Release check and a native notification when a newer stable version is available.
- Added a Track new versions switch; turning it off stops automatic checks and clears active update notices while preserving manual checks.
- Added a foldable Extension updates section with manual checking, direct ZIP download, and previous-version links.
- Added a built-in update and rollback guide that preserves the fixed extension ID and recommends a settings backup.
- Kept update notifications separate from JLab alert levels, quiet hours, email delivery, and Recent alarms.
- Added regression coverage for version comparison and release-asset selection.
- Replaced GitHub's raw HTTP 404 response with a clear message when no release has been published yet.

## 2.22.0

- Added a three-step first-run setup guide that can be reopened from Help.
- Added a compact Simple-mode “Everything is working” health summary.
- Added a safe recommended-defaults reset that preserves personal configuration and history.
- Replaced common technical failures with plain-language explanations and suggested actions.
- Clarified throughout the popup and README that email notifications are optional.
- Added a three-step Quick Start at the top of the README.

## 2.21.0

- Added one-click Simple and Advanced interface modes backed by the same monitoring engine.
- Made Simple mode the default and gathered the most-used controls into a single focused page.
- Preserved every setting and alarm when switching modes or exporting a settings backup.
- Added a Simple-mode notice when hidden advanced settings remain active.
- Kept current Shift Crew, Hall A–D schedule URL entry, and shift-summary links available in Simple mode; per-hall schedule-change alerts remain Advanced.

## 2.20.0

- Added Essential, Standard, and Everything alert levels, with detailed controls folded under Advanced.
- Added a single Test my setup check for system notifications, JLab, DTM, Shift Crew, and connected email.
- Added Urgent, Important, and Info labels and made DTM recurring reminders opt-in by default.
- Combined multiple comments found on the same entry into one notification.
- Added consecutive-failure counts to monitoring health.
- Added a monitoring-health dashboard with privacy-safe copied diagnostics.
- Added a deeper daily comment recovery scan with overlap protection.
- Added per-alert system/email delivery controls, quiet hours, and notification snooze.
- Added current and next Shift Crew assignments, stale-schedule warnings, and optional assignment-change alerts.
- Reorganized the popup into Monitoring, Shifts, Alerts, and Settings views.
- Split shared notification policy, health, and JLab page parsing into dedicated modules.
- Added regression fixtures and automated GitHub checks.
- Added versioned release ZIP and SHA-256 checksum automation.
