# OCR Receipt Ingestion + Rule-Based Auto-Assignment (Phase 1 + 1.5)

## Where to configure the OCR provider

The **parse-receipt** Edge Function uses a **stub OCR** that returns mock data. To plug in a real provider:

1. **File:** `supabase/functions/parse-receipt/index.ts`
2. **Function:** `runOcr(imageBytes: Uint8Array)`
3. **Contract:** Return value must be:
   - `merchant_name?: string`
   - `subtotal`, `tax`, `tip`, `total` (numbers, cents)
   - `rawItems: ParsedItem[]` with `label`, `quantity`, `unit_price`, `total_price` per item

Replace the body of `runOcr()` with your provider (e.g. Google Vision, Tesseract, AWS Textract): decode the image, call the API, map the response to the structure above. The rest of the function (normalization, tagging, CORS, storage/download) stays the same.

---

## Setup

- Run migrations (including `20250208110000_storage_receipts_bucket.sql`).
- Deploy Edge Function: `supabase functions deploy parse-receipt`.
- In `apps/mobile`: run `npm install` (adds `expo-image-picker`).

## Manual test checklist

- [ ] **Storage bucket**
  - Run migration `20250208110000_storage_receipts_bucket.sql` (or create bucket `receipts` private in Dashboard).
- [ ] **Edge Function**
  - Deploy: `supabase functions deploy parse-receipt`
  - Ensure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set for the function.
- [ ] **Mobile: Upload receipt → items populate**
  - Create new split → Receipt step.
  - Tap **Scan receipt** → pick an image from library.
  - Loading state shows; after success, items list is filled from stub (Pizza, IPA Beer, House Fries).
  - Tax and tip fields are filled.
  - Dismiss any parse error if shown; fix network/function if it keeps failing.
- [ ] **Suggested assignments**
  - Add at least one participant (People step) → go to Assign step.
  - Banner: **Suggested split generated**.
  - Each item shows **Use suggestion: &lt;name&gt;** or **Use suggestion: Split** (for shared).
  - Tap **Confirm suggestions** → all items get suggested assignees.
  - Or tap **Use suggestion** per item; you can still change with participant chips.
- [ ] **User edits and finalize**
  - Change some assignments with chips, then tap **Next: Review Summary**.
  - Complete flow to Export (or leave); no crash.
- [ ] **Learning (local)**
  - After finishing a split with assignments, create another split with similar item names (e.g. add “IPA Beer” again). On Assign step, that item should suggest the same person as before (frequency stored in AsyncStorage).

---

## Commit message suggestion

```
feat: OCR receipt ingestion + rule-based auto-assignment (Phase 1 & 1.5)

- Supabase: private storage bucket `receipts`, RLS for user folder upload/read
- Edge Function parse-receipt: storage_path or image_base64 → merchant, totals, items; stub OCR (swappable)
- Mobile: Scan receipt on Receipt step (expo-image-picker), upload to Storage, call parse-receipt, populate items/tax/tip
- Assignment suggestions: shared keywords → split evenly; alcohol → by frequency; else by frequency or unassigned
- Assign step: banner “Suggested split generated”, per-item “Use suggestion”, “Confirm suggestions” button
- Learning: per-item/participant frequency in AsyncStorage, updated on Assign → Summary
```
