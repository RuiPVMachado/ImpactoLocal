// Global test setup that stubs Supabase and DOM APIs so specs run in isolation.
import "@testing-library/jest-dom";
import { vi } from "vitest";

// Ensure required Vite env vars exist to prevent createClient from throwing
process.env.VITE_SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || "http://localhost:54321";
process.env.VITE_SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY || "test_anon_key";

type QueryResult = {
  data: unknown;
  error: unknown;
  count: number | null;
};

type QueryBuilder = {
  eq: () => QueryBuilder;
  neq: () => QueryBuilder;
  in: () => QueryBuilder;
  gte: () => QueryBuilder;
  lte: () => QueryBuilder;
  gt: () => QueryBuilder;
  lt: () => QueryBuilder;
  contains: () => QueryBuilder;
  or: () => QueryBuilder;
  ilike: () => QueryBuilder;
  order: () => QueryBuilder;
  range: () => QueryBuilder;
  limit: () => QueryBuilder;
  returns: () => QueryBuilder;
  select: () => QueryBuilder;
  update: () => QueryBuilder;
  insert: () => QueryBuilder;
  upsert: () => QueryBuilder;
  delete: () => QueryBuilder;
  single: () => Promise<{ data: unknown; error: unknown }>;
  maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
  then: (resolve: (value: QueryResult) => unknown) => Promise<unknown>;
};

// Build a chainable query builder stub that supports common methods and is thenable
function makeQueryBuilder(defaultData: unknown = null): QueryBuilder {
  const result: QueryResult = { data: defaultData, error: null, count: null };
  const builder: QueryBuilder = {
    eq: () => builder,
    neq: () => builder,
    in: () => builder,
    gte: () => builder,
    lte: () => builder,
    gt: () => builder,
    lt: () => builder,
    contains: () => builder,
    or: () => builder,
    ilike: () => builder,
    order: () => builder,
    range: () => builder,
    limit: () => builder,
    returns: () => builder,
    select: () => builder,
    update: () => builder,
    insert: () => builder,
    upsert: () => builder,
    delete: () => builder,
    single: async () => ({ data: null, error: null }),
    maybeSingle: async () => ({ data: null, error: null }),
    then: async (resolve) => resolve({ ...result }),
  };
  return builder;
}

// Provide a stubbed supabase client via module mock
const supabaseStub = {
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    getUser: async () => ({ data: { user: null }, error: null }),
    onAuthStateChange: () => ({
      data: { subscription: { unsubscribe: () => {} } },
    }),
    signInWithPassword: async () => ({
      data: { user: null, session: null },
      error: null,
    }),
    signUp: async () => ({ data: { user: null, session: null }, error: null }),
    signOut: async () => ({ error: null }),
    updateUser: async () => ({ data: { user: null }, error: null }),
  },
  from: () => makeQueryBuilder([]),
  functions: { invoke: async () => ({ data: null, error: null }) },
};

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => supabaseStub,
}));
