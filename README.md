# Bukedea Comprehensive School — Digital Campus

A school operations portal developed by BridanX Tech LLC.

## Current build
- Responsive school portal interface
- Supabase email/password authentication
- Parent self-registration; new accounts receive the restricted parent role
- Live student record listing and authorised student admission
- Bursar payment recording for money already received by the school (no payment processing)
- Published announcements
- Role model and Row Level Security across all exposed school tables
- Dedicated Supabase project, separate from BridanX Business Manager

## Supabase project
- Project ref: `ynacnystxmlfvyqetovu`
- Region: `eu-central-1` (Frankfurt)
- API URL: `https://ynacnystxmlfvyqetovu.supabase.co`
- Browser app uses a publishable key. Never put a service-role/secret key in this repository.

## First administrator setup
1. Open the portal and create the first account using the school's nominated administrator email.
2. Confirm the email and sign in once so Supabase creates the profile.
3. In Supabase SQL Editor, promote that account using its exact approved email:

```sql
update public.profiles
set role = 'school_admin', full_name = 'School Administrator'
where lower(email) = lower('REPLACE-WITH-APPROVED-SCHOOL-ADMIN-EMAIL');
```

4. Sign out and sign back in. Do not promote an account until the school has approved its owner. Never share passwords or secret keys.

## School approval still needed before production
- Official school badge, motto, address, contacts and approved portal domain
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
