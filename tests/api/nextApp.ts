/// <reference types="vite/client" />
/**
 * Serves the Next.js route handlers (src/app/api/**\/route.ts) through a plain Node request listener, so
 * Supertest can call the API in-process, the way it called the Express app before. Routing follows Next:
 * static segments beat [dynamic] ones, which beat [[...catch-all]]; a missing method is 405.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { runWithEnv, type Env } from '@/server/env';
import type { NextRouteArgs, RouteHandler } from '@/server/http/route';

type RouteModule = Partial<Record<string, RouteHandler>>;

const modules = import.meta.glob<RouteModule>('../../src/app/api/**/route.ts', { eager: true });

type Segment = { kind: 'static'; value: string } | { kind: 'dynamic'; name: string } | { kind: 'catchAll'; name: string; optional: boolean };

interface ApiRoute {
  segments: Segment[];
  mod: RouteModule;
}

function parseSegment(s: string): Segment {
  const optional = /^\[\[\.\.\.(\w+)\]\]$/.exec(s);
  if (optional?.[1]) return { kind: 'catchAll', name: optional[1], optional: true };
  const catchAll = /^\[\.\.\.(\w+)\]$/.exec(s);
  if (catchAll?.[1]) return { kind: 'catchAll', name: catchAll[1], optional: false };
  const dynamic = /^\[(\w+)\]$/.exec(s);
  if (dynamic?.[1]) return { kind: 'dynamic', name: dynamic[1] };
  return { kind: 'static', value: s };
}

const ROUTES: ApiRoute[] = Object.entries(modules).map(([file, mod]) => {
  const rel = file.replace(/^.*\/src\/app\//, '').replace(/\/route\.ts$/, '');
  const segments = rel
    .split('/')
    .filter((s) => s && !/^\(.*\)$/.test(s))
    .map(parseSegment);
  return { segments, mod };
});

const RANK = { static: 0, dynamic: 1, catchAll: 2 } as const;

function match(pathname: string): { route: ApiRoute; params: Record<string, string | string[]> } | undefined {
  const parts = pathname.split('/').filter(Boolean).map((p) => decodeURIComponent(p));
  const found: { route: ApiRoute; params: Record<string, string | string[]>; rank: number[] }[] = [];
  for (const route of ROUTES) {
    const params: Record<string, string | string[]> = {};
    const rank: number[] = [];
    let ok = true;
    let i = 0;
    for (const seg of route.segments) {
      rank.push(RANK[seg.kind]);
      if (seg.kind === 'catchAll') {
        const rest = parts.slice(i);
        if (!seg.optional && rest.length === 0) ok = false;
        if (rest.length) params[seg.name] = rest;
        i = parts.length;
        break;
      }
      const part = parts[i];
      if (part === undefined) {
        ok = false;
        break;
      }
      if (seg.kind === 'static' && seg.value !== part) {
        ok = false;
        break;
      }
      if (seg.kind === 'dynamic') params[seg.name] = part;
      i += 1;
    }
    if (ok && i === parts.length) found.push({ route, params, rank });
  }
  found.sort((a, b) => {
    for (let k = 0; k < Math.max(a.rank.length, b.rank.length); k++) {
      const d = (a.rank[k] ?? -1) - (b.rank[k] ?? -1);
      if (d !== 0) return d;
    }
    return 0;
  });
  return found[0];
}

async function readBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
}

function toRequest(req: IncomingMessage, body: Buffer): Request {
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (Array.isArray(v)) v.forEach((x) => headers.append(k, x));
    else if (v !== undefined) headers.set(k, v);
  }
  const url = `http://${req.headers.host ?? 'localhost'}${req.url ?? '/'}`;
  const method = req.method ?? 'GET';
  return new Request(url, { method, headers, body: method === 'GET' || method === 'HEAD' || body.length === 0 ? undefined : body });
}

async function send(res: ServerResponse, response: Response): Promise<void> {
  res.statusCode = response.status;
  const cookies = response.headers.getSetCookie();
  response.headers.forEach((value, key) => {
    if (key !== 'set-cookie') res.setHeader(key, value);
  });
  if (cookies.length) res.setHeader('set-cookie', cookies);
  res.end(Buffer.from(await response.arrayBuffer()));
}

/** A request listener for Supertest. `config` replaces the environment's configuration for its requests. */
export function createApp(config?: Env) {
  return (req: IncomingMessage, res: ServerResponse): void => {
    const run = async () => {
      const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
      const found = pathname === '/api' || pathname.startsWith('/api/') ? match(pathname) : undefined;
      if (!found) {
        await send(res, Response.json({ error: { code: 'NOT_FOUND', message: 'Not found' } }, { status: 404 }));
        return;
      }
      const method = (req.method ?? 'GET').toUpperCase();
      const handler = found.route.mod[method];
      if (!handler) {
        await send(res, new Response(null, { status: 405 }));
        return;
      }
      const request = toRequest(req, await readBody(req));
      const args: NextRouteArgs = { params: Promise.resolve(found.params) };
      await send(res, await (config ? runWithEnv(config, () => handler(request, args)) : handler(request, args)));
    };
    run().catch((err: unknown) => {
      res.statusCode = 500;
      res.end(String(err));
    });
  };
}
