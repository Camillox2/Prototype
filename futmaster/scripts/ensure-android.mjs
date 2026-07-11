import{existsSync}from'node:fs';import{spawnSync}from'node:child_process';
function run(cmd,args){const r=spawnSync(cmd,args,{stdio:'inherit',shell:process.platform==='win32'});if(r.status!==0)process.exit(r.status??1)}
if(!existsSync('android'))run('npx',['cap','add','android']);run('npx',['cap','sync','android']);run('node',['scripts/customize-android.mjs']);
