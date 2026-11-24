// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { db, init } from "../data";
import { Nutrition } from "../features/nutrition/Nutrition";
beforeEach(async()=>{
  for(const table of db.tables) await table.clear();await init();
  await db.settings.update("settings",{nutrition:true});
  Object.defineProperty(HTMLDialogElement.prototype,"showModal",{configurable:true,value:function(){this.open=true;}});
  Object.defineProperty(HTMLDialogElement.prototype,"close",{configurable:true,value:function(){this.open=false;}});
});
afterEach(()=>{cleanup();vi.restoreAllMocks();});
it("opens the compact sheet, saves a manual meal and keeps it when the module is toggled",async()=>{
  render(<MemoryRouter><Nutrition/></MemoryRouter>);
  fireEvent.click(await screen.findByRole("button",{name:"Frühstück hinzufügen"}));
  const dialog=screen.getByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button",{name:"Manuell"}));
  fireEvent.change(within(dialog).getByLabelText("Name",{exact:true}),{target:{value:"Offline Toast"}});
  fireEvent.click(within(dialog).getByRole("button",{name:"Speichern"}));
  await waitFor(()=>expect(screen.queryByRole("dialog")).toBeNull());
  expect((await db.nutrition.toArray())[0]).toMatchObject({name:"Offline Toast",source:"manual"});
  await db.settings.update("settings",{nutrition:false});await db.settings.update("settings",{nutrition:true});
  expect(await db.nutrition.count()).toBe(1);
});
it("creates and reuses a structured recipe with known calories per portion",async()=>{
  render(<MemoryRouter><Nutrition/></MemoryRouter>);
  fireEvent.click(await screen.findByRole("button",{name:"Frühstück hinzufügen"}));
  const dialog=screen.getByRole("dialog"),sheet=within(dialog);
  fireEvent.click(sheet.getByRole("button",{name:"Eigene Rezepte"}));
  fireEvent.click(sheet.getByRole("button",{name:"Rezept erstellen"}));
  fireEvent.change(sheet.getByLabelText("Rezeptname"),{target:{value:"Porridge"}});
  fireEvent.change(sheet.getByLabelText("Ergibt Portionen"),{target:{value:"2"}});
  fireEvent.click(sheet.getByRole("button",{name:"Zutat manuell hinzufügen"}));
  fireEvent.change(sheet.getByLabelText("Zutatenname"),{target:{value:"Hafer"}});
  fireEvent.change(sheet.getByLabelText("Energie (kcal)"),{target:{value:"400"}});
  fireEvent.click(sheet.getByRole("button",{name:"Rezept speichern"}));
  await waitFor(()=>expect(sheet.getByLabelText("Name",{exact:true})).toHaveProperty("value","Porridge"));
  fireEvent.click(sheet.getByRole("button",{name:"Speichern"}));
  await waitFor(()=>expect(screen.queryByRole("dialog")).toBeNull());
  const food=(await db.foods.toArray())[0],entry=(await db.nutrition.toArray())[0];
  expect(food.ingredients).toMatchObject([{name:"Hafer",amount:100,kcal:400}]);
  expect(entry).toMatchObject({name:"Porridge",amount:1,unit:"Portion",nutrientBasis:"portion",kcal:200});
  expect(entry.protein).toBeUndefined();
});
it("respects the existing hidden-nutrients preference in search suggestions",async()=>{
  const {nutritionDefaults}=await import("../data");
  await db.settings.update("settings",{nutritionPreferences:{...nutritionDefaults,showNutrients:false}});
  await db.foods.put({id:"cached",name:"Haferflocken",kind:"cache",notes:"",kcal:370});
  render(<MemoryRouter><Nutrition/></MemoryRouter>);
  fireEvent.click(await screen.findByRole("button",{name:"Frühstück hinzufügen"}));
  fireEvent.change(screen.getByRole("searchbox"),{target:{value:"Ha"}});
  await screen.findByText("Haferflocken");
  expect(screen.queryByText(/370 kcal/)).toBeNull();
});
