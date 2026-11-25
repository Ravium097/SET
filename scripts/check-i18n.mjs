import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
const dictionary=JSON.parse(fs.readFileSync('src/i18n/en.json','utf8'));
const failures=[];
const placeholders=text=>[...text.matchAll(/\{(\d+)\}/g)].map(match=>match[1]).sort().join(',');
for(const [key,value] of Object.entries(dictionary)){
 if(typeof value!=='string'||!value.trim())failures.push(`Empty translation: ${key}`);
 if(placeholders(key)!==placeholders(value))failures.push(`Placeholder mismatch: ${key}`);
}
function walk(directory){for(const name of fs.readdirSync(directory)){
 const file=path.join(directory,name);
 if(fs.statSync(file).isDirectory()){if(name!=='tests')walk(file);continue;}
 if(!/\.(tsx|ts)$/.test(file))continue;
 const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,file.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 function visit(node){
  if(ts.isCallExpression(node)&&node.expression.getText(source)==='tr'&&node.arguments[0]&&ts.isStringLiteral(node.arguments[0])){
   const key=node.arguments[0].text.trim();
   if(/[a-zA-ZäöüÄÖÜß]/.test(key)&&!Object.hasOwn(dictionary,key))failures.push(`Missing translation in ${file}: ${key}`);
  }
  if(ts.isJsxText(node)&&/[a-zA-ZäöüÄÖÜß]/.test(node.text))failures.push(`Untranslated JSX text in ${file}: ${node.text.trim()}`);
  ts.forEachChild(node,visit);
 }
 visit(source);
}}
walk('src');
if(failures.length){console.error(failures.join('\n'));process.exit(1);}
console.log(`Checked ${Object.keys(dictionary).length} translations, placeholders and JSX text.`);
