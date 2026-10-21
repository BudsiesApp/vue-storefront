# Design

## Context

`useEstimatedShipment` supplies both cart deadline displays. Magento #37128 changes its input to a nullable UTC timestamp such as `2026-10-22T03:59:59Z`.

## Decisions

- Format the timestamp with `Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })`. Browser defaults supply the locale, timezone, and hour cycle.
- Use `useI18n().t` from `core/application-services` with the existing `if you order by {date}` key. Keep shipment-promise calculations unchanged.
- Return no deadline until a local `ref(false)` becomes true in `onMounted`, so server rendering and initial hydration match.
- Omit missing/empty values and exact `YYYY-MM-DD` strings. Saved cart items can retain that old format until normal refresh; their missing time cannot be recovered.
- Update `EstimatedShipment.offer_expiration_date` to optional `string | null`. No consumer template changes are needed.

## Verification

Add one composable test at `src/modules/customization-system/test/unit/composables/use-estimated-shipment.spec.ts` using existing Vue test helpers. Check output before/after mount, missing and saved date-only values, and replacement with a full timestamp. Check local date/time and a timezone label against the spec examples; allow native punctuation and GMT-offset labels.

```sh
LANG=en_US.UTF-8 TZ=America/New_York yarn test:unit --runInBand --runTestsByPath src/modules/customization-system/test/unit/composables/use-estimated-shipment.spec.ts
LANG=en_US.UTF-8 TZ=UTC yarn test:unit --runInBand --runTestsByPath src/modules/customization-system/test/unit/composables/use-estimated-shipment.spec.ts
```

Run the repository's normal type and lint checks for the touched files.

## Release

Deploy after Magento #37128. Existing cart refresh updates saved deadlines; no new requests or storage migration are needed.
