Hexa KYP Dashboard — Hyderabad no-results transparency fix

Replace ONLY page1.js and page2.js in repo: vikasmatto-ops/Hexa-KYP-Dashboard-.

Screenshotted filters: Hyderabad / Niva Bupa Health Insurance Company Ltd. / In-House / Self / Any Category / Any Procedure.

Checked in actual Hospital and ASP Google Sheet, 18 Nov 2026:
- 688 historical Hyderabad cases overall.
- 8 historical Hyderabad / Niva Bupa cases.
- 7 historical Hyderabad / Niva Bupa / In-House / Self cases, all 7 with Approval Amount recorded.
- 3 hospitals in the 7 history rows: Vivekananda (5), Cygnus Gastro (1), Sree Manju Kukatpally (1).
- All three listed Inactive in the current network sheet.
- Hyderabad has 24 network hospital rows, 15 Active rows. ZERO Active rows with Niva Bupa = Yes.

Therefore 0 currently eligible recommendations is correct based on the current sheet. The message 'No cases found' was incorrect. The update separates historical evidence from current eligible hospital status, shows blocked hospitals with reasons, and shows current eligible network options without inventing ASP rankings when they exist. Existing strict empanelment and duplicate-row checks are unchanged.

Checks: JavaScript syntax on both full files; functional diagnostics tests in developer environment. No live deployment performed.
Installation: Commit replacements to GitHub main. When Pages deploys, hard refresh browser with Ctrl+Shift+R, reselect filters and click Get Recommendations.
