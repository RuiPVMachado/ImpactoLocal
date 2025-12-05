import { describe, it, expect, vi, beforeEach } from "vitest";

type UpdateChain<Row> = {
  eq: () => {
    select: () => {
      maybeSingle: () => Promise<{ data: Row; error: null }>;
    };
  };
};

// Build a tiny fluent mock for Postgrest update chain
function makeUpdateChain<Row>(row: Row): UpdateChain<Row> {
  return {
    eq: () => ({
      select: () => ({
        maybeSingle: async () => ({ data: row, error: null }),
      }),
    }),
  };
}

describe("updateProfile normalization", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("trims, lowercases email, sanitizes gallery, and normalizes stats and avatar", async () => {
    const nowIso = new Date().toISOString();

    let capturedUpdatePayload: Record<string, unknown> | null = null;
    let capturedAuthMetadata: Record<string, unknown> | null = null;

    const supabaseMock = {
      auth: {
        updateUser: async (args: { data: Record<string, unknown> }) => {
          capturedAuthMetadata = args.data;
          return { data: { user: null }, error: null };
        },
        getSession: async () => ({ data: { session: null }, error: null }),
      },
      from: (table: string) => ({
        update: (payload: Record<string, unknown>) => {
          expect(table).toBe("profiles");
          capturedUpdatePayload = payload;
          // Return a row mirroring storage layer fields
          const row = {
            id: "user1",
            email: payload.email,
            name: payload.name,
            type: "volunteer",
            avatar_url: payload.avatar_url ?? null,
            phone: payload.phone ?? null,
            bio: payload.bio ?? null,
            city: payload.city ?? null,
            location: payload.location ?? null,
            mission: payload.mission ?? null,
            vision: payload.vision ?? null,
            history: payload.history ?? null,
            gallery_urls: payload.gallery_urls ?? [],
            stats_events_held: payload.stats_events_held ?? null,
            stats_volunteers_impacted:
              payload.stats_volunteers_impacted ?? null,
            stats_hours_contributed: payload.stats_hours_contributed ?? null,
            stats_beneficiaries_served:
              payload.stats_beneficiaries_served ?? null,
            created_at: nowIso,
            updated_at: payload.updated_at ?? nowIso,
          };
          return makeUpdateChain(row);
        },
      }),
    };

    vi.doMock("../lib/supabase", () => ({ supabase: supabaseMock }));

    const { updateProfile } = await import("../lib/profiles");

    const result = await updateProfile({
      id: "user1",
      name: "  John   Doe  ",
      email: "  USER@Example.Com  ",
      phone: "   ", // becomes null
      bio: "  Bio about me  ",
      city: "", // becomes null
      location: "  Lisbon  ",
      avatarUrl: "   ", // becomes null
      mission: undefined, // unchanged
      vision: "  ", // becomes null
      history: "My path  ",
      galleryUrls: ["  https://img/1.jpg  ", "   ", "", "https://img/2.jpg"],
      impactStats: {
        eventsHeld: 12.7, // -> 13
        volunteersImpacted: -5, // -> 0 (non-negative)
        hoursContributed: 3.4, // -> 3
        beneficiariesServed: null, // -> null
      },
    });

    // Supabase update payload assertions
    expect(capturedUpdatePayload).toBeTruthy();
    expect(capturedUpdatePayload!.email).toBe("user@example.com");
    expect(capturedUpdatePayload!.name).toBe("John   Doe");
    expect(capturedUpdatePayload!.phone).toBeNull();
    expect(capturedUpdatePayload!.bio).toBe("Bio about me");
    expect(capturedUpdatePayload!.city).toBeNull();
    expect(capturedUpdatePayload!.location).toBe("Lisbon");
    expect(capturedUpdatePayload!.avatar_url).toBeNull();
    expect(capturedUpdatePayload!.vision).toBeNull();
    expect(capturedUpdatePayload!.history).toBe("My path");
    expect(capturedUpdatePayload!.gallery_urls).toEqual([
      "https://img/1.jpg",
      "https://img/2.jpg",
    ]);
    expect(capturedUpdatePayload!.stats_events_held).toBe(13);
    expect(capturedUpdatePayload!.stats_volunteers_impacted).toBe(0);
    expect(capturedUpdatePayload!.stats_hours_contributed).toBe(3);
    expect(capturedUpdatePayload!.stats_beneficiaries_served).toBeNull();

    // Auth metadata update assertions
    expect(capturedAuthMetadata).toBeTruthy();
    expect(capturedAuthMetadata!.name).toBe("John   Doe");
    expect(capturedAuthMetadata!.avatar_url).toBeNull(); // provided but normalized to null
    expect(capturedAuthMetadata!.gallery_urls).toEqual([
      "https://img/1.jpg",
      "https://img/2.jpg",
    ]);

    // Return mapping to domain Profile
    expect(result.name).toBe("John   Doe");
    expect(result.email).toBe("user@example.com");
    expect(result.avatarUrl).toBeNull();
    expect(result.galleryUrls).toEqual([
      "https://img/1.jpg",
      "https://img/2.jpg",
    ]);
    expect(result.impactStats).toEqual({
      eventsHeld: 13,
      volunteersImpacted: 0,
      hoursContributed: 3,
      beneficiariesServed: null,
    });
  });
});
