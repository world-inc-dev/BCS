# Bukedea Comprehensive School — Digital Campus

A school operations portal developed by BridanX Tech LLC.

## Current build
- Responsive school portal interface
- Supabase email/password authentication
- Parent self-registration; new accounts receive the restricted parent role
- Live student record listing, authorised student admission and class enrolment
- Academic year, term, class, subject and class-subject setup
- Daily attendance registers for enrolled students
- Assessment creation and teacher mark entry with score validation
- Verified guardian-to-student linking and a parent portal with attendance, assessment and fee summaries
- Fee categories, student invoices and receipt records for payments already received
- School circulars, announcements, bursar expense records and live operational summaries
- Bursar payment recording for money already received by the school (no payment processing)
- Published announcements and printable school circulars\n- Branded Print Studio for payment receipts, student fee statements, student profiles, academic progress extracts, attendance registers and circulars; print layouts include a school identity header, motto, footer and badge watermark
- Role model and Row Level Security across all exposed school tables
- Dedicated Supabase project, separate from BridanX Business Manager

## Supabase project
- Project ref: `ynacnystxmlfvyqetovu`
- Region: `eu-central-1` (Frankfurt)
- API URL: `https://ynacnystxmlfvyqetovu.supabase.co`
- Browser app uses a publishable key. Never put a service-role/secret key in this repository.

## Official school identity
The school identity and contact details are preloaded from the school's public website:
- Motto: `Be A Force For Good`
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
- Upload/confirm the official school badge and save its approved image URL in Print Studio → Document branding; the badge watermark falls back to a BCS monogram until the authentic crest is supplied\n- Approval of the preloaded motto, address and contact details
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

## Hosting
The repository includes a GitHub Actions Pages workflow. In repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions** if it is not already enabled.
