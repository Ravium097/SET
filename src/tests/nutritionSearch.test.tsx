// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { FoodSearch } from "../features/nutrition/FoodPicker";
const {find}=vi.hoisted(()=>({find:vi.fn()}));
vi.mock("dexie-react-hooks",()=>({useLiveQuery:()=>[]}));
vi.mock("../features/nutrition/service",async original=>({...await original<object>(),findFoods:find,searchDelay:()=>0}));
afterEach(()=>{cleanup();vi.useRealTimers();find.mockReset();});
it("debounces input and ignores stale results when a newer query is entered",async()=>{
  vi.useFakeTimers();let resolve!:(value:unknown)=>void;
  find.mockReturnValueOnce(new Promise(r=>resolve=r)).mockResolvedValue({foods:[],offline:false,limited:false,missingBarcode:false});
  render(<FoodSearch onPick={()=>{}}/>);
  const input=screen.getByRole("searchbox");
  fireEvent.change(input,{target:{value:"Haf"}});
  await act(async()=>{vi.advanceTimersByTime(300);});
  fireEvent.change(input,{target:{value:"Hafer"}});
  await act(async()=>{vi.advanceTimersByTime(549);});expect(find).not.toHaveBeenCalled();
  await act(async()=>{vi.advanceTimersByTime(1);});expect(find).toHaveBeenCalledTimes(1);expect(find.mock.calls[0][0]).toBe("Hafer");
  fireEvent.change(input,{target:{value:"Milch"}});
  await act(async()=>{resolve({foods:[{id:"stale",name:"Old oats",kind:"cache",notes:""}],offline:false,limited:false,missingBarcode:false});});
  expect(screen.queryByText("Old oats")).toBeNull();
  await act(async()=>{vi.advanceTimersByTime(550);});expect(find).toHaveBeenCalledTimes(2);
});
