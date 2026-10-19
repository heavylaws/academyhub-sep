# Antigravity Prompt: Phase 1 Implementation — PeakForm Athletics (`academyhub-sep`)

Act as a Principal Systems Architect and Senior IT Infrastructure Engineer. Implement **Phase 1: Security Hardening, RBAC Expansion & Parent/Medical Architecture** for the `academyhub-sep` repository. 

Strictly adhere to the following architectural requirements, step-by-step instructions, and exact code implementations without conversational fluff.

---

## Step 1.1: Repository Credential Sanitization & Secret Rotation
1. Execute git commands to untrack and purge exposed credentials from the working tree index[cite: 1]:
   ```bash
   git rm --cached academy_admins.csv academy_admins.ods