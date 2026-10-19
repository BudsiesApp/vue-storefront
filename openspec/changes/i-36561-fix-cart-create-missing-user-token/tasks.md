# Tasks

## 1. Cart synchronization behavior

- [x] 1.1 Remove the non-200/non-404 cart-create bypass from `performSync`; confirm the failure path dispatches no `connect` action or additional cart lookup for either customer or guest carts.
- [x] 1.2 Move the successful-sync timestamp update to the completed 200 path and stop updating the item hash on pull errors; confirm the failure path retains the token, items, hash, and last successful sync timestamp.

## 2. Preserve existing paths

- [x] 2.1 Confirm a later eligible synchronization still attempts a pull using the retained customer context or guest cart reference after a 401, 403, or 500 response.
- [x] 2.2 Confirm the 200 merge and 404 cart initialization branches retain their current behavior.
