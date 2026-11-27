// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { beforeEach, afterEach, expect, it } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { db, init, exportData, restore, type Workout } from "../data";
import { ActivityDots, Dashboard, dashboardData } from "../features/Dashboard";
import { format } from "date-fns";
const localDay = () => format(new Date(), "yyyy-MM-dd");
const workout=(id:string,date:string,status:Workout["status"]="completed"):Workout=>({id,date,status,name:"Oberkörper",started:0,duration:60,exercises:[]});
beforeEach(async()=>{for(const t of db.tables)await t.clear();await init();await db.workouts.put(workout("today",localDay()));});
afterEach(cleanup);
it("uses only completed, non-future training data for calendar and seven-day metrics",()=>{
 const data=dashboardData([workout("a","2026-11-24"),workout("b","2026-11-18"),workout("c","2026-11-17"),workout("future","2026-11-25"),workout("template","2026-11-24","template"),workout("active","2026-11-24","active")],new Date("2026-11-24T12:00:00"));
 expect(data.lastSeven.map(w=>w.id)).toEqual(["a","b"]);expect(data.today).toHaveLength(1);expect(data.week).toHaveLength(1);expect(data.active?.id).toBe("active");
});
it("counts training days correctly across year boundaries rather than inventing activity",()=>{
 render(<ActivityDots workouts={[workout("a","2025-12-12"),workout("b","2025-12-12"),workout("c","2026-01-01")]} now={new Date("2026-01-10T12:00:00")}/>);
 expect(screen.getByRole("img",{name:"November 2025: 0 Trainingstage"})).toBeTruthy();
 expect(screen.getByRole("img",{name:"Dezember 2025: 1 Trainingstage"})).toBeTruthy();
 expect(screen.getByRole("img",{name:"Januar 2026: 1 Trainingstage"})).toBeTruthy();
});
it("persists widget preferences in settings and backups and hides a disabled diary",async()=>{
 render(<MemoryRouter><Dashboard/></MemoryRouter>);
 fireEvent.click(await screen.findByRole("button",{name:"Dashboard anpassen"}));
 expect(screen.queryByRole("checkbox",{name:"Tagebuch"})).toBeNull();
 fireEvent.click(screen.getByRole("checkbox",{name:"Körpergewicht"}));
 await waitFor(()=>expect(screen.queryByText("Gewicht hinterlegen")).toBeNull());
 const backup=await exportData();await restore(backup);
 expect((await db.settings.get("settings"))?.dashboardWidgets).not.toContain("body");
});
it("shows a real active-workout resume link and saved body weight",async()=>{
 await db.workouts.put(workout("active",localDay(),"active"));
 const {nutritionDefaults}=await import("../data");
 await db.settings.update("settings",{nutritionPreferences:{...nutritionDefaults,goals:{enabled:false,profile:{weight:80}}}});
 render(<MemoryRouter><Dashboard/></MemoryRouter>);
 const link=await screen.findByRole("link",{name:/Training fortsetzen/});expect(link.getAttribute("href")).toBe("/workout/active");
 expect(screen.getByText("Aus deinen gespeicherten Angaben")).toBeTruthy();
 expect(screen.getByText("80")).toBeTruthy();
});
it("ignores legacy enabled diary widgets without changing stored settings or archives", async()=>{
 await db.settings.update('settings',{nutrition:true,hydration:true,dashboardLayout:[{id:'old-diary',kind:'nutrition',size:'large',hidden:false},{id:'training-kept',kind:'training',size:'small',hidden:false}]});
 await db.nutrition.put({id:'archived',date:'2026-11-24',time:'08:00',name:'Anonymisiert',meal:'Frühstück',amount:1,unit:'Portion',notes:''});
 render(<MemoryRouter><Dashboard/></MemoryRouter>);
 await waitFor(()=>expect(document.querySelector('[data-widget-id="training-kept"]')).toBeTruthy());
 expect(document.querySelector('[data-widget-id="old-diary"]')).toBeNull();
 expect(document.querySelector('[data-widget-id="training-kept"]')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Dashboard anpassen'}));
 expect(screen.queryByRole('checkbox',{name:'Tagebuch'})).toBeNull();
 expect((await exportData()).nutrition?.[0].id).toBe('archived');
 expect((await db.settings.get('settings'))?.dashboardLayout?.[0].id).toBe('old-diary');
});
