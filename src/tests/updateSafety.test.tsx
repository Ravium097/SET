// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { beforeEach,afterEach,it,expect,vi } from 'vitest';
import { render,screen,fireEvent,waitFor,cleanup } from '@testing-library/react';
import { UpdateControl } from '../components/pwa/UpdateControl';
import { db,init } from '../data';
import { observeThemeSafety,resetThemeSafetyForRoute } from '../services/themeSync';
const postMessage=vi.fn(),sw=new EventTarget();
const registration={waiting:{postMessage},update:vi.fn(),addEventListener:vi.fn(),removeEventListener:vi.fn()};
beforeEach(async()=>{for(const table of db.tables)await table.clear();await init();resetThemeSafetyForRoute();vi.stubEnv('DEV',false);Object.assign(sw,{controller:{},register:vi.fn().mockResolvedValue(registration),getRegistration:vi.fn().mockResolvedValue(registration)});Object.defineProperty(navigator,'serviceWorker',{configurable:true,value:sw});vi.spyOn(window,'confirm').mockReturnValue(true);postMessage.mockClear();});
afterEach(()=>{cleanup();vi.unstubAllEnvs();vi.restoreAllMocks();});
it('never activates an update over an active workout',async()=>{
 await db.workouts.put({id:'active',name:'Push Day',date:'2026-11-26',started:1,duration:null,status:'active',exercises:[]});
 render(<UpdateControl/>);fireEvent.click(await screen.findByRole('button',{name:'Update öffnen'}));await screen.findByText('Training fortsetzen');expect(postMessage).not.toHaveBeenCalled();
});
it('does not activate an update over an unsaved input',async()=>{
 const stop=observeThemeSafety();render(<><input aria-label="Draft"/><UpdateControl/></>);fireEvent.change(screen.getByLabelText('Draft'),{target:{value:'not saved'}});
 fireEvent.click(await screen.findByRole('button',{name:'Update öffnen'}));await waitFor(()=>expect(window.confirm).toHaveBeenCalled());await new Promise(resolve=>setTimeout(resolve,30));expect(postMessage).not.toHaveBeenCalled();stop();
});
