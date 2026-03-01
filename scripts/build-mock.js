const fs = require('fs');
const path = require('path');

// プロジェクトのルートディレクトリ
const rootDir = path.resolve(__dirname, '..');
const testsDir = path.join(rootDir, 'tests');

// 対象ファイル群
const indexFile = path.join(rootDir, 'index.html');
const cssFile = path.join(rootDir, 'css.html');
const jsFile = path.join(rootDir, 'js.html');
const outputFile = path.join(testsDir, 'mock-built.html');

console.log('--- Building Mock HTML for Playwright ---');

try {
  // 1. 各ファイルを読み込む
  let htmlContent = fs.readFileSync(indexFile, 'utf8');
  const cssContent = fs.readFileSync(cssFile, 'utf8');
  const jsContent = fs.readFileSync(jsFile, 'utf8');

  // 2. GASのインクルード命令 (<?!= include('...'); ?>) を置換する
  // HTML内に直に書かれているインクルードタグ部分をコンテンツで置き換える
  htmlContent = htmlContent.replace(/<\?!= include\('css'\); \?>/g, cssContent);
  htmlContent = htmlContent.replace(/<\?!= include\('js'\); \?>/g, jsContent);

  // 3. テスト出力ディレクトリへの書き出し
  if (!fs.existsSync(testsDir)) {
    fs.mkdirSync(testsDir);
  }

  fs.writeFileSync(outputFile, htmlContent, 'utf8');

  console.log(`✅ Success! Built mock HTML at: ${outputFile}`);
} catch (err) {
  console.error('❌ Build failed:', err.message);
  process.exit(1);
}
