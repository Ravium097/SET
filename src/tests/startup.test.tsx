// @vitest-environment jsdom
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { StartupBoundary } from "../components/pwa/StartupBoundary";
afterEach(()=>{cleanup();vi.restoreAllMocks();});
it("keeps healthy content visible",()=>{render(<StartupBoundary><p>Training</p></StartupBoundary>);expect(screen.getByText("Training")).toBeDefined();});
it("offers a non-destructive recovery link when rendering fails",()=>{
 vi.spyOn(console,"error").mockImplementation(()=>{});
 const Broken=():React.ReactNode=>{throw Error("test");};
 render(<StartupBoundary><Broken/></StartupBoundary>);
 expect(screen.getByRole("link",{name:"Starthilfe öffnen"}).getAttribute("href")).toBe("/recovery.html");
 expect(screen.getByText("Deine gespeicherten Trainings wurden nicht gelöscht.")).toBeDefined();
});
