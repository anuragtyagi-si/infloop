import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estimateCampaign } from './lib.js';

test('campaign tiers respect the advertised investment boundaries', () => {
  for (const [budget,tier] of [[1000,'Pilot'],[10000,'Pilot'],[10001,'Growth'],[75000,'Growth'],[75001,'Flagship'],[300000,'Flagship']]) {
    assert.equal(estimateCampaign(budget).tier,tier);
  }
});

test('planner provides finite estimates for invalid and out-of-range input', () => {
  for (const budget of [undefined,NaN,-100,0,Infinity,999999999]) {
    const result=estimateCampaign(budget);
    assert.ok(Number.isFinite(result.creators));
    assert.ok(Number.isFinite(result.reach));
    assert.ok(result.creators>=2);
  }
});

test('campaign goal and duration change the planning scenario', () => {
  const awareness=estimateCampaign(25000,'Awareness',6);
  const conversions=estimateCampaign(25000,'Conversions',8);
  assert.ok(awareness.reach>conversions.reach);
  assert.ok(awareness.creators>conversions.creators);
  assert.equal(conversions.content,conversions.creators*4);
});
