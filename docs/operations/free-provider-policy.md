# Free-provider spending policy

Claude/Anthropic is the only provider permitted to incur usage charges. Every other integration is deny-by-default.

Before enabling a non-Claude integration, an administrator must verify the provider account is on its free/trial tier, disable provider-side overages, and set the matching runtime variables in the deployment environment:

```text
FREE_DEEPGRAM_TIER=trial       # or free
FREE_DEEPGRAM_HARD_CAP_CONFIRMED=true
FREE_DEEPGRAM_VERIFIED_UNTIL=YYYY-MM-DD
FREE_DEEPGRAM_MONTHLY_LIMIT=100
```

Use the equivalent `FREE_ELEVENLABS_*`, `FREE_RESEND_*`, `FREE_POSTHOG_*` and `FREE_SENTRY_*` variables for the other allowlisted services. The application clamps limits to conservative ceilings, reserves usage before every outbound call in the database, and fails closed when a daily/monthly allowance is exhausted or verification expires. There is no automatic paid fallback.

Deepgram is treated as a finite trial allowance, ElevenLabs Free is development/testing only, and wearables/payment providers remain disabled until a separate free-capable arrangement is approved. The admin Integrations page displays the declared tier, reserved units, remaining allowance and blocked state.
