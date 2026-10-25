# Cloudflare Attack-Class Catalog

Use these adapted hunting prompts to investigate five threat boundaries. They are not the full upstream Cloudflare workflow or proof that the CLI executed an adversary scan. Confirm failure paths with source/evidence rather than pattern matches.

---

## 1. AI & LLM Threat Surface (`AI-AND-LLM`)
- **Direct & Indirect Prompt Injection:** Untrusted context (documents, web responses, user notes) concatenated into prompts without an effective trust boundary; delimiters alone are not a prompt-injection defense.
- **Tool Smuggling & Unauthorized Tool Invocation:** Blind type-casting of model tool calls (`call.name as ToolName`) without validation against an immutable tool whitelist.
- **Injection Normalizer Evasion:** Keyword filters that fail to normalize Unicode confusables, zero-width spaces (`\u200B`), non-breaking spaces, or NFKD homoglyphs.
- **Fail-Open Policy Fallthrough:** Unrecognized tool or parameter defaulting to `AUTO_EXECUTE` instead of failing closed to `REJECT`.

---

## 2. Client-Side & DOM Manipulation (`CLIENT-SIDE`)
- **DOM-Based XSS:** Interpolation of untrusted error messages, URL hash fragments, or API responses directly into `innerHTML`, `outerHTML`, or `document.write`.
- **Insecure Credential Persistence:** Storing secret tokens, OAuth client secrets, or LLM API keys in unencrypted `localStorage`, `sessionStorage`, or JavaScript-readable cookies. JavaScript cannot set HttpOnly; sensitive sessions require an appropriate server-set cookie policy.
- **PostMessage & Web Worker Leakage:** Unvalidated origins on `window.addEventListener('message')` or postMessage data broadcasting without targetOrigin.

---

## 3. Cloud & Serverless Deployment (`CLOUD-AND-DEPLOYMENT`)
- **Server-Side Request Forgery (SSRF):** Proxy endpoints, webhook gateways, or serverless functions accepting caller-supplied `targetUrl` without destination domain whitelisting, CIDR range restrictions, or private/cloud-metadata blocking (`169.254.169.254`).
- **Wildcard CORS on Authenticated Gateways:** Inspect credential forwarding and origin checks together; browsers reject credentialed wildcard-origin reads, so the header alone does not establish an exploit.

---

## 4. Cryptographic & Policy Gate Integrity (`PROTOCOLS-RPC-AND-MESSAGING`)
- **Preimage State Tampering:** Cryptographic approval hashes or HMAC signatures that hash only transaction arguments while omitting policy decisions, timestamps, or injection detection status from the preimage.
- **Replay Attacks:** Approval gates that do not enforce single-use consumption of authorization digests.

---

## 5. Web Protocol & Credential Hygiene (`WEB-PROTOCOL-AND-AUTH`)
- **API Keys in Query Strings:** Transmitting secret keys in URL parameters (`?key=...`) instead of HTTP request headers (`x-goog-api-key`, `Authorization: Bearer`), leaking tokens into proxy logs and Referer headers.
- **Integer & Formatting Truncation:** Monetary or numeric parsers that stop parsing at commas or formatting separators (`$1,250.00` parsed as `$1`), allowing limit bypasses.
