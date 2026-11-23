-- Company email can be @company.com or @company.in (change request, 19 Nov 2026)
ALTER TABLE "Settings" ALTER COLUMN "allowedDomains" SET DEFAULT 'company.com,company.in';

-- Existing installs still on the old default get both domains; a custom list set by an admin is left alone
UPDATE "Settings" SET "allowedDomains" = 'company.com,company.in' WHERE "allowedDomains" = 'company.com';
