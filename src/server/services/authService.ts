import { Prisma, type User } from '@prisma/client';
import { emailDomain, type PublicUser, type SignupInput } from '@/shared';
import { isLocked, registerFailure, registerSuccess } from '../auth/lockout';
import { burnPasswordCheck, hashPassword, verifyPassword } from '../auth/password';
import { prisma } from '../db';
import { AppError } from '../errors';
import { allowedDomainsOf, getSettings } from './settingsService';

export function toPublicUser(u: Pick<User, 'id' | 'name' | 'email' | 'role' | 'employeeCode' | 'department'>): PublicUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    employeeCode: u.employeeCode,
    department: u.department,
  };
}

/** A1: create an EMPLOYEE account. The schema already normalised the email. */
export async function signup(input: SignupInput): Promise<PublicUser> {
  const settings = await getSettings();
  const domains = allowedDomainsOf(settings);
  if (!domains.includes(emailDomain(input.email))) {
    throw new AppError('DOMAIN_NOT_ALLOWED', 403, `Use your company email (${domains.map((d) => `@${d}`).join(' or ')})`, {
      email: `Use your company email (${domains.map((d) => `@${d}`).join(' or ')})`,
    });
  }
  const passwordHash = await hashPassword(input.password);
  try {
    const user = await prisma.user.create({
      data: { name: input.name, email: input.email, passwordHash, role: 'EMPLOYEE' },
    });
    return toPublicUser(user);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new AppError('EMAIL_EXISTS', 409, 'An account with this email already exists', {
        email: 'An account with this email already exists',
      });
    }
    throw err;
  }
}

const INVALID = () => new AppError('INVALID_CREDENTIALS', 401, 'Invalid email or password');

/** A2: verify credentials with lockout (BR11) and the disabled check (BR12). */
export async function login(email: string, password: string, nowInstant: Date): Promise<PublicUser> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    await burnPasswordCheck(password);
    throw INVALID();
  }
  if (isLocked(user, nowInstant)) {
    throw new AppError('TOO_MANY_ATTEMPTS', 429, 'Too many attempts. Try again in 15 minutes.');
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    const next = registerFailure(user, nowInstant);
    await prisma.user.update({ where: { id: user.id }, data: next });
    throw INVALID();
  }
  if (!user.isActive) {
    throw new AppError('ACCOUNT_DISABLED', 403, 'Your account is disabled. Contact the admin.');
  }
  await prisma.user.update({ where: { id: user.id }, data: registerSuccess() });
  return toPublicUser(user);
}
