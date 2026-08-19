import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const modal = fs.readFileSync(new URL('../../frontend/js/components/modal.js', import.meta.url), 'utf8');
const frontend = fs.readdirSync(new URL('../../frontend/js/pages/', import.meta.url)).filter(name => name.endsWith('.js')).map(name => fs.readFileSync(new URL(`../../frontend/js/pages/${name}`, import.meta.url), 'utf8')).join('\n');
const borrow = fs.readFileSync(new URL('../../frontend/js/pages/borrow.js', import.meta.url), 'utf8');

test('native browser dialogs are replaced by centered application dialogs', () => {
  assert.match(modal, /items-center justify-center/);
  assert.match(modal, /function appAlert/);
  assert.match(modal, /function appConfirm/);
  assert.match(modal, /function appPrompt/);
  assert.doesNotMatch(frontend, /\b(?:alert|confirm|prompt)\(/);
});

test('filter text inputs are limited to 100 characters', () => {
  assert.match(modal, /FILTER_INPUT_MAX_LENGTH = 100/);
  assert.match(modal, /input\.type === 'search'/);
});

test('borrow page returns every signed-in role to user home', () => {
  assert.match(borrow, /href="#\/home"/);
  assert.doesNotMatch(borrow, /กลับหน้า Admin/);
});
