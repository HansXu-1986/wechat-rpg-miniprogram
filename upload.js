const ci = require('miniprogram-ci');
const fs = require('fs');
const path = require('path');

const project = new ci.Project({
  appid: 'wx0f5b36c754c075d1',
  type: 'miniGame',
  projectPath: __dirname,
  privateKeyPath: '/root/.openclaw/workspace/private.key',
  miniprogramRoot: './',
  ignores: ['node_modules/**/*', '.git/**/*', '*.md', '*.yml', 'temp/**/*'],
});

ci.upload({
  project,
  version: '1.0.5',
  desc: '修复 CanvasRenderingContext2D 未定义问题，解决黑屏',
  onProgressUpdate: console.log,
}).then(result => {
  console.log('\n✅ 上传成功！', result);
  process.exit(0);
}).catch(err => {
  console.error('\n❌ 上传失败：', err);
  process.exit(1);
});
