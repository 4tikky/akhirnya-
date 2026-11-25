import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validSize } from '../lib/banner-size';
import { exportDimensions } from '../lib/export-math';
import { canvasSize, generateDesigns, scoreLayout } from '../lib/layout';
import { portraitCrop } from '../lib/photos';
import { duplicateProject, exportProject, parseProject } from '../lib/storage';
import { themes } from '../lib/themes';
import { newGraduate, newProject } from '../lib/types';

const sizes = [{width:300,height:150},{width:400,height:100},{width:600,height:100},{width:100,height:200},{width:120,height:120}];
function fixture(count: number) {
  const project = newProject();
  project.name='Kelulusan bersama';
  project.headline='The Final Chapter — Selamat Wisuda Angkatan Informatika';
  project.graduates=Array.from({length:count},(_, index)=>({
    ...newGraduate(),name:index%3 ? `Nama Wisudawan ${index+1}` : `Raden Prabu Naufal Adinata Mahardika ${index+1}`,
    degree:index%2?'S.Kom.':'S.T.',quote:index===2?'Selesai juga setelah banyak begadang!':'',
    original:{src:'/demo/raka.webp',width:index%2 ? 200 : 1200,height:index%2 ? 300 : 800},
  }));
  return project;
}

for (const count of [1,2,3,5,7,10,15,20]) {
  test(`three valid variations include all ${count} graduates across styles and ratios`,()=>{
    for (const theme of themes) for (const size of sizes) {
      const project={...fixture(count),theme:theme.id,size};
      const designs=generateDesigns(project);
      assert.equal(designs.length,3,`${theme.id}, ${size.width}x${size.height}, ${count}`);
      assert.equal(new Set(designs.map(design=>design.palette.bg)).size,3);
      for (const design of designs) {
        assert(scoreLayout(design.nodes,design.dimensions,project)>0);
        const portraits=design.nodes.filter(node=>node.kind==='portrait');
        assert.deepEqual(portraits.map(node=>node.graduateId),project.graduates.map(person=>person.id));
        const text=design.nodes.filter(node=>node.kind==='text');
        for(const [index,person] of project.graduates.entries()) {
          const label = text.find(item => item.graduateId===person.id);
          assert(label);
          assert.equal(label.text.replace(/\s/g,''),(person.name+', '+person.degree).replace(/\s/g,''));
          const portrait = portraits[index];
          assert(label.y>=portrait.y+portrait.h);
          assert(Math.abs(label.x+label.w/2-portrait.x-portrait.w/2)<.01);
        }
      }
    }
  });
}

test('a seed reproduces the document and a new seed provides different palettes or decoration positions',()=>{
  const project=fixture(7);
  const first=generateDesigns(project);
  assert.deepEqual(first,generateDesigns(project));
  assert.notDeepEqual(first,generateDesigns({...project,seed:1}));
  const invalid={...first[0],nodes:first[0].nodes.slice()};
  const portrait=invalid.nodes.findIndex(node=>node.kind==='portrait');
  invalid.nodes[portrait]={...invalid.nodes[portrait],x:-200};
  assert.equal(scoreLayout(invalid.nodes,invalid.dimensions,project),-1);
});

test('serializes a project, remaps duplicate selections, and rejects remote canvas images',()=>{
  const project=fixture(5);
  project.designs=generateDesigns(project);
  project.selected=project.designs[1].id;
  project.designs[1].canvas={objects:[{type:'Group',layoutManager:{type:'layoutManager',strategy:'fit-content'},objects:[{type:'Image',src:'/demo/raka.webp',gradId:project.graduates[0].id}]}]};
  assert.deepEqual(parseProject(exportProject(project)),JSON.parse(JSON.stringify(project)));
  assert.deepEqual(parseProject(JSON.stringify({format:'gradify',version:1,project})),JSON.parse(JSON.stringify(project)));
  const clone=duplicateProject(project);
  assert.notEqual(clone.id,project.id);
  assert.equal(clone.designs[1].id,clone.selected);
  project.designs[1].canvas={objects:[{type:'Image',src:'https://example.com/remote.png'}]};
  assert.throws(()=>parseProject(exportProject(project)));
});

test('physical sizing, bleed, and memory guard are consistent',()=>{
  assert.deepEqual(canvasSize({width:400,height:100}),{width:1200,height:300});
  assert.equal(validSize({width:700,height:100}),false);
  const draft=exportDimensions({width:200,height:100},72,5);
  assert.deepEqual([draft.width,draft.height,draft.widthMm,draft.heightMm],[5698,2863,2010,1010]);
  assert.equal(draft.supported,true);
  const large=exportDimensions({width:400,height:200},300);
  assert.equal(large.supported,false);
  assert.equal(exportDimensions({width:400,height:200},large.maxDpi).supported,true);
});

test('face-aware crop retains the detected face for portrait and landscape source images',()=>{
  for (const photo of [{src:'',width:480,height:900},{src:'',width:2400,height:1800}]) {
    const face={x:.63,y:.19,w:.13,h:.16};
    const crop=portraitCrop(photo,.8,face);
    assert(crop.x<=photo.width*face.x && crop.y<=photo.height*face.y);
    assert(crop.x+crop.w>=photo.width*(face.x+face.w)&&crop.y+crop.h>=photo.height*(face.y+face.h));
    assert(crop.x>=0 && crop.y>=0 && crop.x+crop.w<=photo.width+.01 && crop.y+crop.h<=photo.height+.01);
  }
});

test('a provider design is validated and rendered as editable layout nodes',async()=>{
  const { generateFromSpec } = await import('../lib/layout');
  const project = fixture(3);
  const spec = {theme:'gaming',headline:'Mission Passed: S.Kom.',palette:['#22223b','#f2f3f4','#4f89ff','#333356'],layout:'staggered'};
  const [design] = generateFromSpec(project,spec);
  assert(design.nodes.some(node=>node.kind==='text' && node.text===spec.headline));
  assert.equal(design.palette.bg,spec.palette[0]);
  assert.throws(()=>generateFromSpec(project,{...spec,palette:['url(https://example.com)']}));
});

test('wide 6:1 layout fits 20 graduates with the maximum name and degree lengths',()=>{
  const project = fixture(20);
  project.size = {width:600,height:100};
  project.headline = 'W'.repeat(150);
  project.graduates = project.graduates.map((person,index)=>({...person,name:'W'.repeat(137)+index,degree:'W'.repeat(60)}));
  for (const theme of themes) {
    const designs = generateDesigns({...project,theme:theme.id});
    assert.equal(designs.length,3);
    assert(designs.every(design=>design.nodes.filter(node=>node.kind==='text' && node.graduateId).length===20));
  }
});

test('stand banners keep exact physical dimensions and select only vertical compositions',()=>{
  const sizes = [
    {width:60,height:160},{width:80,height:180},{width:85,height:200},{width:100,height:200},
    {width:67.5,height:175.25},
  ];
  for (const size of sizes) for (const count of [3,5]) for (const theme of themes) {
    const project={...fixture(count),size,theme:theme.id};
    project.logo={src:'/demo/raka.webp',width:200,height:300};
    const designs=generateDesigns(project);
    const caseName=`${size.width} × ${size.height}, ${count} graduates, ${theme.name}`;
    assert.equal(designs.length,3,caseName);
    assert.equal(new Set(designs.map(design=>design.strategy)).size,3,caseName);
    for (const design of designs) {
      assert.deepEqual(design.size,size);
      assert(design.strategy.startsWith('portrait-'));
      assert(Math.abs(design.dimensions.width/design.dimensions.height-size.width/size.height)<1e-12);
      const photos=design.nodes.filter(node=>node.kind==='portrait');
      const names=design.nodes.filter(node=>node.kind==='text' && node.graduateId);
      const logo=design.nodes.find(node=>node.kind==='logo');
      assert(logo && logo.y < photos[0].y);
      const footer=design.nodes.find(node=>node.kind==='text' && node.text===project.year);
      assert(footer && footer.y > photos.at(-1)!.y);
      assert(photos.some(photo=>photo.y > photos[0].y+photos[0].h));
      assert.deepEqual(names.map(name=>name.kind==='text' && name.graduateId),project.graduates.map(person=>person.id));
      assert(scoreLayout(design.nodes,design.dimensions,project,undefined,design.strategy)>0,caseName);
      assert.equal(scoreLayout(design.nodes,design.dimensions,project,undefined,'editorial'),-1);
    }
    project.designs=designs;
    assert.deepEqual(parseProject(exportProject(project)).designs.map(({size,dimensions})=>({size,dimensions})),designs.map(({size,dimensions})=>({size,dimensions})));
  }
});

test('stand banner exports keep width and height in portrait order',()=>{
  assert.deepEqual(canvasSize({width:60,height:160}),{width:450,height:1200});
  assert(validSize({width:60,height:160}));
  const stand=exportDimensions({width:60,height:160},72);
  assert.deepEqual([stand.width,stand.height,stand.widthMm,stand.heightMm],[1701,4535,600,1600]);
  const withBleed=exportDimensions({width:80,height:180},72,5);
  assert.deepEqual([withBleed.width,withBleed.height,withBleed.widthMm,withBleed.heightMm],[2296,5131,810,1810]);
});
