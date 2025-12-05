// Regression tests for volunteer statistics aggregation (duration parsing, scaling).
import { describe, it, expect, vi, afterEach } from "vitest";
import type { ApplicationStatus, Event } from "../types";

type EventStub = Pick<Event, "date" | "duration" | "status"> & {
  id?: string;
};

type ApplicationRowStub = {
  status: ApplicationStatus;
  event: EventStub | EventStub[] | null;
};

const processSuccessStub = {
  success: true as const,
  completedEventIds: [],
  skippedEventIds: [],
  completedCount: 0,
  processedAt: "2024-01-01T00:00:00.000Z",
};

function createSupabaseMock(rows: ApplicationRowStub[]) {
  const invoke = vi.fn(async () => ({
    data: processSuccessStub,
    error: null,
  }));

  return {
    invoke,
    from: vi.fn((table: string) => {
      expect(table).toBe("applications");
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() =>
            Promise.resolve({
              data: rows,
              error: null,
            })
          ),
        })),
      };
    }),
    functions: {
      invoke,
    },
  };
}

async function setupFetchVolunteerStatistics(rows: ApplicationRowStub[]) {
  vi.resetModules();
  const client = createSupabaseMock(rows);
  vi.doMock("../lib/supabase", () => ({
    supabase: client,
  }));

  const apiModule = await import("../lib/api");

  vi.doUnmock("../lib/supabase");

  return {
    fetchVolunteerStatistics: apiModule.fetchVolunteerStatistics,
    invokeMock: client.invoke,
  };
}

describe("fetchVolunteerStatistics", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    vi.doUnmock("../lib/supabase");
    vi.resetModules();
  });

  it("computes volunteer stats across mixed applications", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-05-01T12:00:00Z"));

    const rows: ApplicationRowStub[] = [
      {
        status: "approved",
        event: {
          id: "evt-1",
          date: "2024-04-10T10:00:00Z",
          duration: "2h 30m",
          status: "completed",
        },
      },
      {
        status: "approved",
        event: {
          id: "evt-2",
          date: "2024-06-01T10:00:00Z",
          duration: "01:45",
          status: "completed",
        },
      },
      {
        status: "approved",
        event: [
          {
            id: "evt-3",
            date: "2024-03-15T15:00:00Z",
            duration: "90m",
            status: "open",
          },
        ],
      },
      {
        status: "rejected",
        event: {
          id: "evt-4",
          date: "2024-02-01T09:00:00Z",
          duration: "3h",
          status: "completed",
        },
      },
    ];

    const { fetchVolunteerStatistics, invokeMock } =
      await setupFetchVolunteerStatistics(rows);

    const stats = await fetchVolunteerStatistics("vol-123");

    expect(stats).toEqual({
      totalVolunteerHours: 5.8,
      eventsAttended: 3,
      eventsCompleted: 2,
      participationRate: 0.75,
      totalApplications: 4,
    });
    expect(invokeMock).toHaveBeenCalledTimes(1);
  });

  it("handles 500 approved applications without degrading aggregates", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-05-01T12:00:00Z"));

    const rows: ApplicationRowStub[] = Array.from(
      { length: 500 },
      (_, index) => ({
        status: "approved",
        event: {
          id: `evt-${index}`,
          date: "2024-04-01T08:00:00Z",
          duration: "2h",
          status: index % 2 === 0 ? "completed" : "open",
        },
      })
    );

    const { fetchVolunteerStatistics } = await setupFetchVolunteerStatistics(
      rows
    );

    const stats = await fetchVolunteerStatistics("vol-stress");

    expect(stats.eventsAttended).toBe(500);
    expect(stats.eventsCompleted).toBe(250);
    expect(stats.totalVolunteerHours).toBe(1000);
    expect(stats.participationRate).toBe(1);
    expect(stats.totalApplications).toBe(500);
  });
});
