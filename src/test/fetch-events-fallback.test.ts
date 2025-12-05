import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Event } from "../types";
import type { PaginatedResponse } from "../lib/api";

type PermissionDeniedError = { message: string; code: string };

type SelectResult<TData> = {
  data: TData | null;
  error: PermissionDeniedError | null;
  count: number | null;
};

type MockQueryBuilder<TData> = {
  eq: () => MockQueryBuilder<TData>;
  or: () => MockQueryBuilder<TData>;
  range: () => MockQueryBuilder<TData>;
  limit: () => MockQueryBuilder<TData>;
  order: () => MockQueryBuilder<TData>;
  then: <TResult>(
    resolve: (value: SelectResult<TData>) => TResult
  ) => Promise<TResult>;
};

// Build a minimal thenable query builder to simulate Supabase
function makeThenable<TData>(
  result: SelectResult<TData>
): MockQueryBuilder<TData> {
  return {
    eq: () => makeThenable(result),
    or: () => makeThenable(result),
    range: () => makeThenable(result),
    limit: () => makeThenable(result),
    order: () => makeThenable(result),
    then: async (resolve) => resolve(result),
  };
}

const isPaginatedResponse = (
  value: Event[] | PaginatedResponse<Event>
): value is PaginatedResponse<Event> => {
  return typeof (value as PaginatedResponse<Event>).page === "number";
};

describe("fetchEvents fallback", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("falls back to non-joined query on RLS permission error and returns paginated estimation", async () => {
    const nowIso = new Date().toISOString();

    const fallbackRows = [
      {
        id: "e1",
        organization_id: "org1",
        title: "Evento 1",
        description: "Desc",
        category: "Social",
        address: "Rua A",
        lat: null,
        lng: null,
        date: nowIso,
        duration: "2h",
        volunteers_needed: 10,
        volunteers_registered: 2,
        post_event_summary: null,
        post_event_gallery_urls: null,
        status: "open",
        image_url: null,
        created_at: nowIso,
        updated_at: nowIso,
      },
      {
        id: "e2",
        organization_id: "org2",
        title: "Evento 2",
        description: "Desc",
        category: "Ambiente",
        address: "Rua B",
        lat: null,
        lng: null,
        date: nowIso,
        duration: "1h 30m",
        volunteers_needed: 5,
        volunteers_registered: 1,
        post_event_summary: null,
        post_event_gallery_urls: null,
        status: "open",
        image_url: null,
        created_at: nowIso,
        updated_at: nowIso,
      },
    ];

    const supabaseMock = {
      functions: {
        invoke: async () => ({ data: { success: true }, error: null as null }),
      },
      from: (table: string) => {
        expect(table).toBe("events");
        return {
          select: (selectStatement: string, opts?: Record<string, unknown>) => {
            void opts;
            // First call with join triggers a permission error
            if (selectStatement.includes("organization:profiles")) {
              const error: PermissionDeniedError = {
                message: "permission denied",
                code: "PGRST302",
              };
              return makeThenable<Event[]>({ data: null, error, count: null });
            }
            // Fallback path without join returns rows
            return makeThenable({
              data: fallbackRows,
              error: null,
              count: fallbackRows.length,
            });
          },
        };
      },
    };

    vi.doMock("../lib/supabase", () => ({ supabase: supabaseMock }));

    const { fetchEvents } = await import("../lib/events");

    const page = 1;
    const pageSize = 10;
    const result = await fetchEvents({ page, pageSize });

    expect(result).toMatchObject({ page, pageSize });
    if (!isPaginatedResponse(result)) {
      throw new Error("Expected paginated response");
    }

    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data.length).toBe(2);
    // estimated total equals page * pageSize because length < pageSize
    expect(result.total).toBe(10);
    expect(result.totalPages).toBe(1);
  });
});
