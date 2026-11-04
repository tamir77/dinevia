import test from 'node:test';
import assert from 'node:assert/strict';
import {menuPresentation,needsTranslatedImage} from '../lib/presentation.ts';
test('personal photo translations skip image generation; host photo translations keep it',()=>{
 assert.equal(menuPresentation('guest:123'),'text');
 assert.equal(needsTranslatedImage('guest:123','photo'),false);
 for(const owner of ['restaurant:123','local_seedy']){
  assert.equal(menuPresentation(owner),'design');
  assert.equal(needsTranslatedImage(owner,'photo'),true);
  assert.equal(needsTranslatedImage(owner,'html'),false);
  assert.equal(needsTranslatedImage(owner,'pdf'),false);
 }
});
