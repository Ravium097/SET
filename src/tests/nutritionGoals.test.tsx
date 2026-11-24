// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { beforeEach, afterEach, expect, it } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { db, init, exportData, restore, nutritionDefaults, nutritionGoalsSchema, type NutritionEntry } from "../data";
import { estimateNeeds, dailyNutrients, GoalsSummary } from "../features/nutrition/Goals";
import { NutritionPreferencesForm } from "../features/nutrition/Preferences";
beforeEach(async()=>{for(const t of db.tables)await t.clear();await init();});
afterEach(cleanup);
it("estimates maintenance only from explicit, valid adult inputs",()=>{
 const profile={age:30,weight:80,height:180,coefficient:"male" as const,activity:1.6};
 expect(estimateNeeds(profile)).toBe(2848);
 expect(estimateNeeds({...profile,coefficient:"female"})).toBe(2582);
 expect(estimateNeeds({...profile,age:undefined})).toBeUndefined();
 expect(estimateNeeds({...profile,age:17})).toBeUndefined();
 expect(estimateNeeds({...profile,weight:NaN})).toBeUndefined();
 expect(nutritionGoalsSchema.safeParse({enabled:true,kcal:-1}).success).toBe(false);
 expect(nutritionGoalsSchema.safeParse({enabled:true,protein:0}).success).toBe(true);
});
it("keeps partial diary totals incomplete and never assumes unknown portions",()=>{
 const base:NutritionEntry={id:"1",name:"Test",date:"2026-11-24",time:"08:00",meal:"Frühstück",amount:50,unit:"g",notes:"",kcal:200};
 expect(dailyNutrients([base,{...base,id:"2",unit:"Portion"}],"kcal")).toEqual({total:100,known:1,complete:false});
 expect(dailyNutrients([base,{...base,id:"2",unit:"Portion",amount:1,nutrientBasis:"portion"}],"kcal").total).toBe(300);
 render(<MemoryRouter><GoalsSummary goals={{enabled:true,kcal:2000}} entries={[{...base,kcal:undefined}]}/></MemoryRouter>);
 expect(screen.getAllByText("Angaben unvollständig")).toHaveLength(4);
 expect(screen.getByText("2.000 kcal Tagesziel")).toBeTruthy();
});
it("saves manual goals through the existing preferences form and backup",async()=>{
 render(<NutritionPreferencesForm settings={(await db.settings.get("settings"))!}/>);
 fireEvent.click(screen.getByLabelText("Persönliche Ziele im Tagebuch anzeigen"));
 fireEvent.change(screen.getByLabelText("Kalorien pro Tag (kcal)"),{target:{value:"2300"}});
 fireEvent.change(screen.getByLabelText("Eiweiß pro Tag (g)"),{target:{value:"140"}});
 fireEvent.click(screen.getByText("Ernährungseinstellungen speichern"));
 await waitFor(()=>expect(screen.getByText("Ernährungseinstellungen gespeichert.")).toBeTruthy());
 expect((await db.settings.get("settings"))?.nutritionPreferences?.goals).toEqual({enabled:true,kcal:2300,protein:140});
 const backup=await exportData();await restore(JSON.parse(JSON.stringify(backup)));
 expect((await db.settings.get("settings"))?.nutritionPreferences?.goals?.kcal).toBe(2300);
});
it("copies an estimate only after explicit selection and retains goals when hidden",async()=>{
 render(<NutritionPreferencesForm settings={{...(await db.settings.get("settings"))!,nutritionPreferences:{...nutritionDefaults,goals:{enabled:false,kcal:2100,profile:{age:30,weight:80,height:180,coefficient:"male",activity:1.6}}}}}/>);
 expect((screen.getByLabelText("Kalorien pro Tag (kcal)") as HTMLInputElement).value).toBe("2100");
 fireEvent.click(screen.getByText("Als Kalorienziel übernehmen"));
 expect((screen.getByLabelText("Kalorien pro Tag (kcal)") as HTMLInputElement).value).toBe("2848");
 fireEvent.click(screen.getByLabelText("Persönliche Ziele im Tagebuch anzeigen"));
 fireEvent.click(screen.getByText("Ernährungseinstellungen speichern"));
 await waitFor(()=>expect(screen.getByText("Ernährungseinstellungen gespeichert.")).toBeTruthy());
 expect((await db.settings.get("settings"))?.nutritionPreferences?.goals).toMatchObject({enabled:false,kcal:2848});
});
