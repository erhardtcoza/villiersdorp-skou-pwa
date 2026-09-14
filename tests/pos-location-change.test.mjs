import test from 'node:test';
import assert from 'node:assert/strict';
import {changePOSLocation,initialPOSContext} from '../lib/pos-location-change.ts';

test('reload restores original sale location and terminal rather than department default',()=>{
  const pending={draft:{location_id:2,terminal_code:'ORIGINAL',event_id:1}};
  assert.deepEqual(initialPOSContext({pending,locationIds:[1,2],primaryLocationId:1,eventId:1}),{locationId:2,terminalCode:'ORIGINAL'});
});
test('inaccessible or malformed recovery context cannot fall back to another location',()=>{
  for(const draft of [
    {location_id:3,terminal_code:'OLD',event_id:1},
    {location_id:2,terminal_code:'OLD',event_id:9},
    {location_id:2,terminal_code:'',event_id:1},
    {location_id:'2',terminal_code:'OLD',event_id:1},
  ]) assert.throws(()=>initialPOSContext({pending:{draft},locationIds:[1,2],primaryLocationId:1,eventId:1}),/moenie weer betaal/);
});
test('new sale chooses an available primary or first location without inventing a terminal',()=>{
  assert.deepEqual(initialPOSContext({pending:null,locationIds:[1,2],primaryLocationId:2}),{locationId:2});
  assert.deepEqual(initialPOSContext({pending:null,locationIds:[1],primaryLocationId:9}),{locationId:1});
  assert.deepEqual(initialPOSContext({pending:null,locationIds:[],primaryLocationId:9}),{locationId:0});
});

function fixture(overrides={}) {
  const calls=[];
  return {calls,options:{hasBasket:false,hasPendingSale:()=>false,
    lease:{terminal_code:'TEST',device_instance_id:'device',lease_token:'fixture'},
    release:async lease=>{calls.push(['release',lease.terminal_code]);return {released:true};},
    clearLease:()=>calls.push('clear'),prepare:async()=>{calls.push('prepare');return true;},
    select:()=>calls.push('select'),...overrides}};
}
test('location change releases original lease before preparing and selecting new location',async()=>{
  const f=fixture();await changePOSLocation(f.options);
  assert.deepEqual(f.calls,[['release','TEST'],'clear','prepare','select']);
});
test('basket, pending sale and unreadable journal prevent all location mutations',async()=>{
  for(const guard of [{hasBasket:true},{hasPendingSale:()=>true},{hasPendingSale:()=>{throw new Error('journal unavailable');}}]){
    const f=fixture(guard);await assert.rejects(changePOSLocation(f.options));assert.deepEqual(f.calls,[]);
  }
});
test('refused or unknown release never prepares a new location or clears old lease',async()=>{
  for(const release of [async()=>({released:false}),async()=>({}),async()=>{throw new Error('network timeout');}]){
    const f=fixture({release});await assert.rejects(changePOSLocation(f.options));assert.deepEqual(f.calls,[]);
  }
});
test('failed preparation never selects new location; absent lease needs no release',async()=>{
  const f=fixture({prepare:async()=>false});await changePOSLocation(f.options);
  assert.deepEqual(f.calls,[['release','TEST'],'clear']);
  const fresh=fixture({lease:null});await changePOSLocation(fresh.options);
  assert.deepEqual(fresh.calls,['prepare','select']);
});
