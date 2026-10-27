/* One-time mechanical presentation-color migration; never visits API, audio, DSP or export code. */
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),vm=require('node:vm'),postcss=require('postcss');
if(process.argv.includes('--write')&&fs.existsSync('app/ui-theme-palette.css'))throw Error('One-time migration already applied; refusing to replace its palette.');
const moduleValue={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/uiTheme.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:moduleValue,exports:moduleValue.exports});
const {UI_THEMES,themeRgb,parseUiColor,uiColorToken}=moduleValue.exports;
const registry=new Map(),changes=[];
const pattern=/#(?:[\da-f]{8}|[\da-f]{6}|[\da-f]{4}|[\da-f]{3})\b|rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+(?:\s*,\s*[\d.]+)?\s*\)|\b(?:white|black)\b/gi;
function replaceColors(value,role='paint'){
 if(value.includes('data:'))return value;
 return value.replace(pattern,match=>{const parsed=parseUiColor(match.toLowerCase()==='white'?'#ffffff':match.toLowerCase()==='black'?'#000000':match);if(!parsed)return match;const token=uiColorToken(parsed.rgb,role);registry.set(token,{rgb:parsed.rgb,role});return parsed.alpha===1?`rgb(var(${token}))`:`rgba(var(${token}),${Number(parsed.alpha.toFixed(5))})`;});
}
const roleFor=property=>/shadow/i.test(property)?'shadow':/border|outline/i.test(property)?'border':'paint';
function css(source){try{const ast=postcss.parse(source);ast.walkDecls(decl=>{if(/^(?:mask|-webkit-mask)/.test(decl.prop))return;decl.value=replaceColors(decl.value,roleFor(decl.prop));});return ast.toString();}catch{return replaceColors(source);}}
function files(folder){return fs.readdirSync(folder,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(path.join(folder,entry.name)):[path.join(folder,entry.name)]);}
const candidates=[...files('components'),...files('app')].filter(file=>!file.includes(path.sep+'api'+path.sep)&&!file.includes('design-preview')&&!file.includes('opengraph-image')&&!file.includes('ui-theme')&&/\.(css|tsx)$/.test(file));
for(const file of candidates){const input=fs.readFileSync(file,'utf8');for(const match of input.matchAll(/var\((--bz-(paint|shadow|border)-([\da-f]{6}))\)/g))registry.set(match[1],{rgb:parseUiColor('#'+match[3]).rgb,role:match[2]});let output=input;
 if(file.endsWith('.css'))output=css(input);
 else{
  const ast=ts.createSourceFile(file,input,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),edits=[];
  function styleAncestor(node){for(let current=node.parent;current;current=current.parent){if(ts.isJsxAttribute(current)&&current.name.getText(ast)==='style')return true;if(ts.isJsxElement(current)&&current.openingElement.tagName.getText(ast)==='style')return true;}return false;}
  const canvasFile=/getContext\(["']2d/.test(input);
  function visit(node){
   if(ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node)||ts.isTemplateHead(node)||ts.isTemplateMiddle(node)||ts.isTemplateTail(node)){
    const parent=node.parent,attribute=ts.isJsxAttribute(parent)?parent.name.getText(ast):'',prop=ts.isPropertyAssignment(parent)?parent.name.getText(ast).replace(/["']/g,''):'';
    const style=styleAncestor(node)||/^(fill|stroke|stopColor|color)$/.test(attribute)||(!canvasFile&&/^(color|background(?:Color|Image)?|border.*|outline.*|boxShadow|textShadow|accentColor|caretColor|fill|stroke|stopColor|--.*)$/.test(prop));
    if(style){let start=node.getStart(ast)+1,end=node.end-1;if(ts.isTemplateHead(node)||ts.isTemplateMiddle(node))end=node.end-2;if(ts.isTemplateMiddle(node)||ts.isTemplateTail(node))start=node.getStart(ast)+1;const raw=input.slice(start,end),replacement=/[{};]/.test(raw)&&styleAncestor(node)?css(raw):replaceColors(raw,roleFor(prop||attribute));if(raw!==replacement)edits.push({start,end,replacement});}
   }
   ts.forEachChild(node,visit);
  }
  visit(ast);for(const edit of edits.sort((a,b)=>b.start-a.start))output=output.slice(0,edit.start)+edit.replacement+output.slice(edit.end);
 }
 if(output!==input){changes.push(file);if(process.argv.includes('--write'))fs.writeFileSync(file,output);}
}
// Canvas files retain normal color strings, resolved by a presentation-only helper.
const canvasFiles=[...files('components'),'lib/sonicCore.ts'].filter(file=>/\.(tsx|ts)$/.test(file)&&!file.includes('design-preview')&&/getContext\(["']2d|CanvasRenderingContext2D/.test(fs.readFileSync(file,'utf8')));
for(const file of canvasFiles){const input=fs.readFileSync(file,'utf8');if(input.includes('import { uiColor }'))continue;const ast=ts.createSourceFile(file,input,ts.ScriptTarget.Latest,true,file.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS),edits=[];
 function underStyle(node){for(let cur=node.parent;cur;cur=cur.parent)if(ts.isJsxAttribute(cur)&&cur.name.getText(ast)==='style'||ts.isJsxElement(cur)&&cur.openingElement.tagName.getText(ast)==='style')return true;return false;}
 function visit(node){if(!underStyle(node)&&!(node.parent&&ts.isJsxAttribute(node.parent))&&(ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node)||ts.isTemplateExpression(node))){const text=ts.isTemplateExpression(node)?node.getText(ast).slice(1,-1):node.text;if(/^(?:#[\da-f]{3,8}|rgba?\([\s\S]*\))$/i.test(text)){edits.push({start:node.getStart(ast),end:node.end,replacement:`uiColor(${node.getText(ast)})`});return;}}ts.forEachChild(node,visit);}
 visit(ast);let output=input;for(const edit of edits.sort((a,b)=>b.start-a.start))output=output.slice(0,edit.start)+edit.replacement+output.slice(edit.end);if(edits.length){const directive=/^["']use client["'];?\s*/.exec(output);const at=directive?.[0].length??0;output=output.slice(0,at)+'\nimport { uiColor } from "@/lib/uiTheme";\n'+output.slice(at);if(process.argv.includes('--write'))fs.writeFileSync(file,output);changes.push(file);}
}
let palette='/* Generated by scripts/migrate-ui-colors.cjs. Original values preserved exactly. */\n';
for(const theme of UI_THEMES){palette+=`:root${theme.id==='original'?'':`[data-ui-theme="${theme.id}"]`}{\n`;for(const [token,{rgb,role}]of [...registry].sort(([a],[b])=>a.localeCompare(b)))palette+=`  ${token}:${themeRgb(rgb,theme.id,role).join(',')};\n`;palette+='}\n';}
if(process.argv.includes('--write'))fs.writeFileSync('app/ui-theme-palette.css',palette);
console.log(JSON.stringify({files:[...new Set(changes)],tokens:registry.size,write:process.argv.includes('--write')},null,2));
