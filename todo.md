# Refactor roadmap – Experience Alcohol

A running checklist of the consolidation / DRY refactor. Tick (x) items as they are completed.

- [x] 1. Create `src/constants/index.js` and move all constant objects (`BAC_CONSTANTS`, `DRINK_TYPES`, `DRINKS`, `FEELING_STATES`, `MAINTENANCE`, `DEFAULT_PERSON`) into it, deleting their previous definitions.
- [x] 2. Create `src/utils/bac.js` and merge all BAC-related maths; old util files archived.
- [x] 3. Update every import to use the new modules.
- [x] 4. Strip duplicate calc functions from Pinia stores; removed inline `calculateBAC`.
- [x] 5. Move any remaining pure‐math logic from composables (`useDrinks`, `usePerson`) into `utils/bac.js`.
- [ ] 6. (Optional) Evaluate splitting `stores/alcohol.js` into `stores/people.js` & `stores/drinks.js`; implement if beneficial.
- [x] 8. Delete obsolete util files (`src/utils/utils.js`, `src/utils/bacCalculator.js`).
- [x] 7. Convert `src/utils/bacValidator.js` into proper unit tests (`tests/bac.spec.js`) with Jest/Vitest, then delete the old file.
- [ ] 9. Run the application & the new tests; fix any import path or runtime issues.

> Update the checkboxes above as each step is implemented and verified.
