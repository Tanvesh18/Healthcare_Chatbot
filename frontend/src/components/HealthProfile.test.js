import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import HealthProfile from "./HealthProfile";
import { apiJson } from "../api";

jest.mock("../api", () => ({
  apiFetch: jest.fn(),
  apiJson: jest.fn()
}));

const user = {
  privacyConsents: {
    aiProfilePersonalization: { enabled: false },
    locationCareSearch: { enabled: true }
  }
};

function renderProfile(overrides = {}) {
  return render(
    <HealthProfile
      user={overrides.user || user}
      onSaved={overrides.onSaved}
      standalone
    />
  );
}

test("renders accessible privacy choices with data sharing explanations", () => {
  renderProfile();

  expect(screen.getByRole("checkbox", {
    name: /use my saved health profile to personalize ai responses/i
  })).not.toBeChecked();
  expect(screen.getByText(/relevant saved health details are sent to groq/i)).toBeInTheDocument();
  expect(screen.getByRole("checkbox", {
    name: /use my location to find nearby care/i
  })).toBeChecked();
  expect(screen.getByText(/coordinates are sent to openstreetmap overpass, with nominatim as a fallback/i)).toBeInTheDocument();
});

test("saves enabled and revoked privacy preferences", async () => {
  const onSaved = jest.fn();
  const updatedUser = {
    privacyConsents: {
      aiProfilePersonalization: { enabled: true },
      locationCareSearch: { enabled: false }
    }
  };
  apiJson.mockResolvedValue(updatedUser);
  renderProfile({ onSaved });

  fireEvent.click(screen.getByRole("checkbox", {
    name: /use my saved health profile to personalize ai responses/i
  }));
  fireEvent.click(screen.getByRole("checkbox", {
    name: /use my location to find nearby care/i
  }));
  fireEvent.click(screen.getByRole("button", { name: /save privacy settings/i }));

  await waitFor(() => {
    expect(apiJson).toHaveBeenCalledWith("/api/auth/privacy-consents", {
      method: "PATCH",
      body: JSON.stringify({
        aiProfilePersonalization: true,
        locationCareSearch: false
      })
    });
  });
  expect(onSaved).toHaveBeenCalledWith(updatedUser);
});
