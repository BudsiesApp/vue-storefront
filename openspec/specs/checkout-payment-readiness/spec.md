# checkout-payment-readiness Specification

## Purpose

Cart and checkout payment starts only from valid, successfully applied totals for the current quote. On the cart page, express wallet buttons stay visible but inactive while cart edits or a totals refresh can still change the grand total, and the existing totals retry offers the way back after totals are missing or a refresh fails.

## Requirements

### Requirement: Payment requires valid current-quote totals

Standard and express checkout SHALL require valid, successfully applied totals for the current quote before payment starts and at final submission. Totals from another quote SHALL NOT be used. A payment blocked by missing totals SHALL offer a retryable error and a business refresh, without waiting for analytics.

On the cart pages of Petsies, Budsies, Waggables and Stuffed Animal Pros, PayPal, Pay Later, Apple Pay and Google Pay SHALL additionally reject payment initiation while Add, cart synchronization, coupon processing or a cart totals refresh is active, or the current cart quantities are not represented by the last applied item totals. For a quantity change, the block SHALL start immediately when the shopper changes the quantity, including the input's unsent delay, and continue through its write and totals settlement. Other cart edits SHALL remain blocked from sending the change through methods preparation and application of the totals response. The available buttons SHALL remain visible in their normal positions and sizes, look disabled, and reject pointer and keyboard activation without opening a wallet or starting a payment request. The wait SHALL add no message or spinner and SHALL NOT delay Add to cart, cart edits or navigation to the cart. A blocked activation SHALL NOT be replayed after settlement. A configured Amazon Pay button in the same group SHALL share the inactive presentation and interaction block.

After a successful refresh applies valid totals representing the current quote's quantities and active Add, cart, coupon and totals work settles, the buttons SHALL become usable without a reload or another enabling action. A new activation SHALL use the updated grand total in the first wallet request. With current totals representing the displayed quantities, no active cart work and no failed refresh, the buttons SHALL retain their existing appearance and behavior. The existing quantity-input delay of up to one second before sending a change SHALL remain unchanged; only express payment SHALL become inactive earlier.

If the refresh rejects, returns an error, or receives an unusable totals response, cart express checkout SHALL remain unavailable even if last-known same-quote totals still exist. After the failed refresh settles, the existing "Order totals are unavailable. Refresh totals to continue." message and "Refresh totals" action SHALL be offered. A successful manual retry or later successful business refresh SHALL restore availability. A chain that resolves without requesting totals SHALL retain the previous totals/failure outcome and SHALL NOT count as successful recovery or create a new failure. No new failure message or automatic retry SHALL be introduced. This stricter express-start policy SHALL NOT remove the last-known totals used by analytics' same-quote fallback, change standard checkout's policy, or interrupt an already-open wallet's shipping callbacks.

The quantity comparison SHALL NOT introduce a new block on "Refresh totals". That action SHALL retain its existing active-cart-work and own-request protection, including when earlier item quantities are missing or differ from the current cart. A quantity difference alone SHALL NOT show "Refresh totals"; a changed quantity that never reaches the server keeps the express buttons inactive until the next cart synchronization applies matching totals, with no added on-page recovery. Cart edits begun after PayPal or Pay Later has already accepted a click are outside the readiness guarantee; no second readiness check before its payment request SHALL be added. No additional validation that a totals response contains a grand-total line SHALL be introduced.

#### Scenario: Replacement quote has no usable totals
- **WHEN** login or recovery replaces the quote and its totals refresh fails, even though payment methods are available
- **THEN** payment cannot start until business totals for the replacement quote are ready
- **AND** the shopper can request one normal business totals refresh and retry payment

#### Scenario: Totals become unavailable during payment
- **WHEN** a standard or express payment reaches final submission without valid current-quote totals
- **THEN** no order is submitted or missing totals dereferenced, and the shopper can retry
- **AND** the rejected submission does not consume the payment nonce or session ID

#### Scenario: Add completes before its background totals refresh
- **WHEN** an accepted Add starts a background methods/totals refresh and the shopper opens the cart before that refresh finishes
- **THEN** Add completion and cart navigation do not wait for the refresh
- **AND** each eligible express button stays visible in its normal place and size but looks disabled and cannot open its wallet
- **AND** no extra wait message or spinner is added

#### Scenario: Cart edits or cart entry refresh totals
- **WHEN** the shopper changes quantity, an item removal or coupon change is sent to the server, or a cart-entry totals refresh starts
- **THEN** all four express payment choices are unavailable from the local quantity change, or from sending another edit, through applying the corresponding totals response
- **AND** the block covers the quantity debounce, item/coupon request before methods preparation and the gap before the totals HTTP request
- **AND** they stay unavailable until the active Add, cart, coupon and totals work settles
- **AND** the change adds no wait to the edit or navigation

#### Scenario: Quantity change has not been sent yet
- **WHEN** usable totals are available, no cart operation or failed refresh blocks payment, and a quantity change is still in the input's existing delay before sending
- **THEN** the express buttons are already visible and inactive because the displayed quantity differs from the last applied item totals
- **AND** the delay remains unchanged at up to one second
- **AND** sending the edit does not briefly re-enable payment before matching quantities and totals are applied and active work settles

#### Scenario: An unrelated acknowledgement occurs before the quantity is sent
- **WHEN** a local quantity differs from the last applied item totals and a background stock update acknowledges the cart without applying new item totals
- **THEN** express payment remains unavailable for that unsent quantity
- **AND** no extra write, timer or totals request is introduced by the readiness gate

#### Scenario: Refresh succeeds after a blocked activation
- **WHEN** a shopper activates an inactive express button and the current quote's refresh later succeeds
- **THEN** no wallet opens and no payment-start event or wallet payment request occurs for the blocked activation
- **AND** the buttons become active without a reload once matching current quantities are represented by applied totals and active Add, cart, coupon and totals work settles
- **AND** the shopper must activate a button again
- **AND** that activation's first wallet request uses the newly applied grand total

#### Scenario: Keyboard or wallet click attempts activation during cart work
- **WHEN** a focused button or wallet click callback attempts to initiate express payment during an unmatched quantity edit or while Add, cart synchronization, coupon processing or a totals refresh is active
- **THEN** no wallet payment request or payment sheet is started with the retained totals
- **AND** no delayed activation or additional shopper-facing error is created

#### Scenario: Failed refresh retains earlier same-quote totals
- **WHEN** a refresh after a cart change fails while earlier successfully applied totals of the same quote remain
- **THEN** express payment stays unavailable after processing ends
- **AND** the existing totals-unavailable message and manual refresh action appear
- **AND** analytics can still use its existing last-known same-quote fallback
- **AND** no automatic retry is started

#### Scenario: A chain ends without requesting totals
- **WHEN** a chain resolves without requesting totals because the refresh is no longer needed or its configured country is absent
- **THEN** it releases its busy state without replacing the earlier totals or changing the earlier failure outcome
- **AND** an earlier failed refresh remains blocking and its retry remains available
- **AND** earlier usable totals with no failure remain eligible after active cart work settles only when they represent the current quantities
- **AND** no new error or automatic retry is added for that no-request exit

#### Scenario: Manual retry succeeds or fails again
- **WHEN** the shopper requests "Refresh totals" after a failed refresh with retained totals
- **THEN** one normal business refresh is requested, and express payment remains unavailable while it runs
- **AND** another failure leaves the existing retry available
- **AND** success restores the buttons without reloading, and a new activation uses the refreshed grand total

#### Scenario: Quantity write succeeds but its totals refresh fails
- **WHEN** a quantity write succeeds, its totals refresh fails, and the cart quantity still differs from the earlier applied item totals
- **THEN** express payment remains blocked but the existing "Refresh totals" action is available once active cart work settles
- **AND** requesting that action makes one normal business totals refresh despite the quantity difference
- **AND** a successful retry with matching quantities restores payment readiness without reloading

#### Scenario: An unsent quantity edit alone does not disable the retry
- **WHEN** the existing totals retry is shown because payment totals are missing or the latest refresh failed, no cart operation or retry request is active, and the shopper also has an unsent quantity edit
- **THEN** the quantity difference does not add a disabled state or an early rejection to "Refresh totals"
- **AND** the express payment buttons remain blocked by their separate readiness policy

#### Scenario: A changed quantity never reaches the server
- **WHEN** usable totals are available, no refresh has failed, and a changed quantity is never sent because its cart write fails, the shopper leaves the cart within the input's delay, or a coupon is applied or removed within that delay and marks the cart as synced
- **THEN** the express buttons remain visible and inactive with no message and no "Refresh totals" action
- **AND** they become usable again after the next cart synchronization applies matching totals, such as another cart edit or a page reload
- **AND** standard checkout remains available

#### Scenario: A later cart change recovers from failure
- **WHEN** express checkout is blocked by an earlier failed refresh and a later cart change triggers a successful refresh
- **THEN** the existing retry disappears and the express buttons become usable when applied totals represent the current quantities and active Add, cart, coupon and totals work settles
- **AND** no separate manual retry or page reload is required

#### Scenario: Overlapping refreshes settle out of order
- **WHEN** totals refreshes overlap and an older response arrives after the latest refresh succeeds or fails
- **THEN** express checkout remains unavailable while any totals refresh is active
- **AND** the superseded result cannot replace the latest totals or re-enable express checkout after the latest refresh failed
- **AND** a response for a replaced quote cannot change the replacement quote's express readiness

#### Scenario: Refresh becomes obsolete during methods preparation
- **WHEN** a refresh finishes preparing methods after its quote was replaced or a newer refresh superseded it, before it sent a totals request
- **THEN** it sends no subsequent totals request or shipping-information update
- **AND** it releases its busy hold without changing the current quote's failure evidence

#### Scenario: No payment totals are available
- **WHEN** the cart has available express methods but no usable current-quote totals
- **THEN** express payment cannot start and the existing totals-unavailable retry remains available as before
- **AND** absence of an earlier applied item-quantity snapshot does not add a block on that retry

#### Scenario: Current totals and an already-open wallet
- **WHEN** current totals represent the displayed quantities, no Add, cart, coupon or totals work is active and no refresh has failed
- **THEN** express buttons have their existing enabled appearance, eligibility, ordering and payment behavior
- **AND** shipping callbacks of a wallet that has already opened keep their existing amount-update behavior

#### Scenario: Amazon Pay shares the inactive button group
- **WHEN** Amazon Pay is configured in the cart express group and the group is blocked by a quantity difference, active cart work or a failed totals refresh
- **THEN** its button shares the group's visible inactive presentation and pointer/keyboard interaction block
- **AND** it becomes interactive again with the rest of the group when the cart is ready
