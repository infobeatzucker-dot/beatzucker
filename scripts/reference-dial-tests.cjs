const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
let props,drag={current:null},changed;
const source=ts.transpileModule(fs.readFileSync('components/ReferenceDial.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const m={exports:{}};
vm.runInNewContext(source,{exports:m.exports,module:m,require:name=>name==='react'?{useId:()=>':test:',useRef:()=>drag}:name==='react/jsx-runtime'?{jsx:(type,p)=>({type,props:p}),jsxs:(type,p)=>({type,props:p})}:{}});
function find(node){if(!node||typeof node!=='object')return null;if(node.props?.role==='slider')return node;for(const c of [node.props?.children].flat(Infinity)){const found=find(c);if(found)return found}return null}
function render(value,min=0,max=1,initial=.65){props=find(m.exports.default({label:'Influence',value,min,max,initial,lang:'en',ends:['OFF','FULL'],onChange:v=>{changed=v}})).props;changed=undefined;return props}
function key(k,shiftKey=false){props.onKeyDown({key:k,shiftKey,preventDefault(){}});return changed}
render(.65);assert.equal(key('Home'),0);assert.equal(key('End'),1);assert.equal(key('ArrowRight'),.7);assert.equal(key('ArrowLeft'),.6);assert.equal(key('ArrowUp',true),.75);
render(1);assert.equal(key('ArrowUp'),1);render(0);assert.equal(key('ArrowDown'),0);
render(0,-1,1,0);assert.equal(key('Home'),-1);assert.equal(key('End'),1);assert.equal(key('ArrowDown'),-.05);props.onDoubleClick();assert.equal(changed,0);
render(.3);const target={focus(){},setPointerCapture(){},hasPointerCapture:()=>true,releasePointerCapture(){}};
props.onPointerDown({button:0,pointerId:1,clientX:0,clientY:100,currentTarget:target});props.onPointerMove({pointerId:1,clientX:0,clientY:55});assert.equal(changed,.55);props.onPointerCancel();changed=undefined;props.onPointerMove({pointerId:1,clientX:0,clientY:0});assert.equal(changed,undefined);
render(.1);props.onDoubleClick();assert.equal(changed,.65);assert.equal(props['aria-valuemin'],0);assert.equal(props['aria-valuemax'],100);
console.log('PASS reference dials: unchanged bounds/5% steps, signed values, keyboard, clamping, drag, cancellation and reset');
