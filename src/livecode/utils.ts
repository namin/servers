import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export function snippetCache(content?: string): string {
  content = content || '';
  const hash = crypto.createHash('sha256').update(content).digest('hex');
  const snippetPath = path.join('/tmp/snippets', hash);
  
  fs.writeFileSync(snippetPath, content);
  return hash;
}
