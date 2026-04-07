# MVP Scope - AZA Finance

## Product objective
Build a mobile-first web MVP that makes Gen Z and young millennials keep a daily finance routine by combining:
- low friction transaction capture
- clear monthly control
- lightweight gamification

## Target segment
- People with income instability or low consistency in finance tracking
- Users from classes B/C (and part of A) that abandon traditional finance apps
- Primary age focus: born after 1980, with strongest tone for 2000+

## Core MVP outcomes
1. User logs transactions in seconds.
2. User understands current month status (balance, expenses, card invoices).
3. User can manage credit card purchases, including installments.
4. User gets habit reinforcement (streak/XP/challenges) tied to real actions.

## In-scope features (MVP)
### Wallet and transaction base
- Accounts CRUD (create/edit/archive/restore)
- Cards CRUD (create/edit/archive/restore)
- Transactions CRUD for:
- income
- expense
- transfer between accounts
- credit card purchase
- History view with month, search and type filters

### Credit card and invoices
- Card purchase registration
- Installment purchase registration (1x to 12x)
- Invoice listing by card and month
- Invoice payment (minimum/partial/full)
- Card usage/available limit updates

### Planning (MVP-light)
- Budget CRUD
- Goal CRUD
- Recurrence CRUD
- All flows integrated with actual front-end state (no fake submit-only actions)

### Home and reports
- Home summary from live front-end state (not hardcoded)
- Account detail report powered by real transaction data
- Card detail report powered by real card/invoice/installment data

### Habit layer
- XP/streak/score/challenges shown consistently
- Rewards tied to real actions (transaction creation at minimum)

## Out of scope for MVP
- Bank sync / open finance integration
- Investment portfolio management
- AI advisor with autonomous planning
- Multi-user collaboration
- Full antifraud engine
- Advanced tax/report exports

## Technical readiness for backend integration
- Front-end entities follow `src/types/entities.ts`
- Hooks expose deterministic data contracts
- UI stops depending on isolated page-level mock lists
- Domain rules are isolated in hook/store functions and easy to replace with API calls

## MVP acceptance criteria
1. Every primary flow updates visible UI state without page-level hardcoded mocks.
2. Credit card installment flow works end-to-end in UI state:
- create installment purchase
- see in card timeline
- see impact on invoice and card usage
3. Home, account report and card report remain consistent after actions.
4. Build and tests run successfully.
