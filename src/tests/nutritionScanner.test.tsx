// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { Scanner } from "../features/nutrition/Nutrition";
const {decode}=vi.hoisted(()=>({decode:vi.fn()}));
vi.mock("@zxing/browser",()=>({BrowserMultiFormatReader:class {decodeFromConstraints=decode;}}));
beforeEach(()=>{decode.mockReset();});
afterEach(cleanup);
it("retains rear-camera constraints, emits a decoded barcode once and stops the existing reader",async()=>{
  const stop=vi.fn(),onCode=vi.fn();decode.mockResolvedValue({stop});
  const view=render(<Scanner onCode={onCode} onClose={()=>{}}/>);
  await waitFor(()=>expect(decode).toHaveBeenCalledTimes(1));
  await waitFor(()=>expect(screen.getByRole("status").textContent).toContain("Barcode"));
  const [constraints,video,callback]=decode.mock.calls[0];
  expect(constraints).toEqual({video:{facingMode:"environment"},audio:false});
  expect(video.tagName).toBe("VIDEO");expect(video.playsInline).toBe(true);
  callback({getText:()=>"12345678"});callback({getText:()=>"12345678"});
  expect(onCode).toHaveBeenCalledExactlyOnceWith("12345678");
  view.unmount();expect(stop).toHaveBeenCalled();
});
it("retains manual-barcode fallback when camera permission or initialization fails",async()=>{
  decode.mockRejectedValue(Error("permission denied"));
  render(<Scanner onCode={()=>{}} onClose={()=>{}}/>);
  await screen.findByText("Kamera nicht verfügbar. Barcode bitte manuell eingeben.");
});
it("stops a late camera initialization after the scanner was closed",async()=>{
  let resolve!:(value:unknown)=>void;
  decode.mockReturnValue(new Promise(r=>resolve=r));
  const stop=vi.fn(),onCode=vi.fn();const view=render(<Scanner onCode={onCode} onClose={()=>{}}/>);
  await waitFor(()=>expect(decode).toHaveBeenCalledTimes(1));view.unmount();
  resolve({stop});await waitFor(()=>expect(stop).toHaveBeenCalled());
  decode.mock.calls[0][2]({getText:()=>"12345678"});expect(onCode).not.toHaveBeenCalled();
});
