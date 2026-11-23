-- Sign-up domains are the company's real domains: @rubicotech.com and @rubicotech.in (change request, 19 Nov 2026)
ALTER TABLE "Settings" ALTER COLUMN "allowedDomains" SET DEFAULT 'rubicotech.com,rubicotech.in';

-- Installs still on an earlier default move to the new domains; a custom list set by an admin is left alone
UPDATE "Settings" SET "allowedDomains" = 'rubicotech.com,rubicotech.in'
WHERE "allowedDomains" IN ('company.com', 'company.com,company.in');
