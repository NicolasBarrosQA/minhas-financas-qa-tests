# Azinha Chat QA Matrix

Date: 2026-03-22
Scope: chat NLP parsing, clarification flow, draft commands, response quality.

## Coverage Matrix

| Scenario | Expected behavior | Status |
|---|---|---|
| Greeting (`oi`, `bom dia`) | Friendly non-transaction reply | Supported |
| Thanks (`obrigado`) | Polite short reply | Supported |
| Unrelated message | Non-transaction guidance | Supported |
| Simple expense (`gastei 42,90 no ifood`) | Draft with type DESPESA and amount | Supported |
| Simple income (`recebi 3000`) | Draft with type RECEITA | Supported |
| Full transfer (`transferi 200 da X para Y`) | Draft with origin + destination | Supported |
| Transfer destination only (`transferi 200 para Inter`) | Destination parsed, source resolved by defaults | Supported |
| Installments (`em 3x`) | `installments` set and card source | Supported |
| Large amount scale (`35 mil`) | Amount parsed as 35000 | Supported |
| Scale aliases (`k`, `mi`, `bi`) | Scaled amount parsing | Supported |
| Amount with BRL currency code | Numeric amount extraction | Supported |
| Date in `DD/MM` or `YYYY-MM-DD` | Date normalized to `YYYY-MM-DD` | Supported |
| Date phrase (`dia 5 de marco`) | Date normalized from month name | Supported |
| Relative date (`ontem`, `anteontem`, `semana passada`) | Relative date resolved | Supported |
| Expense with typo verb (`gastar 5`) | Still parsed as transaction | Supported |
| Pix expense (`paguei 50 no pix no ifood`) | Keep DESPESA, not TRANSFERENCIA | Supported |
| Card credit wording (`cartao de credito`) | Keep DESPESA | Supported |
| Date fragments mistaken as amount (`em 22-03`) | Ask clarification for value | Supported |
| Description cleaning (remove sentence/raw text) | Short useful label | Supported |
| Description cleaning (remove trailing preposition) | No `por`, `de`, etc at tail | Supported |
| Description cleaning (remove temporal tail) | No `semana passada` in description | Supported |
| Generic category handling (`Outros`) | Ask/adjust when ambiguous | Partially supported |
| Person vs transfer ambiguity (`paguei 200 pro Joao`) | Single objective disambiguation question | Supported |
| False person ambiguity (`pro plano de saude`) | No person-vs-transfer question | Supported |
| Entity ambiguity (`Carolina`) | Ask whether person vs item | Supported |
| Confirmation typo (`confirmae`) | Interpreted as confirm | Supported |
| Cancellation phrase (`acho que nao`) | Interpreted as cancel | Supported |
| Cancellation negative commands (`nao gravar`) | Interpreted as cancel (not confirm) | Supported |
| Free command without draft (`confirmar`) | Explain no draft is open | Supported |
| Polite phrase without draft (`nao quero`) | Friendly quick reply (not command error) | Supported |
| Draft field update (`valor 129,90`) | Adjust draft value | Supported |
| Draft natural update (`saida de 35 mil`) | Adjust amount/type without invalid-type error | Supported |
| Draft context shift (new transaction during draft) | Drop old draft and start new parse | Supported |
| Clarification missing amount then type | Ask minimum sequence, no loop | Supported |
| Clarification missing type then amount | Ask minimum sequence, no loop | Supported |
| Clarification from resolver (`conta vs cartao`) | Keep context and merge follow-up answer | Supported |
| Rewrite decision follow-up | Keep context and continue parse | Supported |

## Fixed in this hardening pass

- Type collision fixes for `pix`/`credito` contexts.
- Amount parser hardened to ignore date fragments.
- Transfer parser fixed for destination-only messages.
- Cancel intent fixed for `nao gravar`/`nao concluir`.
- Clarification state now persists expected slot/prompt and no longer drops context on `rewrite`/resolver ambiguity.
- Clarification loop fixed for short replies like `saida` and progressive flow (`15` -> `saida`).
- Free command handling improved so polite phrases are not treated as control commands.
- Tone sanitizer added to reduce slang/abbreviations from remote model text.

## Non-blocking improvements (post-MVP)

- Expand category inference coverage to reduce `Outros` for long-tail merchants.
- Add typo-tolerant matching for account/card/category entities with larger lexicon.
- Introduce dedicated confidence calibration metrics from production telemetry.

## Second QA Round (extra scenarios)

Execution date: 2026-03-22
Result: 18/18 checks passed in automated UI conversation run.

Additional scenarios validated:
- OTHER question (`Qual a sua idade?`) without infrastructure-style error text.
- Ambiguous entity flow (`Carolina`) with follow-up `doce` and typo confirmation (`confirmae`).
- Person vs transfer disambiguation (`paguei 200 pro Joao` -> `tipo transferência`).
- Negative cancel command (`não concluir`) while draft is open.
- Transfer destination-only parse + confirm save.
- Relative date (`semana passada`) with clean description (`Mercado`).
- Date fragment vs amount clarification (`Paguei mercado em 22-03` -> asks value, then asks type, then resolves).
- No-draft polite phrase (`não quero`) returns friendly standby response.

