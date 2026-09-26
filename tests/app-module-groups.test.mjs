import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const page = await readFile(new URL('../app/page.tsx', import.meta.url), 'utf8');

test('extra module actions expand inline instead of opening the group default action', () => {
  assert.match(page, /const \[expanded, setExpanded\] = useState\(false\)/);
  assert.match(page, /const extraItems = group\.items\.slice\(3\)/);
  assert.match(page, /expanded && extraItems\.map/);
  assert.match(page, /aria-expanded=\{expanded\}/);
  assert.match(page, /onClick=\{\(\) => setExpanded\(\(isExpanded\) => !isExpanded\)\}/);
  assert.doesNotMatch(page, /className="module-more-button" onClick=\{onOpenGroup\}/);
});

test('membership remains the fourth visitor action and can be revealed', () => {
  assert.match(page, /modules: \["tickets", "wallet", "family", "membership"\]/);
  assert.match(page, /key: "membership"/);
});
