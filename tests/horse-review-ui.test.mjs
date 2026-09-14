import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Execute the actual panel with a minimal hook scheduler; this exercises its
// event handlers but does not replace browser/layout or authenticated API QA.
const page=readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8');
const start=page.indexOf('function HorseApplicationsPanel(');
const end=page.indexOf('\nfunction ',start+10);
const compiled=ts.transpileModule(page.slice(start,end),{compilerOptions:{target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React}}).outputText;
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function panel({allow=true,status='new',post}={}) {
  let cursor=0;const slots=[],calls=[];
  const state=(initial)=>{const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],v=>{slots[i]=typeof v==='function'?v(slots[i]):v;}];};
  let rowStatus=status;
  const context={React:{createElement:(type,props,...children)=>({type,props:props||{},children})},
    useState:state,useRef:initial=>{const [value]=state({current:initial});return value;},useCallback:fn=>fn,useEffect:()=>{},
    RefreshCw:'RefreshCw',ClipboardCheck:'ClipboardCheck',EmptyState:'EmptyState',
    serviceStatusLabel:v=>v,
    api:async(path,init)=>{
      calls.push({path,init});
      if(init?.method==='POST') {
        if(post)return post();
        rowStatus=path.endsWith('/approve')?'approved':'declined';
        return {ok:true,notifications:{email:{ok:true}}};
      }
      return {can_approve:allow,event:{id:2,name:'Fixture'},applications:[{id:7,event_id:2,status:rowStatus,created_at:1,stud_name:'Fixture',total_cents:0}]};
    }};
  const component=vm.runInNewContext(`${compiled}\nHorseApplicationsPanel`,context);
  const render=()=>{cursor=0;return component({});};
  function nodes(node){if(Array.isArray(node))return node.flatMap(nodes);if(!node||typeof node!=='object')return [];return [node,...nodes(node.children)];}
  const content=node=>Array.isArray(node)?node.map(content).join(''):node&&typeof node==='object'?content(node.children):String(node??'');
  const button=label=>nodes(render()).find(n=>n.type==='button'&&content(n).trim()===label);
  const text=()=>content(render());
  async function load(){button('Herlaai perde-aansoeke').props.onClick();await tick();}
  return {calls,button,text,load};
}
test('horse review UI hides write controls for read-only or already processed rows',async()=>{
  for(const options of [{allow:false},{status:'approved'},{status:'declined'}]){
    const p=panel(options);await p.load();assert.equal(p.button('Keur goed'),undefined);assert.equal(p.button('Keur af'),undefined);
  }
});
test('horse review UI confirms once, carries row event, then refreshes canonical state',async()=>{
  const p=panel();await p.load();p.button('Keur goed').props.onClick();
  const confirm=p.button('Bevestig');confirm.props.onClick();confirm.props.onClick();await tick();
  const writes=p.calls.filter(c=>c.init?.method==='POST');assert.equal(writes.length,1);
  assert.equal(writes[0].path,'/api/app/staff/horse-applications/7/approve');
  assert.deepEqual(JSON.parse(writes[0].init.body),{event_id:2});
  assert.equal(p.button('Keur goed'),undefined);assert.match(p.text(),/uitnodiging gestuur/);
});
test('horse review UI blocks retry after uncertain result until fresh list read',async()=>{
  const p=panel({post:async()=>{throw Error('network timeout');}});await p.load();
  p.button('Keur af').props.onClick();p.button('Bevestig').props.onClick();await tick();
  assert.equal(p.button('Keur af'),undefined);assert.match(p.text(),/Herlaai die aansoeke/);
  assert.equal(p.calls.filter(c=>c.init?.method==='POST').length,1);
  await p.load();assert.ok(p.button('Keur af'));
});
test('horse review UI preserves committed approval with delivery warning',async()=>{
  const p=panel({post:async()=>({ok:true,notifications:{needs_review:true}})});await p.load();
  p.button('Keur goed').props.onClick();p.button('Bevestig').props.onClick();await tick();
  assert.match(p.text(),/Aansoek goedgekeur.*aflewering na te gaan/);
});
