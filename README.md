# Sakthi Spark Audits

Build a fully functioning, role-based Audit Management Web Application named "Sakthi Spark" (Continuous Improvement Platform) with a complete frontend and backend database integration.  1. Branding & Design System Use a dark slate and charcoal background gradient (#343a40) for login and structural containers.Accent buttons, active tabs, headers, and key branding must use the official Sakthi Spark orange color (#ff7b00) and hover state (#e06c00).Cards and input areas must feature a clean, modern white background (#ffffff) with crisp borders and subtle shadows.Top navigation must display the official Sakthi Spark logo (Trident icon + typography style).

2. Core Authentication & Views

Sign-In Screen: Employee ID/Number input field with a solid orange "Send OTP" action button.

Role-Based Routing:

  Admin View:Full dashboard access, annual plan creator, monthly assignment matrix, review queue, and deviation tracker.

  - Employee View: Assigned work queue, active audit execution forms, and deviation reporting.

 3. Dashboard Metrics & Modules (Clickable Cards)

- Total Audit: Overview of all planned, active, and completed audits for the selected period[cite: 1].

- Product Audit:Product and process compliance tracking[cite: 1].

- Revalidation Audit: Periodic verification schedules[cite: 1].

- Ongoing Audit:Active monthly assignments in progress[cite: 1].

- Completed Audit: Read-only verified historical records[cite: 1].

- Deviation Audit: Non-conformances and error reporting queue[cite: 1].

 4. Employee Audit Execution & Excel-Format Form

- Interactive form layout that mirrors standard audit checkpoints.

- Mandatory Image Uploads: Exactly 3 image upload slots (Image 1, Image 2, Image 3) with client-side format and size validation[cite: 1].

- Electronic Signature Block: Captures employee confirmation, linked automatically to the logged-in Employee ID, timestamp, and signature reference[cite: 1].

- Submission Workflow: Validates mandatory fields, locks the record upon completion, changes status to "Submitted", and routes it to the Admin dashboard[cite: 1].

5. Deviation & Error Reporting Module

- Allows employees to trigger a "Report Deviation" action linked directly to the parent Audit ID[cite: 1].

- Captures description, location/operation, observed condition, recommended action, and evidence attachment[cite: 1].

- Routes straight to Admin for review, corrective action assignment, and closure[cite: 1].

 6. Backend Data Structure (Mock/Supabase Integration)

- Setup relational tables for `users`, `audit_plans`, `audit_assignments`, `audit_records`, `audit_deviations`, and `audit_logs` capturing full timestamps, file versions, and status tracking (Planned, Assigned, In Progress, Submitted, Completed, Deviation, Overdue)[cite: 1].

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c2b61608-d7e6-46c7-b099-c156f097ed8f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
