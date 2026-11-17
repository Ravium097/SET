// @vitest-environment jsdom
import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { RestDuration } from "../components/settings/RestDuration";
afterEach(cleanup);
it("allows clearing and typing without intermediate writes then saves on blur", async () => {
  const save = vi.fn().mockResolvedValue(undefined);
  render(<RestDuration value={90} onSave={save} />);
  const input = screen.getByLabelText("Standardpause · Sekunden");
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: "" } });
  expect((input as HTMLInputElement).value).toBe("");
  fireEvent.change(input, { target: { value: "1" } });
  fireEvent.change(input, { target: { value: "120" } });
  expect(save).not.toHaveBeenCalled();
  fireEvent.blur(input);
  await waitFor(() =>
    expect(
      screen.getByText("Pausenzeit gespeichert: 120 Sekunden."),
    ).toBeTruthy(),
  );
  expect(save).toHaveBeenCalledExactlyOnceWith(120);
});
it("keeps an unfinished draft during database updates and rejects empty/out-of-range values", () => {
  const save = vi.fn();
  const view = render(<RestDuration value={90} onSave={save} />);
  const input = screen.getByLabelText("Standardpause · Sekunden");
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: "" } });
  view.rerender(<RestDuration value={60} onSave={save} />);
  expect((input as HTMLInputElement).value).toBe("");
  fireEvent.blur(input);
  expect(save).not.toHaveBeenCalled();
  expect(screen.getByText(/Bitte eine ganze Zahl/)).toBeTruthy();
  for (const value of ["0", "3601"]) {
    fireEvent.change(input, { target: { value } });
    fireEvent.click(screen.getByRole("button"));
  }
  expect(save).not.toHaveBeenCalled();
});
it("prevents duplicate writes and preserves draft after storage failure", async () => {
  const save = vi.fn().mockRejectedValue(new Error("disk full"));
  render(<RestDuration value={90} onSave={save} />);
  const input = screen.getByLabelText("Standardpause · Sekunden");
  fireEvent.change(input, { target: { value: "180" } });
  fireEvent.blur(input);
  fireEvent.click(screen.getByRole("button"));
  await waitFor(() =>
    expect(screen.getByText(/nicht gespeichert/)).toBeTruthy(),
  );
  expect(save).toHaveBeenCalledTimes(1);
  expect((input as HTMLInputElement).value).toBe("180");
  save.mockResolvedValueOnce(undefined);
  fireEvent.click(screen.getByRole("button"));
  await waitFor(() =>
    expect(screen.getByText(/gespeichert: 180/)).toBeTruthy(),
  );
});
