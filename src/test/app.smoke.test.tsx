import { render, screen, within, waitFor } from "@testing-library/react";
import { act } from "react";
import userEvent from "@testing-library/user-event";
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  beforeAll,
  afterEach,
} from "vitest";
import App from "../App";
import * as api from "../lib/api";
import type { Event } from "../types";

vi.mock("../context/AuthContext", async () => {
  const React = await vi.importActual<typeof import("react")>("react");

  const stubValue = {
    user: null,
    loading: false,
    authLoading: false,
    login: async () => ({ success: true }),
    register: async () => ({ success: true }),
    logout: async () => {},
    refreshProfile: async () => {},
    isAuthenticated: false,
    resetPassword: async () => ({ success: true }),
    updatePassword: async () => ({ success: true }),
    passwordResetPending: false,
    completePasswordReset: () => {},
    isOnline: true,
    lastProfileRefresh: null,
  } as const;

  const AuthContext = React.createContext<typeof stubValue>(stubValue);

  const AuthProvider = ({ children }: { children: React.ReactNode }) => (
    <AuthContext.Provider value={stubValue}>{children}</AuthContext.Provider>
  );

  return {
    AuthContext,
    AuthProvider,
    useAuth: () => React.useContext(AuthContext),
  };
});

vi.mock("../components/Navbar", async () => {
  const React = await vi.importActual<typeof import("react")>("react");
  const router = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom"
  );

  const Navbar = () => {
    const [isOpen, setIsOpen] = React.useState(false);

    return (
      <nav role="navigation">
        <div>
          <router.Link to="/" onClick={() => setIsOpen(false)}>
            <span>Impacto</span>
            <span>Local</span>
          </router.Link>
        </div>

        <button
          type="button"
          aria-controls="mobile-navigation"
          aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((current) => !current)}
        >
          {isOpen ? "Fechar menu" : "Abrir menu"}
        </button>

        <router.Link to="/login">Entrar</router.Link>
        <router.Link to="/register">Registar</router.Link>

        {isOpen ? (
          <div id="mobile-navigation">
            <router.Link to="/faq" onClick={() => setIsOpen(false)}>
              FAQ
            </router.Link>
          </div>
        ) : null}
      </nav>
    );
  };

  return { default: Navbar };
});

beforeAll(async () => {
  await Promise.all([import("../pages/Home"), import("../pages/FAQ")]);
});

const flushReactUpdates = async (delay = 0) => {
  await act(async () => {
    await Promise.resolve();
  });

  if (delay > 0) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, delay));
    });
  }
};

// Ensure fetchEvents doesn't hit the network and returns empty list for Home
beforeEach(() => {
  const emptyEvents: Event[] = [];
  vi.spyOn(api, "fetchEvents").mockResolvedValue(emptyEvents);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("App smoke", () => {
  it("renders navbar brand and navigates to FAQ (mobile menu)", async () => {
    render(<App />);
    const user = userEvent.setup();

    // Ensure Suspense fallback and auth bootstrapping settle
    await flushReactUpdates();
    await flushReactUpdates();
    await waitFor(() =>
      expect(screen.queryByText(/a carregar/i)).not.toBeInTheDocument()
    );
    await waitFor(() => expect(api.fetchEvents).toHaveBeenCalled());

    // Brand link within the navbar (avoid multiple matches from footer text)
    const navbar = await screen.findByRole("navigation");
    const brandLink = within(navbar).getByRole("link", {
      name: /impacto\s*local/i,
    });
    expect(brandLink).toBeInTheDocument();

    // Ensure public auth UI settled (links visible)
    await screen.findByRole("link", { name: /entrar/i });
    await screen.findByRole("link", { name: /registar|criar conta/i });

    // Open mobile menu via toggle button
    const menuToggle = await screen.findByRole("button", {
      name: /abrir menu/i,
    });
    await act(async () => {
      await user.click(menuToggle);
    });
    await flushReactUpdates(320);
    await screen.findByRole("button", { name: /fechar menu/i });

    // Click FAQ link in mobile menu (scope to #mobile-navigation)
    const mobileNav = document.getElementById("mobile-navigation");
    expect(mobileNav).toBeTruthy();
    const faqLink = within(mobileNav as HTMLElement).getByRole("link", {
      name: /faq/i,
    });
    await act(async () => {
      await user.click(faqLink);
    });
    await flushReactUpdates(320);

    // Assert FAQ page heading appears
    expect(
      await screen.findByRole("heading", {
        name: /tudo o que precisa de saber/i,
      })
    ).toBeInTheDocument();
  });
});
