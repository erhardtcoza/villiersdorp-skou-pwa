import test from 'node:test';
import assert from 'node:assert/strict';
import { backendOrigin, usesBoundDevelopmentBackend } from '../lib/backend-origin.ts';

test('only exact live app hosts use production; previews and lookalikes use dev',()=>{
  for(const host of ['app.villiersdorpskou.co.za','villiersdorp-skou-app.vinetis.workers.dev'])
    assert.equal(backendOrigin(`https://${host}/api/pos-v1/orders`),'https://tickets.villiersdorpskou.co.za');
  for(const host of ['localhost:5173','preview-villiersdorp-skou-app.vinetis.workers.dev','app.villiersdorpskou.co.za.attacker.invalid'])
    assert.equal(backendOrigin(`https://${host}/api/pos-v1/orders?host=app.villiersdorpskou.co.za`),'https://skou-events-dev.vinetis.workers.dev');
  assert.equal(backendOrigin('https://villiersdorp-skou-app-dev.vinetis.workers.dev/api/pos-v1/orders'),'https://skou-events-staging.vinetis.workers.dev');
  assert.equal(usesBoundDevelopmentBackend('https://villiersdorp-skou-app-dev.vinetis.workers.dev/api/pos-v1/orders'),true);
  assert.equal(usesBoundDevelopmentBackend('https://preview-villiersdorp-skou-app.vinetis.workers.dev/api/pos-v1/orders'),false);
});
