import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const source=await readFile(new URL('../app/page.tsx',import.meta.url),'utf8');
for(const component of ['VenueBookingPage','ServiceRequestFlow','PhotosFlow']) {
  test(`${component} finishes successful save after React clears currentTarget`,async()=>{
    const componentSource=source.slice(source.indexOf(`function ${component}(`));
    const match=componentSource.match(/const submit = (async \(event: FormEvent<HTMLFormElement>\) => \{[\s\S]*?\n  \});/);
    assert.ok(match);
    let release, error='', reset=0, refreshed=0;
    const input={value:'selected-file'};
    const formElement={reset(){reset++;},querySelector(){return input;}};
    const context={
      api:()=>new Promise(resolve=>{release=resolve;}),
      FormData:class {get(){return 'Test';}set(){}},
      setBusy(){},setError(v){error=v;},setMessage(){},setFile(){},setTitle(){},setCaption(){},
      loadRequests:async()=>{refreshed++;},load:async()=>{refreshed++;},
      file:{},title:'Test',caption:'Test',moduleKey:'horses',config:{fields:[],title:'Test',requestType:'test'},
    };
    runInNewContext(ts.transpileModule(`globalThis.submit = ${match[1]};`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,context);
    const event={preventDefault(){},currentTarget:formElement};
    const running=context.submit(event);
    event.currentTarget=null; // React only supplies currentTarget during dispatch.
    release({ok:true});await running;
    assert.equal(error,'');assert.equal(refreshed,1);
    if(component==='PhotosFlow')assert.equal(input.value,'');else assert.equal(reset,1);
  });
}
