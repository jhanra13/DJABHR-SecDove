# SecureDove: A Secure Messenger

A course project for CptS 428: Software Security and Reverse Engineering. SecureDove is a secure messaging application focused on privacy, confidentiality, and tamper resistance.

## Table of Contents
- Project Overview
- Development Approach
- Security Goals
- Technology Stack
- Team Information
- Collaborators
- Project Milestones & Deliverables

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
- Backend: Python (Flask or FastAPI) or Node.js (Express) for the messaging server
- Client: Python CLI or lightweight web UI
- Database: SQLite or PostgreSQL for user and message metadata
- Encryption & Security Libraries:
  - Python: cryptography, PyNaCl
  - Node.js: crypto, jsonwebtoken (if applicable)
- Version Control: GitHub

## Team Information
- Team Name: SecureDove
- Project Topic: Secure Messenger
- Repository: https://github.com/jhanra13/DJABHR-SecDove

| Name           | Email                  | WSU ID    |
|----------------|------------------------|-----------|
| Johann Ramirez | johann.ramirez@wsu.edu | 011829488 |
| Ross Kugler    | ross.kugler@wsu.edu    | 011835486 |
| Huy (Harry) Ky | giahuy.ky@wsu.edu      | 011833522 |
| Benjamin Bordon| b.bordon@wsu.edu       | 011843215 |
| Dylan Gyori    | dylan.gyori@wsu.edu    | 011870945 |
| Anthony Do     | anthony.do1@wsu.edu    | 011828757 |

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
