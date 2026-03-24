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
  version: '1.0.8',
  desc: '修复选中后无法移动空格的bug',
  onProgressUpdate: console.log,
}).then(result => {
  console.log('\n✅ 上传成功！', result);
  process.exit(0);
}).catch(err => {
  console.error('\n❌ 上传失败：', err);
  process.exit(1);
});
