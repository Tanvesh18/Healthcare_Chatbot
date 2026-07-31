## Summary

CuraLink handles health profile information and precise location data, but it does not provide clear consent controls before that data is shared with external services. Health profile context is included in Groq requests, and location coordinates can be sent to OpenStreetMap Overpass for nearby care suggestions.

This issue introduces a privacy boundary that makes sharing optional, visible, and enforced by the backend.

## Current behavior

- The frontend sends health-related chat and profile context to the backend.
- The backend builds health-profile context for Groq prompts.
- Nearby-care requests can collect browser coordinates and send them to external Overpass endpoints.
- Precise coordinates are currently logged by the backend.
- API callers can send profile and location data without a consent record being checked server-side.

## Proposed changes

### Consent preferences

- Add separate consent preferences for AI personalization and location-based care search.
- Show a clear explanation before each preference is enabled.
- Allow users to revoke either preference at any time.
- Store consent preferences with the user profile.

### Backend enforcement

- Do not include health-profile context in an AI request unless AI personalization consent is enabled.
- Reject or ignore location data when location-search consent is not enabled.
- Treat the backend as the source of truth so direct API callers cannot bypass consent.
- Remove logs containing exact coordinates or health-profile content.

### Privacy settings UI

- Add a privacy settings section to the health profile area.
- Explain what data is shared, which external provider receives it, and why it is needed.
- Show the current consent status clearly.

### Data controls

- Provide a way for a user to export their stored profile and chat data.
- Provide a way for a user to delete their stored profile and chat data.
- Document the behavior and any limits in the README.

### Tests

- Add backend tests proving that profile context is excluded when consent is disabled.
- Add backend tests proving that location data is not used without consent.
- Add frontend tests for enabling, disabling, and revoking consent.
- Add tests confirming that sensitive values are not written to application logs.

## Acceptance criteria

- A user can use chat without sharing optional profile data with the AI provider.
- Location permission is requested only after explicit consent for nearby-care search.
- The backend does not forward health-profile context or location coordinates without the relevant stored consent.
- Revoking consent takes effect on the next request.
- Application logs do not contain exact coordinates or health-profile values.
- Users can export and delete their stored data.
- The README explains the data-sharing flow and privacy controls.