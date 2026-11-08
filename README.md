# Bukedea Comprehensive School — Digital Campus

A school operations portal developed by BridanX Tech LLC.

## Current build
- Responsive school portal interface
- Supabase email/password authentication
- Parent self-registration; new accounts receive the restricted parent role
- Live student record listing, authorised student admission and class enrolment
- Academic year, term, class, subject, class-subject setup and teacher-to-class/class-teacher assignments
- Daily attendance registers for enrolled students
- Assessment creation and teacher mark entry with score validation
- Verified guardian-to-student linking and a parent portal with attendance, assessment and fee summaries
- Fee categories, student invoices and receipt records for payments already received
- School circulars, announcements, bursar expense records and live operational summaries
- Bursar payment recording for money already received by the school (no payment processing)
- Published announcements and printable school circulars
- Staff directory and role assignment for existing registered accounts, protected by the administrator role-assignment RPC
- Confidential payroll entries with gross pay, deductions, net pay, draft/approved/paid status and a limited-name staff directory (no staff phone/email exposed to bursar roles)
- Database-enforced payroll arithmetic checks and assessment score limits; payroll entries must follow Draft → Approved → Paid, with financial fields locked after approval
- Branded Print Studio for payment receipts, student fee statements, student profiles, academic progress extracts, provisional term reports, attendance registers and circulars; print layouts include the official crest, school motto, footer and badge watermark
- Role model and Row Level Security across all exposed school tables
- Dedicated Supabase project, separate from BridanX Business Manager

## Supabase project
- Project ref: `ynacnystxmlfvyqetovu`
- Region: `eu-central-1` (Frankfurt)
- API URL: `https://ynacnystxmlfvyqetovu.supabase.co`
- Browser app uses a publishable key. Never put a service-role/secret key in this repository.

## Official school identity
The school identity and contact details are preloaded from the school's public website:
- Motto: `Knowledge & Innovation`
- Address: Bukedea Town, Bukedea District, Eastern Uganda; P.O. Box 195, Bukedea, Uganda
- Telephone: `+256 (0) 700 000 000`
- Email: `info@bukedeacomprehensive.ac.ug`
- Website: `https://www.bukedeacomprehensiveschool.com/`
- Curriculum: Uganda National Curriculum, O'Level (S1–S4) and A'Level (S5–S6), with UCE/UACE examinations

Official fee schedules, current academic dates, subject combinations, grading scales and student/staff records are not invented or preloaded; they must be confirmed by school leadership.

## First administrator setup
1. The designated initial School Administrator account is `worldbridan3@gmail.com` (approved by the project operator for this setup).
2. This account already exists in Supabase Auth and its profile has been assigned the `school_admin` role.
3. Sign out of the BCS portal and sign back in with this email so the refreshed session loads the administrator permissions. Use the account's existing private password; never place passwords or secret keys in this repository.
4. Before production handover, the school should formally approve the administrator and may nominate additional staff administrators.

## School approval still needed before production
- The official crest supplied in the project conversation is embedded in the portal and used in branding and print layouts.
- School leadership must approve the final report-card grading scale, assessment aggregation rules and signature authorities.
- Enable Supabase leaked-password protection in Authentication → Settings → Password Security.
- School leadership's formal approval of the initial administrator and the staff account list
- Actual classes, streams, subjects, academic years and term dates
- Official grading scale and report-card layout
- Fee categories, invoice numbering, payment methods and receipt requirements
- Parent/guardian verification and student-to-guardian linking
- Data import approval, retention rules, backups and staff training

## Privacy and safety
- Do not enter real student data until the school approves the production setup.
- Keep student and guardian data in Supabase, not public source files.
- Use individual accounts; never share staff passwords.
- The fees module only records payments already received by the school. It is not a payment gateway.
- Obtain school approval and comply with Uganda's Data Protection and Privacy Act before entering personal student data.

## Current security review
- Corrected the private role helper used by school-settings RLS; verified that the school administrator can pass the update policy and execute a school-settings UPDATE (test transaction rolled back without changing data).
- Payroll staff names are exposed to payroll-authorised roles through a restricted directory table containing only profile ID, display name, role and active status; the full profiles table remains restricted.
- Payroll checks enforce deductions not exceeding gross pay, net pay consistency, a timestamp for paid entries, sequential approval/payment and locked amounts after approval.
- Assessment result trigger rejects scores above the assessment maximum.
- Row Level Security is enabled on all 23 public school tables.
- The role-assignment RPC is restricted to authenticated users and checks administrator/director permissions in the database; only an existing school administrator can grant the school-admin role.
- Supabase health advisor currently reports no health lints.
- The public role-assignment RPC is now SECURITY INVOKER and delegates to an authenticated, permission-checked function in the non-exposed private schema. The security advisor no longer flags this RPC.
- Security advisor still flags leaked-password protection as disabled. Enable leaked-password protection before production.
- Performance advisor reports multiple permissive-policy notices and unused-index information findings. Review query plans after real workload testing; do not drop indexes solely because a new database has not used them yet.

## Hosting
The repository includes a GitHub Actions Pages workflow. In repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions** if it is not already enabled.
