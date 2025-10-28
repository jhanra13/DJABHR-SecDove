# SecureDove: A Secure Messenger

A course project for CptS 428: Software Security and Reverse Engineering. SecureDove is a secure messaging application focused on privacy, confidentiality, and tamper resistance.

## Table of Contents
- [SecureDove: A Secure Messenger](#securedove-a-secure-messenger)
  - [Table of Contents](#table-of-contents)
  - [Project Overview](#project-overview)
  - [Development Approach](#development-approach)
    - [Option 1: Secure Development Lifecycle](#option-1-secure-development-lifecycle)
    - [Option 2: Layered Security Model](#option-2-layered-security-model)
  - [Security Goals](#security-goals)
  - [Technology Stack](#technology-stack)
  - [Team Information](#team-information)
  - [Collaborators](#collaborators)
  - [Project Milestones \& Deliverables](#project-milestones--deliverables)
  - [Installation Instructions](#installation-instructions)
    - [Running](#running)
    - [Usage](#usage)
    - [Notes](#notes)
  - [Documentation](#documentation)

## Project Overview
SecureDove aims to provide end-to-end encrypted messaging with strong authentication and integrity guarantees. Throughout development, we will incorporate rigorous testing and iterative hardening to meet well-defined security goals.

## Development Approach
We are evaluating two complementary approaches and will choose the one that best aligns with implementation and testing as the project evolves.

### Option 1: Secure Development Lifecycle
A structured cycle that integrates security throughout:
- Design & Requirements: Define security goals such as encryption, authentication, and resistance to attacks.
- Implementation: Build core messaging features with cryptographic protections and safe coding practices.
- Testing & Evaluation: Use static analysis, fuzzing, and penetration testing to identify weaknesses.
- Improvement: Refine the system and patch vulnerabilities based on test results.

### Option 2: Layered Security Model
A defense-in-depth strategy that secures the messenger in layers:
- Confidentiality Layer: End-to-end encryption ensures only intended recipients can read messages.
- Integrity Layer: Digital signatures and message authentication codes protect against tampering.
- Authentication Layer: Strong identity checks prevent impersonation and unauthorized access.
- Resilience Layer: Continuous testing and adversarial evaluation strengthen the system against real-world attacks.

## Security Goals
SecureDove will adopt widely accepted communication security practices, including:
- End-to-End Encryption (E2EE): Messages are encrypted (e.g., AES-256) for confidentiality with secure key exchange (e.g., Diffie-Hellman or RSA).
- Message Integrity: Digital signatures and verification methods detect tampering and confirm sender authenticity.
- Forward Secrecy: Ephemeral, session-based keys ensure past conversations remain protected even if long-term keys are compromised.

We will also use static code analysis, fuzz testing, and penetration testing throughout development to evaluate and strengthen security.

## Technology Stack
- Backend: Node.js (Express)
- Client: React+Vite
- Database: SQLite
- Encryption & Security Libraries:
  - Node.js: crypto, jsonwebtoken
- Version Control: GitHub

## Team Information
- Team Name: SecureDove
- Project Topic: Secure Messenger
- Repository: https://github.com/jhanra13/DJABHR-SecDove

| Name             | Email                                                      | WSU ID    | GitHub                                           |
|------------------|------------------------------------------------------------|-----------|--------------------------------------------------|
| Johann Ramirez   | [johann.ramirez@wsu.edu](mailto:johann.ramirez@wsu.edu)    | 011829488 | [jhanra13](https://github.com/jhanra13)          |
| Ross Kugler      | [ross.kugler@wsu.edu](mailto:ross.kugler@wsu.edu)          | 011835486 | [rk3026](https://github.com/rk3026)              |
| Huy (Harry) Ky   | [giahuy.ky@wsu.edu](mailto:giahuy.ky@wsu.edu)              | 011833522 | [Harry908](https://github.com/Harry908)          |
| Benjamin Bordon  | [b.bordon@wsu.edu](mailto:b.bordon@wsu.edu)                | 011843215 | [wizkid0101](https://github.com/wizkid0101)      |
| Dylan Gyori      | [dylan.gyori@wsu.edu](mailto:dylan.gyori@wsu.edu)          | 011870945 | [JustDylan](https://github.com/JustDylan)        |
| Anthony Do       | [anthony.do1@wsu.edu](mailto:anthony.do1@wsu.edu)          | 011828757 | [anthonyd03](https://github.com/anthonyd03)      |

## Collaborators
The following accounts have been added as collaborators to the repository:
- Instructor: xlin29
- TA: reflate31

## Project Milestones & Deliverables

| Milestone | Deliverable                              | Due Date | Description                                                                                                                                                       |
|----------:|------------------------------------------|----------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|         1 | Deliverable 1-1: Team Setup              | Sep 2    | Submit team information, set up the repository, and select the project topic.                                                                                     |
|         2 | Deliverable 2-1: Project Specification   | Sep 22   | Define project requirements and security goals/metrics. Provide project planning and quality planning documentation.                                              |
|         2 | Deliverable 2-2: Design & Implementation | Oct 6    | Produce design models (use case diagrams, architecture) and implement an initial prototype with documentation.                                                    |
|         3 | Deliverable 3: Security Assessment       | Oct 27   | Validate the system against security goals using code review, penetration testing, and static/dynamic analysis. Identify vulnerabilities.                         |
|         4 | Deliverable 4: Amend & Enhance           | Nov 27   | Update design and implementation with enhanced security. Develop countermeasures, validate fixes with regression testing, and document improvements.              |
|         5 | Deliverable 5: Final Report & Demo       | Dec 1    | Present project outcomes, lessons learned, and insights. Finalize all artifacts (code, documentation, exploits, fixes) and demonstrate the build-break-fix cycle. |

## Installation Instructions

**Prerequisites**
- Node.js LTS (v18+ recommended)
- npm (bundled with Node)

**Clone and install**
- `npm install` in both `server/` and `client/` directories.

**Server environment**
- Create `server/.env` with (example defaults):
  - `PORT=8000`
  - `NODE_ENV=development`
  - `JWT_SECRET=<set-a-strong-secret>`
  - `DB_PATH=./database/securedove.db`
  - `CORS_ORIGIN=http://localhost:5173`
  - `RATE_LIMIT_WINDOW_MS=900000` and `RATE_LIMIT_MAX_REQUESTS=100`
  - `LOGIN_RATE_LIMIT_WINDOW_MS=900000` and `LOGIN_RATE_LIMIT_MAX_REQUESTS=5`

**Client environment**
- Create `client/.env` with:
  - `VITE_API_URL=http://localhost:8000/api`
  - Optionally: `VITE_SOCKET_URL=http://localhost:8000`

**ascripts virtual environment (optional)**
- Some helper scripts under `ascripts/` use Python with crypto.
- Create and activate a venv, then install deps:
  - `python3 -m venv ascripts/venv`
  - `source ascripts/venv/bin/activate` (Windows: `ascripts\venv\Scripts\activate`)
  - `pip install cryptography`
  - Run scripts, e.g. `python ascripts/list_conversations.py`
  - Deactivate with `deactivate`

### Running

**Option A: Start both via helper script**
- From repo root: `./start.sh` (or `start.bat` on Windows)

**Option B: Start separately**
- Server: `cd server && npm run dev` (or `npm start`)
- Client: `cd client && npm run dev` (Vite dev server on port 5173)

### Usage

1) **Register and Login**
- Registration generates an RSA keypair client‑side; the private key is encrypted with a password‑derived key and stored server‑side only in encrypted form.
- Login decrypts the private key client‑side after JWT authentication.

2) **Contacts**
- Add/remove/list contacts; fetch public keys for secure key wrapping.

3) **Conversations**
- Create conversations by wrapping a content key per participant. Add participants either by:
  - Sharing history (re‑wrap historical content keys for new users), or
  - Rotating to a new content key (key number increments for all participants).
- Leave/delete removes the current user’s membership; emits a system event.

4) **Messaging**
- Messages are encrypted (AES‑GCM) client‑side with the conversation content key. Realtime delivery via Socket.IO; history is fetched via REST and decrypted locally.
- Edit/delete operations update or remove encrypted payloads; system events (participant added/removed, key rotation) appear as broadcast messages in the timeline.

5) **Backup & Local Data**
- Create/export a backup (JSON) of encrypted messages and metadata. Import/restore to merge/replace local data. Optionally clear all local messages.

### Notes

- **Security**
  - The server never handles plaintext messages or private keys.
  - Ensure HTTPS and strong JWT secret in production.
- **CORS/WebSocket**
  - Match `CORS_ORIGIN` to the client dev server (`http://localhost:5173`) and `VITE_SOCKET_URL` to the server origin.

## Documentation
All documentation for the software development process is located in the [`/documentation`](documentation) folder.
