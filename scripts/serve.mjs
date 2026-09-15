import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../dist/',import.meta.url));
const prefix='/spray-net-network-pwa/';
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.ttf':'font/ttf','.webmanifest':'application/manifest+json'};
createServer(async(req,res)=>{const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(path==='/'){res.writeHead(302,{Location:prefix});res.end();return;}const file=resolve(root,path.slice(prefix.length)||'index.html');if(!path.startsWith(prefix)||!file.startsWith(root.endsWith(sep)?root:root+sep)){res.writeHead(404);res.end();return;}try{const body=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(body);}catch{res.writeHead(404);res.end('Not found');}}).listen(4174,'127.0.0.1',()=>console.log('Preview: http://127.0.0.1:4174'+prefix));
