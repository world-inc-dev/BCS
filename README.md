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
- Published announcements
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
1. Open the portal and create the first account using `info@bukedeacomprehensive.ac.ug` (only if the school controls this mailbox and has approved its use).
2. Confirm the email and sign in once so Supabase creates the profile.
3. In Supabase SQL Editor, promote that account using its exact approved email:

```sql
update public.profiles
set role = 'school_admin', full_name = 'School Administrator'
where lower(email) = lower('info@bukedeacomprehensive.ac.ug');
```

4. Sign out and sign back in. Do not promote an account until the school has approved its owner. Never share passwords or secret keys.

## School approval still needed before production
- Official school badge file and approval of the preloaded motto, address and contact details
- Nominated administrator email and staff account list
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
