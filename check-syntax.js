const fs=require('fs');
const content=fs.readFileSync('src/components/screens/MorningScreen.tsx','utf8');

let str={in:false,ch:''};
let pa=0,br=0,sq=0;
let errs=[];
for(let i=0;i<content.length;i++){
  const c=content[i],n=content[i+1]||'';
  if(str.in){
    if(c===str.ch && content[i-1]!=='\\'){ str.in=false; }
    continue;
  }
  if(c==='"' || c==="'" || c==='`'){ str={in:true,ch:c}; continue; }
  if(c==='/' && n==='*'){ i++; while(!(content[i]==='*' && content[i+1]==='/')) i++; i++; continue; }
  if(c==='/' && n==='/'){ while(content[i]!=='\n' && i<content.length) i++; continue; }
  if(c==='(') pa++;
  if(c===')') pa--;
  if(c==='{') br++;
  if(c==='}') br--;
  if(c==='[') sq++;
  if(c===']') sq--;
}
console.log('Parens:',pa);
console.log('Braces:',br);
console.log('Brackets:',sq);
if(pa!==0) console.log('ERROR: Unmatched parentheses');
if(br!==0) console.log('ERROR: Unmatched braces');
if(sq!==0) console.log('ERROR: Unmatched brackets');
